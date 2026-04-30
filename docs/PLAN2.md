# PLAN 2 — Polish & Enhancement Pass

> Branch: `dev` (branched from `main` after initial build)
> Goal: Improve the existing Supplier Payment Agent without breaking any functionality.
> Approach: Go one-by-one. After each step, verify the app still builds and runs.

---

## Status Legend

- **PARTIALLY DONE** — Logging improvements were started in main branch but need more work
- **NEW** — Not yet started

---

## Step 1: Enhanced Logging & Activity Feed (PARTIALLY DONE)

**What**: The activity feed streams events but needs to be more verbose, structured, and impressive — making it clear to a demo audience exactly what the agent is doing at each moment.

**Current state**: Basic streaming works. Thinking events are throttled. Tool calls show names but could be more narrative.

**Changes needed**:

### 1a. Pipeline logging (`src/lib/pipeline.ts`)

- Add **pipeline stage banners** to the activity feed (not just console). Emit clear stage markers:
  - `"━━ Stage 1/5: Invoice Parsing ━━"`
  - `"━━ Stage 2/5: Specter Company Lookup ━━"`
  - `"━━ Stage 3/5: Specter People Search ━━"`
  - `"━━ Stage 4/5: Web Intelligence ━━"`
  - `"━━ Stage 5/5: Website Verification ━━"`
  - `"━━ Risk Assessment Complete ━━"`
- Add **elapsed time** to each stage completion: `"Stage 1 complete — 3.2s"`
- After decision, emit a **summary event** with the key facts: `"Summary: Synthesia — Series E, 674 employees, $156M raised, CEO verified, website legitimate → LOW risk, auto-approved in 28.1s"`

### 1b. Activity feed UI (`src/components/ActivityFeed.tsx`)

- Add a new `ActivityEvent` type: `'stage_marker'` — styled differently (bolder, wider, maybe a divider line) so stages visually separate the feed
- Add a new `ActivityEvent` type: `'pipeline_summary'` — styled as a highlight card at the bottom of each invoice's events
- Show **elapsed time** on summary events
- Make thinking events slightly dimmer than action events (tool calls, stage markers) so the visual hierarchy is: stage > action > thinking

### 1c. Types (`src/lib/types.ts`)

- Add `'stage_marker'` and `'pipeline_summary'` to the `ActivityEventType` union

**Validation**: Process one invoice. The activity feed should show clearly labelled stages, descriptive actions, and a final summary.

---

## Step 2: Internal Employees & Notification Routing (NEW)

**What**: Add a list of 20 company employees with names, emails, roles, and department descriptions. When the agent processes an invoice, it should intelligently pick which employees are relevant (based on department, role, invoice type) and show them as suggested notification recipients. The user can then select/deselect who to notify.

**Changes needed**:

### 2a. Employee data (`src/data/employees.json`)

Create a file with 20 employees across departments. Example structure:

```json
[
  {
    "id": "emp-001",
    "name": "Sarah Chen",
    "email": "sarah.chen@company.com",
    "role": "Head of Procurement",
    "department": "Procurement",
    "description": "Oversees all vendor relationships and procurement decisions. Final approver for new supplier contracts above £5,000."
  },
  {
    "id": "emp-002",
    "name": "James Mitchell",
    "email": "james.mitchell@company.com",
    "role": "CFO",
    "department": "Finance",
    "description": "Chief Financial Officer. Must be notified for all payments above £10,000 and any blocked transactions."
  }
]
```

Include employees from: Procurement (3), Finance/AP (4), Legal/Compliance (3), IT Security (2), Operations (3), C-Suite (3), Internal Audit (2). Each with a realistic description of their responsibilities that the agent can use to decide relevance.

### 2b. Types (`src/lib/types.ts`)

Add:
```typescript
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  description: string;
}

interface NotificationRecipient {
  employee: Employee;
  reason: string;        // Why the agent selected this person
  priority: 'required' | 'recommended' | 'fyi';
  selected: boolean;     // User can toggle
}
```

Add `suggestedRecipients?: NotificationRecipient[]` to `ProcessingResult`.

### 2c. Pipeline update (`src/lib/pipeline.ts`)

After the risk assessment is complete (before returning from `processInvoice`), add a step where the agent decides which employees should be notified. The agent receives:
- The invoice details (vendor, amount, type)
- The risk assessment result (risk level, recommendation)
- The full list of employees with their descriptions

