import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tag = (process.argv[2] ?? process.env.RELEASE_TAG ?? "").trim();

if (!tag) {
  console.log(
    "Sin tag de release: no se sincroniza la versión (ejecución manual sin versión).",
  );
  process.exit(0);
}

const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag);

if (!match) {
  throw new Error(
    `El tag de release debe tener el formato vX.Y.Z. Valor recibido: ${tag}`,
  );
}

const [, major, minor, patch] = match;
const version = `${Number(major)}.${Number(minor)}.${Number(patch)}`;
const versionCode =
  Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appConfigPath = resolve(root, "app.json");
const packagePath = resolve(root, "package.json");
const gradlePath = resolve(root, "android", "app", "build.gradle");

const appConfig = readJson(appConfigPath);
appConfig.expo.version = version;
appConfig.expo.android.versionCode = versionCode;
appConfig.expo.ios.buildNumber = String(versionCode);
writeJson(appConfigPath, appConfig);

const packageJson = readJson(packagePath);
packageJson.version = version;
writeJson(packagePath, packageJson);

if (existsSync(gradlePath)) {
  const gradle = readFileSync(gradlePath, "utf8")
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  if (
    !gradle.includes(`versionCode ${versionCode}`) ||
    !gradle.includes(`versionName "${version}"`)
  ) {
    throw new Error(
      "No se pudo sincronizar versionCode/versionName en android/app/build.gradle.",
    );
  }

  writeFileSync(gradlePath, gradle);
} else {
  console.log(
    "android/app/build.gradle no existe (lo genera expo prebuild desde app.json); se omite.",
  );
}
