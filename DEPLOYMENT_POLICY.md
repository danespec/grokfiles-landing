# Grok Archive Hub deployment policy

## Canonical source repository

This repository is the canonical source and recovery history.
It is not a Cloudflare Pages deployment directory.

## Prohibited command

Never deploy the repository root with:

    wrangler pages deploy .

Only a separately generated, validated, allowlisted package may be deployed.
Quarantined directories and recovery workspaces are never deployment sources.
