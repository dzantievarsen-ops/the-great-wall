# The Great Wall

**AI Intelligence Perimeter** — curates the AI landscape and feeds actionable intelligence into your projects.

Not a firehose. A filter.

## What It Does

The Great Wall scrapes YouTube channels, Substacks, and AI news sites twice a week. **The Watchman** (a Claude Sonnet agent acting as a PhD-level AI researcher) analyzes everything with scientific rigor — scoring significance, project relevance, actionability, and threats. You get:

- **Twice-weekly digest** (Monday + Friday) — fits on 1 A4 page. Top 5 developments, trend watch, action items.
- **Biweekly comprehensive report** — 3-4 page scientific analysis. Field overview, threat assessment, hypothesis tracking.
- **Emergency alerts** — triggered immediately for paradigm-shifting developments.

## Quick Start

```bash
git clone https://github.com/dzantievarsen-ops/the-great-wall.git
cd the-great-wall
pnpm install
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Run the pipeline
pnpm gather              # Full: scrape → analyze → digest
pnpm gather:dry          # Scrape only, no analysis
pnpm report:digest       # Generate digest from existing data
pnpm report:full         # Generate comprehensive report

# Start the dashboard
pnpm dev                 # localhost:3000
```

## Architecture

```
Sources (YouTube + Substack + AI News)
    │ Configurable CLI agents (Gemini, Claude, Codex)
    ▼
Raw Content Store (SQLite)
    │ The Watchman (Claude Sonnet — PhD-level analysis)
    ▼
Scored & Curated Intelligence
    │ Report Generator
    ▼
Digest + Report + Emergency Alerts → Email + Dashboard
```

## The Watchman

A Claude Sonnet agent with a PhD researcher mindset. For every piece of content, it evaluates:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Significance | 30% | How important for the AI field |
| Project Relevance | 30% | How relevant to your active projects |
| Actionability | 25% | Can this change what you do? |
| Threat | 15% | Does this obsolete current approaches? |

Composite >= 5.0 → digest. >= 7.0 → memory suggestion. >= 9.0 → emergency alert.

## Multi-Agent Architecture

Assign different CLI agents to different tasks via `packages/core/src/config/agents.yaml` or the UI settings page:

```yaml
task_assignments:
  scraping: gemini          # Fast content extraction
  analysis: claude          # Deep scientific analysis
  digest: claude            # Report writing
  deduplication: gemini     # Quick semantic dedup
```

## Configuration

- **Sources**: `packages/core/src/config/sources.yaml` (or edit via UI at `/sources`)
- **Agents**: `packages/core/src/config/agents.yaml` (or edit via UI at `/settings`)
- **Projects**: `packages/core/src/config/projects.yaml` (maps to your active projects)

## Scheduling

```bash
pnpm schedule:install     # Monday + Friday 07:00 via macOS launchd
pnpm schedule:uninstall   # Remove schedule
```

## Tech Stack

- TypeScript + Node.js (pnpm monorepo)
- SQLite + Drizzle ORM (local) / Turso (cloud)
- Gemini CLI + Claude Sonnet + Firecrawl
- Next.js 16 + Tailwind v4 (dashboard)
- Resend (email delivery)
- macOS launchd (scheduling)

## License

MIT
