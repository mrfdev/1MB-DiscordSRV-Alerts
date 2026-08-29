import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { REPOSITORY_ROOT } from "./files.js";

interface LiveAlert {
  Trigger?: unknown;
  Conditions?: unknown;
  Channel?: unknown;
  Content?: unknown;
  Webhook?: unknown;
  Embed?: unknown;
}

function textList(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function channelKind(value: unknown): string {
  const channels = textList(value);
  if (channels.length === 0) {
    return "missing";
  }
  if (channels.every((channel) => /^\d{17,20}$/.test(channel))) {
    return "numeric-id";
  }
  return channels.join(",");
}

export async function inventoryLiveProfile(): Promise<Record<string, unknown>[]> {
  const file = path.join(REPOSITORY_ROOT, "profiles", "1moreblock", "alerts.yml");
  const parsed = parse(await readFile(file, "utf8")) as { Alerts?: LiveAlert[] };
  return (parsed.Alerts ?? []).map((alert, index) => ({
    index: index + 1,
    triggers: textList(alert.Trigger),
    conditions: Array.isArray(alert.Conditions) ? alert.Conditions.length : 0,
    channel: channelKind(alert.Channel),
    hasContent: typeof alert.Content === "string" && alert.Content.trim().length > 0,
    webhookEnabled: typeof alert.Webhook === "object" && alert.Webhook !== null && (alert.Webhook as Record<string, unknown>).Enabled === true,
    embedEnabled: typeof alert.Embed === "object" && alert.Embed !== null && (alert.Embed as Record<string, unknown>).Enabled === true
  }));
}
