import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { readUtf8, repositoryRelative, REPOSITORY_ROOT } from "./files.js";
import type { ValidationIssue } from "./types.js";

const execFileAsync = promisify(execFile);
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules", "servers", "dist", ".cache", ".vite"]);
const TEXT_EXTENSIONS = new Set(["", ".md", ".yml", ".yaml", ".json", ".ts", ".js", ".css", ".html", ".txt", ".toml", ".xml"]);
const FORBIDDEN_EXTENSIONS = new Set([".jar", ".db", ".sqlite", ".aof", ".log", ".mca", ".dat", ".zip", ".pem", ".p12", ".jks", ".key"]);

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Discord webhook URL", pattern: /https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/i },
  { name: "Discord bot token", pattern: /\b[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,}\b/ },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
];

function shouldSkip(file: string): boolean {
  const relativeParts = path.relative(REPOSITORY_ROOT, file).split(path.sep);
  return relativeParts.some((part) => SKIPPED_DIRECTORIES.has(part));
}

async function listPublicFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listPublicFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

export function inspectRecipeBodyForPrivateData(yamlText: string, relativePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (/\b\d{17,20}\b/.test(yamlText)) {
    issues.push({ path: relativePath, message: "numeric Discord IDs are forbidden in reusable Recipes" });
  }
  if (/(?:player|getPlayer)[.\w()]*\.?getAddress\s*\(|player(?:_|-)?ip|ip2location|%[^%]*player[^%]*ip[^%]*%/i.test(yamlText)) {
    issues.push({ path: relativePath, message: "player IP output is forbidden in reusable Recipes" });
  }
  for (const secret of SECRET_PATTERNS) {
    if (secret.pattern.test(yamlText)) {
      issues.push({ path: relativePath, message: `${secret.name} is forbidden` });
    }
  }
  return issues;
}

async function trackedFiles(): Promise<string[] | null> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: REPOSITORY_ROOT, encoding: "utf8" });
    return stdout.split("\0").filter(Boolean);
  } catch {
    return null;
  }
}

export async function inspectPublicTree(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const tracked = await trackedFiles();
  if (tracked?.some((file) => file === "servers" || file.startsWith("servers/"))) {
    issues.push({ path: "servers/", message: "tracked server runtime content is forbidden" });
  }

  const allFiles = (await listPublicFiles(REPOSITORY_ROOT)).filter((file) => !shouldSkip(file));
  for (const file of allFiles) {
    const relative = repositoryRelative(file);
    const extension = path.extname(file).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      issues.push({ path: relative, message: `forbidden public file type ${extension}` });
      continue;
    }
    if (!TEXT_EXTENSIONS.has(extension) && path.basename(file) !== "LICENSE") {
      continue;
    }

    const content = await readUtf8(file);
    for (const secret of SECRET_PATTERNS) {
      if (secret.pattern.test(content)) {
        issues.push({ path: relative, message: `${secret.name} is forbidden` });
      }
    }
  }

  return issues;
}
