# Context & Ideas — Money Movement Track

## Chosen Track

**Track 1 — Money Movement**

---

## How Specter Connects to Money Movement

Specter is NOT a payments API — it won't move money. But it provides the **intelligence layer** that makes money movement decisions smarter:

- **Vendor/counterparty enrichment** — before paying an invoice, look up the company (are they legit? funded? how big? who are the people?)
- **Risk scoring** — enrich payees with company data to flag suspicious or unknown entities
- **Supplier intelligence** — before large payments, check company health, funding status, key people
- **Fraud signals** — cross-reference payment recipients against Specter's company/people database

---

## Strategy: Maximizing Score (10 points)

### Core (7 points)
Ship an agent that moves money with clear guardrails. The judges care about:
1. Does it actually work?
2. Are the guardrails clear and thoughtful?
3. Where is the human in the loop?
4. Is the risk model explicit?
5. Demo quality

### Bonus: Best use of Cursor (+1)
Use the Cursor SDK to make the agent programmatic — not just a chat demo. A deployable, scriptable agent that could run in CI/CD or be embedded in a product.

### Bonus: Best use of Specter (+1)
Integrate Specter MCP to enrich counterparty/vendor data before moving money. Show the agent using real market intelligence to make payment decisions.

### Bonus: Best use of LLM models (+1)
Show thoughtful model selection — reasoning models for risk decisions, fast models for categorisation, etc.

---

## Project Ideas

### Idea 1: Smart Invoice Autopay Agent
An agent that processes incoming invoices and decides whether to auto-pay or escalate.
- **Specter integration**: Before paying, enriches the vendor with Specter (company size, funding, legitimacy, key people). Unknown or suspicious vendors get flagged.
- **Cursor SDK**: Runs as a programmatic agent that watches an invoice queue.
- **Guardrails**: Amount thresholds, vendor trust scoring, anomaly detection.
- **Human-in-the-loop**: Escalates to human when amount > threshold, vendor is new/unknown, or pattern is unusual.

### Idea 2: Counterparty Risk Gateway
A payment gateway layer that enriches every outbound payment with intelligence before executing.
- **Specter integration**: Every payee gets looked up — company data, people, investor signals, similar companies.
- **Cursor SDK**: Agent orchestrates the enrichment -> risk score -> approve/escalate flow.
- **Guardrails**: Risk score matrix, velocity checks, geographic checks.
- **Human-in-the-loop**: Dashboard showing pending payments with risk analysis, human approves the flagged ones.

### Idea 3: Intelligent Cash Sweep Agent
An agent that moves idle cash between accounts based on rules + market intelligence.
- **Specter integration**: Uses company/market signals to inform timing and allocation decisions.
- **Cursor SDK**: Autonomous agent that runs on a schedule.
- **Guardrails**: Hard limits on amounts, approved account list, rate limits.
- **Human-in-the-loop**: Daily summary + approval for moves above threshold.
