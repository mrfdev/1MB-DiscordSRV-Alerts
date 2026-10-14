# PyroFishingPro Alert Recipes

These four candidate Recipes target the **built-in PyroFishingPro 4.9.31 API** and DiscordSRV 1.30.5 Alerts v1. They require PyroFishingPro and its PyroLib dependency. Jobs Reborn, PlaceholderAPI, and the standalone PyroAPI plugin are not required.

| Recipe | Behavior | Channel |
| --- | --- | --- |
| [Custom fish catch](../staging/pyrofishingpro/custom-fish-catch.yml) | Every custom catch, including rare tiers and Hotspot bonus fish | `logs` |
| [Rare fish catch](../staging/pyrofishingpro/rare-fish-catch.yml) | Platinum, Mythical, or Divine tier, matched case-insensitively | `global` |
| [Tournament start](../staging/pyrofishingpro/tournament-start.yml) | Start notification using the tournament name | `global` |
| [Tournament end](../staging/pyrofishingpro/tournament-end.yml) | End notification using the tournament name | `global` |

An additional [tournament results Recipe](../staging/pyrofishingpro/tournament-results.yml) supplies three winner fields through the existing 1MB placeholders and a private Discord message. It replaces the simple end notification and additionally requires PlaceholderAPI and 1MB Library Core/Placeholders. See the [configuration and local timing tests](pyrofishingpro-tournament-results.md): using live winner placeholders directly in `TournamentEndEvent` was proven to read the previous results.

The catch log includes rare catches deliberately. Installing both catch Recipes sends a rare catch to both destinations. Mapping them to the same Discord channel produces two messages for that catch. The log can be busy; install only the rare Recipe if that is the desired volume. Edit its tier allowlist to include Diamond or another tier. Hotspot bonus fish remain separate catch events.

Catch output uses the fish item's display name with legacy Minecraft formatting removed, falling back to its numeric fish number when there is no display name. Player names appear in inline code so underscores remain visible. These Recipes inspect the event synchronously (`Async: false`); DiscordSRV queues Discord delivery. They do not change items, player state, or tournament rewards.

## Compatibility evidence

Inspected on 2026-09-09:

| Artifact | Evidence | Result |
| --- | --- | --- |
| Local JAR internally reporting `4.9.31` | `plugin.yml` and public class signatures | Contains all three legacy event classes below |
| Spigot download internally reporting `4.9.33` | `plugin.yml` and JAR class inventory | Missing the public legacy API classes; incompatible with these Recipes |
| Standalone PyroAPI `v1.0.0` | Official release notes and source | PyroFishingPro integration still pending; targets PFP `4.10.0+` |

The inspected 4.9.31 artifact was named `PyroFishingPro-4.9.32.jar` on disk, but its own `plugin.yml` reports **4.9.31**. Its SHA-256 is `58bb7db4c72e3097d552aefbfd1e5b94fe9c841c3d07b797d88bbbc3c7fc1352`. Compatibility is based on that artifact and its actual class signatures, not its filename. No plugin binary is distributed here, and a shared version string alone does not prove two builds are identical.

