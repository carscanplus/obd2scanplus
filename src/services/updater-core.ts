export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  assets?: ReleaseAsset[];
}

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  downloadUrl: string | null;
  releaseUrl: string;
}

export const GITHUB_REPO = "leandrocaldon/obd2scanplus";

/**
 * Normaliza y compara dos versiones semánticas (ej: 'v1.0.1' y '1.0.0').
 * Retorna true si remote > local.
 */
export function isNewerVersion(remote: string, local: string): boolean {
  const cleanRemote = remote.replace(/^v/i, "").trim();
  const cleanLocal = local.replace(/^v/i, "").trim();

  const rParts = cleanRemote.split(".").map((p) => parseInt(p, 10) || 0);
  const lParts = cleanLocal.split(".").map((p) => parseInt(p, 10) || 0);

  const length = Math.max(rParts.length, lParts.length);
  for (let i = 0; i < length; i++) {
    const r = rParts[i] ?? 0;
    const l = lParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Consulta la API de GitHub Releases para ver si hay una versión más reciente.
 */
export async function checkForUpdateCore(
  currentVer: string,
  repo: string = GITHUB_REPO,
  fetchFn: typeof fetch = fetch
): Promise<UpdateInfo> {
  const url = `https://api.github.com/repos/${repo}/releases/latest`;

  try {
    const res = await fetchFn(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        latestVersion: currentVer,
        releaseName: "",
        releaseNotes: "",
        downloadUrl: null,
        releaseUrl: "",
      };
    }

    const data: GitHubRelease = await res.json();
    const latestVersion = data.tag_name || "";
    const hasUpdate = isNewerVersion(latestVersion, currentVer);

    // Buscar el asset APK en la release
    const apkAsset = data.assets?.find((a) => a.name.toLowerCase().endsWith(".apk"));
    const downloadUrl = apkAsset?.browser_download_url || data.html_url;

    return {
      hasUpdate,
      currentVersion: currentVer,
      latestVersion,
      releaseName: data.name || latestVersion,
      releaseNotes: data.body || "",
      downloadUrl,
      releaseUrl: data.html_url,
    };
  } catch (err) {
    console.warn("Error al comprobar actualizaciones:", err);
    return {
      hasUpdate: false,
      currentVersion: currentVer,
      latestVersion: currentVer,
      releaseName: "",
      releaseNotes: "",
      downloadUrl: null,
      releaseUrl: "",
    };
  }
}
