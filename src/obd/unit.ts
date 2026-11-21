/**
 * Tipos de unidad y conversiones, portados de `backend/src/scalar.rs` de OBDium.
 *
 * Nota: se corrigieron dos errores del original:
 *  - Fahrenheit -> Celsius usaba `* 1.8` en vez de `/ 1.8`.
 *  - Kilometros -> Pies usaba `83281` en vez de `3280.839895`.
 */

export type Unit =
  | "Percent"
  | "Ratio"
  | "Celsius"
  | "Fahrenheit"
  | "Degrees"
  | "KiloPascal"
  | "Pascal"
  | "RPM"
  | "KilometersPerHour"
  | "MilesPerHour"
  | "GramsPerSecond"
  | "Volts"
  | "Seconds"
  | "Hours"
  | "Minutes"
  | "Kilometers"
  | "Meters"
  | "Miles"
  | "Feet"
  | "Milliampere"
  | "LitresPerHour"
  | "GallonsPerHour"
  | "NewtonMeters"
  | "FootPounds"
  | "KilogramsPerSecond"
  | "PartsPerMillion"
  | "MiligramsPerStroke"
  | "PSI"
  | "Unknown"
  | "NoData";

export const UNIT_LABELS: Record<Unit, string> = {
  Percent: "%",
  Ratio: "",
  Celsius: "°C",
  Fahrenheit: "°F",
  Degrees: "°",
  KiloPascal: "kPa",
  Pascal: "Pa",
  RPM: "RPM",
  KilometersPerHour: "km/h",
  MilesPerHour: "mph",
  GramsPerSecond: "g/s",
  Volts: "V",
  Seconds: "s",
  Hours: "h",
  Minutes: "mins",
  Kilometers: "km",
  Meters: "m",
  Miles: "mi",
  Feet: "ft",
  Milliampere: "mA",
  LitresPerHour: "L/h",
  GallonsPerHour: "gal/h",
  NewtonMeters: "Nm",
  FootPounds: "ft-lb",
  KilogramsPerSecond: "Kg/s",
  PartsPerMillion: "ppm",
  MiligramsPerStroke: "mg/stroke",
  PSI: "PSI",
  Unknown: "",
  NoData: "NO DATA",
};

const UNIT_BY_LABEL: Record<string, Unit> = {
  "%": "Percent",
  ratio: "Ratio",
  "°C": "Celsius",
  "°F": "Fahrenheit",
  "°": "Degrees",
  kPa: "KiloPascal",
  Pa: "Pascal",
  RPM: "RPM",
  "km/h": "KilometersPerHour",
  mph: "MilesPerHour",
  "g/s": "GramsPerSecond",
  V: "Volts",
  s: "Seconds",
  h: "Hours",
  mins: "Minutes",
  km: "Kilometers",
  m: "Meters",
  mi: "Miles",
  ft: "Feet",
  mA: "Milliampere",
  "L/h": "LitresPerHour",
  "gal/h": "GallonsPerHour",
  Nm: "NewtonMeters",
  "ft-lb": "FootPounds",
  "Kg/s": "KilogramsPerSecond",
  ppm: "PartsPerMillion",
  "mg/stroke": "MiligramsPerStroke",
  PSI: "PSI",
};

export function parseUnit(label: string): Unit {
  return UNIT_BY_LABEL[label] ?? "Unknown";
}

/** Convierte un valor entre unidades compatibles. Devuelve `null` si no hay conversión. */
export function convertUnit(
  value: number,
  from: Unit,
  to: Unit,
): number | null {
  if (from === to) return value;

  switch (`${from}->${to}`) {
    case "Kilometers->Meters":
      return value * 1000;
    case "Meters->Kilometers":
      return value / 1000;
    case "KilometersPerHour->MilesPerHour":
    case "Kilometers->Miles":
      return value / 1.609;
    case "MilesPerHour->KilometersPerHour":
    case "Miles->Kilometers":
      return value * 1.609;
    case "Kilometers->Feet":
      return value * 3280.839895;
    case "Feet->Kilometers":
      return value / 3280.839895;
    case "Celsius->Fahrenheit":
      return value * 1.8 + 32;
    case "Fahrenheit->Celsius":
      return (value - 32) / 1.8;
    case "Seconds->Minutes":
      return value / 60;
    case "Seconds->Hours":
      return value / 3600;
    case "Minutes->Seconds":
      return value * 60;
    case "Minutes->Hours":
      return value / 60;
    case "Hours->Seconds":
      return value * 3600;
    case "Hours->Minutes":
      return value * 60;
    case "LitresPerHour->GallonsPerHour":
      return value * 0.264172;
    case "GallonsPerHour->LitresPerHour":
      return value / 0.264172;
    case "NewtonMeters->FootPounds":
      return value * 0.73756;
    case "FootPounds->NewtonMeters":
      return value / 0.73756;
    case "KiloPascal->PSI":
      return value / 6.895;
    case "PSI->KiloPascal":
      return value * 6.895;
    case "KiloPascal->Pascal":
      return value * 1000;
    case "Pascal->KiloPascal":
      return value / 1000;
    default:
      return null;
  }
}
