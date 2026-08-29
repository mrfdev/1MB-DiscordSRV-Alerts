import "./styles.css";

type Channel = "global" | "staff" | "logs";

interface CatalogRecipe {
  id: string;
  description: string;
  plugin: string;
  version: string;
  build: string;
  channel: Channel;
  audience: string;
  triggers: string[];
  authors: string[];
  credits: string[];
  originUrls: string[];
  requiredPlugins: string[];
  verifiedRuntime: {
    discordSrv: string;
    paper: string;
    java: string;
    date: string;
  };
  screenshots: string[];
  relativePath: string;
  rawUrl: string;
  yaml: string;
}

interface CatalogData {
  collection: {
    version: string;
    build: string;
    verifiedRuntime: {
      paper: string;
      java: string;
      discordSrv: string;
    };
  };
  recipes: CatalogRecipe[];
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

const searchInput = element<HTMLInputElement>("search-input");
const pluginFilter = element<HTMLSelectElement>("plugin-filter");
const channelFilter = element<HTMLSelectElement>("channel-filter");
const recipeList = element<HTMLDivElement>("recipe-list");
const detail = element<HTMLElement>("recipe-detail");
const emptyState = element<HTMLDivElement>("empty-state");
const resultCount = element<HTMLParagraphElement>("result-count");
const releaseLine = element<HTMLDivElement>("release-line");
const clearFilters = element<HTMLButtonElement>("clear-filters");

let catalog: CatalogData | undefined;
let activeRecipeId = "";

function queryState(): { query: string; plugin: string; channel: string; recipe: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    query: params.get("q") ?? "",
    plugin: params.get("plugin") ?? "",
    channel: params.get("channel") ?? "",
    recipe: params.get("recipe") ?? ""
  };
}

function updateUrl(): void {
  const params = new URLSearchParams();
  const query = searchInput.value.trim();
  if (query) params.set("q", query);
  if (pluginFilter.value) params.set("plugin", pluginFilter.value);
  if (channelFilter.value) params.set("channel", channelFilter.value);
  if (activeRecipeId) params.set("recipe", activeRecipeId);
  const search = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}`);
}

function searchableText(recipe: CatalogRecipe): string {
  return [
    recipe.id,
    recipe.description,
    recipe.plugin,
    recipe.channel,
    recipe.audience,
    ...recipe.triggers,
    ...recipe.authors,
    ...recipe.credits,
    ...recipe.requiredPlugins
  ].join(" ").toLowerCase();
}

function filteredRecipes(): CatalogRecipe[] {
  if (!catalog) return [];
  const terms = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.recipes.filter((recipe) => {
    if (pluginFilter.value && recipe.plugin !== pluginFilter.value) return false;
    if (channelFilter.value && recipe.channel !== channelFilter.value) return false;
    const haystack = searchableText(recipe);
    return terms.every((term) => haystack.includes(term));
  });
}

function badge(text: string, variant = ""): HTMLSpanElement {
  return node("span", `badge ${variant}`.trim(), text);
}

function renderList(recipes: CatalogRecipe[]): void {
  recipeList.replaceChildren();
  emptyState.hidden = recipes.length > 0;
  resultCount.textContent = `${recipes.length} verified Recipe${recipes.length === 1 ? "" : "s"}`;

  for (const recipe of recipes) {
    const button = node("button", "recipe-row");
    button.type = "button";
    button.dataset.recipeId = recipe.id;
    button.setAttribute("aria-pressed", String(recipe.id === activeRecipeId));
    if (recipe.id === activeRecipeId) button.classList.add("active");

    const top = node("span", "recipe-row-top");
    top.append(node("strong", "recipe-name", recipe.id.split("/").at(-1)?.replaceAll("-", " ") ?? recipe.id));
    top.append(badge(recipe.plugin));
    top.append(badge(recipe.channel, `channel-${recipe.channel}`));
    button.append(top, node("span", "recipe-description", recipe.description));

    const trigger = node("code", "recipe-trigger", recipe.triggers.join(", "));
    button.append(trigger);
    button.addEventListener("click", () => {
      activeRecipeId = recipe.id;
      render();
      if (window.matchMedia("(max-width: 899px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    recipeList.append(button);
  }
}

function definitionList(entries: Array<[string, string]>): HTMLDListElement {
  const list = node("dl", "facts");
  for (const [term, value] of entries) {
    list.append(node("dt", undefined, term), node("dd", undefined, value));
  }
  return list;
}

function externalLink(label: string, href: string, className?: string): HTMLAnchorElement {
  const link = node("a", className, label);
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  return link;
}

function renderDetail(recipe: CatalogRecipe | undefined): void {
  detail.replaceChildren();
  if (!recipe) {
    detail.append(node("div", "detail-placeholder", "Choose a Recipe to inspect its trigger and YAML."));
    return;
  }

  const heading = node("div", "detail-heading");
  const titleGroup = node("div");
  titleGroup.append(node("div", "eyebrow", recipe.id), node("h2", undefined, recipe.description));
  heading.append(titleGroup, badge(`v${recipe.version} · b${recipe.build}`, "version-badge"));

  const actions = node("div", "detail-actions");
  actions.append(externalLink("Download Recipe", recipe.rawUrl, "primary-action"));
  const sourceLink = externalLink("View source", `https://github.com/mrfdev/1MB-DiscordSRV-Alerts/blob/main/${recipe.relativePath}`);
  actions.append(sourceLink);

  const triggerBlock = node("section", "detail-section");
  triggerBlock.append(node("h3", undefined, "Trigger"));
  for (const trigger of recipe.triggers) triggerBlock.append(node("code", "trigger-block", trigger));

  const facts = definitionList([
    ["Plugin", recipe.plugin],
    ["Destination", recipe.channel],
    ["Audience", recipe.audience],
    ["Authors", recipe.authors.join(", ")],
    ["Credits", recipe.credits.join(", ") || "Original author only"],
    ["Tested", `${recipe.verifiedRuntime.paper} · Java ${recipe.verifiedRuntime.java} · DiscordSRV ${recipe.verifiedRuntime.discordSrv}`],
    ["Verified", recipe.verifiedRuntime.date]
  ]);

  const requirements = node("section", "detail-section");
  requirements.append(node("h3", undefined, "Required plugins"));
  const requiredList = node("ul", "inline-list");
  for (const requirement of recipe.requiredPlugins.length ? recipe.requiredPlugins : ["Paper + DiscordSRV only"]) {
    requiredList.append(node("li", undefined, requirement));
  }
  requirements.append(requiredList);

  const origins = node("section", "detail-section");
  origins.append(node("h3", undefined, "Origins"));
  const originList = node("ul", "origin-list");
  recipe.originUrls.forEach((url, index) => {
    const item = node("li");
    item.append(externalLink(`Origin ${index + 1}`, url));
    originList.append(item);
  });
  origins.append(originList);

  const codeSection = node("section", "code-section");
  const codeHeading = node("div", "code-heading");
  codeHeading.append(node("h3", undefined, "Recipe YAML"));
  const copyButton = node("button", "copy-button", "Copy YAML");
  copyButton.type = "button";
  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(recipe.yaml);
    copyButton.textContent = "Copied";
    window.setTimeout(() => { copyButton.textContent = "Copy YAML"; }, 1600);
  });
  codeHeading.append(copyButton);
  const pre = node("pre");
  pre.append(node("code", undefined, recipe.yaml));
  codeSection.append(codeHeading, pre);

  detail.append(heading, actions, triggerBlock, facts, requirements, origins, codeSection);

  if (recipe.screenshots.length > 0) {
    const gallery = node("section", "detail-section screenshot-gallery");
    gallery.append(node("h3", undefined, "Output examples"));
    for (const screenshot of recipe.screenshots) {
      const image = node("img");
      image.src = `${import.meta.env.BASE_URL}generated/${screenshot}`;
      image.alt = `Discord output example for ${recipe.id}`;
      image.loading = "lazy";
      gallery.append(image);
    }
    detail.append(gallery);
  }
}

