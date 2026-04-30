# Cursor × Briefcase Hackathon — London 2026

**Date:** April 30, 2026  
**Location:** Halkin Offices, London  
**Site:** https://cusor-hack-london-2026-1.vercel.app/

---

## Overview

- **Theme:** Human out of the loop in high-risk financial workflows
- **2 tracks**, 5 judges, 3 podium places
- **Scoring:** 10-point rubric (7 core + 3 bonus)
- **Prize:** £2,000 cash for 1st place + Cursor Ultra seats for top 3

---

## Track 1 — Money Movement

Agents that **actually move money** — paying invoices, running payroll, sending refunds, transferring between accounts.

**The risk is direct:** get it wrong and the money is gone.

**Human-in-the-loop question:** How big is too big to act alone? What counts as suspicious? Who can the agent trust?

### Example ideas (from organisers)

- Auto-pays small invoices, escalates the rest
- Runs payroll, pauses when something looks off
- Sweeps idle cash within set rails

---

## Track 2 — Financial Intelligence

Agents that **read and interpret money** — categorising transactions, spotting fraud, explaining bank lines, answering "what is this charge for?".

**The risk is indirect:** a wrong answer becomes a wrong decision downstream.

**Human-in-the-loop question:** How confident is the agent really, and which edge cases deserve a human eye?

### Example ideas (from organisers)

- Categorises transactions, flags the uncertain
- Detects fraud, asks when the signal is mixed
- Explains bank lines, escalates the weird ones

---

## Scoring Rubric (10 points)

### Core Score (7 points)

| Criterion | Points | Question |
|-----------|--------|----------|
| Concrete Workflow Value | 2 | Does it replace or compress a real finance workflow a human does today? |
| Track Fit | 2 | How purely does the submission embody its chosen track (money movement)? |
| Human-in-the-Loop Decision | 1 | Does the system know when a human should be in the loop vs not? Thresholds, confidence gates, escalation paths. |
| Technical Execution | 1 | Architecture quality, tool design, latency, integrations that actually work. |
| Demo Clarity | 1 | Can the judge, in 90 seconds, see exactly what this agent does and why it matters? |

### Bonus Buckets (+3 points)

| Bucket | Points | Question |
|--------|--------|----------|
| Best use of Cursor | 1 | How effectively the build used Cursor — editor, agents, and workflow — end to end. |
| Best use of Specter | 1 | Standout use of Specter's API, MCP, or data for market intelligence in the product. |
| Best use of LLM models | 1 | Smart or effective use of models — APIs, routing, evals, or multi-model design. |

---

## Judge Bonus Buckets

### Best use of Cursor (+1)
- $100 credits shared on Discord
- **Cursor SDK** — programmatic agents with the same runtime, harness, and models as Cursor
  - CI/CD pipelines, bespoke automations, or embed Cursor in products
  - 50% off Composer 2 through the SDK until May 5th
  - [Cursor SDK announcement](https://x.com/cursor_ai/status/2049499866217185492)

### Best use of Specter (+1)
- Market intelligence via API and MCP
- Ping Francisco for access on Discord
- [Specter MCP](https://x.com/SpecterHQ/status/2049150321381765258)

### Best use of LLM models (+1)

---

## Judges

Operators and investors who have shipped finance agents at scale. Includes investors from Chapter One and Earlybird, someone from OpenAI, and a No. 10 voice on public-sector AI.

---

## Specter — Reference

**Specter** (tryspecter.com) is an AI-powered **startup data & deal sourcing platform** used by 300+ investment firms. It is NOT a payments API. It's a market intelligence layer.

### Datasets

| Dataset | Scale |
|---------|-------|
| Companies | 55M+ (funded startups, public cos, emerging private businesses) |
| People | 550M+ (founders, operators, decision-makers with verified history) |
| Investors | 330K+ |
| Transactions | 1M+ (funding rounds, M&A, etc.) |

### Unique signals

- **Talent Signals** — new founders, stealth hires, key people job changes (30K/week)
- **Investor Interest Signals** — who's about to back whom *before* headlines
- **Revenue Signals** — live revenue/profitability from news, social, podcasts, filings
- **Natural language company search** across 50M+ companies

### API endpoints

| Endpoint | What it does |
|----------|-------------|
| `POST` Get/Enrich companies | Enrich company data (funding, headcount, execs) |
| `POST` Get/Enrich people | Enrich people data |
| Search Company Name | Natural language company search |
| Get company info by ID | Full company profile |
| Get company people | Key people at a company |
| Get similar companies | Find similar businesses |
| Get Talent Signals by ID | Career moves, new founders, stealth hires |
| Get Investor Interest Signals | Who's interested in backing whom |
| Company/People Lists | Create, manage, modify watchlists |
| Saved Searches | Save and subscribe to search results |

### Specter MCP

Specter has an MCP server (Model Context Protocol) — plug it directly into Cursor or any AI agent as a tool. The agent can then query Specter's data naturally.

**To get access:** Ping **Francisco** on the hackathon Discord.  
**Docs:** https://api.tryspecter.com/

---

## Cursor SDK — Reference

The **Cursor SDK** (`@cursor/sdk`) lets you run Cursor agents programmatically from TypeScript. Same agent as the IDE, but scriptable.

### Capabilities

| Feature | Description |
|---------|-------------|
| **Local runtime** | Agent runs inline in your Node process, reads files from disk |
| **Cloud runtime** | Agent runs in isolated VM with repo cloned, survives disconnects |
| **MCP support** | Attach MCP servers (like Specter) to agents inline |
| **Subagents** | Define specialized child agents the parent can spawn |
| **Streaming** | Real-time event stream of agent actions |
| **Multi-turn** | Conversation context retained across multiple prompts |

### Quick start

```typescript
import { Agent } from "@cursor/sdk";

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  mcpServers: {
    specter: {
      type: "http",
      url: "https://specter-mcp-url-here",
      headers: { Authorization: `Bearer ${process.env.SPECTER_API_KEY}` },
    },
  },
});

const run = await agent.send("Do something useful");

for await (const event of run.stream()) {
  if (event.type === "assistant") {
    for (const block of event.message.content) {
      if (block.type === "text") process.stdout.write(block.text);
    }
  }
}
```

**Docs:** https://cursor.com/docs/sdk/typescript  
**Auth:** Get API key from https://cursor.com/dashboard/integrations

---

## Submission Requirements

- Team name, project name
- GitHub URL (required)
- Track selection (Money Movement or Financial Intelligence)
- Demo URL (optional)
- Team members
- One-line description
