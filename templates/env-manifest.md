# Environment Manifest

Use this file to document environment variables and secrets required for safe execution.

## Purpose

Keep required versus optional environment inputs explicit so adoption does not depend on tribal knowledge.

## Recommended Sections

### Required Variables

For each variable, document:

- name
- purpose
- where it is used
- whether local development needs it
- whether CI or hosted execution needs it

### Optional Variables

Document convenience or feature-flag variables separately from required ones.

### Secret Sources

Document where values should come from, for example:

- GitHub Actions secrets
- cloud secret manager
- local `.env`

### Safety Notes

Document:

- whether values should never be committed
- whether production credentials are forbidden for local tasks
