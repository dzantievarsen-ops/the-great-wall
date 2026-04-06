# CLAUDE.md - The Great Wall

## What This Is

AI Intelligence Perimeter for the Voyager ecosystem. Scrapes YouTube channels, Substacks, and AI news sites. The Watchman (Claude Sonnet) curates what matters and generates reports.

## Architecture

```
packages/core/   — Scraping engine, Watchman agent, reports, storage
packages/ui/     — Next.js dashboard (local + Vercel deployable)
data/            — SQLite DB, generated reports, cache (git-ignored)
```

## Key Commands

```bash
pnpm gather              # Full pipeline: scrape → analyze → digest
pnpm gather:dry          # Scrape only, no Watchman analysis
pnpm report:digest       # Generate digest from existing data
pnpm report:full         # Generate comprehensive report
pnpm dev                 # Start UI dashboard at localhost:3000
```

## Config Files (packages/core/src/config/)

- `sources.yaml` — YouTube channels, Substacks, news sites (editable via UI)
- `agents.yaml` — CLI agent definitions + task assignments
- `projects.yaml` — Voyager project mappings for relevance scoring

## Tech Stack

- TypeScript + Node.js (pnpm monorepo)
- SQLite + Drizzle ORM (local), Turso (cloud)
- Gemini CLI (scraping), Claude Sonnet (analysis)
- Next.js 16 + Tailwind v4 (UI)
- Resend (email delivery)
- macOS launchd (scheduling)

## Conventions

- All dates in ISO 8601
- Scores are 0-10 float
- Config files are YAML
- Reports are Markdown
- Never auto-apply memory suggestions to Voyager — always human-reviewed
