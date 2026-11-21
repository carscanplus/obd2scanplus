/**
 * Parseo hexadecimal estricto. A diferencia de `parseInt`, no acepta prefijos
 * parciales: `parseInt("DATA", 16)` devolvería 218 (parsea "DA"), lo cual es
 * un bug. Esta función devuelve `NaN` si la cadena contiene caracteres no hex.
 */
export function parseHex(value: string): number {
  if (!/^[0-9a-fA-F]+$/.test(value)) return NaN;
  return parseInt(value, 16);
}
