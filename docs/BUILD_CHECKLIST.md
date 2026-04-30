# Build Checklist — Score Every Point

Every item below maps to a scoring criterion. Nothing ships until all are checked.

---

## Concrete Workflow Value (2 pts)

_Does it replace or compress a real finance workflow a human does today?_

- [ ] Identify the SPECIFIC human job this replaces (who does it today, how long it takes, how often)
- [ ] The agent must do end-to-end what that human does — not just assist, but REPLACE the workflow
- [ ] Show time saved: "this took a person X hours, the agent does it in Y seconds"
- [ ] The workflow must be real and recognizable to a finance person, not a toy demo

---

## Track Fit — Money Movement (2 pts)

_How purely does the submission embody Money Movement?_

- [ ] The agent MOVES money (even if mocked) — pays, transfers, refunds, sweeps
- [ ] The core action is a financial transaction, not just analysis or categorisation
- [ ] Money movement is the main event, not a side feature
- [ ] Risk is direct and visible: "if the agent gets it wrong, money is lost"

---

## Human-in-the-Loop Decision (1 pt)

_Does the system know when a human should be in the loop vs not?_

- [ ] Clear thresholds defined (amount, confidence, vendor trust, etc.)
- [ ] Automatic actions for low-risk decisions (agent acts alone)
- [ ] Escalation paths for high-risk decisions (agent pauses and asks human)
- [ ] Confidence scoring visible — the agent shows WHY it escalated or auto-approved
- [ ] Edge cases handled: what happens when the agent is uncertain?

---

## Technical Execution (1 pt)

_Architecture quality, tool design, latency, integrations that actually work._

- [ ] Clean architecture — clear separation of concerns
- [ ] Integrations actually work live (Specter returns real data, agent responds correctly)
- [ ] Reasonable latency — demo doesn't hang for 60 seconds
- [ ] Error handling — what happens when Specter is down or returns no data?
- [ ] Code is readable, not a hackathon spaghetti mess

---

## Demo Clarity (1 pt)

_Can the judge, in 90 seconds, see exactly what this agent does and why it matters?_

- [ ] 90-second demo script written BEFORE building
- [ ] One clear sentence: "This agent does X so that Y doesn't have to"
- [ ] Visual UI that shows the agent's decisions in real-time
- [ ] Before/after: show what a human does today vs what the agent does
- [ ] The "wow" moment is in the first 30 seconds, not the last

---

## Best use of Cursor (+1 bonus)

_How effectively the build used Cursor — editor, agents, and workflow — end to end._

- [ ] Use Cursor SDK to run agents programmatically (not just the IDE)
- [ ] Show the agent as a deployable, scriptable system — not a chat demo
- [ ] Use subagents for specialized tasks (risk assessment, payment execution, etc.)
- [ ] Leverage built-in tools: browser, web search, shell, MCP
- [ ] The SDK integration is functional, not decorative

---

## Best use of Specter (+1 bonus)

_Standout use of Specter's API, MCP, or data for market intelligence in the product._

- [ ] Specter MCP connected and working
- [ ] Specter data DRIVES a decision — not just displayed, but changes the outcome
- [ ] Use multiple Specter capabilities (company enrichment + people + signals)
- [ ] The agent couldn't make the same quality decision WITHOUT Specter
- [ ] Show a case where Specter data caused the agent to block/escalate a payment it would have otherwise approved

---

## Best use of LLM models (+1 bonus)

_Smart or effective use of models — APIs, routing, evals, or multi-model design._

- [ ] Multiple models used for different tasks (fast model for simple tasks, reasoning model for risk)
- [ ] Model selection is intentional and explainable ("we use X for Y because Z")
- [ ] Structured outputs where appropriate (JSON schemas for decisions)
- [ ] Confidence calibration — the model's uncertainty affects the workflow
- [ ] Show that model choice matters: same prompt, different model = different quality

---

## Pre-Submission

- [ ] GitHub repo is public and clean
- [ ] One-line description nails it
- [ ] Demo URL works (if applicable)
- [ ] Team name and members listed
- [ ] Track selected: Money Movement
