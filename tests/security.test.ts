import { describe, expect, it } from "vitest";
import { inspectRecipeBodyForPrivateData } from "../src/security.js";

describe("Publication guard", () => {
  it("allows logical channel names", () => {
    expect(inspectRecipeBodyForPrivateData("Channel: staff", "recipe.yml")).toEqual([]);
  });

  it("detects Discord webhook credentials", () => {
    const webhook = ["https://discord.com/api", "webhooks", "12345678901234567", "secret-webhook-value"].join("/");
    const issues = inspectRecipeBodyForPrivateData(
      webhook,
      "recipe.yml"
    );
    expect(issues.some((issue) => issue.message.includes("webhook"))).toBe(true);
  });
});
