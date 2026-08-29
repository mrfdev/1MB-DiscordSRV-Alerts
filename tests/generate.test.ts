import { describe, expect, it } from "vitest";
import { generateMergedAlerts } from "../src/generate.js";
import { parseHeader } from "../src/metadata.js";
import type { AlertRecipe } from "../src/types.js";
import { VALID_CANDIDATE } from "./fixtures.js";
import { parse } from "yaml";

describe("Complete Alerts generation", () => {
  it("emits one top-level Alerts list without nested wrappers", async () => {
    const verifiedRaw = VALID_CANDIDATE
      .replace("# Status: candidate", "# Status: verified")
      .replace("# Verified-DiscordSRV: unverified", "# Verified-DiscordSRV: 1.30.5")
      .replace("# Verified-Paper: unverified", "# Verified-Paper: 26.2-84")
      .replace("# Verified-Java: unverified", "# Verified-Java: 25")
      .replace("# Verified-Date: unverified", "# Verified-Date: 2026-08-29");
    const header = parseHeader(verifiedRaw, "alerts/bukkit/player-join.yml");
    expect(header.issues).toEqual([]);
    const data = parse(header.yamlText) as { Alerts: Record<string, unknown>[] };
    const recipe: AlertRecipe = {
      absolutePath: "/example.yml",
      relativePath: "alerts/bukkit/player-join.yml",
      raw: verifiedRaw,
      headerLines: header.headerLines,
      yamlText: header.yamlText,
      listBody: header.listBody,
      metadata: header.metadata!,
      alerts: data.Alerts
    };

    const result = await generateMergedAlerts([recipe]);
    expect(result.issues).toEqual([]);
    expect(result.output?.match(/^Alerts:$/gm)).toHaveLength(1);
    expect(parse(result.output!).Alerts).toHaveLength(1);
    expect(result.output).toContain("# Alert-ID: bukkit/player-join");
  });
});
