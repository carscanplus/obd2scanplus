import { OBDError } from "./errors";
import { parseHex } from "./hex";
import { Scalar } from "./scalar";

/**
 * Respuestas de error que el ELM327 devuelve en lugar de datos. Se comprueban
 * antes de intentar interpretar bytes hexadecimales.
 */
const ERROR_RESPONSE =
  /NO\s*DATA|NODATA|UNABLE\s*TO\s*CONNECT|CAN\s*ERROR|BUFFER\s*FULL|BUS\s*ERROR|FB\s*ERROR|ERR\s*\d{2}|\bERROR\b|^\?$/i;

/** Bytes de servicio que puede devolver el adaptador como respuesta. */
const PLAUSIBLE_SERVICES = new Set([
  0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4c, 0x4e,
  0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6e,
]);

/**
 * Divide la respuesta cruda del adaptador en líneas de tokens.
 *
 * - Normaliza `\r\n`, `\r` y `\n` como separadores de línea.
 * - Elimina ruido del ELM327 (`SEARCHING...`, `BUS INIT: OK`).
 * - Descarta el eco del comando enviado (el adaptador lo repite tal cual,
 *   por ejemplo `0105` antes de `41 05 40`).
 */
export function tokenizeResponse(raw: string, sentCommand?: string): string[][] {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/SEARCHING\.*/gi, "")
    .replace(/BUS\s*INIT:?\s*OK/gi, "");

  const lines: string[][] = [];
  for (const line of text.split("\n")) {
    const tokens = line
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token.toUpperCase());
    if (tokens.length > 0) lines.push(tokens);
  }

  if (!sentCommand) return lines;

  const command = sentCommand.replace(/\s+/g, "").toUpperCase();
  if (command && lines.length > 0 && lines[0].join("") === command) {
    lines.shift();
  }
  return lines;
}

/**
 * Cabecera de ECU: 3 caracteres (CAN 11 bits, p. ej. `7E8`) u 8 caracteres
 * (CAN 29 bits). Los bytes de datos siempre ocupan 2 caracteres.
 */
export function isEcuHeader(
  token: string | undefined,
  hasFollowing: boolean,
): boolean {
  if (!token || !/^[0-9A-F]+$/.test(token)) return false;
  if (token.length === 3) return true;
  return hasFollowing && token.length === 8;
}

/** Byte de servicio esperado para un comando (`010C` → `0x41`, `03` → `0x43`). */
export function responseServiceFor(sentCommand?: string): number | null {
  if (!sentCommand) return null;
  const hex = sentCommand.replace(/\s+/g, "");
  if (hex.length < 2) return null;
  const service = parseHex(hex.slice(0, 2));
  if (Number.isNaN(service) || service === 0 || service >= 0x40) return null;
  return service + 0x40;
}

/**
 * Índice del byte de servicio dentro de una línea. Si se conoce el servicio
 * esperado se ancla en él para ignorar cabeceras de ECU de KWP/ISO 9141 (que
 * también usan valores 0x4x) y el byte PCI de ISO-TP.
 */
export function findServiceIndex(
  tokens: string[],
  expected: number | null = null,
): number {
  if (expected !== null) {
    return tokens.findIndex(
      (token) => token.length === 2 && parseHex(token) === expected,
    );
  }
  return tokens.findIndex((token) => {
    if (token.length !== 2) return false;
    const value = parseHex(token);
    return !Number.isNaN(value) && PLAUSIBLE_SERVICES.has(value);
  });
}

export interface ResponseLine {
  /** ECU que respondió, si el adaptador incluye cabeceras. */
  ecu?: string;
  /** Bytes de la línea sin la cabecera de ECU. */
  tokens: string[];
}

/**
 * Agrupa la respuesta en líneas, separando la cabecera de ECU de los datos.
 * Funciona con respuestas con cabecera (`7E8 04 41 0C 3B 2E`) y sin ella
 * (`41 0C 3B 2E`, el caso del V011 con ATH0).
 */
export function splitResponseLines(
  raw: string,
  sentCommand?: string,
): ResponseLine[] {
  const lines: ResponseLine[] = [];
  for (const tokens of tokenizeResponse(raw, sentCommand)) {
    let rest = tokens;
    let ecu: string | undefined;
    if (isEcuHeader(rest[0], rest.length > 1)) {
      ecu = rest[0];
      rest = rest.slice(1);
    }
    if (rest.length === 0) continue;
    lines.push({ ecu, tokens: rest });
  }
  return lines;
}

/**
 * Parseo de respuestas ELM327, portado de `backend/src/response.rs` y
 * `backend/src/obd.rs` (`parse_pid_response`, `format_response`, etc.).
 */
export class Response {
  formattedResponse?: string;
  rawResponse?: string;
  payload?: string;
  service = "";
  respondingEcus: string[] = [];
  payloadSize = 0;

