import { defineConfig } from "vite";

export default defineConfig({
  root: "site",
  base: process.env.GITHUB_ACTIONS ? "/1MB-DiscordSRV-Alerts/" : "/",
  publicDir: "public",
  build: {
    outDir: "../dist/site",
    emptyOutDir: true
  }
});
