# PLAN 3 — Concurrency fix (Process All / parallel POSTs)

> Branch: `fix/concurrency-pipeline-queue`

## Problem

Several symptoms when **Process All** or multiple invoices are kicked off quickly:

- Timeouts, parse failures, or **wrong risk flags**
- SSE / logs look chaotic

**Root cause:** The Cursor SDK agent is a **singleton** (`globalThis.__cursorAgent`). Each `POST /api/process-invoice` kicks off `processInvoice()` immediately without awaiting. Multiple pipelines run **in parallel** on the **same agent**, so overlapping `agent.send()` / `stream()` work **interleaves** — corrupted JSON extraction, flaky tool calls, and incorrect assessments.

Client-side spacing (e.g. 1 second between clicks) **does not** fix this: the HTTP response returns as soon as processing is **queued**, not when the pipeline **finishes**, so pipelines still overlap.

## Fix (implemented on this branch)

1. **`src/lib/pipeline-queue.ts`** — A small global Promise chain (`enqueuePipeline`) so every `processInvoice()` run **starts only after** the previous one settles (success or failure). Failures `.catch()` on the tail so **one broken job cannot stall** the queue.

2. **`src/app/api/process-invoice/route.ts`** — Replace fire-and-forget `processInvoice(invoice)` with `enqueuePipeline(() => processInvoice(invoice))`.

No change required to **`src/lib/agent.ts`** (still one agent). No API contract change for the client.

## Verification

### Automated (no Cursor API)

```bash
npm install          # installs devDependency `tsx`
npm run verify:queue
```

Runs `scripts/verify-pipeline-queue.ts`: fires 5 overlapping `enqueuePipeline` tasks and asserts **max concurrency = 1** and strict **FIFO completion order**. This validates the queue implementation used by `process-invoice`.

### Manual (full stack)

1. Fresh dev server, **Process All** on 5 seeds (or hammer 5 quick POSTs to `/api/process-invoice`).
2. Confirm invoices finish **serially** in the activity feed (no mixed vendor messages mid-run).
3. Outcomes stable vs single-invoice baseline (especially low-risk invoices not randomly HIGH).

## Optional follow-ups

- **`InvoiceQueue.tsx`**: After queue fix, shorter delay between batch POSTs or none (server backs up fairly). Optionally poll until `processing` count drops before next POST for clearer pacing (UX only).
- **UX**: Emit `queued` activity when backlog > 1 (requires passing queue depth).
- **`approve-payment`** if it ever calls the agent (currently it does not).

## Prompt for another agent

> Checkout `fix/concurrency-pipeline-queue`. Read `docs/PLAN3.md` and verify `enqueuePipeline` in `pipeline-queue.ts` wraps all `processInvoice` entry points. Run Process All locally and confirm no overlapping agent work. Extend tests if added.
