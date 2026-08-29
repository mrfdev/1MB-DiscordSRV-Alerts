import path from "node:path";
import type { AlertMetadata, Audience, LogicalChannel, RecipeStatus, ValidationIssue } from "./types.js";

const REPEATABLE_FIELDS = new Set(["Credit", "Origin-URL", "Required-Plugin", "Screenshot"]);
const ALLOWED_FIELDS = new Set([
  "Alert-ID",
  "Description",
  "Plugin",
  "Alert-Version",
  "Alert-Build",
  "Status",
  "Authors",
  "Credit",
  "Origin-URL",
  "Origin-Version",
  "Origin-Build",
  "License",
  "Audience",
  "Channel",
  "Verified-DiscordSRV",
  "Verified-Paper",
  "Verified-Java",
  "Required-Plugin",
  "Verified-Date",
  "Screenshot"
]);

const REQUIRED_FIELDS = [
  "Alert-ID",
  "Description",
  "Plugin",
  "Alert-Version",
  "Alert-Build",
  "Status",
  "Authors",
  "License",
  "Audience",
  "Channel",
  "Verified-DiscordSRV",
  "Verified-Paper",
  "Verified-Java",
  "Verified-Date"
] as const;

export interface ParsedHeader {
  metadata?: AlertMetadata;
  headerLines: string[];
  yamlText: string;
  listBody: string;
  issues: ValidationIssue[];
}

function splitAuthors(value: string): string[] {
  return value.split(",").map((author) => author.trim()).filter(Boolean);
}

function first(values: Map<string, string[]>, field: string): string {
  return values.get(field)?.[0] ?? "";
}