function render(): void {
  const recipes = filteredRecipes();
  if (!recipes.some((recipe) => recipe.id === activeRecipeId)) activeRecipeId = recipes[0]?.id ?? "";
  renderList(recipes);
  renderDetail(recipes.find((recipe) => recipe.id === activeRecipeId));
  updateUrl();
}

function hydrateFromUrl(): void {
  const state = queryState();
  searchInput.value = state.query;
  pluginFilter.value = state.plugin;
  channelFilter.value = state.channel;
  activeRecipeId = state.recipe;
}

async function loadCatalog(): Promise<void> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}generated/catalog.json`);
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    catalog = await response.json() as CatalogData;

    const plugins = [...new Set(catalog.recipes.map((recipe) => recipe.plugin))].sort();
    for (const plugin of plugins) {
      const option = node("option", undefined, plugin);
      option.value = plugin;
      pluginFilter.append(option);
    }

    releaseLine.textContent = `Collection v${catalog.collection.version}, build ${catalog.collection.build} · ${catalog.recipes.length} verified Recipe${catalog.recipes.length === 1 ? "" : "s"}`;
    hydrateFromUrl();
    render();
  } catch (error) {
    releaseLine.textContent = "Catalog unavailable";
    resultCount.textContent = error instanceof Error ? error.message : "Could not load catalog.";
    emptyState.hidden = false;
  }
}

for (const control of [searchInput, pluginFilter, channelFilter]) {
  control.addEventListener("input", render);
  control.addEventListener("change", render);
}

clearFilters.addEventListener("click", () => {
  searchInput.value = "";
  pluginFilter.value = "";
  channelFilter.value = "";
  searchInput.focus();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener("popstate", () => {
  hydrateFromUrl();
  render();
});

await loadCatalog();
