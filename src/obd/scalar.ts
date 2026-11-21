import { convertUnit, Unit, UNIT_LABELS } from "./unit";

/**
 * Preferencias de unidad (métrico/imperial), portadas de `backend/src/scalar.rs`.
 */
export interface UnitPreferences {
  speed: Unit;
  distance: Unit;
  temperature: Unit;
  torque: Unit;
  pressure: Unit;
  flowRate: Unit;
}

export const DEFAULT_UNIT_PREFERENCES: UnitPreferences = {
  speed: "KilometersPerHour",
  distance: "Kilometers",
  temperature: "Celsius",
  torque: "NewtonMeters",
  pressure: "KiloPascal",
  flowRate: "LitresPerHour",
};

type PreferenceKey = keyof UnitPreferences;

function preferenceKeyFor(unit: Unit): PreferenceKey | null {
  switch (unit) {
    case "KilometersPerHour":
    case "MilesPerHour":
      return "speed";
    case "Kilometers":
    case "Miles":
    case "Meters":
    case "Feet":
      return "distance";
    case "Celsius":
    case "Fahrenheit":
    case "Degrees":
      return "temperature";
    case "NewtonMeters":
    case "FootPounds":
      return "torque";
    case "KiloPascal":
    case "Pascal":
    case "PSI":
      return "pressure";
    case "LitresPerHour":
    case "GallonsPerHour":
      return "flowRate";
    default:
      return null;
  }
}

export class Scalar {
  constructor(
    public value: number,
    public unit: Unit,
  ) {}

  static noData(): Scalar {
    return new Scalar(0, "NoData");
  }

  /** Equivalente a `Scalar::new` de Rust: aplica conversión según preferencias. */
  static create(value: number, unit: Unit, prefs?: UnitPreferences): Scalar {
    if (prefs) {
      const key = preferenceKeyFor(unit);
      if (key) {
        const target = prefs[key];
        if (target !== unit) {
          const converted = convertUnit(value, unit, target);
          if (converted !== null) {
            return new Scalar(converted, target);
          }
        }
      }
    }
    return new Scalar(value, unit);
  }

  get label(): string {
    return UNIT_LABELS[this.unit];
  }

  get isNoData(): boolean {
    return this.unit === "NoData";
  }

  toString(): string {
    if (this.unit === "NoData") return "NO DATA";
    return `${this.value}${this.label}`;
  }
}
