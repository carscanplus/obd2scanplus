import { DTC_DESCRIPTIONS } from "../data/dtc-descriptions";

/** Busca la descripción de un código DTC (p. ej. "P0133"). */
export function lookupDtcDescription(code: string): string | undefined {
  return DTC_DESCRIPTIONS[code];
}
