# 1MB DiscordSRV Alerts

A curated, tested collection of DiscordSRV Alerts for modern Paper servers, including Alerts developed, evaluated, or used on the [1MoreBlock.com](https://1moreblock.com/) Minecraft server.

The collection turns years of standalone snippets, live-server configurations, community contributions, and experiments into consistent Alert Recipes that are searchable, credited, versioned, and tested.

## Browse the collection

- [Search the Alert catalog](https://mrfdev.github.io/1MB-DiscordSRV-Alerts/)
- Browse verified Recipes under [`alerts/`](./alerts/)
- Download the latest release ZIP or generated `alerts.yml` from [Releases](https://github.com/mrfdev/1MB-DiscordSRV-Alerts/releases)

The catalog is published after the first verified Recipes are ready. Until then, the repository files are the source of truth.

## Supported target

The initial Verified Runtime is:

- Paper 26.2, currently verified on build 120
- Java 25 or newer as required by Paper 26.2
- DiscordSRV 1.30.5 Alerts v1

Event triggers use fully qualified class names, as required by modern DiscordSRV. A Recipe records any additional plugin and version needed to test it.

Compatibility with later releases is not assumed. The recorded versions describe what was actually tested.

## Install one Alert Recipe

1. Back up `plugins/DiscordSRV/alerts.yml`.
2. Open the Recipe under `alerts/<plugin>/`.
3. Copy its single entry from the Recipe's `Alerts:` list into the `Alerts:` list in your file.
4. Map the Recipe's logical `global`, `staff`, or `logs` channel in DiscordSRV's `config.yml`, or deliberately change the Recipe for your server.
5. Run `discordsrv reload` and check the console for errors.
6. Trigger the event and confirm the Discord output before relying on it.

Alert conditions and expressions are trusted executable configuration. Review imported or modified expressions instead of installing unfamiliar files blindly.

## Install the complete collection

Each GitHub release provides:

- A ZIP containing every verified Recipe under its plugin directory.
- A generated `alerts.yml` containing the reusable collection merged beneath one top-level `Alerts:` key.

The complete file excludes the exact 1MoreBlock Live Profile and player-IP reporting. It is a convenience download, not a recommended preset for every server: review its events, channels, permissions, plugin requirements, message volume, and performance before use.

## 1MoreBlock Live Profile

[`profiles/1moreblock/alerts.yml`](./profiles/1moreblock/alerts.yml) is the exact recovery-ready file maintained for the 1MoreBlock.com live server. It intentionally contains server-specific Discord channel IDs and tailored behavior. It is public for versioning and recovery, but it is not a general-purpose configuration and is never included in collection downloads.

No bot configuration, token, account links, server logs, worlds, databases, JARs, or other runtime data belong in this repository.

## Repository layout

```text
alerts/                  verified current Alert Recipes
staging/                 candidates awaiting runtime verification
research/sources.yml     link-only external discoveries
profiles/1moreblock/     exact public 1MoreBlock alerts.yml only
screenshots/             real tested Discord output examples
test-harness/            sanitized testing documentation and helpers
site/                    static catalog source
servers/                 private local test runtime, always ignored
```

## Contributing

Bug reports, Alert requests, and migration work are tracked in [GitHub Issues](https://github.com/mrfdev/1MB-DiscordSRV-Alerts/issues). Pull requests are welcome for new Recipes, fixes, credits, screenshots, and documentation.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting an Alert. Every Recipe must preserve its origin and credits, use the standardized metadata header, target DiscordSRV 1.30.5 Alerts v1, and include honest test status.

## Reporting security or privacy problems

Do not open a public issue containing credentials, tokens, webhooks, account links, player IP addresses, or other private data. Follow [SECURITY.md](./SECURITY.md).

## License

Project-owned Alert Recipes, tooling, and documentation are licensed under GPL-3.0-or-later unless a file records a different compatible origin license. Per-Recipe credits and origin notices must remain intact. See [`LICENSE`](./LICENSE).
