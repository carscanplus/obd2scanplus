import { Command } from "./command";
import {
    decodeIsoTpFrames,
    decodeTroubleCodes,
    DescriptionLookup,
    TroubleCode,
} from "./dtc";
import { OBDError } from "./errors";
import { parseHex } from "./hex";
import { Response } from "./response";
import { DEFAULT_UNIT_PREFERENCES, UnitPreferences } from "./scalar";
import { OBDTransport } from "./transport";

/**
 * Sesión OBD de alto nivel, portada de `backend/src/obd.rs`.
 *
 * Soporta dos modos:
 *  - Real: mediante un `OBDTransport` (Bluetooth SPP / BLE).
 *  - Demo: reproduciendo respuestas grabadas (equivalente a `DEMO MODE`).
 *
 * Protocolo del adaptador BLE "V011" (clon ELM327 v2.2, ISO 14230-4 KWP FAST):
 *  - Los comandos van terminados en `\r` y la respuesta acaba en `>`.
 *  - El adaptador repite el comando enviado (eco) antes de los datos.
 *  - Responde con las cabeceras desactivadas (`41 05 40`), sin byte de tamaño.
 *  - No se envían ATZ/ATE/ATS/ATSP en la inicialización: en este clon no están
 *    verificados. Sólo se envía ATSP si el llamador pide un protocolo concreto.
 */
export interface RecordedRequest {
  request: string;
  request_type: string;
  response: string;
}

/** Tiempo máximo de espera del prompt `>` tras enviar un comando. */
const DEFAULT_READ_TIMEOUT_MS = 6000;
/** Reintentos de `ATI`: el primero suele perderse si el CCCD aún no está activo. */
const PROBE_TIMEOUTS_MS = [2500, 4500, 6000];
const PROBE_DELAY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Primera línea de texto útil de una respuesta AT (versión, protocolo…). */
function firstTextLine(raw: string, sentCommand: string): string | null {
  const command = sentCommand.replace(/\s+/g, "").toUpperCase();
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const clean = line.trim();
    if (!clean) continue;
    if (clean.replace(/\s+/g, "").toUpperCase() === command) continue;
    if (/^SEARCHING/i.test(clean) || /^BUS\s*INIT/i.test(clean)) continue;
    return clean;
  }
  return null;
}


export class ObdSession {
  private transport: OBDTransport | null = null;
  private replayData: RecordedRequest[] | null = null;
  private _connected = false;
  private elmVersion: string | null = null;
  private protocolName: string | null = null;
  private supportedPids: Set<string> | null = null;
  private freezeFrameQuery = false;
  /** Cola que serializa los comandos enviados al adaptador. */
  private queue: Promise<unknown> = Promise.resolve();

  unitPreferences: UnitPreferences = { ...DEFAULT_UNIT_PREFERENCES };
  readTimeoutMs = DEFAULT_READ_TIMEOUT_MS;

  get connected(): boolean {
    return this._connected;
  }

  get connectionName(): string {
    if (this.replayData) return "DEMO MODE";
    return this.transport?.name ?? "Unknown";
  }

  get elmVersionName(): string | null {
    return this.elmVersion;
  }

  /** Protocolo detectado con `ATDP` (p. ej. "ISO 14230-4 (KWP FAST)"). */
  get protocol(): string | null {
    return this.protocolName;
  }

  /** PIDs (`010C`…) que el vehículo declara soportar; `null` si no se sabe. */
  get supportedPidCommands(): Set<string> | null {
    return this.supportedPids;
  }

  /**
   * Conecta a un adaptador real.
   *
   * La inicialización es deliberadamente mínima: sólo `ATI` para comprobar que
   * hay comunicación (con reintentos, porque las notificaciones BLE tardan en
   * activarse) y `ATDP` para conocer el protocolo. No se resetea ni se cambia
   * la configuración del adaptador.
   */
  async connect(transport: OBDTransport, protocol = 0): Promise<void> {
    this.disconnect();
    this.transport = transport;
    this.supportedPids = null;
    this.protocolName = null;
    try {
      await transport.connect();
      await this.probeAdapter();

      // ATSP sólo se envía si se pide un protocolo explícito.
      if (protocol > 0 && protocol <= 9) {
        await this.tryExchange(`ATSP${protocol}`, 3000);
      }

      this.protocolName = await this.readProtocol();
      this._connected = true;
    } catch (error) {
      // No dejes un socket RFCOMM/BLE abierto si el adaptador se desconecta o
      // no responde durante la secuencia de inicialización.
      await transport.disconnect();
      this.transport = null;
      this.elmVersion = null;
      this._connected = false;
      throw error;
    }
  }

  /** Activa el modo demo reproduciendo respuestas grabadas. */
  connectDemo(requests: RecordedRequest[]): void {
    this.disconnect();
    this.replayData = [...requests];
    this._connected = true;
  }

  disconnect(): void {
    if (this.transport) {
      void this.transport.disconnect();
      this.transport = null;
    }
    this.replayData = null;
    this._connected = false;
    this.elmVersion = null;
    this.protocolName = null;
    this.supportedPids = null;
  }

