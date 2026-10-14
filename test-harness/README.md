# Test Harness

This directory documents the sanitized, publishable testing workflow. The actual Paper server lives under the ignored `servers/` directory and is never committed.

## Normal verification loop

1. Run `npm run test:deploy`. This validates every Recipe, backs up the pre-collection test file once, generates one test bundle, and forces every destination to the internal debug channel.
2. Run `discordsrv reload` from the console or in game.
3. Treat any reload warning, missing event class, expression failure, or formatting exception as a failed test.
4. Trigger every Alert variant.
5. Confirm the expected message in the private Discord debug channel.
6. Capture a deliberate Screenshot Example when it helps explain the output.
7. Before publishing, apply the Sanitization Guard so player-facing output uses `global` and staff/audit output uses `staff` or `logs`.
8. Record the exact tested versions and date in the Recipe header.

The maintainer defaults are `servers/Paper-26.2/plugins/DiscordSRV/alerts.yml` and debug channel `1266102649825001543`. Other contributors can set `DISCORDSRV_TEST_ALERTS_PATH` and `DISCORDSRV_TEST_CHANNEL_ID` without editing tracked files. Run `npm run test:restore` to restore the one-time backup, then reload DiscordSRV.

When editing a test bundle by hand, keep numeric channel IDs quoted. DiscordSRV 1.30.5 skips an unquoted numeric `Channel` value with only an Alerts debug message. The generator already writes string IDs. See the [confirmed PyroFishingPro channel comparison](../docs/pyrofishingpro.md#channel-ids-must-be-strings).

A full restart is normally unnecessary. Restart when dependency changes, Paper/DiscordSRV upgrades, or an exception leaves state that a reload cannot cleanly reset.

## Fishing-results regression check

Run `node test-harness/verify-pyrofishingpro.mjs /path/to/PyroFishingPro.jar` with Java 25+ and the initialized Test Server. An optional second argument selects another server directory. The local inspected JAR is `servers/Paper-26.2/plugins/PyroFishingPro-4.9.32.jar`; its internal version is 4.9.31. No server needs to be running, and no Discord messages are sent.

Alongside the Recipe API and formatting checks, this replays the [recorded tournament event order](../docs/pyrofishingpro-tournament-results.md) against both the staged results Recipe and the fishing-results Alert in `profiles/1moreblock/alerts.yml`. The end event sees the previous winners, then a successful private message contains the current winners. A separate case overwrites the mutable placeholders before the message is rendered. Each completed case must produce exactly one correct podium; empty standings and a no-rewards stop must produce none. The replay uses real events and DiscordSRV expressions with static placeholder fixtures. It checks configuration-to-output behavior, not live scheduler ordering or network delivery.

## Safety boundary

Never copy bot configuration, tokens, accounts, logs, databases, worlds, player data, JARs, or other generated state into this directory. Plugin dependencies are documented by name and official source only.
