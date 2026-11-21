import { parseHex } from "./hex";
import {
  findServiceIndex,
  responseServiceFor,
  splitResponseLines,
} from "./response";

/**
 * Decodificación de códigos de falla (DTC), portada de
 * `backend/src/pid/diagnostics.rs` y `backend/src/obd.rs`.
 */

export type TroubleCodeCategory =
  | "Powertrain"
  | "Chassis"
  | "Body"
  | "Network"
  | "Unknown";

export const CATEGORY_LETTER: Record<TroubleCodeCategory, string> = {
  Powertrain: "P",
  Chassis: "C",
  Body: "B",
  Network: "U",
  Unknown: "?",
};

export const CATEGORY_LABEL: Record<TroubleCodeCategory, string> = {
  Powertrain: "Powertrain",
  Chassis: "Chassis",
  Body: "Body",
  Network: "Network",
  Unknown: "Unknown",
};

export interface TroubleCode {
  category: TroubleCodeCategory;
  /** Código DTC, p. ej. "P0133". */
  code: string;
  description: string;
  /** `true` si es un código permanente (modo 0A), `false` para modo 03. */
  permanent: boolean;
}

export type DescriptionLookup = (code: string) => string | undefined;

/** Elimina el patrón al final de la cadena de forma repetida (como `trim_end_matches`). */
function trimEndPattern(value: string, pattern: string): string {
  let result = value;
  while (result.endsWith(pattern)) {
    result = result.slice(0, result.length - pattern.length);
  }
  return result;
}

/**
 * Devuelve los bytes de payload de una respuesta de diagnóstico, sin cabecera
 * de ECU, sin eco y sin los bytes de control de ISO-TP.
 *
 * Cubre los formatos reales del ELM327:
 *  - `7E8 06 43 01 33 00 00 00` (CAN con cabecera y PCI).
 *  - `43 01 32 00 00 00 00` (respuesta ya ensamblada, p. ej. ISO 14230 con ATH0).
 *  - `7E8 21 00 00 00 ...` (tramas de continuación de ISO-TP).
 */
export function decodeIsoTpFrames(raw: string, sentCommand?: string): string[] {
  const expected = responseServiceFor(sentCommand);
  const payload: string[] = [];

  for (const line of splitResponseLines(raw, sentCommand)) {
    const tokens = line.tokens;
    const serviceIndex = findServiceIndex(tokens, expected);
    if (serviceIndex >= 0) {
      payload.push(...tokens.slice(serviceIndex));
      continue;
    }

    // Trama de continuación ISO-TP: byte PCI 0x2X seguido solo de datos.
    const pci = parseHex(tokens[0]);
    if (!Number.isNaN(pci) && pci >> 4 === 0x2) {
      payload.push(...tokens.slice(1));
    }
  }

  return payload;
}

/**
 * Decodifica una lista de códigos de falla a partir de una respuesta cruda
 * (o del payload ISO-TP unido). Equivalente a `OBD::decode_trouble_codes`.
 */
export function decodeTroubleCodes(
  response: string,
  lookup?: DescriptionLookup,
): TroubleCode[] {
  const binding = response
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/SEARCHING\.*/g, "");

  let sanitized: string;
  let permanent = false;

  if (binding.includes("43")) {
    sanitized = binding
      .split("43")
      .map((chunk) => (chunk.length >= 4 ? trimEndPattern(chunk, "00") : ""))
      .join("");
    permanent = false;
  } else if (binding.includes("4A")) {
    sanitized = binding
      .split("4A")
      .map((chunk) => (chunk.length >= 4 ? trimEndPattern(chunk, "00") : ""))
      .join("");
    permanent = true;
  } else {
    return [];
  }

  if (sanitized.includes("NODATA")) {
    return [];
  }

  const codes: TroubleCode[] = [];

  for (let i = 0; i + 4 <= sanitized.length; i += 4) {
    const chunk = sanitized.slice(i, i + 4);
    if (chunk.length !== 4) break;

    const a = chunk[0];
    const b = chunk[1];
    const c = chunk[2];
    const d = chunk[3];

    const left = parseHex(a + b);
    const right = parseHex(c + d);
    if (Number.isNaN(left) || Number.isNaN(right)) break;

    if ((left === 0 && right === 0) || chunk === "0000") break;

    const bit7 = (left & 0x80) >> 7;
    const bit6 = (left & 0x40) >> 6;
    const bit5 = (left & 0x20) >> 5;
    const bit4 = (left & 0x10) >> 4;
    const c2 = (bit5 << 1) | bit4;
    const newLeft = left & 0x0f;

    let category: TroubleCodeCategory;
    if (bit7 === 0 && bit6 === 0) category = "Powertrain";
    else if (bit7 === 0 && bit6 === 1) category = "Chassis";
    else if (bit7 === 1 && bit6 === 0) category = "Body";
    else category = "Network";

    const code =
      CATEGORY_LETTER[category] +
      c2.toString(16).toUpperCase() +
      newLeft.toString(16).toUpperCase() +
      right.toString(16).toUpperCase().padStart(2, "0");

    codes.push({
      category,
      code,
      description: lookup?.(code) ?? "No description available",
      permanent,
    });
  }

  return codes;
}
