import { existsSync, readdirSync, readFileSync } from "node:fs";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.argv[2]) {
  throw new Error("Usage: node test-harness/verify-pyrofishingpro.mjs /path/to/PyroFishingPro.jar [Paper-server-directory]");
}
const pyroJar = resolve(process.argv[2]);
const server = resolve(process.argv[3] ?? resolve(root, "servers/Paper-26.2"));
const pluginDir = resolve(server, "plugins");
const libraries = resolve(server, "libraries");
if (!existsSync(pyroJar) || !existsSync(pluginDir) || !existsSync(libraries)) {
  throw new Error("Provide a local PyroFishingPro jar and an initialized Paper test server containing DiscordSRV and libraries.");
}

// Check before source compilation so incompatible/obfuscated builds have a useful error.
const inventory = spawnSync("jar", ["tf", pyroJar], { encoding: "utf8" });
if (inventory.error) throw inventory.error;
if (inventory.status !== 0) throw new Error(inventory.stderr || "Unable to read PyroFishingPro jar");
const entries = new Set(inventory.stdout.split(/\r?\n/));
const missing = ["PyroFishCatchEvent", "TournamentStartEvent", "TournamentEndEvent"]
  .map((name) => `me/arsmagica/API/${name}.class`)
  .filter((name) => !entries.has(name));
if (missing.length) {
  throw new Error(`Missing legacy PyroFishingPro API classes: ${missing.join(", ")}. The inspected 4.9.33 build is incompatible; standalone PyroAPI does not restore these events.`);
}

const discordJars = readdirSync(pluginDir).filter((name) => /^DiscordSRV.*\.jar$/i.test(name));
if (discordJars.length !== 1) throw new Error("Expected exactly one DiscordSRV jar in the test server's plugins directory.");
const target = parse(readFileSync(resolve(root, "collection.yml"), "utf8"))["Verified-Runtime"].Paper;
const [paperVersion, paperBuild] = target.split("-");
const apiSuffix = `io/papermc/paper/paper-api/${paperVersion}.build.${paperBuild}-stable/paper-api-${paperVersion}.build.${paperBuild}-stable.jar`;
const jars = readdirSync(libraries, { recursive: true })
  .filter((name) => name.endsWith(".jar") && (!name.includes("/paper-api/") || name === apiSuffix))
  .sort()
  .map((name) => resolve(libraries, name));
if (!jars.includes(resolve(libraries, apiSuffix))) {
  throw new Error(`Missing exact collection target Paper API ${target} in the test server libraries.`);
}
const result = spawnSync("java", [
  "--class-path", [pyroJar, resolve(pluginDir, discordJars[0]), ...jars].join(delimiter),
  resolve(root, "test-harness/VerifyPyroFishingPro.java"),
  pyroJar,
  resolve(root, "staging/pyrofishingpro"),
  resolve(root, "profiles/1moreblock/alerts.yml")
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
