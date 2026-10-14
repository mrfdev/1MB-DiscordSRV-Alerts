# Tournament winner embeds through 1MB placeholders

The existing three placeholders can supply a tournament podium embed, but the **4.9.31 `TournamentEndEvent` fires before `StopCommands` updates them**. Reading `%onemb_pfp_first%` directly in that event's Alert can announce the previous tournament's winners.

The tested replacement keeps the three `_placeholders set` commands, then sends their current values to a private Discord channel. DiscordSRV's successful-send event triggers the public embed. Its fields read the captured values from that private message, so later placeholder updates cannot change the tournament being announced.

This adds one private text message per tournament with results. Players see the orange end embed with three inline medal fields. The [Alert Recipe](../staging/pyrofishingpro/tournament-results.yml) retains the existing title, description, color, and timestamp. DiscordSRV can reload its mapping and Alert; the maintainer's live Pyro tournament configuration must wait for the next planned server restart. No production bridge plugin is needed.

## Follow-up on the stale-winner report, 2026-10-14

The repository's 1MoreBlock Live Profile still used `TournamentEndEvent` with the three live `%onemb_pfp_*%` placeholders when this report was investigated. The saved Test Server trace shows the same failure: the event saw `OLD_First`, `OLD_Second`, and `OLD_Third`; the StopCommands then stored the current winners; Discord received the old names. The in-game results and the eventual placeholder values can therefore both be correct while the embed is wrong.

The profile now contains the captured-results Alert below. At the maintainer's request, the matching live DiscordSRV mapping, fishing-results Alert, and final Pyro StopCommand were written on 2026-10-14 with backups. The maintainer then ran `discord reload` and restarted the server; startup completed at 08:37 Europe/Amsterdam. A read-only post-restart check confirmed the edits survived, the provider and DiscordSRV started successfully, all three placeholders exist and are enabled, and the bot has the required permissions in both destinations. No test tournament or manual Discord broadcast was executed. **Installation and restart are complete; normal tournament delivery remains to be observed.** See the [server-specific installation record](../profiles/1moreblock/README.md#fishing-results-installation).

