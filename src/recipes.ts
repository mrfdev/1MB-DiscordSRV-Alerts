import path from "node:path";
import { parseDocument } from "yaml";
import { listYamlFiles, readUtf8, repositoryRelative, REPOSITORY_ROOT } from "./files.js";
import { parseHeader } from "./metadata.js";
import { inspectRecipeBodyForPrivateData } from "./security.js";
import type { AlertRecipe, ValidationIssue } from "./types.js";

const REQUIRED_ALERT_FIELDS = ["Trigger", "Async", "Conditions", "Channel", "IgnoreCancelled", "Content", "Webhook", "Embed"];
const LOGICAL_CHANNELS = new Set(["global", "staff", "logs"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] | null {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  return null;
}

function meaningfulEmbed(embed: Record<string, unknown>): boolean {
  const values = [embed.Description, embed.ThumbnailUrl, embed.ImageUrl];
  if (values.some((value) => typeof value === "string" && value.trim())) {
    return true;
  }
  for (const nestedName of ["Author", "Title", "Footer"]) {
    const nested = embed[nestedName];
    if (isObject(nested) && Object.values(nested).some((value) => typeof value === "string" && value.trim())) {
      return true;
    }
  }
  return Array.isArray(embed.Fields) && embed.Fields.length > 0;
}

function validateAlert(alert: unknown, recipePath: string, index: number, expectedChannel: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const prefix = `Alert entry ${index + 1}`;
  if (!isObject(alert)) {
    return [{ path: recipePath, message: `${prefix} must be a mapping` }];
  }

  for (const field of REQUIRED_ALERT_FIELDS) {
    if (!(field in alert)) {
      issues.push({ path: recipePath, message: `${prefix} is missing required field ${field}` });
    }
  }
  if ("Enabled" in alert) {
    issues.push({ path: recipePath, message: `${prefix} uses unsupported alert-level Enabled` });
  }

  const triggers = strings(alert.Trigger);
  if (!triggers?.length) {
    issues.push({ path: recipePath, message: `${prefix} Trigger must be a string or non-empty string list` });
  } else {
    for (const trigger of triggers) {
      if (trigger.startsWith("/")) {
        const command = trigger.slice(1).split(/\s+/)[0] ?? "";
        if (command !== command.toLowerCase()) {
          issues.push({ path: recipePath, message: `${prefix} command trigger ${trigger} must use lowercase command text` });
        }
      } else if (!trigger.includes(".") || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(trigger)) {
        issues.push({ path: recipePath, message: `${prefix} event trigger ${trigger} must be an exact fully qualified class name` });
      }
    }
  }

  if (typeof alert.Async !== "boolean") {
    issues.push({ path: recipePath, message: `${prefix} Async must be true or false` });
  }
  if (!Array.isArray(alert.Conditions) || !alert.Conditions.every((condition) => typeof condition === "string")) {
    issues.push({ path: recipePath, message: `${prefix} Conditions must be a string list` });
  }
  if (typeof alert.IgnoreCancelled !== "boolean") {
    issues.push({ path: recipePath, message: `${prefix} IgnoreCancelled must be true or false` });
  }
  if (typeof alert.Content !== "string") {
    issues.push({ path: recipePath, message: `${prefix} Content must be a string` });
  }

  const channels = strings(alert.Channel);
  if (!channels?.length || channels.some((channel) => !LOGICAL_CHANNELS.has(channel))) {
    issues.push({ path: recipePath, message: `${prefix} Channel must use only global, staff, or logs` });
  } else if (channels.some((channel) => channel !== expectedChannel)) {
    issues.push({ path: recipePath, message: `${prefix} Channel must match header Channel: ${expectedChannel}` });
  }

  if (!isObject(alert.Webhook) || typeof alert.Webhook.Enabled !== "boolean") {
    issues.push({ path: recipePath, message: `${prefix} Webhook.Enabled must be true or false` });
  }
  if (!isObject(alert.Embed) || typeof alert.Embed.Enabled !== "boolean") {
    issues.push({ path: recipePath, message: `${prefix} Embed.Enabled must be true or false` });
  }

  const contentHasValue = typeof alert.Content === "string" && alert.Content.trim().length > 0;
  const embedHasValue = isObject(alert.Embed) && alert.Embed.Enabled === true && meaningfulEmbed(alert.Embed);
  if (!contentHasValue && !embedHasValue) {
    issues.push({ path: recipePath, message: `${prefix} must contain nonblank Content or a meaningful enabled Embed` });
  }

  return issues;
}

export async function loadRecipe(file: string): Promise<{ recipe?: AlertRecipe; issues: ValidationIssue[] }> {
  const relativePath = repositoryRelative(file);
  const raw = await readUtf8(file);
  const parsedHeader = parseHeader(raw, relativePath);
  const issues = [...parsedHeader.issues, ...inspectRecipeBodyForPrivateData(parsedHeader.yamlText, relativePath)];
  if (!parsedHeader.metadata || !parsedHeader.yamlText) {
    return { issues };
  }

  const document = parseDocument(parsedHeader.yamlText, { prettyErrors: true, uniqueKeys: true });
  if (document.errors.length > 0) {
    issues.push(...document.errors.map((error) => ({ path: relativePath, message: error.message })));
    return { issues };
  }

  const data = document.toJS() as unknown;
  if (!isObject(data)) {
    issues.push({ path: relativePath, message: "YAML root must be a mapping" });
    return { issues };
  }
  const rootKeys = Object.keys(data);
  if (rootKeys.length !== 1 || rootKeys[0] !== "Alerts") {
    issues.push({ path: relativePath, message: "YAML root must contain only the Alerts key" });
  }
  if (!Array.isArray(data.Alerts) || data.Alerts.length === 0) {
    issues.push({ path: relativePath, message: "Alerts must be a non-empty list" });
    return { issues };
  }
  if (data.Alerts.length !== 1) {
    issues.push({ path: relativePath, message: "Each Recipe must contain exactly one Alert definition" });
  }

  const alerts = data.Alerts as Record<string, unknown>[];
  alerts.forEach((alert, index) => issues.push(...validateAlert(alert, relativePath, index, parsedHeader.metadata!.channel)));

  const recipe: AlertRecipe = {
    absolutePath: file,
    relativePath,
    raw,
    headerLines: parsedHeader.headerLines,
    yamlText: parsedHeader.yamlText,
    listBody: parsedHeader.listBody,
    metadata: parsedHeader.metadata,
    alerts
  };
  return { recipe, issues };
}

export async function loadRecipes(): Promise<{ recipes: AlertRecipe[]; issues: ValidationIssue[] }> {
  const files = [
    ...await listYamlFiles(path.join(REPOSITORY_ROOT, "alerts")),
    ...await listYamlFiles(path.join(REPOSITORY_ROOT, "staging"))
  ].sort();
  const recipes: AlertRecipe[] = [];
  const issues: ValidationIssue[] = [];

  for (const file of files) {
    const result = await loadRecipe(file);
    issues.push(...result.issues);
    if (result.recipe) {
      recipes.push(result.recipe);
    }
  }

  const ids = new Map<string, string>();
  const alertBodies = new Map<string, string>();
  for (const recipe of recipes) {
    const previousPath = ids.get(recipe.metadata.alertId);
    if (previousPath) {
      issues.push({ path: recipe.relativePath, message: `duplicate Alert-ID also used by ${previousPath}` });
    } else {
      ids.set(recipe.metadata.alertId, recipe.relativePath);
    }
    for (const alert of recipe.alerts) {
      const fingerprint = JSON.stringify(alert);
      const previousRecipe = alertBodies.get(fingerprint);
      if (previousRecipe) {
        issues.push({ path: recipe.relativePath, message: `exact duplicate Alert entry also exists in ${previousRecipe}` });
      } else {
        alertBodies.set(fingerprint, recipe.relativePath);
      }
    }
  }

  return { recipes, issues };
}