The agent returns a JSON array of selected employees with reasons and priority levels. Use the same `streamAgentResponse` function with a dedicated prompt.

Emit activity events:
- `'notification_routing'` — `"Selecting relevant team members to notify..."`
- `'notification_complete'` — `"Selected 4 recipients: Sarah Chen (required), James Mitchell (required), ..."`

### 2d. UI — Notification panel (`src/components/NotificationPanel.tsx`)

Create a new component shown in `InvoiceDetail` (below the risk assessment) when `suggestedRecipients` exists. Design:
- Header: "Suggested Notifications" with a Mail icon
- List of employees with:
  - Checkbox (pre-checked based on agent selection)
  - Name + role
  - Reason the agent selected them (in small text)
  - Priority badge (required = red, recommended = amber, fyi = gray)
- "Send Notifications" button (mock — just emits an activity event and shows a success toast)
- "Select All" / "Deselect All" controls

### 2e. Store update (`src/lib/store.ts`)

No structural changes needed — `ProcessingResult` already stores in `processingResults` map. The `suggestedRecipients` will be included automatically.

**Validation**: Process an invoice. After the risk assessment, the agent should select relevant employees. The notification panel should appear in the invoice detail view with pre-selected recipients and reasons.

---

## Step 3: Professional UI Theme (NEW)

**What**: Restyle the entire UI to look like a serious enterprise banking/compliance dashboard. Think Bloomberg Terminal, Stripe Dashboard, or a compliance tool like ComplyAdvantage — not a hackathon toy. Keep the same layout and component structure, just update colours, typography, and spacing.

**CRITICAL**: Do NOT change the layout, component structure, or any functionality. Only change visual styling.

**Changes needed**:

### 3a. Colour palette (`src/app/globals.css`)

Replace the current neon-tinged dark theme with a muted, institutional palette:

```css
:root {
  --bg-primary: #0c0e13;      /* Near-black with slight blue undertone */
  --bg-secondary: #111318;     /* Card backgrounds */
  --bg-tertiary: #181b22;      /* Hover states, nested surfaces */
  --border: #23272f;            /* Subtle, barely visible borders */
  --text-primary: #d4d7de;     /* Warm gray, not pure white (easier on eyes) */
  --text-secondary: #6b7280;   /* Muted gray for labels */
  --accent-blue: #2563eb;      /* Deeper, more institutional blue */
  --accent-green: #059669;     /* Darker emerald, not neon */
  --accent-red: #dc2626;       /* Standard risk-red */
  --accent-amber: #d97706;     /* Warning amber */
  --accent-purple: #7c3aed;    /* Subtle purple for AI indicators */
}
```

### 3b. Typography & spacing

- Use `font-family: 'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif;`
- Increase letter-spacing on section headers slightly (`tracking-wide`)
- Use `font-feature-settings: 'tnum'` on all numeric displays (amounts, percentages, scores) for tabular number alignment
- Slightly larger padding on cards (p-5 instead of p-4 where it feels cramped)

### 3c. Component refinements

Update these files to feel more enterprise:

