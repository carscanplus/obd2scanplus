import { evaluateFormula } from "./formula";
import { Response } from "./response";
import { DEFAULT_UNIT_PREFERENCES, Scalar, UnitPreferences } from "./scalar";
import { Unit } from "./unit";

/**
 * Definición de un PID consultable. Las fórmulas usan las variables A..E
 * (bytes de la respuesta). Portado de `backend/src/pid/*.rs` y `backend/src/dicts.rs`.
 */
export interface PidDefinition {
  /** Comando hexadecimal de 4 caracteres, p. ej. "010C". */
  command: string;
  /** Nombre mostrado en el dashboard. */
  name: string;
  /** Unidad base (antes de aplicar preferencias métrico/imperial). */
  unit: Unit;
  /** Fórmula de conversión de los bytes de la respuesta a un valor numérico. */
  formula: string;
}

function buildO2SensorPids(): PidDefinition[] {
  const result: PidDefinition[] = [];
  for (let i = 1; i <= 8; i += 1) {
    // 0x13 + i -> 0114..011B (voltaje + STFT)
    // 0x23 + i -> 0124..012B (AFR + voltaje)
    const voltagePid = (0x13 + i).toString(16).toUpperCase();
    const afrPid = (0x23 + i).toString(16).toUpperCase();

    result.push(
      {
        command: `01${voltagePid}`,
        name: `O2 Sensor (${i}) Voltage (1)`,
        unit: "Volts",
        formula: "A / 200",
      },
      {
        command: `01${voltagePid}`,
        name: `O2 Sensor (${i}) STFT`,
        unit: "Percent",
        formula: "B / 1.28 - 100",
      },
      {
        command: `01${afrPid}`,
        name: `O2 Sensor (${i}) AFR`,
        unit: "Ratio",
        formula: "2 / 65536 * ((256 * A) + B)",
      },
      {
        command: `01${afrPid}`,
        name: `O2 Sensor (${i}) Voltage (2)`,
        unit: "Volts",
        formula: "8 / 65536 * ((256 * C) + D)",
      },
    );
  }
  return result;
}

