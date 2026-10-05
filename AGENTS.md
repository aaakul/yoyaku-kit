# AGENTS.md

## Project Overview

`yoyaku-kit` is a lightweight Japanese restaurant reservation and table management system built with Next.js 16 and PostgreSQL. Designed specifically for small, single-location restaurants in Japan, it provides localized usage experience.

The core domain is single-restaurant reservation management with concurrency-safe table allocation.

## Development Rules

- Read `docs/overview.md` before changing reservation logic.
- Keep business rules in server-side/domain code; never rely on UI checks for correctness.
- Preserve PostgreSQL exclusion constraints and reservation time guards.
- Use `timestamptz` and the restaurant's IANA timezone for time-related logic.
- Preserve idempotency for reservation creation.
- Keep audit logging for every reservation lifecycle change.
- Do not introduce Redis, queues, multi-tenancy, or other infrastructure without a clear requirement.
- Write concise, objective English comments only; never use subjective marketing jargon.
- Do not comment on obvious code (what the code does); only explain non-obvious rationale, business rules, or external constraints (why it is done).
- Prefer simple, readable, strongly typed implementations over unnecessary abstractions.
- Do not add dependencies unless they provide clear project value.
- Do not modify generated files or migrations manually unless required by the task.

## Reservation Invariants

- Only `confirmed` reservations occupy tables.
- `cancelled` and `no_show` reservations do not occupy tables.
- `startAt < endAt`.
- `partySize > 0`.
- Customer cancellation must respect the cancellation cutoff.
- `no_show` requires the configured grace period.
- `no_show -> confirmed` is correction-only.
- Never bypass the database exclusion constraint when creating or changing reservations.

## Testing

For reservation or concurrency changes:

- Run the relevant unit/integration tests.
- Verify affected UI flows when applicable.
- Check database constraints and migrations when schema changes are involved.

## Git

- Do not create commits unless explicitly requested.
- Do not push changes unless explicitly requested.

### Default Login Credentials

| Role    | Email               | Password   |
| ------- | ------------------- | ---------- |
| Manager | `admin@example.com` | `12345678` |
| Demo    | `demo@example.com`  | `12345678` |

## Scripts

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Start development server          |
| `pnpm build`     | Build production bundle           |
| `pnpm test`      | Run tests                         |
| `pnpm typecheck` | TypeScript typecheck              |
| `pnpm check`     | Run Biome checks                  |
| `pnpm db:init`   | Initialize database and seed data |
| `pnpm db:reset`  | Reset and seed database           |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
