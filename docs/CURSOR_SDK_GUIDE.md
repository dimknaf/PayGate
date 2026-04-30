# Cursor SDK Guide

## What Is It

The Cursor SDK (`@cursor/sdk`) is a TypeScript package that lets you run the same Cursor agent programmatically — from code, not just the IDE. It's in public beta.

**Official SDK is TypeScript only.** No Python SDK from Cursor.

---

## Installation

```bash
npm install @cursor/sdk
```

Requires Node.js + TypeScript.

---

## Authentication

Get an API key from: https://cursor.com/dashboard/integrations

```bash
export CURSOR_API_KEY="your-key"
```

---

## Two Runtimes

| Runtime | What it does | When to use |
|---------|-------------|-------------|
| **Local** | Agent runs inline in your Node process, reads files from disk | Dev scripts, CI checks, working on a local repo |
| **Cloud** | Agent runs in isolated VM with repo cloned, survives disconnects | Remote work, parallelism, no local repo needed |

---

## Built-in Agent Tools

The SDK agent has the **same tools as the Cursor IDE agent**:

| Tool | What it does |
|------|-------------|
| **Read files** | Read file contents, including images |
| **Edit files** | Make code edits and apply them |
| **Shell commands** | Run terminal commands, monitor output |
| **Semantic search** | Find code by meaning across indexed codebase |
| **File/folder search** | Glob patterns, grep, directory listing |
| **Web search** | Generate queries and search the web |
| **Browser** | Navigate, click, type, scroll, screenshot web pages (cloud agents get a full desktop VM) |
| **Image generation** | Generate images from text descriptions |
| **MCP tools** | Any MCP server you attach (like Specter) |
| **Subagents** | Spawn specialized child agents |

**Key insight:** The agent can browse the web, take screenshots, run shell commands, and use any MCP server — it's not limited to just reading/writing code.

---

## Quick Start — Local Agent

```typescript
import { Agent } from "@cursor/sdk";

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});

const run = await agent.send("Summarize what this repository does");

for await (const event of run.stream()) {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
      }
      break;
    case "tool_call":
      console.log(`[tool] ${event.name}: ${event.status}`);
      break;
  }
}
```

---

## Quick Start — Cloud Agent

```typescript
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  cloud: {
    repos: [{ url: "https://github.com/your-org/your-repo", startingRef: "main" }],
    autoCreatePR: true,
  },
});
```

---

## Attaching MCP Servers (e.g. Specter)

```typescript
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  mcpServers: {
    specter: {
      type: "http",
      url: "https://specter-mcp-url",
      headers: { Authorization: `Bearer ${process.env.SPECTER_API_KEY}` },
    },
  },
});

// The agent can now use Specter tools naturally
const run = await agent.send("Look up information about Acme Ltd using Specter");
```

MCP servers can also be loaded from `.cursor/mcp.json` in the project:

```typescript
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: {
    cwd: process.cwd(),
    settingSources: ["project"], // loads .cursor/mcp.json
  },
});
```

---

## Subagents

Define specialized child agents that the main agent can spawn:

```typescript
const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
  agents: {
    "risk-assessor": {
      description: "Assesses payment risk based on vendor data.",
      prompt: "Evaluate the risk of a payment based on vendor enrichment data. Return a risk score and reasoning.",
      model: "inherit",
    },
    "payment-executor": {
      description: "Executes approved payments.",
      prompt: "Process an approved payment. Log the transaction details.",
    },
  },
});
```

---

## Multi-Turn Conversations

The agent retains context across multiple sends:

```typescript
const run1 = await agent.send("Look up vendor Acme Ltd");
await run1.wait();

// Follow-up — full context retained
const run2 = await agent.send("Based on what you found, should we approve a £5000 payment to them?");
await run2.wait();
```

---

## Per-Run Model Override

Switch models per task:

```typescript
// Use a reasoning model for risk assessment
const riskRun = await agent.send("Assess the risk of this payment", {
  model: { id: "claude-4-sonnet-thinking" },
});

// Use a fast model for simple categorisation
const catRun = await agent.send("Categorise this transaction", {
  model: { id: "composer-2" },
});
```

---

## One-Shot Convenience

For single-prompt tasks:

```typescript
const result = await Agent.prompt("Is this vendor legitimate?", {
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2" },
  local: { cwd: process.cwd() },
});
```

---

## Streaming Events

| Event type | Description |
|------------|-------------|
| `assistant` | Model text output |
| `thinking` | Reasoning content (for thinking models) |
| `tool_call` | Tool invocation (start + completion) |
| `status` | Run lifecycle transitions |
| `task` | Task milestones |
| `request` | Agent asking for user input |

---

## Resource Cleanup

```typescript
// Automatic cleanup with `await using`
await using agent = await Agent.create({ /* ... */ });

// Or manual
await agent[Symbol.asyncDispose]();
```

---

## Billing / Cost

- SDK usage **consumes the same credits as IDE usage** — same pool, same pricing
- Shows up in your usage dashboard under the "SDK" tag
- Your Cursor plan (Pro/Ultra/etc.) covers it — no separate API billing
- Different models cost different amounts (thinking models cost more)

---

## Key Links

- **SDK Docs:** https://cursor.com/docs/sdk/typescript
- **Cloud Agents API (REST):** https://cursor.com/docs/cloud-agent/api/endpoints
- **API Key:** https://cursor.com/dashboard/integrations
- **Models list:** Call `Cursor.models.list()` or `GET /v1/models`
- **Cloud Agent Capabilities:** https://cursor.com/docs/cloud-agent/capabilities