`Async: true` does not guarantee that placeholder updates have finished. [DiscordSRV 1.30.5's Alert listener](https://github.com/DiscordSRV/DiscordSRV/blob/v1.30.5/src/main/java/github/scarsz/discordsrv/modules/alerts/AlertListener.java) queues asynchronous Alert processing without waiting for Pyro's StopCommands; `Async: false` processes the event immediately. Neither setting establishes the required ordering. The replacement captures the result after the three updates, then renders that captured value even if the placeholders change again while Discord delivery is pending.

There is no PyroFarming tournament Alert in this repository. These findings and the replacement apply to fishing only.

The offline harness now replays the recorded event order against both the staged Recipe and the actual profile. Before the profile change, it failed with `expected [Fresh_First, FreshSecond, .FreshThird] but rendered [OLD_First, OLD_Second, OLD_Third]`. After the change, all **503 checks** passed, including three winners, one winner, a later placeholder overwrite, empty standings, and a no-rewards stop. `npm run check` also passed. These offline checks used the same inspected 4.9.31 JAR and Java 25; they did not start a server or send Discord messages. The replay protects the configuration-to-output behavior; the earlier runtime evidence below establishes event ordering for that build.

The installed live JAR now reports PyroFishingPro **4.9.35**, with PyroLib **1.6.0**. Static inspection confirmed the same StopCommands tokens, ordered dispatch on Paper, and no tournament-file rewrite in the normal shutdown path. This is compatibility evidence, not a live delivery test. The maintainer reported that `fish reload` did not pick up `tournaments.yml`; this guide therefore uses the next planned restart to activate the Pyro edit and makes no reload-only guarantee.

## Configuration and activation

**Runtime-test scope:** the September timing tests below exercised only the local Test Server. The live library core JAR was copied read-only to match that installed build locally. The later October live file installation is recorded above and did not run any server commands.

The following steps describe the required configuration for installation or recovery.

### 1. Keep the existing placeholders

The three static placeholders must exist and be enabled:

| Category | Key | Placeholder |
| --- | --- | --- |
| `fishing` | `pfp_first` | `%onemb_pfp_first%` |
| `fishing` | `pfp_second` | `%onemb_pfp_second%` |
| `fishing` | `pfp_third` | `%onemb_pfp_third%` |

They were already created in the reported setup. If installing elsewhere, create them once using `_placeholders add fishing pfp_first N/A`, and the equivalent commands for `pfp_second` and `pfp_third`.

### 2. Map the helper messages to a debug channel

Append this entry at the end of the existing `Channels:` section of DiscordSRV's `config.yml`; preserve the existing `global` mapping, other entries, and their order:

```yaml
Channels:
  pfp-results: 'PRIVATE_DISCORD_CHANNEL_ID'
```

Replace `PRIVATE_DISCORD_CHANNEL_ID` with the actual numeric ID, keeping the YAML quotes. The bot must be able to view and send messages in this channel. Use a private staff/debug destination for this mapping and the following command.

An existing debug channel is sufficient; `pfp-results` is only an additional configuration key pointing to that channel. The public podium keeps `Channel: global`. The [1MoreBlock installation instructions](../profiles/1moreblock/README.md#fishing-results-installation) include the maintainer's selected `#logs-debug` destination and exact command.

### 3. Add the final StopCommand

Under the existing `Settings.Commands.StopCommands` in PyroFishingPro's `tournaments.yml`, retain the three updates in this order and append the broadcast. Preserve any other existing end commands.

```yaml
Settings:
  Commands:
    StopCommands:
      - '_placeholders set fishing pfp_first %first_name%'
      - '_placeholders set fishing pfp_second %second_name%'
      - '_placeholders set fishing pfp_third %third_name%'
      - 'discordsrv broadcast #PRIVATE_DISCORD_CHANNEL_ID [PFP-PLACEHOLDERS-v1]|%name%|%onemb_pfp_first%|%onemb_pfp_second%|%onemb_pfp_third%'
```

Use the same actual channel ID after `#`. DiscordSRV's broadcast argument resolves an actual Discord channel ID or name; it does not resolve the `pfp-results` mapping key. Keep this command on one line and preserve the `|` separators.

Pyro replaces `%name%` and its winner tokens. [DiscordSRV 1.30.5's broadcast implementation](https://github.com/DiscordSRV/DiscordSRV/blob/v1.30.5/src/main/java/github/scarsz/discordsrv/commands/CommandBroadcast.java) then expands the PlaceholderAPI tokens before queuing that private message. This is the moment at which the three values are captured.

### 4. Replace the old end Alert

Replace the `me.arsmagica.API.TournamentEndEvent` entry with the single `Alerts:` entry from [tournament-results.yml](../staging/pyrofishingpro/tournament-results.yml). Keep the surrounding `Alerts:` list and unrelated alerts intact.

The replacement uses `Channel: global` for the public embed. The private text message triggers `DiscordGuildMessageSentEvent` only after DiscordSRV sends it successfully. The Alert checks the private channel, sending bot, marker, number of values, and absence of unresolved placeholders. Embed messages do not qualify, preventing the output from triggering itself.

The fields deliberately use the captured message values instead of reading `%onemb_*%` again. The placeholders still supply those values in the final StopCommand. Re-reading them when Discord's network request finishes would introduce another timing race.

### 5. Reload DiscordSRV; activate Pyro at the next planned restart

After installing all three file changes, run this in the server console, without a leading slash:

```text
discord reload
```

This loads DiscordSRV's channel mapping and replacement Alert. It does not load Pyro's changed StopCommands. Leave the running server up and let its next planned stop/start load `tournaments.yml`. After reloading DiscordSRV and until that restart, there will be no fishing end/podium announcement because the new helper command is not yet active. The three existing placeholder-update commands remain configured; no placeholder creation or reset is required for this installation. Normal tournaments after the restart can confirm live delivery without starting a test tournament.

## Behavior and limits

- One participant produces their name in first place and `N/A` in the other two fields, using the inspected Pyro defaults.
- On the inspected build, an empty tournament and a forced stop through the no-rewards end path skip `StopCommands`. This replacement sends no end/podium embed for those cases, even if old placeholder values still exist.
- The result does not certify that reward commands delivered their rewards. Pyro runs the end commands as part of its own completion path.
- Tournament/name values must not contain `|`, `;`, unresolved `%...%` tokens, dollar signs, braces, or line breaks. The Alert rejects these rather than constructing malformed fields. Normal Java names, leading-dot Bedrock names, underscores, and `N/A` were checked.
- Delivery depends on the private message succeeding. There is no persistent retry queue, outage recovery, or exactly-once guarantee in this configuration. Existing DiscordSRV behavior applies.
- Keep DiscordSRV Alerts debug disabled during ordinary use. The private channel needs no console forwarding for this setup.

## Runtime evidence, 2026-09-10

Tested with Paper `26.2-120`, Java `25.0.4`, DiscordSRV `1.30.5`, PyroFishingPro internally reporting `4.9.31`, PyroLib `1.4.9`, PlaceholderAPI `2.12.3`, and 1MB Library Core/Placeholders `1.0.3-629`, with CMI `9.8.9.9` and CMILib `1.5.9.9`.

An isolated console-only fixture supplied synthetic standings to the installed Pyro tournament manager and exercised its actual end processing, scheduler, StopCommands, installed placeholder provider, and DiscordSRV delivery. No players joined and tournament rewards were disabled. Discord messages carried `TEST SERVER` and unique `TEST PFP` markers; matching the shared bot account alone was not treated as proof of local delivery.

| Case | Actual Discord result |
| --- | --- |
| Original end event, three new winners | Failed: `OLD_First`, `OLD_Second`, `OLD_Third` appeared instead of current winners |
| Original end event, one new winner | Failed again: the old three names appeared |
| Trigger after updates, fields still reading live placeholders | Passed normally; deliberately overwriting the placeholders before rendering reproduced a second stale-value race |
| Captured-value fields under that same overwrite | Passed: retained the intended three winners |
| Final Recipe, three winners | Exactly one embed with `Fresh_First`, `FreshSecond`, `.FreshThird` |
| Final Recipe, one winner | Exactly one embed with `Fresh_First`, `N/A`, `N/A` |
| Final Recipe, empty standings | No private result message or podium embed |
| Final Recipe, forced no-rewards stop | No private result message or podium embed |
| Final Recipe, overwritten placeholders during delivery | Exactly one embed with the captured winners, despite all current placeholders being `LATER_TOURNAMENT` |

The fixture command completed each assertion in eight seconds. Original failure command: `pfpfixture run baseline-two three`. Final regression commands used `pfpfixture run final-three three`, `final-one one`, `final-empty empty`, `final-cancel cancel`, and `final-overwrite overwrite`.

The [offline harness](../test-harness/verify-pyrofishingpro.mjs) also checks the real DiscordSRV event and expression implementation, destination/author guards, malformed snapshots, field layout, and visible underscore/Bedrock names. It passed **396 checks** across all five Pyro Recipes. These parser checks complement the actual runtime test; they cannot establish event ordering by themselves.

The earlier [user-supplied screenshot](../screenshots/pyrofishingpro/tournament-end/placeholder-fields-live.png) establishes the original three-column layout. It does not prove timing: both live test tournaments had the same winner. It is preserved unchanged and is not presented as a screenshot of this replacement trigger.

The Recipe remains a candidate, with this exact tested configuration and synthetic runtime evidence recorded here. The temporary fixture JAR was removed after a clean Test Server shutdown. The local configuration remains ready for further isolated testing, with automatic tournaments, reward commands, debug logging, and console forwarding disabled.
