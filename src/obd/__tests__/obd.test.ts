import { describe, expect, it } from "vitest";

import requestsJson from "../../data/requests.json";

import { decodeIsoTpFrames, decodeTroubleCodes } from "../dtc";
import { OBDError } from "../errors";
import { evaluateFormula } from "../formula";
import { computeScalar, findPidByCommand, STANDARD_PIDS } from "../pids";
import { Response } from "../response";
import { DEFAULT_UNIT_PREFERENCES, Scalar } from "../scalar";
import { convertUnit } from "../unit";

interface RecordedRequest {
  request: string;
  request_type: string;
  response: string;
}

const requests: RecordedRequest[] = requestsJson as RecordedRequest[];

describe("Response.parsePidResponse", () => {
  it("parsea la respuesta de RPM (010C)", () => {
    const r = Response.parsePidResponse("7E8 04 41 0C 3B 2E \n\n");
    expect(r.payloadSize).toBe(4);
    expect(r.service).toBe("41");
    expect(r.respondingEcus).toEqual(["7E8"]);
    expect(r.aValue()).toBe(0x3b);
    expect(r.bValue()).toBe(0x2e);
  });

  it("parsea la respuesta de velocidad (010D)", () => {
    const r = Response.parsePidResponse("7E8 03 41 0D 29 \n\n");
    expect(r.aValue()).toBe(0x29);
    expect(r.payloadSize).toBe(3);
  });

  it('lanza NoData ante "NO DATA"', () => {
    expect(() => Response.parsePidResponse("NO DATA")).toThrowError(OBDError);
  });

  it('lanza NoData ante "?"', () => {
    expect(() => Response.parsePidResponse("?")).toThrowError(OBDError);
  });
});

describe("respuestas sin cabecera (ELM327 ATH0 / ISO 14230 del V011)", () => {
  it("parsea 41 05 40 sin cabecera ni byte de tamaño", () => {
    const r = Response.parsePidResponse("41 05 40", "0105");
    expect(r.service).toBe("41");
    expect(r.payloadSize).toBe(3);
    expect(r.aValue()).toBe(0x40);
    expect(r.respondingEcus).toEqual([]);

    const scalar = computeScalar(findPidByCommand("0105")!, r);
    expect(scalar.value).toBe(24);
  });

  it("descarta el eco del comando enviado", () => {
    const r = Response.parsePidResponse("0105\r\r41 05 40\r\r>", "0105");
    expect(r.aValue()).toBe(0x40);
  });

  it("tolera ruido SEARCHING... y BUS INIT de KWP", () => {
    const r = Response.parsePidResponse(
      "SEARCHING...\rBUS INIT: OK\r41 0C 1A F8\r\r>",
      "010C",
    );
    expect(r.aValue()).toBe(0x1a);
    expect(r.bValue()).toBe(0xf8);
  });

  it("RPM con el motor apagado devuelve 0", () => {
    const r = Response.parsePidResponse("41 0C 00 00", "010C");
    const scalar = computeScalar(findPidByCommand("010C")!, r);
    expect(scalar.value).toBe(0);
  });

  it("ignora la cabecera de KWP al anclar el servicio esperado", () => {
    // 48 6B 13 = cabecera de 3 bytes de ISO 9141/KWP; 48 también es un 0x4x.
    const r = Response.parsePidResponse("48 6B 13 41 0D 3C", "010D");
    expect(r.service).toBe("41");
    expect(r.aValue()).toBe(0x3c);
  });
});

describe("evaluateFormula", () => {
  const vars = { A: 59, B: 46, C: 0, D: 0, E: 0 };

  it("evalúa RPM: ((256*A)+B)/4", () => {
    expect(evaluateFormula("((256 * A) + B) / 4", vars)).toBeCloseTo(3787.5);
  });

  it("evalúa temperatura: A - 40", () => {
    expect(evaluateFormula("A - 40", { ...vars, A: 90 })).toBe(50);
  });

  it("evalúa fuel trim: A / 1.28 - 100", () => {
    expect(evaluateFormula("A / 1.28 - 100", { ...vars, A: 128 })).toBeCloseTo(
      0,
    );
  });

  it("soporta multiplicación implícita: 2/65536(256A+B)", () => {
    expect(
      evaluateFormula("2/65536(256A+B)", { ...vars, A: 1, B: 0 }),
    ).toBeCloseTo(256 / 65536);
  });

  it("soporta multiplicación implícita con paréntesis: 10(256A+B)", () => {
    expect(evaluateFormula("10(256A+B)", { ...vars, A: 1, B: 0 })).toBeCloseTo(
      2560,
    );
  });

  it("evalúa odómetro: ((A*16777216)+(B*65536)+(C*256)+D)/10", () => {
    const v = evaluateFormula(
      "((A * 16777216) + (B * 65536) + (C * 256) + D) / 10",
      {
        A: 0,
        B: 1,
        C: 0,
        D: 0,
        E: 0,
      },
    );
    expect(v).toBeCloseTo(6553.6);
  });
});

