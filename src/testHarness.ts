import { constants, copyFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { REPOSITORY_ROOT } from "./files.js";
import type { AlertRecipe } from "./types.js";

export const DEFAULT_DEBUG_CHANNEL_ID = "1266102649825001543";
export const DEFAULT_TEST_ALERTS_PATH = path.join(
  REPOSITORY_ROOT,
  "servers",
  "Paper-26.2",
  "plugins",
  "DiscordSRV",
  "alerts.yml"
);

function recipeHeader(recipe: AlertRecipe): string[] {
  return [
    "  # -----------------------------------------------------------------------------",
    `  # Test Recipe: ${recipe.metadata.alertId}`,
    ...recipe.headerLines.filter((line) => line.startsWith("#")).map((line) => `  ${line}`)
  ];
}

export function generateTestAlerts(recipes: AlertRecipe[], channelId: string): string {
  if (!/^\d{17,20}$/.test(channelId)) {
    throw new Error("Test channel must be a 17-20 digit Discord channel ID");
  }

  const lines = [
    "# GENERATED TEST BUNDLE - DO NOT PUBLISH THIS FILE",
    "# All destinations are forced to the configured private debug channel.",
    "# Run `discordsrv reload` after deploying this file.",
    "",
    "Alerts:"
  ];

  for (const recipe of [...recipes].sort((left, right) => left.metadata.alertId.localeCompare(right.metadata.alertId))) {
    const routedAlerts = recipe.alerts.map((alert) => ({ ...structuredClone(alert), Channel: channelId }));
    const serialized = stringify({ Alerts: routedAlerts }, { lineWidth: 0 }).trimEnd();
    const body = serialized.split("\n").slice(1);
    lines.push(...recipeHeader(recipe), ...body);
  }

  return `${lines.join("\n").replace(/\s+$/, "")}\n`;
}

export async function deployTestAlerts(
  recipes: AlertRecipe[],
  target = DEFAULT_TEST_ALERTS_PATH,
  channelId = DEFAULT_DEBUG_CHANNEL_ID
): Promise<{ target: string; backup: string; alertCount: number }> {
  const output = generateTestAlerts(recipes, channelId);
  const backup = `${target}.before-collection`;
  const temporary = `${target}.collection-tmp`;

  await mkdir(path.dirname(target), { recursive: true });
  try {
    await copyFile(target, backup, constants.COPYFILE_EXCL);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST" && code !== "ENOENT") {
      throw error;
    }
  }

  await writeFile(temporary, output, "utf8");
  await rename(temporary, target);
  return {
    target,
    backup,
    alertCount: recipes.reduce((total, recipe) => total + recipe.alerts.length, 0)
  };
}

export async function restoreTestAlerts(
  target = DEFAULT_TEST_ALERTS_PATH
): Promise<{ target: string; backup: string }> {
  const backup = `${target}.before-collection`;
  await copyFile(backup, target);
  return { target, backup };
}
