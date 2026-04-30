# Supplier Payment Agent

> Drop in a new supplier invoice, and the agent does the due diligence that takes your team an hour — then pays or escalates in seconds.

**Track 1: Money Movement** — Cursor × Briefcase Hackathon, London 2026

## What It Does

When a company receives its first invoice from a new vendor, someone in finance/procurement has to manually verify the company before approving payment. This takes **30-60 minutes per vendor**: Google the company, check who runs it, visit their website, verify details match, assess risk, write up a brief, approve or escalate.

This agent replaces that entire workflow. It:

1. **Parses the invoice** — extracts vendor name, amount, line items, domain
2. **Enriches via Specter** — company profile, funding, employees, growth stage, operating status
3. **Looks up key people** — CEO/founders, titles, backgrounds via Specter
4. **Searches the web** — news, red flags, complaints, lawsuits
5. **Visits the vendor's website** — checks if it looks like a real business
6. **Writes an analyst-grade risk brief** — like a senior due diligence analyst would
7. **Makes a payment decision** — auto-approve, flag for review, or block

## Architecture

```
Invoice → [Invoice Parser (fast model)] → [Vendor Intelligence Agent (reasoning model)]
                                                ↓
                                    Specter Company Data
                                    Specter People Data
                                    Web Search Results
                                    Website Browser Visit
                                                ↓
                                    Risk Assessment + Brief
                                                ↓
                                    Decision Gate (LOW/MEDIUM/HIGH)
                                                ↓
                              Auto-Pay | Flag for Review | Block
```

**Two subagents via Cursor SDK:**
- **Invoice Parser** (`composer-2`) — fast extraction, no judgment
- **Vendor Intelligence** (`claude-sonnet-4-6`) — reasoning model for risk assessment across 5 data layers

## Human-in-the-Loop

| Risk Level | Criteria | Action |
|------------|----------|--------|
| LOW | Funded company, verified people, small amount, real website | Auto-approve payment |
| MEDIUM | Company exists but young/small, moderate amount, minor flags | Flag for human review |
| HIGH | Can't verify company, no data, no website, suspicious signals | Block + escalate |

The agent always shows its reasoning. Human reviewers see the full risk brief, Specter data, website assessment, and can approve or reject with one click.

## Stack

- **Next.js 14** (App Router) — dashboard + API routes + SSE
- **Cursor SDK** (`@cursor/sdk`) — orchestrates 2 subagents programmatically
- **Specter API** — company intelligence, people data, growth signals
- **Server-Sent Events** — real-time activity streaming to dashboard
- **Tailwind CSS** — dark-themed, polished UI

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Add your CURSOR_API_KEY and SPECTER_API_KEY

# Run development server
npm run dev

# Open http://localhost:3000
```

## Seed Invoices

| # | Vendor | Amount | Expected Outcome |
|---|--------|--------|-------------------|
| 1 | Synthesia (Series E, 674 employees) | £800 | AUTO-APPROVED |
| 2 | GlobalTrade Dynamics LLC (suspicious) | £15,000 | BLOCKED |
| 3 | Beam AI (small startup) | £3,200 | FLAGGED |
| 4 | Wise (established fintech) | £4,500 | AUTO-APPROVED |
| 5 | NovaPeak Consulting (borderline) | £2,800 | FLAGGED |

## Scoring Coverage (10/10)

- **Concrete Workflow Value (2pts)** — replaces 30-60min AP analyst workflow end-to-end
- **Track Fit (2pts)** — core action is a payment decision; agent moves money
- **Human-in-the-Loop (1pt)** — clear thresholds, auto/flag/block tiers, confidence visible
- **Technical Execution (1pt)** — clean architecture, typed interfaces, SSE streaming, error handling
- **Demo Clarity (1pt)** — 5 invoices, 3 outcomes, live activity feed, 90-second narrative
- **Best use of Cursor (+1)** — SDK programmatic agents, 2 subagents, multi-model routing
- **Best use of Specter (+1)** — company + people + signals drive risk decisions
- **Best use of LLM models (+1)** — fast model for parsing, reasoning model for risk assessment
