import { describe, expect, it } from "vitest";
import { isNewerVersion, checkForUpdateCore } from "../updater-core";

describe("updater-core - isNewerVersion", () => {
  it("detects newer patch versions", () => {
    expect(isNewerVersion("v1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
  });

  it("detects newer minor and major versions", () => {
    expect(isNewerVersion("v1.1.0", "1.0.9")).toBe(true);
    expect(isNewerVersion("v2.0.0", "1.9.9")).toBe(true);
  });

  it("returns false for equal or older versions", () => {
    expect(isNewerVersion("v1.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("v0.9.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
  });
});

describe("updater-core - checkForUpdateCore", () => {
  it("returns hasUpdate=true when release is newer with an APK asset", async () => {
    const fakeFetch = async () =>
      ({
        ok: true,
        json: async () => ({
          tag_name: "v1.1.0",
          name: "Versión 1.1.0",
          body: "- Nuevas funciones agregadas",
          html_url: "https://github.com/leandrocaldon/obd2scanplus/releases/tag/v1.1.0",
          assets: [
            {
              name: "obd2scanner-v1.1.0.apk",
              browser_download_url:
                "https://github.com/leandrocaldon/obd2scanplus/releases/download/v1.1.0/obd2scanner-v1.1.0.apk",
              size: 45000000,
            },
          ],
        }),
      } as any);

    const result = await checkForUpdateCore("1.0.0", "leandrocaldon/obd2scanplus", fakeFetch);
    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe("v1.1.0");
    expect(result.downloadUrl).toBe(
      "https://github.com/leandrocaldon/obd2scanplus/releases/download/v1.1.0/obd2scanner-v1.1.0.apk"
    );
  });

  it("handles non-ok response gracefully", async () => {
    const fakeFetch = async () =>
      ({
        ok: false,
        status: 404,
      } as any);

    const result = await checkForUpdateCore("1.0.0", "leandrocaldon/obd2scanplus", fakeFetch);
    expect(result.hasUpdate).toBe(false);
  });
});