describe("computeScalar", () => {
  it("calcula velocidad del vehículo a partir del fixture real", () => {
    const def = findPidByCommand("010C");
    expect(def).toBeDefined();

    // Muestra concreta con motor en marcha (41 0C 3B 2E).
    const entry = requests.find(
      (r) => r.request === "010C" && r.response.includes("41 0C 3B 2E"),
    );
    expect(entry).toBeDefined();

    const parsed = Response.parsePidResponse(entry!.response, "010C");
    const scalar = computeScalar(def!, parsed);
    expect(scalar.unit).toBe("RPM");
    expect(scalar.value).toBeCloseTo(3787.5, 1);
  });

  it("devuelve NO DATA para una respuesta vacía", () => {
    const def = findPidByCommand("010C")!;
    const scalar = computeScalar(def, Response.noData());
    expect(scalar.isNoData).toBe(true);
  });
});

describe("decodeTroubleCodes", () => {
  it("decodifica un código P0133 de una respuesta modo 03", () => {
    const codes = decodeTroubleCodes("4301330000");
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatchObject({
      code: "P0133",
      category: "Powertrain",
      permanent: false,
    });
  });

  it("decodifica múltiples códigos y categorías", () => {
    // "0133" -> P0133 (Powertrain), "4123" -> C0123 (Chassis)
    const codes = decodeTroubleCodes("4301334123");
    expect(codes.map((c) => c.code)).toEqual(["P0133", "C0123"]);
    expect(codes[1].category).toBe("Chassis");
  });

  it("marca como permanente los códigos del modo 0A (4A)", () => {
    const codes = decodeTroubleCodes("4A0133");
    expect(codes[0].permanent).toBe(true);
  });

  it("usa el lookup de descripciones", () => {
    const codes = decodeTroubleCodes("430133", (code) => `desc-${code}`);
    expect(codes[0].description).toBe("desc-P0133");
  });
});

describe("decodeIsoTpFrames", () => {
  it("reensambla una respuesta de una sola trama", () => {
    const payload = decodeIsoTpFrames("7E8 06 43 01 33 00 00 00\r");
    expect(payload).toEqual(["43", "01", "33", "00", "00", "00"]);
  });

  it("acepta la respuesta ya ensamblada sin PCI (ISO 14230)", () => {
    const payload = decodeIsoTpFrames("43 01 32 00 00 00 00\r>", "03");
    expect(payload).toEqual(["43", "01", "32", "00", "00", "00", "00"]);
  });

  it("ignora el eco del comando en modo 03", () => {
    const payload = decodeIsoTpFrames(
      "03\r\r43 01 32 00 00 00 00\r\r>",
      "03",
    );
    expect(decodeTroubleCodes(payload.join("")).map((c) => c.code)).toEqual([
      "P0132",
    ]);
  });

  it("reensambla tramas de continuación de ISO-TP", () => {
    const payload = decodeIsoTpFrames(
      "7E8 10 0A 43 01 33 41 23 00 00\r7E8 21 00 00 00 00 00 00\r",
      "03",
    );
    const codes = decodeTroubleCodes(payload.join(""));
    expect(codes.map((c) => c.code)).toEqual(["P0133", "C0123"]);
  });

  it("no inventa códigos cuando no hay fallos", () => {
    const payload = decodeIsoTpFrames("43 00 00 00 00 00 00", "03");
    expect(decodeTroubleCodes(payload.join(""))).toEqual([]);
  });
});

describe("unidades", () => {
  it("convierte Celsius a Fahrenheit", () => {
    expect(convertUnit(100, "Celsius", "Fahrenheit")).toBeCloseTo(212);
  });

  it("convierte velocidad km/h a mph", () => {
    const scalar = Scalar.create(100, "KilometersPerHour", {
      ...DEFAULT_UNIT_PREFERENCES,
      speed: "MilesPerHour",
    });
    expect(scalar.unit).toBe("MilesPerHour");
    expect(scalar.value).toBeCloseTo(100 / 1.609);
  });
});

describe("fixture requests.json (integración)", () => {
  it("parsea y calcula todos los PIDs registrados sin lanzar errores", () => {
    let parsedCount = 0;
    for (const entry of requests) {
      if (entry.response.includes("NO DATA")) continue;
      const def = findPidByCommand(entry.request);
      if (!def) continue;

      const parsed = Response.parsePidResponse(entry.response);
      const scalar = computeScalar(def, parsed);
      expect(scalar.value).toBeTypeOf("number");
      parsedCount += 1;
    }
    expect(parsedCount).toBeGreaterThan(0);
    expect(STANDARD_PIDS.length).toBeGreaterThan(50);
  });
});
