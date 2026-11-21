// Vuelca la tabla `codes` de code-descriptions.sqlite a un módulo TypeScript.
// Uso: node scripts/dump-dtc.mjs <ruta-sqlite> <ruta-salida-ts>
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = resolve(process.argv[2]);
const outPath = resolve(process.argv[3]);

const db = new DatabaseSync(dbPath, { readOnly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((row) => row.name);
console.log("tables:", tables.join(", "));

const columns = db.prepare("PRAGMA table_info(codes)").all();
console.log("columns:", columns.map((c) => c.name).join(", "));

const rows = db.prepare("SELECT id, desc FROM codes").all();
console.log("rows:", rows.length);
db.close();

const escape = (s) =>
  String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");

const lines = [
  "// Generado automáticamente desde code-descriptions.sqlite (OBDium). No editar manualmente.",
  "export const DTC_DESCRIPTIONS: Record<string, string> = {",
];
for (const row of rows) {
  lines.push(`  "${escape(row.id)}": "${escape(row.desc)}",`);
}
lines.push("};");
lines.push("");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("escrito en", outPath);
