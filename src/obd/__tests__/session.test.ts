import { describe, expect, it } from "vitest";

import requestsJson from "../../data/requests.json";

import { Command } from "../command";
import { computeScalar, findPidByCommand } from "../pids";
import { Response } from "../response";
import { ObdSession, RecordedRequest } from "../session";
import { OBDTransport } from "../transport";

const requests = requestsJson as RecordedRequest[];

class MockTransport implements OBDTransport {
  readonly name = "MOCK";
  private connected = false;
  private responses: string[];
  readonly writes: string[] = [];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  isConnected(): boolean {
    return this.connected;
  }
  async write(data: string): Promise<void> {
    this.writes.push(data);
  }
  async readUntil(): Promise<string> {
    return this.responses.shift() ?? "";
  }
  async clear(): Promise<void> {}
}

describe("ObdSession (demo mode)", () => {
  it("reproduce el PID 010C desde requests.json", async () => {
    // Se usa una única respuesta grabada: el modo demo elige al azar entre las
    // del mismo comando (hay muestras con el motor apagado, 41 0C 00 00).
    const entry = requests.find(
      (r) => r.request === "010C" && r.response.includes("41 0C 3B 2E"),
    );
    expect(entry).toBeDefined();

    const session = new ObdSession();
    session.connectDemo([entry!]);

    const response = await session.query(Command.newPid("010C"));
    expect(response.payloadSize).toBe(4);

    const scalar = computeScalar(findPidByCommand("010C")!, response);
    expect(scalar.unit).toBe("RPM");
    // 0x3B2E = 15150 / 4 = 3787,5 RPM
    expect(scalar.value).toBeCloseTo(3787.5, 1);
  });

  it("devuelve NO DATA para respuestas grabadas sin datos", async () => {
    const entry = requests.find((r) => r.response.includes("NO DATA"));
    expect(entry).toBeDefined();

    // Sólo las respuestas NO DATA de ese comando: otras pueden traer datos.
    const noData = requests.filter(
      (r) => r.request === entry!.request && r.response.includes("NO DATA"),
    );
    const session = new ObdSession();
    session.connectDemo(noData);

    const response = await session.query(Command.newPid(entry!.request));
    expect(response.payloadSize).toBe(0);
  });

  it("no lanza errores al leer códigos en demo (sin datos modo 03)", async () => {
    const session = new ObdSession();
    session.connectDemo(requests);
    const codes = await session.getTroubleCodes();
    expect(codes).toEqual([]);
  });
});

describe("ObdSession (transporte real simulado)", () => {
  it("detecta la versión con ATI y el protocolo con ATDP", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "ATDP\r\rAUTO, ISO 14230-4 (KWP FAST)\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 0);

    expect(session.connected).toBe(true);
    expect(session.elmVersionName).toBe("ELM327 v2.2");
    expect(session.protocol).toBe("ISO 14230-4 (KWP FAST)");
    // No se resetea ni se reconfigura el adaptador.
    expect(transport.writes).toEqual(["ATI\r", "ATDP\r"]);
  });

  it("parsea un PID descartando el eco del V011", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "ATDP\r\rAUTO\r\r",
      "010C\r\r41 0C 1A F8\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 0);

    const response = await session.query(Command.newPid("010C"));
    expect(response.aValue()).toBe(0x1a);
    expect(response.bValue()).toBe(0xf8);
    expect(transport.writes).toContain("010C\r");
  });

  it("lee los DTC sin PCI ni cabecera (modo 03)", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "ATDP\r\rAUTO\r\r",
      "03\r\r43 01 32 00 00 00 00\r\r",
      "0A\r\rNO DATA\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 0);

    const codes = await session.getTroubleCodes();
    expect(codes.map((c) => c.code)).toEqual(["P0132"]);

    const permanent = await session.getPermanentTroubleCodes();
    expect(permanent).toEqual([]);
  });

  it("interpreta el bitmask de PIDs soportados (0100)", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "ATDP\r\rAUTO\r\r",
      "41 00 80 00 00 00\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 0);

    const supported = await session.loadSupportedPids();
    expect(supported.has("0101")).toBe(true);
    expect(supported.has("0102")).toBe(false);
    expect(session.supportedPidCommands?.has("0101")).toBe(true);
  });

  it("interpreta el bitmask real del V011 (41 00 BE 3E B0 11)", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "ATDP\r\rAUTO\r\r",
      "41 00 BE 3E B0 11\r\r",
      "41 20 80 00 00 00\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 0);

    const supported = await session.loadSupportedPids();
    expect(supported.has("0101")).toBe(true);
    expect(supported.has("0102")).toBe(false);
    expect(supported.has("010C")).toBe(true);
    expect(supported.has("010D")).toBe(true);
    expect(supported.has("0120")).toBe(true);
    expect(supported.has("0121")).toBe(true);
  });

  it("envía ATSP sólo si se pide un protocolo explícito", async () => {
    const transport = new MockTransport([
      "ATI\r\rELM327 v2.2\r\r",
      "OK\r\r",
      "ATDP\r\rAUTO, ISO 14230-4 (KWP FAST)\r\r",
    ]);
    const session = new ObdSession();
    await session.connect(transport, 6);
    expect(transport.writes).toEqual(["ATI\r", "ATSP6\r", "ATDP\r"]);
  });

  it("lanza si el adaptador no responde a ATI", async () => {
    const transport = new MockTransport([]);
    const session = new ObdSession();
    await expect(session.connect(transport, 0)).rejects.toThrow();
    expect(session.connected).toBe(false);
  });
});

describe("Response estática", () => {
  it("crea una respuesta NO DATA", () => {
    const r = Response.noData();
    expect(r.formattedResponse).toBe("NO DATA");
    expect(r.payloadSize).toBe(0);
  });
});