  /** Comprueba comunicación con `ATI`; el primer intento puede perderse. */
  private async probeAdapter(): Promise<void> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < PROBE_TIMEOUTS_MS.length; attempt += 1) {
      if (attempt > 0) await delay(PROBE_DELAY_MS);
      try {
        const raw = await this.exchange("ATI", PROBE_TIMEOUTS_MS[attempt]);
        const version = firstTextLine(raw, "ATI");
        if (!version) throw new OBDError("InitFailed");
        this.elmVersion = version;
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new OBDError("InitFailed");
  }

  private async readProtocol(): Promise<string | null> {
    try {
      const raw = await this.exchange("ATDP", 4000);
      const text = firstTextLine(raw, "ATDP");
      if (!text) return null;
      return text.replace(/^AUTO,?\s*/i, "").trim() || null;
    } catch {
      return null;
    }
  }

  /** Comando de configuración best-effort: nunca hace fallar la conexión. */
  private async tryExchange(
    command: string,
    timeoutMs = 3000,
  ): Promise<string | null> {
    try {
      return await this.exchange(command, timeoutMs);
    } catch {
      return null;
    }
  }

  /**
   * Envía un comando terminado en `\r` y acumula la respuesta hasta el prompt
   * `>`, que marca el fin de la respuesta en el ELM327.
   *
   * Los comandos se serializan: un PID del dashboard no puede cruzarse con un
   * escaneo de códigos en el mismo buffer de lectura.
   */
  private exchange(
    command: string,
    timeoutMs = this.readTimeoutMs,
  ): Promise<string> {
    const run = async (): Promise<string> => {
      if (this.replayData) return "";
      if (!this.transport) throw new OBDError("NoConnection");

      await this.transport.clear();
      await this.transport.write(`${command}\r`);
      return this.transport.readUntil(">", timeoutMs);
    };

    const result = this.queue.then(run, run);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Igual que `exchange`, pero sin lanzar si el adaptador no responde. */
  private async requestQuietly(command: string): Promise<string> {
    try {
      return await this.exchange(command);
    } catch {
      return "";
    }
  }

  /**
   * Lee el bitmask de PIDs soportados (`0100`, `0120`, `0140`). Es best-effort:
   * si el adaptador no responde, el dashboard sigue sondeando todos los PIDs.
   */
  async loadSupportedPids(): Promise<Set<string>> {
    const supported = new Set<string>();

    for (const block of ["00", "20", "40"]) {
      const response = await this.query(Command.newPid(`01${block}`));
      if (response.payloadSize === 0) break;

      const bytes = response.getPayloadComponents();
      if (bytes.length === 0) break;

      const base = parseInt(block, 16);
      bytes.forEach((byte, byteIndex) => {
        const value = parseHex(byte);
        if (Number.isNaN(value)) return;
        for (let bit = 0; bit < 8; bit += 1) {
          if ((value & (1 << (7 - bit))) === 0) continue;
          const pid = base + byteIndex * 8 + bit + 1;
          if (pid > 0xff) continue;
          supported.add(`01${pid.toString(16).toUpperCase().padStart(2, "0")}`);
        }
      });

      // Sólo continuar si el bloque siguiente también está soportado.
      const next = (base + 0x20).toString(16).toUpperCase().padStart(2, "0");
      if (!supported.has(`01${next}`)) break;
    }

    if (supported.size > 0) this.supportedPids = supported;
    return supported;
  }

  private getRecordedResponse(command: Command): Response {
    if (!this.replayData) return Response.noData();

    const related = this.replayData.filter(
      (r) => r.request === command.asString(),
    );
    if (related.length === 0) return Response.noData();

    const entry = related[Math.floor(Math.random() * related.length)];
    const raw = entry.response;

    if (entry.request_type === "PIDCommand") {
      try {
        return Response.parsePidResponse(raw, entry.request);
      } catch {
        return Response.noData();
      }
    }

    const response = new Response();
    response.rawResponse = raw;
    response.formattedResponse = raw;
    return response;
  }

  /** Envía un comando y devuelve la respuesta parseada. */
  async query(command: Command): Promise<Response> {
    let request = command;

    // Redirige a freeze frame (servicio 02) si está activo.
    if (this.freezeFrameQuery && command.commandType === "PIDCommand") {
      const pid = command.getPid();
      if (pid.startsWith("01")) {
        request = Command.newPid(`02${pid.slice(2)}`);
      }
    }

    if (this.replayData) {
      return this.getRecordedResponse(request);
    }

    try {
      const raw = await this.exchange(request.asString());
      return Response.parsePidResponse(raw, request.asString());
    } catch (error) {
      if (error instanceof OBDError) {
        // Sin datos o respuesta ilegible: el sondeo simplemente reintenta.
        if (error.code === "NoData" || error.code === "InvalidResponse") {
          return Response.noData();
        }
        throw error;
      }
      // Timeout: también se trata como "sin datos" para no romper el sondeo.
      if (error instanceof Error && /espera|timeout/i.test(error.message)) {
        return Response.noData();
      }
      throw error;
    }
  }

  /** Lee los códigos de falla (modo 03) y los decodifica. */
  async getTroubleCodes(lookup?: DescriptionLookup): Promise<TroubleCode[]> {
    return this.readTroubleCodes("03", lookup);
  }

  /** Lee los códigos de falla permanentes (modo 0A). */
  async getPermanentTroubleCodes(
    lookup?: DescriptionLookup,
  ): Promise<TroubleCode[]> {
    return this.readTroubleCodes("0A", lookup);
  }

  /** Borra los códigos de falla (modo 04). Devuelve `true` si tuvo éxito. */
  async clearTroubleCodes(): Promise<boolean> {
    const raw = await this.requestQuietly("04");
    return /\b44\b|OK/i.test(raw.replace(/\s+/g, " ").trim());
  }

  private async readTroubleCodes(
    service: string,
    lookup?: DescriptionLookup,
  ): Promise<TroubleCode[]> {
    const raw = await this.requestQuietly(service);
    const payload = decodeIsoTpFrames(raw, service);
    return decodeTroubleCodes(payload.join(""), lookup);
  }

  setFreezeFrameQuery(state: boolean): void {
    this.freezeFrameQuery = state;
  }
}
