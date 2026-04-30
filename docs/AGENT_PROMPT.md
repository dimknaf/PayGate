# Agent Prompt — Polish Pass

Copy and paste this as your first message to a new Cursor agent:

---

Read `docs/PLAN2.md` — it contains the full plan for 4 improvement steps to apply to this project. Execute them in order (Step 1 → 2 → 3 → 4).

Before starting, also read these files to understand the existing codebase:
- `src/lib/types.ts` — all type definitions
- `src/lib/pipeline.ts` — the enrichment pipeline (most of your changes go here)
- `src/lib/store.ts` — in-memory data store
- `src/lib/agent.ts` — Cursor SDK setup (DO NOT MODIFY)
- `src/lib/events.ts` — event emitter for SSE
- `src/components/ActivityFeed.tsx` — live activity feed component
- `src/components/InvoiceDetail.tsx` — invoice detail view
- `src/components/Dashboard.tsx` — main dashboard layout
- `src/app/globals.css` — current theme/colours
- `src/data/seed-invoices.json` — the 5 test invoices

Key constraints:
- We are on the `dev` branch. Commit after each step.
- Do NOT modify `src/lib/agent.ts`, `next.config.mjs`, `src/instrumentation.ts`, or any API route signatures.
- Do NOT change any component's props interface in a way that breaks existing callers.
- Run `npm run build` after each step to verify no errors.
- The project uses Next.js 14 (App Router), TypeScript, Tailwind CSS, and the Cursor SDK (`@cursor/sdk`).
- The `.env.local` has `CURSOR_API_KEY` and `SPECTER_API_KEY` — never commit it.
- Node version is 20.3.1. There's a `Symbol.dispose` polyfill in `instrumentation.ts` — do not remove it.

Go step by step. Be careful not to break what already works.
