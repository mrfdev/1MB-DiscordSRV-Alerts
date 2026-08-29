import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRecipe } from "../src/recipes.js";
import { VALID_CANDIDATE } from "./fixtures.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function validateText(text: string) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "discordsrv-alert-test-"));
  temporaryDirectories.push(directory);
  const file = path.join(directory, "recipe.yml");
  await writeFile(file, text, "utf8");
  return loadRecipe(file);
}

describe("Recipe YAML validation", () => {
  it("accepts a modern fully qualified event trigger", async () => {
    const result = await validateText(VALID_CANDIDATE);
    expect(result.issues).toEqual([]);
    expect(result.recipe?.alerts).toHaveLength(1);
  });

  it("rejects deprecated simple-name event triggers", async () => {
    const result = await validateText(VALID_CANDIDATE.replace("org.bukkit.event.player.PlayerJoinEvent", "PlayerJoinEvent"));
    expect(result.issues.some((issue) => issue.message.includes("fully qualified class name"))).toBe(true);
  });

  it("rejects numeric Discord destinations", async () => {
    const result = await validateText(VALID_CANDIDATE.replaceAll("Channel: global", "Channel: \"1266102649825001543\""));
    expect(result.issues.some((issue) => issue.message.includes("numeric Discord IDs"))).toBe(true);
  });

  it("rejects reusable player IP output", async () => {
    const result = await validateText(VALID_CANDIDATE.replace("{name} joined", "%player_ip% joined"));
    expect(result.issues.some((issue) => issue.message.includes("player IP output"))).toBe(true);
  });

  it("rejects more than one Alert definition per Recipe", async () => {
    const secondEntry = VALID_CANDIDATE.slice(VALID_CANDIDATE.indexOf("  - Trigger:"));
    const result = await validateText(`${VALID_CANDIDATE.trimEnd()}\n${secondEntry}`);
    expect(result.issues.some((issue) => issue.message.includes("exactly one Alert definition"))).toBe(true);
  });
});
