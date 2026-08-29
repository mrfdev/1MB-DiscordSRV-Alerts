import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { generateTestAlerts } from "../src/testHarness.js";
import { parseHeader } from "../src/metadata.js";
import type { AlertRecipe } from "../src/types.js";
import { VALID_CANDIDATE } from "./fixtures.js";

function candidateRecipe(): AlertRecipe {
  const header = parseHeader(VALID_CANDIDATE, "staging/bukkit/player-join.yml");
  const data = parse(header.yamlText) as { Alerts: Record<string, unknown>[] };
  return {
    absolutePath: "/candidate.yml",
    relativePath: "staging/bukkit/player-join.yml",
    raw: VALID_CANDIDATE,
    headerLines: header.headerLines,
    yamlText: header.yamlText,
    listBody: header.listBody,
    metadata: header.metadata!,
    alerts: data.Alerts
  };
}

describe("Test Harness deployment bundle", () => {
  it("forces every destination to one quoted debug channel", () => {
    const output = generateTestAlerts([candidateRecipe()], "1266102649825001543");
    const data = parse(output) as { Alerts: Record<string, unknown>[] };

    expect(data.Alerts).toHaveLength(1);
    expect(data.Alerts[0]?.Channel).toBe("1266102649825001543");
    expect(output).not.toMatch(/^\s+Channel: global$/m);
    expect(output).toContain("# GENERATED TEST BUNDLE");
  });

  it("rejects a non-ID test destination", () => {
    expect(() => generateTestAlerts([candidateRecipe()], "global")).toThrow(/17-20 digit/);
  });
});
