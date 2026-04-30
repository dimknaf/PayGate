# PayGate

> AI-powered vendor due diligence and first payment approval — replacing the 45-minute analyst workflow with a 30-second automated pipeline.

**Track 1: Money Movement** — Cursor × Briefcase Hackathon, London 2026

### Demo

[![PayGate Demo](https://img.youtube.com/vi/HxabrhOAH5o/maxresdefault.jpg)](https://youtu.be/HxabrhOAH5o)

---

## The Problem

Every company that pays suppliers faces the same bottleneck: **first-time vendor payments**.

Before approving a payment to a new vendor, someone in finance or procurement has to manually verify the company. They Google the vendor, check Companies House, look up the founders, visit the website, assess whether the invoice looks legitimate, write up their findings, and either approve or escalate. This process takes **30–60 minutes per vendor** and is entirely manual.

For a mid-size company onboarding 10–20 new vendors per month, that's an entire person's week spent on repetitive due diligence — work that requires judgment but follows a consistent pattern.

**PayGate automates this entire workflow.** Drop in an invoice, and the AI agent performs analyst-grade due diligence across five data sources in ~30 seconds, then either approves the payment, flags it for human review, or blocks it with a full risk brief.

---

## How It Works

### User Flow

1. **Submit an invoice** — Click "Process" on any invoice in the queue
2. **Watch the agent work** — The live activity feed shows every step: parsing, Specter lookups, web search, website visit, risk scoring
3. **See the verdict** — Risk assessment with score, reasoning, and an analyst-grade brief
4. **Act on it** — Auto-approved invoices are paid immediately; flagged/blocked ones show Approve/Reject buttons for human review
5. **Notify the team** — The agent selects which employees should know about this transaction, with reasons and priority levels

### The 5-Layer Enrichment Pipeline

Each invoice passes through five data layers before a decision is made:

| Layer | Source | What It Gathers |
|-------|--------|----------------|
| **1. Invoice Parsing** | Cursor SDK (composer-2) | Vendor name, amount, line items, domain, bank details |
| **2. Company Intelligence** | Specter API | Founded year, employee count, funding, growth stage, operating status, headquarters, industry |
| **3. People Search** | Specter API | CEO/founders, key executives, titles, backgrounds |
| **4. Web Intelligence** | Cursor SDK (web search) | News articles, press releases, red flags, complaints, lawsuits |
| **5. Website Verification** | Cursor SDK (browser) | Visual inspection of vendor website — does it look like a real business? |

All five layers feed into a single risk assessment produced by the reasoning model.

### Decision Engine

The agent produces a risk level based on weighted signals:

| Risk Level | Criteria | Action |
|------------|----------|--------|
| **LOW** (auto-approve) | Funded company, verified people, small amount, legitimate website, no red flags | Payment executed automatically |
| **MEDIUM** (flag) | Company exists but young/small, moderate amount, minor concerns | Flagged for human review — approve or reject |
| **HIGH** (block) | Cannot verify company, no Specter data, no website, suspicious signals, large amount | Blocked — requires manual investigation |

Each assessment includes a confidence score, specific risk triggers, and a full analyst brief explaining the reasoning.

### Notification Routing

After each decision, the agent analyses the transaction context (vendor type, amount, risk level, industry) against a roster of 20 internal employees across Procurement, Finance, Legal/Compliance, IT Security, Operations, C-Suite, and Internal Audit. It selects 3–6 relevant people with:

- **Priority level** — Required, Recommended, or FYI
- **Reason** — Why this specific person needs to know (e.g., "As CFO, must be notified for payments above £10,000")
- **Toggle control** — Users can select/deselect recipients before sending

---

## Architecture

```
Invoice submitted via API
         │
         ▼
┌─────────────────────┐
│   Invoice Parser    │  ← Cursor SDK, composer-2 (fast model)
│   Extract fields    │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│          Vendor Intelligence Agent                │  ← Cursor SDK, claude-sonnet-4-6
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Specter  │  │   Web    │  │ Browser  │       │
│  │ Company  │  │  Search  │  │  Visit   │       │
│  │ + People │  │          │  │          │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       └──────────────┴──────────────┘             │
│                      │                            │
│              Risk Assessment                      │
│         (score + brief + triggers)                │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Decision Gate  │
              │ LOW/MED/HIGH   │
              └───────┬────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    Auto-Pay     Flag Review     Block
         │            │            │
         ▼            ▼            ▼
   ┌───────────────────────────────────┐
   │      Notification Routing         │  ← Cursor SDK, composer-2
   │  Select relevant team members     │
   └───────────────────────────────────┘
         │
         ▼
   ┌───────────────────────────────────┐
   │     SSE → Dashboard UI            │
   │  Real-time activity streaming     │
   └───────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/agent.ts` | Cursor SDK setup with 2 subagents (invoice-parser, vendor-intelligence) |
| `src/lib/pipeline.ts` | 5-layer enrichment orchestration, streaming, notification routing |
| `src/lib/store.ts` | In-memory data store (invoices, vendors, transactions, activity log) |
| `src/lib/events.ts` | Server-Sent Events emitter for real-time activity streaming |
| `src/lib/mock-payment.ts` | Payment execution, transaction recording, vendor trust scoring |
| `src/lib/types.ts` | All TypeScript interfaces |
| `src/app/api/` | Next.js API routes (process-invoice, approve-payment, invoices, activity-stream) |
| `src/components/` | Dashboard UI components (10 total) |

---

## Behind the Scenes

When you click **Process** on an invoice, here's what happens:

1. **API receives the invoice** → `POST /api/process-invoice` validates and stores the invoice, then kicks off the pipeline asynchronously
2. **Agent initialised** → The Cursor SDK creates an agent with two subagents. The parser uses `composer-2` (fast, cheap) and the intelligence agent uses `claude-sonnet-4-6` (reasoning, thorough)
3. **Stage 1: Parse** → The invoice raw text is sent to the parser. It extracts vendor name, amounts, dates, line items, and returns structured JSON
4. **Stage 2–5: Investigate** → The intelligence agent receives the vendor details and autonomously:
   - Queries Specter for company data (funding, employees, status)
   - Queries Specter for key people (CEO, founders)
   - Runs web searches for news, red flags, and reputation
   - Opens a browser and visits the vendor's website to verify legitimacy
5. **Risk assessment computed** → The agent weighs all findings and produces a risk score (0–1), risk level (LOW/MEDIUM/HIGH), recommendation, confidence score, specific triggers, and a full analyst brief
6. **Decision gate** → LOW risk = auto-approve → payment executed. MEDIUM = flag for review. HIGH = block
7. **Notification routing** → A separate agent call analyses the transaction against the employee roster and selects relevant recipients
8. **SSE streaming** → Every step emits events to the activity feed via Server-Sent Events. Stage markers, tool calls, agent reasoning, and the final summary all appear in real-time
9. **Patterns detected** → Cross-invoice analysis checks for rapid vendor onboarding and similar invoice amounts

---

## Tech Stack

| Technology | What It Does | Why |
|-----------|-------------|-----|
| **Next.js 14** (App Router) | Dashboard UI + API routes + SSE | Full-stack in one framework, server components for performance |
| **Cursor SDK** (`@cursor/sdk`) | Orchestrates 2 AI subagents programmatically | Multi-model routing, tool use (web search, browser), streaming |
| **Specter API** | Company intelligence + people data | Verified business data — funding, headcount, status, key executives |
| **Server-Sent Events** | Real-time activity streaming | Lightweight, one-directional, perfect for live logs |
| **TypeScript** | Type safety across the stack | Shared interfaces between API and UI, catch errors at build time |
| **Tailwind CSS** | Enterprise-grade dark theme | Rapid styling, consistent design tokens |

---

## Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd cursor-hackathon-finance

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your CURSOR_API_KEY and SPECTER_API_KEY

# Run development server
npm run dev

# Open http://localhost:3000
```

### Requirements

- Node.js 20+
- Cursor API key (from Cursor Settings → API)
- Specter API key (from tryspecter.com)

---

## Seed Invoices

The app ships with 5 pre-loaded invoices designed to test different risk scenarios:

| # | Vendor | Amount | Profile | Expected Outcome |
|---|--------|--------|---------|-------------------|
| 1 | **Synthesia** | £800 | Series E startup, 674 employees, £156M+ raised | AUTO-APPROVED (low risk) |
| 2 | **GlobalTrade Dynamics LLC** | £15,000 | Suspicious — no Specter data, .biz domain, first invoice | BLOCKED (high risk) |
| 3 | **Beam AI** | £3,200 | Small AI startup, limited data, moderate amount | FLAGGED (medium risk) |
| 4 | **Wise** | £4,500 | Established fintech, 6000+ employees, well-known brand | AUTO-APPROVED (low risk) |
| 5 | **NovaPeak Consulting** | £2,800 | Small consulting firm, borderline data, London-based | FLAGGED (medium risk) |

---

## Hackathon Scoring Coverage (10/10)

| Criterion | Points | How PayGate Covers It |
|-----------|--------|----------------------|
| **Concrete Workflow Value** | 2 | Replaces 30–60 min AP analyst workflow end-to-end — invoice to payment decision |
| **Track Fit** | 2 | Core action is a payment decision; agent moves money on approval |
| **Human-in-the-Loop** | 1 | Three-tier system (auto/flag/block), full risk brief visible, one-click approve/reject |
| **Technical Execution** | 1 | Clean architecture, TypeScript, SSE streaming, error handling, HMR persistence |
| **Demo Clarity** | 1 | 5 invoices, 3 distinct outcomes, live activity feed, 90-second demo narrative |
| **Best use of Cursor** | +1 | SDK programmatic agents, 2 subagents with multi-model routing, web + browser tools |
| **Best use of Specter** | +1 | Company data + people data + growth signals drive the entire risk decision |
| **Best use of LLM models** | +1 | Fast model for parsing (composer-2), reasoning model for risk assessment (claude-sonnet-4-6) |

---

## License

Built for the Cursor × Briefcase Hackathon 2026.