The [Jobs Reborn integration](https://github.com/Zrips/Jobs/blob/91c1f27e108da18f4fbd33f7a68100016ce85186/src/main/java/com/gamingmesh/jobs/hooks/pyroFishingPro/PyroFishingProListener.java) independently demonstrates the legacy catch event and its `getTier()` and `isHotspot()` methods. Its [build dependency](https://github.com/Zrips/Jobs/blob/91c1f27e108da18f4fbd33f7a68100016ce85186/pom.xml) is an older 4.9.1 API artifact; the Recipes use the inspected 4.9.31 signatures:

| Event class | Available data used here |
| --- | --- |
| `me.arsmagica.API.PyroFishCatchEvent` | `getPlayer()`, `getTier()`, `getFishNumber()`, `isHotspot()`, `getItemStack()` |
| `me.arsmagica.API.TournamentStartEvent` | `getName()` |
| `me.arsmagica.API.TournamentEndEvent` | `getName()` |

All three extend Bukkit `Event` and provide their own handler lists. None implements `Cancellable` in the inspected build, so `IgnoreCancelled: true` does not create a cancellation guarantee. A catch notification reports the plugin's catch event, not durable inventory delivery. The end event exposes no duration, leaderboard, winner, or reward-delivery flag; the Recipe cannot infer those details or distinguish a forced stop from a natural ending.

The author [acknowledged the 4.9.33 legacy-API packaging issue](https://www.spigotmc.org/threads/jobs-reborn.50989/page-315) on 2026-09-04. Installing standalone PyroAPI alongside 4.9.33 does not restore the missing legacy events. The [PyroAPI release notes](https://github.com/PyroTempus/PyroAPI/releases/tag/v1.0.0) explicitly exclude PyroFishingPro support pending its corresponding release. The [new API source](https://github.com/PyroTempus/PyroAPI/tree/fd78f7b9bb0ed7b39adae17ff4d444cd0d097f7d/src/me/PyroAPI/Events/PyroFishingPro) uses different class and accessor names; it is not a drop-in substitute.

## Level milestones

Level milestones are **not implemented**. The inspected 4.9.31 JAR exposes no public fishing level-up event, and its bundled configuration provides no documented level-up command callback. A current-level placeholder does not establish that a player has just crossed a milestone: testing divisibility on every catch would repeatedly announce the same level, and catch timing relative to XP application is not established.

A reliable implementation needs an authoritative level-change hook, or a separate bridge that observes committed level changes and persists the last announced milestone by server UUID. It must handle XP from sources other than catches, skipped levels, reconnects, resets, and restarts. An API getter alone, including the one in the future PyroAPI interface, does not provide those guarantees. No speculative level-up trigger or state-changing expression is included.

## Verification and installation

These Recipes remain in `staging/` while the remaining variants below are checked. API inspection and offline expression checks are not runtime verification.

On 2026-09-09, the maintainer confirmed a live custom catch after quoting the destination channel ID. The supplied [custom-catch screenshot](../screenshots/pyrofishingpro/custom-fish-catch/live-catch-and-tournaments.png) shows a Bronze Bubbly Fish with no Hotspot bonus, including the expected player name, fish name, tier, and timestamp. Successful [tournament start](../screenshots/pyrofishingpro/tournament-start/default.png) and [tournament end](../screenshots/pyrofishingpro/tournament-end/default.png) screenshots were also supplied. These observations establish basic delivery; they do not establish rare-tier filtering, Hotspot behavior, or every tournament transition listed below.

Run `node test-harness/verify-pyrofishingpro.mjs /path/to/PyroFishingPro.jar` for an offline check against a local JAR. An optional second argument selects another initialized Paper test-server directory. The check uses the collection's exact Paper API target and local DiscordSRV formatter, constructs the real legacy and DiscordSRV event classes, and exercises tier selection, Hotspot catches, missing item names, Minecraft colors, Java/Bedrock names, tournament output, and the result snapshot guards. It rejects missing API classes before compiling and never starts the plugin or sends a Discord message.

1. Check the actual server JAR for the three event classes above. Keep the existing plugin versions when trying these Recipes; the downloaded 4.9.33 cannot run them.
2. Leave PyroFishingPro's `Settings.General.DisableEvents` at its documented `false` default while testing custom events. Its bundled configuration describes this switch as disabling custom events. This setting is separate from the channel type issue below.
3. Copy each selected Recipe's single `Alerts:` entry into a backed-up DiscordSRV `alerts.yml`. Route all four to the private debug channel during testing, **quoting the numeric channel ID**, then run `discordsrv reload`.
4. Catch a normal custom fish and confirm only the log Recipe fires. Catch Platinum, Mythical, and Divine fish and confirm the rare Recipe qualifies. Check mixed-case tier IDs, a Hotspot bonus catch, and a fish without a display name. Vanilla catches must not produce these alerts.
5. Observe both scheduled and manual tournament starts, natural endings, a forced stop, and an empty tournament. Confirm that the old plugin actually emits each transition and that no duplicate notifications occur.
6. Review console output for missing event classes or expression errors and inspect the actual Discord messages. Record the exact Paper, Java, DiscordSRV, PyroFishingPro, and PyroLib versions before promoting Recipes to `alerts/`.

The 1MoreBlock Live Profile is maintained separately. Adding candidates here does not deploy them to that profile or a running server.

### Channel IDs must be strings

When replacing a logical destination with a Discord channel ID, keep the ID in single or double quotes. Replace the placeholder below with the actual digits, preserving the quotes:

```yaml
Channel: 'YOUR_DISCORD_CHANNEL_ID'
```

An unquoted all-digit scalar becomes a YAML number. [DiscordSRV 1.30.5's channel resolver](https://github.com/DiscordSRV/DiscordSRV/blob/v1.30.5/src/main/java/github/scarsz/discordsrv/modules/alerts/AlertListener.java#L452-L507) accepts a string or a list; a numeric scalar yields no destinations. It skips delivery with an Alerts debug message containing `no target channel was defined/found (channels: [])`, rather than a normal console error. A successfully registered trigger alone does not prove its channel can be resolved.

A controlled local comparison on Paper 26.2 build 120, Java 25.0.4, and DiscordSRV 1.30.5 confirmed this on 2026-09-09. The same `/version PyroFishingPro` control alert and command were used twice, changing only the channel quoting and reloading DiscordSRV each time. The numeric form produced the debug skip and no control message; restoring the quoted form delivered the control message. The maintainer independently confirmed the corresponding catch alert working on live.

The reusable Recipes already use string destinations (`global` and `logs`). The generated test bundle also preserves numeric-looking IDs as strings, covered by the existing test-harness regression check.
