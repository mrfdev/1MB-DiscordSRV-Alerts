# 1MoreBlock Live Profile

`alerts.yml` is an exact recovery-ready copy of the Alert file maintained for the 1MoreBlock.com live server. It intentionally includes server-specific Discord channel IDs and tailored behavior.

This profile:

- Is public for review, fixes, versioning, and emergency restoration.
- Is not sanitized or generalized.
- Is not recommended for installation on another server.
- Is excluded from the release ZIP, generated reusable `alerts.yml`, and searchable public catalog.
- Is the only file that may be copied from the private Test Server into this repository.

No DiscordSRV bot configuration, account links, credentials, logs, worlds, databases, plugin JARs, or other server runtime data may be added here.

## Fishing-results installation

The 2026-10-14 fishing-results correction was written to the live server files at the maintainer's request: DiscordSRV `config.yml`, DiscordSRV `alerts.yml`, and PyroFishingPro `tournaments.yml`. The live fishing-results Alert matches the definition in this profile. The new Alert replaces the old end-event Alert, which read the previous tournament's winner placeholders. The maintainer subsequently ran `discord reload` and restarted the server; startup completed at 08:37 Europe/Amsterdam on 2026-10-14.

The post-restart read-only check confirmed all three edited files remained byte-for-byte intact, all four Pyro end commands were in order, and exactly one captured-results Alert targeted `global`. DiscordSRV connected and registered 38 Alerts. The `onemb` provider registered successfully, and the three static fishing placeholders were enabled without duplicate keys. Discord API permission checks confirmed the bot can view and send in `#logs-debug` and can send embeds in public `#server-chat`. No server commands or test Discord messages were sent by the check. A normal completed tournament remains the final end-to-end delivery confirmation.

The runtime is `/Users/floris/MinecraftServer/live-1mb-3.14.1-mc-26.3` on the maintainer's live mini (the configured SSH connection here is `m4pro-mini`). Originals are backed up under `backups/codex-fishing-results-20261014T062947416015Z/` within that runtime, preserving the `plugins/` paths. The configuration below records the installed edits for recovery.

Use the existing `#logs-debug` channel (`1266102649825001543`) for helper messages. Append this entry at the end of DiscordSRV's existing `Channels:` section in `config.yml`, preserving `global`, all other mappings, and their order:

```yaml
  pfp-results: '1266102649825001543'
```

`pfp-results` is the configuration key used by the Alert to recognize helper messages. It points to the existing `#logs-debug` channel; no new Discord channel is needed. The podium embed keeps `Channel: global`, which sends it to public `#server-chat`.

In PyroFishingPro's `tournaments.yml`, append this final entry under `Settings.Commands.StopCommands`, after the three existing `_placeholders set fishing pfp_*` commands. Preserve other end commands:

```yaml
      - 'discordsrv broadcast #1266102649825001543 [PFP-PLACEHOLDERS-v1]|%name%|%onemb_pfp_first%|%onemb_pfp_second%|%onemb_pfp_third%'
```

The files above are installed, and the maintainer has already run this console command and completed the server restart. No further setup commands are needed. For future installation or recovery, the DiscordSRV reload command is:

```text
discord reload
```

No placeholder setup commands are needed; the three existing placeholders and their update commands are retained. For future tournament-file edits, use the next planned server stop/start to load them: the maintainer reported that `fish reload` did not load this edit. During installation, reloading DiscordSRV before Pyro loads the final command temporarily pauses end/podium announcements. That waiting period is now over. Normal completed tournaments are configured to send the helper to `#logs-debug` and the winner embed to public `#server-chat` through `global`.
