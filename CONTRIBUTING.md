# Contributing

Thank you for helping make DiscordSRV Alerts easier to understand, test, and reuse.

## Request or report an Alert

Use GitHub Issues for bug reports, compatibility reports, missing triggers, and new Alert requests. Include the relevant Paper, DiscordSRV, Java, and third-party plugin versions, plus console errors with secrets removed.

## Submit a Recipe

1. Start candidates under `staging/<plugin>/<slug>.yml`.
2. Put exactly one Alert Definition in each file. Player/console, start/stop, and audience variants use separate Recipes.
3. Follow [`docs/alert-recipe-format.md`](./docs/alert-recipe-format.md).
4. Use fully qualified event class names for event triggers.
5. Use `global`, `staff`, or `logs` for reusable channel destinations.
6. Preserve all known authors, credits, origins, and prior versions.
7. Do not claim `verified` until every included variant has been triggered and observed in Discord on the recorded runtime.
8. Add authentic screenshots under `screenshots/<plugin>/<slug>/` when useful.
9. Run the repository checks before opening a pull request.

## Content that is not accepted

- Bot tokens, webhook credentials, private configuration, account-link data, or non-localhost player IP addresses.
- Server/plugin JARs, worlds, logs, databases, caches, or player data.
- Simple-name event triggers that depend on DiscordSRV's deprecated legacy listener behavior.
- Unreviewed Spring expressions or unsafe copied internet configurations.
- Third-party work without a clear permission or compatible license.
- Multiple stylistic duplicates for a behavior already covered by a Canonical Recipe.

## Build numbering

Each migrated Recipe begins at version `3.0.0`, build `001`. Increment that Recipe's build for every file change, including typo, credit, header, compatibility, trigger, condition, or output changes. Preserve legacy numbering under `Origin-Version` and `Origin-Build` instead of reusing it as the maintained revision.

## Credits

Credits are part of the Recipe, not optional decoration. Add rather than replace contributors when a Recipe evolves. Git history explains this repository's changes; the header keeps authorship and provenance attached to downloaded YAML.
