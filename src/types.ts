export type RecipeStatus = "candidate" | "verified";
export type LogicalChannel = "global" | "staff" | "logs";
export type Audience = "player" | "staff" | "logs";

export interface AlertMetadata {
  alertId: string;
  description: string;
  plugin: string;
  version: string;
  build: string;
  status: RecipeStatus;
  authors: string[];
  credits: string[];
  originUrls: string[];
  originVersion?: string;
  originBuild?: string;
  license: string;
  audience: Audience;
  channel: LogicalChannel;
  verifiedDiscordSrv: string;
  verifiedPaper: string;
  verifiedJava: string;
  requiredPlugins: string[];
  verifiedDate: string;
  screenshots: string[];
}

export interface AlertRecipe {
  absolutePath: string;
  relativePath: string;
  raw: string;
  headerLines: string[];
  yamlText: string;
  listBody: string;
  metadata: AlertMetadata;
  alerts: Record<string, unknown>[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface CollectionConfig {
  version: string;
  build: string;
  verifiedRuntime: {
    paper: string;
    java: string;
    discordSrv: string;
  };
}

export interface CatalogRecord {
  id: string;
  description: string;
  plugin: string;
  version: string;
  build: string;
  channel: LogicalChannel;
  audience: Audience;
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
