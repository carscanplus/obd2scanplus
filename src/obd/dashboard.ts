import { PidDefinition, findPidByCommand } from "./pids";

/**
 * PIDs que se muestran y actualizan en el dashboard en vivo.
 * Cada tick se consulta el siguiente PID de la lista (round-robin).
 */
const TRACKED_COMMANDS = [
  "010C", // Engine Speed
  "010D", // Vehicle Speed
  "0105", // Coolant Temp.
  "0104", // Engine Load
  "0111", // Throttle Pos.
  "0110", // MAF Airflow Rate
  "010F", // Intake Air Temp.
  "010B", // Intake Manifold Abs. Pressure
  "010E", // Timing Advance
  "0106", // Short Term Fuel Trim (Bank 1)
  "0107", // Long Term Fuel Trim (Bank 1)
  "012F", // Fuel Level Input
  "0142", // Control Module Voltage
  "011F", // Engine Runtime (Session)
];

export const TRACKED_PIDS: PidDefinition[] = TRACKED_COMMANDS.map((c) =>
  findPidByCommand(c),
).filter((p): p is PidDefinition => Boolean(p));
