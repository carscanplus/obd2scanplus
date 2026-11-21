import * as Linking from "expo-linking";
import Constants from "expo-constants";
import {
  checkForUpdateCore,
  GITHUB_REPO,
  UpdateInfo,
} from "./updater-core";

export * from "./updater-core";

/**
 * Obtiene la versión actual configurada en la aplicación.
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}

/**
 * Consulta la API de GitHub Releases con la versión actual de la app.
 */
export async function checkForUpdate(
  repo: string = GITHUB_REPO,
  currentVer: string = getCurrentAppVersion(),
  fetchFn: typeof fetch = fetch
): Promise<UpdateInfo> {
  return checkForUpdateCore(currentVer, repo, fetchFn);
}

/**
 * Abre el instalador o la página del release en el navegador del dispositivo.
 */
export async function downloadAndInstallUpdate(url: string): Promise<void> {
  await Linking.openURL(url);
}
