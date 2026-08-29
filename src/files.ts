import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");

export async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function listYamlFiles(directory: string): Promise<string[]> {
  try {
    return (await listFiles(directory)).filter((file) => /\.ya?ml$/i.test(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function readUtf8(file: string): Promise<string> {
  return readFile(file, "utf8");
}

export function repositoryRelative(file: string): string {
  return path.relative(REPOSITORY_ROOT, file).split(path.sep).join("/");
}
