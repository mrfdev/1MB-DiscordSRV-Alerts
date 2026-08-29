import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { REPOSITORY_ROOT } from "./files.js";
import type { CollectionConfig, ValidationIssue } from "./types.js";

export async function loadCollectionConfig(): Promise<{ config?: CollectionConfig; issues: ValidationIssue[] }> {
  const file = path.join(REPOSITORY_ROOT, "collection.yml");
  const issues: ValidationIssue[] = [];
  try {
    const data = parse(await readFile(file, "utf8")) as Record<string, unknown>;
    const runtime = data["Verified-Runtime"] as Record<string, unknown> | undefined;
    const version = String(data.Version ?? "");
    const build = String(data.Build ?? "");
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      issues.push({ path: "collection.yml", message: "Version must use major.minor.patch" });
    }
    if (!/^\d{3,}$/.test(build)) {
      issues.push({ path: "collection.yml", message: "Build must be zero-padded to at least three digits" });
    }
    if (!runtime?.Paper || !runtime.Java || !runtime.DiscordSRV) {
      issues.push({ path: "collection.yml", message: "Verified-Runtime must include Paper, Java, and DiscordSRV" });
    }
    return {
      config: {
        version,
        build,
        verifiedRuntime: {
          paper: String(runtime?.Paper ?? ""),
          java: String(runtime?.Java ?? ""),
          discordSrv: String(runtime?.DiscordSRV ?? "")
        }
      },
      issues
    };
  } catch (error) {
    issues.push({ path: "collection.yml", message: (error as Error).message });
    return { issues };
  }
}
