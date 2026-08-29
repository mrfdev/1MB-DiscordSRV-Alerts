import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { zipSync } from "fflate";
import { loadCollectionConfig } from "./collection.js";
import { REPOSITORY_ROOT } from "./files.js";
import { generateMergedAlerts, writeGeneratedFiles, writeSiteData } from "./generate.js";
import { inventoryLiveProfile } from "./inventory.js";
import { deployTestAlerts, restoreTestAlerts } from "./testHarness.js";
import { validateRepository } from "./validate.js";
import type { ValidationIssue } from "./types.js";

function printIssues(issues: ValidationIssue[]): void {
  for (const issue of issues.sort((left, right) => left.path.localeCompare(right.path) || left.message.localeCompare(right.message))) {
    console.error(`${issue.path}: ${issue.message}`);
  }
}

async function validatedRecipes() {
  const result = await validateRepository();
  if (result.issues.length > 0) {
    printIssues(result.issues);
    process.exitCode = 1;
    return null;
  }
  return result.recipes;
}

async function validate(): Promise<void> {
  const recipes = await validatedRecipes();
  if (!recipes) {
    return;
  }
  const verified = recipes.filter((recipe) => recipe.metadata.status === "verified").length;
  const candidates = recipes.filter((recipe) => recipe.metadata.status === "candidate").length;
  console.log(`Validated ${verified} verified Recipe(s) and ${candidates} candidate Recipe(s).`);
}

async function generate(): Promise<void> {
  const recipes = await validatedRecipes();
  if (!recipes) {
    return;
  }
  const issues = await writeGeneratedFiles(recipes);
  if (issues.length > 0) {
    printIssues(issues);
    process.exitCode = 1;
    return;
  }
  console.log("Generated dist/generated/alerts.yml.");
}

async function siteData(): Promise<void> {
  const recipes = await validatedRecipes();
  if (!recipes) {
    return;
  }
  await writeSiteData(recipes);
  console.log("Generated site catalog data.");
}

async function prepareRelease(): Promise<void> {
  const recipes = await validatedRecipes();
  if (!recipes) {
    return;
  }
  const collection = await loadCollectionConfig();
  const merged = await generateMergedAlerts(recipes);
  if (!collection.config || !merged.output) {
    printIssues([...collection.issues, ...merged.issues]);
    process.exitCode = 1;
    return;
  }

  const releaseDirectory = path.join(REPOSITORY_ROOT, "dist", "release");
  await rm(releaseDirectory, { recursive: true, force: true });
  await mkdir(releaseDirectory, { recursive: true });
  await writeFile(path.join(releaseDirectory, "alerts.yml"), merged.output, "utf8");
  const archiveEntries: Record<string, Uint8Array> = {};
  for (const recipe of recipes.filter((item) => item.metadata.status === "verified")) {
    archiveEntries[recipe.relativePath] = new Uint8Array(await readFile(recipe.absolutePath));
  }
  const archiveName = `1MB-DiscordSRV-Alerts-v${collection.config.version}-b${collection.config.build}.zip`;
  await writeFile(path.join(releaseDirectory, archiveName), zipSync(archiveEntries, { level: 9 }));
  console.log(`Prepared alerts.yml and ${archiveName}.`);
}

async function printReleaseTag(): Promise<void> {
  const collection = await loadCollectionConfig();
  if (!collection.config || collection.issues.length > 0) {
    printIssues(collection.issues);
    process.exitCode = 1;
    return;
  }
  console.log(`v${collection.config.version}-b${collection.config.build}`);
}

async function deployTest(): Promise<void> {
  const recipes = await validatedRecipes();
  if (!recipes) {
    return;
  }
  const target = process.env.DISCORDSRV_TEST_ALERTS_PATH;
  const channelId = process.env.DISCORDSRV_TEST_CHANNEL_ID;
  const result = await deployTestAlerts(recipes, target, channelId);
  console.log(`Deployed ${result.alertCount} Alert(s) to ${result.target}.`);
  console.log(`Original test file backup: ${result.backup}`);
  console.log("Run `discordsrv reload` in the test-server console.");
}

async function restoreTest(): Promise<void> {
  const result = await restoreTestAlerts(process.env.DISCORDSRV_TEST_ALERTS_PATH);
  console.log(`Restored ${result.target} from ${result.backup}.`);
  console.log("Run `discordsrv reload` in the test-server console.");
}

const command = process.argv[2] ?? "validate";
switch (command) {
  case "validate":
    await validate();
    break;
  case "generate":
    await generate();
    break;
  case "site-data":
    await siteData();
    break;
  case "release":
    await prepareRelease();
    break;
  case "release-tag":
    await printReleaseTag();
    break;
  case "inventory-live":
    console.log(JSON.stringify(await inventoryLiveProfile(), null, 2));
    break;
  case "deploy-test":
    await deployTest();
    break;
  case "restore-test":
    await restoreTest();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
}
