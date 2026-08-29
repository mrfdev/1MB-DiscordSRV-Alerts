import { parseDocument } from "yaml";
import { access } from "node:fs/promises";
import { readUtf8, REPOSITORY_ROOT } from "./files.js";
import path from "node:path";
import { loadCollectionConfig } from "./collection.js";
import { generateMergedAlerts } from "./generate.js";
import { loadRecipes } from "./recipes.js";
import { inspectPublicTree } from "./security.js";
import type { AlertRecipe, ValidationIssue } from "./types.js";

async function validateLiveProfile(): Promise<ValidationIssue[]> {
  const relative = "profiles/1moreblock/alerts.yml";
  const file = path.join(REPOSITORY_ROOT, relative);
  try {
    const raw = await readUtf8(file);
    const document = parseDocument(raw, { prettyErrors: true, uniqueKeys: true });
    const issues = document.errors.map((error) => ({ path: relative, message: error.message }));
    const data = document.toJS() as Record<string, unknown> | null;
    if (!data || !Array.isArray(data.Alerts)) {
      issues.push({ path: relative, message: "live profile must contain an Alerts list" });
    }
    return issues;
  } catch (error) {
    return [{ path: relative, message: (error as Error).message }];
  }
}

export async function validateRepository(): Promise<{ recipes: AlertRecipe[]; issues: ValidationIssue[] }> {
  const loaded = await loadRecipes();
  const collection = await loadCollectionConfig();
  const generated = await generateMergedAlerts(loaded.recipes);
  const liveIssues = await validateLiveProfile();
  const publicIssues = await inspectPublicTree();

  const screenshotChecks = loaded.recipes.flatMap((recipe) => recipe.metadata.screenshots.map(async (screenshot) => {
    try {
      await access(path.join(REPOSITORY_ROOT, screenshot));
      return [] as ValidationIssue[];
    } catch {
      return [{ path: recipe.relativePath, message: `missing Screenshot file ${screenshot}` }];
    }
  }));
  const screenshotIssues = (await Promise.all(screenshotChecks)).flat();

  return {
    recipes: loaded.recipes,
    issues: [...loaded.issues, ...collection.issues, ...generated.issues, ...liveIssues, ...publicIssues, ...screenshotIssues]
  };
}