  static noData(): Response {
    const r = new Response();
    r.formattedResponse = "NO DATA";
    r.rawResponse = "NO DATA";
    return r;
  }

  /** Convierte "410C3B2E" en "41 0C 3B 2E". */
  static formatResponse(response: string): string {
    const chunks: string[] = [];
    for (let i = 0; i < response.length; i += 2) {
      chunks.push(response.slice(i, i + 2));
    }
    return chunks.join(" ").trim();
  }

  static extractEcuNames(response: string): string[] {
    const names: string[] = [];
    for (const line of response.split("\n")) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length < 3) continue;
      const name = parts[0];
      // Los IDs de ECU son cadenas hexadecimales de 3 caracteres.
      if (name.length !== 3) continue;
      names.push(name);
    }
    return names;
  }

  static extractPayloadSize(response: string): number {
    const parts = response.split(/\s+/).filter(Boolean);
    const second = parts[1];
    if (!second) return 0;
    const parsed = parseHex(second);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  static stripEcuNames(response: string, names: string[]): string {
    let result = response;
    for (const name of names) {
      result = result.split(name).join("");
    }
    return result;
  }

  /**
   * Parsea una respuesta PID cruda del ELM327.
   *
   * Soporta los dos formatos reales:
   *  - Con cabecera CAN y PCI: `7E8 04 41 0C 3B 2E`.
   *  - Sin cabecera (ELM327 con ATH0, caso del V011 en ISO 14230): `41 0C 3B 2E`.
   *
   * Si se conoce el comando enviado se usa para descartar el eco y para anclar
   * el byte de servicio esperado.
   *
   * Lanza `OBDError` con código `NoData` o `InvalidResponse` en caso de error.
   */
  static parsePidResponse(rawResponse: string, sentCommand?: string): Response {
    const expected = responseServiceFor(sentCommand);
    const lines = splitResponseLines(rawResponse, sentCommand);
    const joined = lines.flatMap((line) => line.tokens).join(" ");

    if (lines.length === 0 || ERROR_RESPONSE.test(joined)) {
      throw new OBDError("NoData");
    }

    const ecuNames: string[] = [];
    let payloadTokens: string[] | null = null;

    for (const line of lines) {
      if (line.ecu) ecuNames.push(line.ecu);
      const index = findServiceIndex(line.tokens, expected);
      if (index < 0) continue;
      payloadTokens = line.tokens.slice(index);
      break;
    }

    if (!payloadTokens || payloadTokens.length === 0) {
      throw new OBDError("InvalidResponse");
    }

    const formatted = payloadTokens.join(" ");
    const meta = new Response();
    meta.respondingEcus = ecuNames;
    meta.formattedResponse = formatted;
    meta.rawResponse = rawResponse;
    meta.payloadSize = payloadTokens.length;
    meta.service = payloadTokens[0];
    meta.payload = formatted;

    return meta;
  }

  getPayload(): string | undefined {
    if (!this.payload && this.formattedResponse) {
      return this.payloadFromResponse();
    }
    return this.payload;
  }

  getPayloadComponents(): string[] {
    const payload = this.getPayload();
    if (!payload) return [];

    let clean: string;
    if (payload.startsWith("62")) {
      // Modo 22: "62 F4 0D 2B" -> datos desde el carácter 9.
      if (payload.length < 9) return [];
      clean = payload.slice(9);
    } else if (payload.startsWith("41")) {
      // Servicio 01: "41 0C 1A F8" -> datos desde el carácter 6.
      if (payload.length < 6) return [];
      clean = payload.slice(6);
    } else {
      return [];
    }

    return clean.split(" ").filter(Boolean);
  }

  aValue(): number {
    return this.component(0);
  }
  bValue(): number {
    return this.component(1);
  }
  cValue(): number {
    return this.component(2);
  }
  dValue(): number {
    return this.component(3);
  }
  eValue(): number {
    return this.component(4);
  }

  private component(index: number): number {
    const components = this.getPayloadComponents();
    const byte = components[index];
    if (byte === undefined) return 0;
    const parsed = parseHex(byte);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  payloadFromResponse(): string {
    if (this.payload) return this.payload;
    if (!this.formattedResponse) return "";

    const lines = splitResponseLines(this.formattedResponse);
    if (lines.length === 0) return "";

    const index = findServiceIndex(lines[0].tokens);
    if (index < 0) return "";
    return lines[0].tokens.slice(index).join(" ");
  }

  /** Equivalente a `map_no_data`: devuelve `Scalar::no_data()` si no hay payload. */
  mapNoData(op: (r: Response) => Scalar): Scalar {
    if (this.payloadSize === 0) return Scalar.noData();
    return op(this);
  }
}
