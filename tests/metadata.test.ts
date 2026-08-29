import { describe, expect, it } from "vitest";
import { parseHeader } from "../src/metadata.js";
import { VALID_CANDIDATE } from "./fixtures.js";

describe("Recipe metadata", () => {
  it("parses the standardized comment header", () => {
    const result = parseHeader(VALID_CANDIDATE, "staging/bukkit/player-join.yml");

    expect(result.issues).toEqual([]);
    expect(result.metadata).toMatchObject({
      alertId: "bukkit/player-join",
      version: "3.0.0",
      build: "001",
      status: "candidate",
      channel: "global"
    });
    expect(result.listBody).toContain("org.bukkit.event.player.PlayerJoinEvent");
  });

  it("rejects a path identity mismatch", () => {
    const result = parseHeader(VALID_CANDIDATE, "staging/bukkit/different-name.yml");

    expect(result.issues.map((issue) => issue.message)).toContain(
      "Alert-ID bukkit/player-join must match path identity bukkit/different-name"
    );
  });
});
