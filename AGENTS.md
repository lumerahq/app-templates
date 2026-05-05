# Lumera App Templates

This repository is now a legacy compatibility mirror for older published
`@lumerahq/cli` versions that still download templates from GitHub.

The active template source lives in the Lumera monorepo:

```text
devkit/packages/cli/templates/default/
```

## Current policy

- Lumera supports one scaffold template: `default`.
- Do not add finance/demo templates here.
- New template development happens in the monorepo next to `@lumerahq/cli` and
  `@lumerahq/ui` so package and template changes land together.
- Keep this repo available for old CLIs until we are comfortable deleting or
  archiving it.

## Compatibility behavior

Older CLIs fetch this repo and scan directories with `template.json`. Because
only `default/template.json` remains, old `lumera init <name> -y` flows keep
working while legacy `-t invoice-processing` style flows fail clearly as no
longer supported.

## Validation

```bash
./scripts/validate-templates.sh
./scripts/build-public-artifact.sh
```

The public artifact workflow may remain until all old consumers are gone.