const BASE_PIDS: PidDefinition[] = [
  {
    command: "0104",
    name: "Engine Load",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "0105",
    name: "Coolant Temp.",
    unit: "Celsius",
    formula: "A - 40",
  },
  {
    command: "0106",
    name: "Short Term Fuel Trim (Bank 1)",
    unit: "Percent",
    formula: "A / 1.28 - 100",
  },
  {
    command: "0107",
    name: "Long Term Fuel Trim (Bank 1)",
    unit: "Percent",
    formula: "A / 1.28 - 100",
  },
  {
    command: "0108",
    name: "Short Term Fuel Trim (Bank 2)",
    unit: "Percent",
    formula: "A / 1.28 - 100",
  },
  {
    command: "0109",
    name: "Long Term Fuel Trim (Bank 2)",
    unit: "Percent",
    formula: "A / 1.28 - 100",
  },
  {
    command: "010A",
    name: "Fuel Pressure",
    unit: "KiloPascal",
    formula: "3 * A",
  },
  {
    command: "010B",
    name: "Intake Manifold Abs. Pressure",
    unit: "KiloPascal",
    formula: "A",
  },
  {
    command: "010C",
    name: "Engine Speed",
    unit: "RPM",
    formula: "((256 * A) + B) / 4",
  },
  {
    command: "010D",
    name: "Vehicle Speed",
    unit: "KilometersPerHour",
    formula: "A",
  },
  {
    command: "010E",
    name: "Timing Advance",
    unit: "Degrees",
    formula: "A / 2 - 64",
  },
  {
    command: "010F",
    name: "Intake Air Temp.",
    unit: "Celsius",
    formula: "A - 40",
  },
  {
    command: "0110",
    name: "MAF Airflow Rate",
    unit: "GramsPerSecond",
    formula: "((256 * A) + B) / 100",
  },
  {
    command: "0111",
    name: "Throttle Pos.",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "011F",
    name: "Engine Runtime (Session)",
    unit: "Seconds",
    formula: "(256 * A) + B",
  },
  {
    command: "0121",
    name: "Dist. With Check Engine Light",
    unit: "Kilometers",
    formula: "(256 * A) + B",
  },
  {
    command: "0122",
    name: "Fuel Rail Pressure",
    unit: "KiloPascal",
    formula: "0.079 * ((256 * A) + B)",
  },
  {
    command: "0123",
    name: "Fuel Rail Gauge Pressure",
    unit: "KiloPascal",
    formula: "10 * ((256 * A) + B)",
  },
  {
    command: "012C",
    name: "Commanded EGR",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "012D",
    name: "EGR Error",
    unit: "Percent",
    formula: "(A - 128) * 100 / 128",
  },
  {
    command: "012F",
    name: "Fuel Level Input",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "0130",
    name: "Warm-Ups Since Codes Cleared",
    unit: "Unknown",
    formula: "A",
  },
  {
    command: "0131",
    name: "Dist. Since Codes Cleared",
    unit: "Kilometers",
    formula: "(256 * A) + B",
  },
  {
    command: "0133",
    name: "Absolute Barometric Pressure",
    unit: "KiloPascal",
    formula: "A",
  },
  {
    command: "0142",
    name: "Control Module Voltage",
    unit: "Volts",
    formula: "((256 * A) + B) / 1000",
  },
  {
    command: "0143",
    name: "Absolute Load Value",
    unit: "Percent",
    formula: "((256 * A) + B) / 2.55",
  },
  {
    command: "0144",
    name: "Commanded Equivalence Ratio",
    unit: "Ratio",
    formula: "((256 * A) + B) / 32768",
  },
  {
    command: "0145",
    name: "Relative Throttle Pos.",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "0146",
    name: "Ambient Air Temp.",
    unit: "Celsius",
    formula: "A - 40",
  },
  {
    command: "0147",
    name: "Abs. Throttle Pos. (B)",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "0148",
    name: "Abs. Throttle Pos. (C)",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "0149",
    name: "Accelerator Pedal Pos. (D)",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "014A",
    name: "Accelerator Pedal Pos. (E)",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "014B",
    name: "Accelerator Pedal Pos. (F)",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "014C",
    name: "Commanded Throttle Actuator",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "014D",
    name: "Time With Check Engine Light",
    unit: "Minutes",
    formula: "(256 * A) + B",
  },
  {
    command: "014E",
    name: "Time Since Codes Cleared",
    unit: "Minutes",
    formula: "(256 * A) + B",
  },
  {
    command: "0152",
    name: "Ethanol Fuel Percentage",
    unit: "Percent",
    formula: "A / 2.55",
  },
  {
    command: "015C",
    name: "Engine Oil Temp.",
    unit: "Celsius",
    formula: "A - 40",
  },
  {
    command: "015D",
    name: "Fuel Injection Timing",
    unit: "Degrees",
    formula: "((256 * A) + B) / 128 - 210",
  },
  {
    command: "015E",
    name: "Engine Fuel Rate",
    unit: "LitresPerHour",
    formula: "((256 * A) + B) / 20",
  },
  {
    command: "0162",
    name: "Engine Torque %",
    unit: "Percent",
    formula: "A - 125",
  },
  {
    command: "01A6",
    name: "Odometer",
    unit: "Kilometers",
    formula: "((A * 16777216) + (B * 65536) + (C * 256) + D) / 10",
  },
];

export const STANDARD_PIDS: PidDefinition[] = [
  ...BASE_PIDS,
  ...buildO2SensorPids(),
];

export function findPidByCommand(command: string): PidDefinition | undefined {
  return STANDARD_PIDS.find((pid) => pid.command === command);
}

export function findPidByName(name: string): PidDefinition | undefined {
  return STANDARD_PIDS.find((pid) => pid.name === name);
}

/** Calcula el valor de un PID a partir de la respuesta cruda parseada. */
export function computeScalar(
  def: PidDefinition,
  response: Response,
  prefs: UnitPreferences = DEFAULT_UNIT_PREFERENCES,
): Scalar {
  if (response.payloadSize === 0 || !def.formula) return Scalar.noData();
  const value = evaluateFormula(def.formula, {
    A: response.aValue(),
    B: response.bValue(),
    C: response.cValue(),
    D: response.dValue(),
    E: response.eValue(),
  });
  return Scalar.create(value, def.unit, prefs);
}
