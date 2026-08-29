export const VALID_CANDIDATE = `# Alert-ID: bukkit/player-join
# Description: Announces a player join.
# Plugin: Bukkit
# Alert-Version: 3.0.0
# Alert-Build: 001
# Status: candidate
# Authors: mrfloris
# License: GPL-3.0-or-later
# Audience: player
# Channel: global
# Verified-DiscordSRV: unverified
# Verified-Paper: unverified
# Verified-Java: unverified
# Verified-Date: unverified

Alerts:
  - Trigger: org.bukkit.event.player.PlayerJoinEvent
    Async: true
    Conditions: []
    Channel: global
    IgnoreCancelled: true
    Content: "{name} joined the server."
    Webhook:
      Enabled: false
    Embed:
      Enabled: false
`;
