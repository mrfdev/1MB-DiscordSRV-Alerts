# Security and privacy

## Report privately

Do not open a public issue containing a Discord bot token, webhook credential, password, account-link record, private player information, or another secret. Contact the repository owner privately through an established 1MoreBlock.com or GitHub contact channel and include only the minimum information needed to identify the affected file.

## Publication boundary

The exact 1MoreBlock Live Profile is intentionally public and may contain Discord channel IDs and server-tailored Alert behavior. That exception applies only to `profiles/1moreblock/alerts.yml`.

The repository must never contain:

- Any other file copied from the private `servers/` runtime.
- DiscordSRV bot configuration or tokens.
- Linked Discord accounts or Minecraft UUID mappings.
- Non-localhost player IP output in reusable Recipes or screenshots.
- Plugin/server JARs, security keys, databases, worlds, player data, logs, caches, or backups.

Automated checks supplement, but do not replace, a human tracked-file and secret review before every release.
