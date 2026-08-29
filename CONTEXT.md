# DiscordSRV Alert Collection

This project curates, verifies, documents, and distributes DiscordSRV Alerts for modern Paper servers, including Alerts developed or evaluated for 1MoreBlock.com.

## Language

**Alert Definition**:
A single DiscordSRV Alert, including its trigger, conditions, and Discord output.
_Avoid_: Alert snippet, rule

**Alert Recipe**:
A canonical YAML file implementing exactly one Alert Definition for one behavior or use case. Player/console, on/off, audience, or output variants are separate Alert Recipes, even when they use the same event class or command.
_Avoid_: Trigger file, per-event bundle, Plugin Pack

**Canonical Recipe**:
The single maintained reusable Alert Recipe selected after exact duplicates and stylistic variants for the same behavior have been reconciled.
_Avoid_: Alternative style, superseded variant, 1MoreBlock Live Profile

**Curated Catalog**:
The supported set of reviewed and verified Canonical Recipes.
_Avoid_: Main archive, supported archive

**Release Archive**:
A versioned ZIP containing the Curated Catalog's individual Alert Recipe files in their plugin directories.
_Avoid_: Per-plugin ZIP, per-alert ZIP

**Complete Alerts File**:
A generated, deployable `alerts.yml` containing every reusable Alert Definition in the Curated Catalog.
_Avoid_: 1MoreBlock Live Profile, per-plugin bundle

**Live Profile**:
A deployable selection of Alert Definitions curated for one Minecraft server; it is not a complete catalog.
_Avoid_: Complete Alerts File, canonical list

**1MoreBlock Live Profile**:
The intentionally public, recovery-ready `alerts.yml` used by 1MoreBlock.com, including its server-specific channel IDs and behavior. It is excluded from the Release Archive and Complete Alerts File and is not recommended for reuse by other servers.
_Avoid_: Private configuration, Complete Alerts File, generic example

**Public Alert Definition**:
A generalized and verified Alert Definition intended for reuse by other server owners. It contains no 1MoreBlock channel IDs or player IP-reporting behavior.
_Avoid_: 1MoreBlock Live Profile, raw live alert

**Modern Alert Definition**:
A Public Alert Definition targeting DiscordSRV 1.30.5's built-in Alerts v1 schema and using fully qualified event class names. It does not use the separate DiscordSRV Ascension Alerts schema.
_Avoid_: Ascension Alert, simple-name event trigger, legacy Alert

**Alert Build**:
The monotonically increasing revision number of an Alert Recipe. Every change to its YAML file, including comments, credits, compatibility notes, or typo fixes, creates a new Alert Build.
_Avoid_: Git commit, collection release

**Alert Version**:
The maintained major, minor, and patch version of a reusable Alert Recipe. Migrated Public Alert Definitions begin at version `3.0.0`, independently of their preserved Origin Revision.
_Avoid_: Alert Build, Origin Revision

**Origin Revision**:
The version and build recorded by an Alert's source before migration into this repository. It is preserved as provenance and never incremented by this project.
_Avoid_: Alert Version, current build

**Format Showcase**:
A tested set of Alert Definitions and captured Discord examples demonstrating presentation styles supported by DiscordSRV 1.30.5.
_Avoid_: Unsupported-feature demo, pagination test, fake Discord output

**Screenshot Example**:
A real Discord message captured from a tested Alert Definition and referenced by that Alert's metadata header.
_Avoid_: Rendered mockup, unverified example

**Collection Release**:
A deliberately published, validated snapshot containing the Release Archive and Complete Alerts File.
_Avoid_: Every commit, unvalidated main branch

**Recipe Status**:
The lifecycle classification `candidate`, `verified`, or `link-only`. Only verified Alert Recipes are eligible for a Collection Release.
_Avoid_: Alert Version, compatibility guarantee

**Verified Recipe**:
An Alert Recipe whose schema, triggers, conditions, dependencies, and every included variant have been validated and observed on the Verified Runtime.
_Avoid_: Candidate Recipe, statically valid Recipe

**Collection Build**:
The monotonically increasing build number of Collection Releases. It advances for every release independently of individual Alert Builds.
_Avoid_: Alert Build, Git commit

**Catalog Site**:
The static GitHub Pages website generated from Alert Recipe headers and Screenshot Examples for searching, filtering, and downloading the collection.
_Avoid_: Dynamic application, authoritative source

**Verified Runtime**:
The exact Paper, Java, and DiscordSRV versions against which the Curated Catalog has been tested.
_Avoid_: Guaranteed future compatibility, latest-compatible

**Test Server**:
The private local Paper runtime used to validate Alert Definitions; none of its contents are published.
_Avoid_: Test Harness, public server scaffold

**Test Harness**:
The sanitized, reproducible scripts, templates, fixtures, and instructions used to exercise Alert Definitions without publishing the Test Server.
_Avoid_: Test Server, server copy

**Sanitization Guard**:
The publication check that converts Test Server destinations and other server-specific values into reusable logical channels and rejects unsafe public content. It does not modify the 1MoreBlock Live Profile.
_Avoid_: Test deployment, manual channel reinjection
