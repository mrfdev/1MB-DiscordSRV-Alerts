# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Before exploring, read these

- `CONTEXT.md` at the repository root.
- Relevant decisions under `docs/adr/`.

If these files do not exist, proceed silently. The `domain-modeling` skill creates them lazily when terminology or architectural decisions are resolved.

## File structure

This is a single-context repository:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
└── src/
```

## Use the glossary's vocabulary

Use canonical terms from `CONTEXT.md` in issues, documentation, tests, and implementation discussions. Avoid synonyms that the glossary explicitly rejects.

If a required concept is missing, determine whether the language is unnecessary or whether the glossary has a genuine gap.

## Flag ADR conflicts

If proposed work contradicts an existing ADR, identify that conflict explicitly instead of silently overriding the recorded decision.
