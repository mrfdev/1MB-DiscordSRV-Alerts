# Alert Recipe format

An Alert Recipe is one YAML file containing exactly one Alert Definition for one behavior or use case. It contains a standardized commented header followed by one independently valid DiscordSRV `Alerts:` list. Player/console or on/off variants are separate files. The release generator removes each Recipe wrapper and combines the definitions beneath one top-level `Alerts:` key.

## Header

The header uses one `# Field: value` per line. Repeat `Credit`, `Origin-URL`, `Required-Plugin`, and `Screenshot` as needed.

```yaml
# Alert-ID: cmi/nick-change
# Description: Reports a CMI nickname change to staff.
# Plugin: CMI
# Alert-Version: 3.0.0
# Alert-Build: 001
# Status: candidate
# Authors: mrfloris
# Credit: Zrips for CMI API guidance
# Origin-URL: https://github.com/mrfdev/CMI/...
# Origin-Version: 0.2.5
# Origin-Build: 021
# License: GPL-3.0-or-later
# Audience: staff
# Channel: staff
# Verified-DiscordSRV: unverified
# Verified-Paper: unverified
# Verified-Java: unverified
# Required-Plugin: CMI unverified
# Verified-Date: unverified
# Screenshot: screenshots/cmi/nick-change/default.png

Alerts:
  - Trigger: com.Zrips.CMI.events.CMIPlayerNickNameChangeEvent
    Async: true
    Conditions: []
    Channel: staff
    IgnoreCancelled: true
    Content: ""
    Webhook:
      Enabled: false
    Embed:
      Enabled: true
      Description: "..."
```

## Required behavior fields

Every Alert entry explicitly declares:

- `Trigger`
- `Async`
- `Conditions`
- `Channel`
- `IgnoreCancelled`
- `Content`
- `Webhook.Enabled`
- `Embed.Enabled`

Only include additional webhook and embed fields when used. Event triggers use exact-case fully qualified class names. Command triggers begin with `/` and use lowercase command names.

Reusable channels are `global`, `staff`, and `logs`. Numeric channel IDs are rejected outside the 1MoreBlock Live Profile.

## Verification

A candidate becomes verified only after its YAML and metadata pass validation, every event class resolves against the tested dependencies, every condition is reviewed, and every included variant is reloaded, triggered, and observed in the private Discord debug channel.