- **`Dashboard.tsx`**: Header should feel like a banking app toolbar. Consider a thin top accent line (`border-t-2 border-blue-600` on the header). Remove the gradient logo background — use a simple monochrome shield icon instead.
- **`StatusBadge.tsx`**: Keep the colour differentiation (it's functional). Make badges slightly less rounded — use `rounded-md` instead of `rounded-full` for a more buttoned-up look.
- **`RiskGauge.tsx`**: Add a subtle border around the gauge track. Keep the colour semantics (green/amber/red).
- **`ActivityFeed.tsx`**: Keep the feed structure. Make the background slightly more recessed (darker than card bg). Timestamps in `tabular-nums`.
- **`InvoiceQueue.tsx`**: The "Process" and "Process All" buttons should look more like enterprise action buttons — slightly larger, with sharper corners (`rounded-md`).
- **`HistoryTable.tsx`**: Add subtle alternating row backgrounds. Bolder header row.
- **`VendorProfile.tsx`** and **`RiskBrief.tsx`**: Keep the content and layout. Just ensure colours match the new palette.

### 3d. Animations

- Keep the `slideIn` animation on activity feed lines but make it subtler (reduce translateX from 10px to 4px)
- Keep the pulse animation on processing states
- Keep the gauge fill animation
- Remove or reduce the shimmer animation — too flashy for a banking tool

**Validation**: Run the app. It should look like something a compliance officer at a bank would use — dark, muted, professional. All colours should still be distinguishable and functional (red = danger, green = safe, amber = warning). No layout should break.

---

## Step 4: Comprehensive README (NEW)

**What**: Rewrite README.md as a full public-facing guide. This project goes public — the README should explain both what it does from a user perspective AND what happens technically behind the scenes.

**Changes needed**:

### 4a. Structure

```
# Supplier Payment Agent

> One-line description

## The Problem
(2-3 paragraphs: what AP teams do today, why it's painful, cost in time)

## How It Works
(User-facing flow: drop invoice → agent investigates → decision → done)

### The 5-Layer Enrichment Pipeline
(Detailed explanation of each layer with what data it gathers and why)

### Decision Engine
(Risk thresholds, auto/flag/block logic, confidence scoring)

### Notification Routing
(How the agent selects relevant employees)

## Architecture
(ASCII diagram of the full system — invoice → parser → enrichment → decision → payment)
(Component diagram: which files do what)

## Behind the Scenes
(What happens technically when you click "Process":
 1. API receives invoice
 2. Cursor SDK agent created with 2 subagents
 3. Invoice parser extracts structured data
 4. Vendor intelligence agent orchestrates 4 data sources
 5. Risk assessment computed
 6. Decision gate applies thresholds
 7. Payment executed or escalated
 8. All events streamed via SSE to dashboard)

## Tech Stack
(Table with: technology, what it does, why we chose it)

## Getting Started
(Step by step: clone, install, env vars, run)

## Seed Invoices
(Table with all 5 invoices and expected outcomes)

## Screenshots
(Placeholder for: dashboard, activity feed, risk assessment, approval flow)

## Hackathon Scoring
(How each of the 10 rubric points is covered)
```

### 4b. Writing style

- Professional but accessible. Write for a technical reviewer who has 2 minutes to decide if this project is impressive.
- Use concrete numbers: "processes a new vendor in ~30 seconds instead of ~45 minutes"
- Explain the "why" behind each architectural decision
- Don't be overly promotional — let the architecture speak for itself

**Validation**: Read the README. It should fully explain the project to someone who has never seen it. It should be clear enough that a hackathon judge can understand the value proposition in 30 seconds and the technical depth in 2 minutes.

---

## Execution Order

1. **Step 1** (logging) — Foundation for everything else; makes the demo more impressive
2. **Step 2** (employees) — Adds a new feature that shows agent intelligence
3. **Step 3** (theme) — Visual polish; do this after functionality is stable
4. **Step 4** (README) — Write last, after all features are finalized

After each step:
- Run `npm run build` to verify no errors
- Run `npm run dev` and process at least one invoice to verify functionality
- Commit the step on `dev` branch with a descriptive message

---

## Files to modify (summary)

| Step | Modified | Created |
|------|----------|---------|
| 1 | `src/lib/types.ts`, `src/lib/pipeline.ts`, `src/components/ActivityFeed.tsx` | — |
| 2 | `src/lib/types.ts`, `src/lib/pipeline.ts`, `src/lib/store.ts`, `src/components/InvoiceDetail.tsx` | `src/data/employees.json`, `src/components/NotificationPanel.tsx` |
| 3 | `src/app/globals.css`, `src/components/Dashboard.tsx`, `src/components/StatusBadge.tsx`, `src/components/RiskGauge.tsx`, `src/components/ActivityFeed.tsx`, `src/components/InvoiceQueue.tsx`, `src/components/HistoryTable.tsx`, `src/components/VendorProfile.tsx`, `src/components/RiskBrief.tsx`, `src/components/PaymentActions.tsx` | — |
| 4 | `README.md` | — |

## Rules

1. **DO NOT** change the agent setup (`src/lib/agent.ts`) — it works, don't touch it.
2. **DO NOT** change the API routes structure — they work, don't touch the signatures.
3. **DO NOT** change the `next.config.mjs` or `instrumentation.ts` — they solve critical compatibility issues.
4. **DO NOT** change the data model in ways that break existing data (only add fields, never remove).
5. **DO NOT** change the `.env.local` file or commit it.
6. After each step, run `npm run build` to verify.
7. Keep all existing imports and exports — don't rename anything that other files depend on.