export function parseHeader(raw: string, relativePath: string): ParsedHeader {
  const normalized = raw.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const issues: ValidationIssue[] = [];
  const headerLines: string[] = [];
  const values = new Map<string, string[]>();
  let alertsLine = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line === "Alerts:") {
      alertsLine = index;
      break;
    }
    if (line.trim() === "") {
      headerLines.push(line);
      continue;
    }
    if (!line.startsWith("#")) {
      issues.push({ path: relativePath, message: `line ${index + 1}: expected a metadata comment or top-level Alerts:` });
      continue;
    }

    headerLines.push(line);
    const match = /^#\s*([A-Za-z][A-Za-z0-9-]*):\s*(.*?)\s*$/.exec(line);
    if (!match) {
      issues.push({ path: relativePath, message: `line ${index + 1}: metadata comments must use # Field: value` });
      continue;
    }

    const field = match[1] ?? "";
    const value = match[2] ?? "";
    if (!ALLOWED_FIELDS.has(field)) {
      issues.push({ path: relativePath, message: `line ${index + 1}: unknown metadata field ${field}` });
      continue;
    }
    if (!value) {
      issues.push({ path: relativePath, message: `line ${index + 1}: ${field} cannot be empty` });
    }

    const existing = values.get(field) ?? [];
    if (existing.length > 0 && !REPEATABLE_FIELDS.has(field)) {
      issues.push({ path: relativePath, message: `line ${index + 1}: ${field} may appear only once` });
    }
    existing.push(value);
    values.set(field, existing);
  }

  if (alertsLine < 0) {
    issues.push({ path: relativePath, message: "missing top-level Alerts: key" });
    return { headerLines, yamlText: "", listBody: "", issues };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!values.has(field)) {
      issues.push({ path: relativePath, message: `missing required metadata field ${field}` });
    }
  }

  const alertId = first(values, "Alert-ID");
  const version = first(values, "Alert-Version");
  const build = first(values, "Alert-Build");
  const status = first(values, "Status") as RecipeStatus;
  const audience = first(values, "Audience") as Audience;
  const channel = first(values, "Channel") as LogicalChannel;
  const authors = splitAuthors(first(values, "Authors"));

  if (!/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/.test(alertId)) {
    issues.push({ path: relativePath, message: "Alert-ID must use lowercase plugin/recipe-slug format" });
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    issues.push({ path: relativePath, message: "Alert-Version must use major.minor.patch" });
  }
  if (!/^\d{3,}$/.test(build)) {
    issues.push({ path: relativePath, message: "Alert-Build must be a zero-padded number with at least three digits" });
  }
  if (!(["candidate", "verified"] as string[]).includes(status)) {
    issues.push({ path: relativePath, message: "Status must be candidate or verified" });
  }
  if (!(["player", "staff", "logs"] as string[]).includes(audience)) {
    issues.push({ path: relativePath, message: "Audience must be player, staff, or logs" });
  }
  if (!(["global", "staff", "logs"] as string[]).includes(channel)) {
    issues.push({ path: relativePath, message: "Channel must be global, staff, or logs" });
  }
  if (authors.length === 0) {
    issues.push({ path: relativePath, message: "Authors must name at least one author" });
  }
  if (first(values, "License") !== "GPL-3.0-or-later") {
    issues.push({ path: relativePath, message: "License must be GPL-3.0-or-later for maintained Recipes" });
  }
  for (const originUrl of values.get("Origin-URL") ?? []) {
    try {
      const parsed = new URL(originUrl);
      if (parsed.protocol !== "https:") {
        issues.push({ path: relativePath, message: "Origin-URL must use https" });
      }
    } catch {
      issues.push({ path: relativePath, message: `invalid Origin-URL ${originUrl}` });
    }
  }

  const sourceRoot = relativePath.startsWith("alerts/") ? "alerts" : relativePath.startsWith("staging/") ? "staging" : "";
  const expectedId = sourceRoot
    ? relativePath.slice(sourceRoot.length + 1).replace(/\.ya?ml$/i, "")
    : "";
  if (expectedId && alertId !== expectedId) {
    issues.push({ path: relativePath, message: `Alert-ID ${alertId} must match path identity ${expectedId}` });
  }
  if (sourceRoot === "alerts" && status !== "verified") {
    issues.push({ path: relativePath, message: "Recipes under alerts/ must have Status: verified" });
  }
  if (sourceRoot === "staging" && status !== "candidate") {
    issues.push({ path: relativePath, message: "Recipes under staging/ must have Status: candidate" });
  }

  const verificationFields = ["Verified-DiscordSRV", "Verified-Paper", "Verified-Java", "Verified-Date"];
  if (status === "verified") {
    for (const field of verificationFields) {
      if (first(values, field).toLowerCase() === "unverified") {
        issues.push({ path: relativePath, message: `${field} cannot be unverified for a verified Recipe` });
      }
    }
  }

  for (const screenshot of values.get("Screenshot") ?? []) {
    const expectedPrefix = `screenshots/${alertId}/`;
    if (!screenshot.startsWith(expectedPrefix) || path.posix.normalize(screenshot) !== screenshot) {
      issues.push({ path: relativePath, message: `Screenshot must be a normalized path beneath ${expectedPrefix}` });
    }
  }

  const yamlText = lines.slice(alertsLine).join("\n");
  const listBody = lines.slice(alertsLine + 1).join("\n").replace(/\s+$/, "");
  if (listBody && listBody.split("\n").some((line) => line && !line.startsWith("  "))) {
    issues.push({ path: relativePath, message: "every line beneath Alerts: must remain indented for safe merging" });
  }

  const metadata: AlertMetadata = {
    alertId,
    description: first(values, "Description"),
    plugin: first(values, "Plugin"),
    version,
    build,
    status,
    authors,
    credits: values.get("Credit") ?? [],
    originUrls: values.get("Origin-URL") ?? [],
    license: first(values, "License"),
    audience,
    channel,
    verifiedDiscordSrv: first(values, "Verified-DiscordSRV"),
    verifiedPaper: first(values, "Verified-Paper"),
    verifiedJava: first(values, "Verified-Java"),
    requiredPlugins: values.get("Required-Plugin") ?? [],
    verifiedDate: first(values, "Verified-Date"),
    screenshots: values.get("Screenshot") ?? [],
    ...(values.has("Origin-Version") ? { originVersion: first(values, "Origin-Version") } : {}),
    ...(values.has("Origin-Build") ? { originBuild: first(values, "Origin-Build") } : {})
  };

  return { metadata, headerLines, yamlText, listBody, issues };
}
