import { describe, expect, it } from "vitest";

import { base64ToUtf8, utf8ToBase64 } from "../base64";
import { ReadBuffer } from "../readBuffer";

describe("base64", () => {
  it("codifica y decodifica texto ASCII de forma reversible", () => {
    const text = "010C\r";
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it("decodifica una cadena base64 conocida", () => {
    // "OK" en base64 es "T0s="
    expect(base64ToUtf8("T0s=")).toBe("OK");
  });
});

describe("ReadBuffer", () => {
  it("resuelve readUntil cuando llega el delimitador", async () => {
    const buffer = new ReadBuffer();
    const pending = buffer.readUntil(">");
    buffer.append("41 0C 3B 2E\r>");
    await expect(pending).resolves.toBe("41 0C 3B 2E\r");
  });

  it("acumula datos repartidos en varios chunks", async () => {
    const buffer = new ReadBuffer();
    const pending = buffer.readUntil(">");
    buffer.append("41 0C");
    buffer.append(" 3B 2E\r>");
    await expect(pending).resolves.toBe("41 0C 3B 2E\r");
  });

  it("rechaza la promesa al agotar el tiempo de espera", async () => {
    const buffer = new ReadBuffer();
    await expect(buffer.readUntil(">", 20)).rejects.toThrow();
  });
});
