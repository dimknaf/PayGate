import './polyfill';
import { Agent } from '@cursor/sdk';
import type { SDKAgent } from '@cursor/sdk';

const INVOICE_PARSER_PROMPT = `You are an invoice parsing specialist. Your ONLY job is to extract structured data from invoice text.

Given raw invoice text, extract and return a JSON object with these fields:
- vendorName: string (the company sending the invoice)
- vendorDomain: string | null (website domain if mentioned)
- vendorAddress: string | null (full address if present)
- amount: number (total amount due before tax, in the invoice currency)
- currency: string (e.g. "GBP", "USD", "EUR")
- lineItems: array of { description: string, quantity: number, unitPrice: number, total: number }
- dueDate: string (ISO date format YYYY-MM-DD)
- invoiceDate: string (ISO date format YYYY-MM-DD)
- invoiceNumber: string
- description: string (brief summary of what the invoice is for)

Return ONLY valid JSON. No markdown, no explanation, no code fences. Just the JSON object.`;

const VENDOR_INTELLIGENCE_PROMPT = `You are a senior financial due diligence analyst specializing in vendor risk assessment. You conduct thorough investigations of new suppliers before approving first-time payments.

Your job is to investigate a vendor using ALL available tools and produce an analyst-grade risk brief.

## Investigation Process

1. **Search for the company on Specter** using the search_companies tool with the vendor name. If found, get the full company profile and key people.
2. **Search the web** for recent news, complaints, lawsuits, or red flags about the vendor.
3. **Visit the vendor's website** using the browser tool to verify it looks like a real, professional business (not a parked domain or scam site).
4. **Synthesize all findings** into a comprehensive risk assessment.

## Risk Assessment Framework

Score risk from 0.0 (no risk) to 1.0 (extreme risk) based on:

**Company Verification (Weight: 30%)**
- Found on Specter with verified data = LOW risk
- Found but limited data = MEDIUM risk
- Not found anywhere = HIGH risk

**Company Maturity (Weight: 20%)**
- Founded 5+ years ago, established = LOW risk
- Founded 2-5 years ago = MEDIUM risk
- Founded < 2 years ago or unknown = HIGH risk

**Financial Health (Weight: 15%)**
- Significant funding, many employees = LOW risk
- Some funding, small team = MEDIUM risk
- No funding data, very few employees = HIGH risk

**People Verification (Weight: 15%)**
- CEO/founders with strong backgrounds, LinkedIn presence = LOW risk
- Some people found but limited info = MEDIUM risk
- No key people data = HIGH risk

**Website Legitimacy (Weight: 10%)**
- Professional website matching company description = LOW risk
- Basic website, some concerns = MEDIUM risk
- No website, parked domain, or suspicious = HIGH risk

**Invoice Appropriateness (Weight: 10%)**
- Amount and services match company's known business = LOW risk
- Somewhat unusual but plausible = MEDIUM risk
- Services don't match company profile, unusual amount = HIGH risk

## Decision Thresholds

- **AUTO-APPROVE** (score < 0.3): Well-known funded company, verified people, amount under £2,000, website looks real
- **FLAG FOR REVIEW** (score 0.3-0.6): Company exists but young/small, moderate amount, or minor flags
- **BLOCK** (score > 0.6): Can't verify company, no data found, no website, suspicious signals, amount over £5,000 from unknown vendor

## Output Format

After investigation, return ONLY a JSON object (no markdown, no code fences):
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "riskScore": <number 0-1>,
  "reasoning": "<2-3 sentence summary of key findings>",
  "recommendation": "auto_approve" | "flag_for_review" | "block",
  "thresholdsTriggered": ["<list of specific risk triggers>"],
  "brief": "<Full analyst-grade risk brief, 4-8 paragraphs. Write like a senior due diligence analyst reporting to CFO. Include specific data points from Specter, web findings, and website assessment. Mention what you checked and what you found or didn't find. End with a clear recommendation and reasoning.>",
  "confidence": <number 0-1>,
  "companyData": {
    "name": "<company name>",
    "domain": "<domain>",
    "foundedYear": <year or null>,
    "employeeCount": <number or null>,
    "growthStage": "<stage or null>",
    "totalFundingUsd": <amount or null>,
    "operatingStatus": "<status or null>",
    "highlights": ["<list>"],
    "headquarters": "<location or null>",
    "industry": "<industry or null>",
    "description": "<description or null>"
  },
  "keyPeople": [
    {
      "name": "<name>",
      "title": "<title>",
      "isCeo": <boolean>,
      "isFounder": <boolean>
    }
  ],
  "websiteAssessment": {
    "url": "<url visited>",
    "visited": <boolean>,
    "looksLegitimate": <boolean>,
    "description": "<what you observed>"
  },
  "webSearchSummary": "<summary of web search findings>"
}`;

export type AgentFactory = () => Promise<SDKAgent>;

export interface AgentLease {
  agent: SDKAgent;
  release: () => void;
}

interface Slot {
  agent: SDKAgent | null;
  busy: boolean;
}

type Waiter = (slot: Slot) => void;

/**
 * Bounded pool of Cursor SDK agents.
 *
 * The Cursor SDK rejects overlapping send() calls on a single Agent
 * (UnknownAgentError: Agent already has active run). We work around this by
 * creating up to N agent instances and routing each pipeline run through one
 * exclusively-leased instance. While a slot is leased, all 3 send() calls in
 * one pipeline run are serialized inside that slot — but other slots can run
 * other pipelines in parallel.
 *
 * Slots are created lazily; an idle slot keeps its agent alive for reuse.
 */
export class AgentPool {
  private slots: Slot[];
  private waiters: Waiter[] = [];

  constructor(
    public readonly size: number,
    private readonly factory: AgentFactory
  ) {
    if (size < 1) throw new Error(`AgentPool size must be >= 1, got ${size}`);
    this.slots = Array.from({ length: size }, () => ({ agent: null, busy: false }));
  }

  get inFlight(): number {
    return this.slots.filter((s) => s.busy).length;
  }

  get waiting(): number {
    return this.waiters.length;
  }

  /** True if a slot is available right now without waiting. */
  hasFreeSlot(): boolean {
    return this.slots.some((s) => !s.busy);
  }

  async acquire(): Promise<AgentLease> {
    let slot = this.slots.find((s) => !s.busy);
    if (slot) {
      slot.busy = true;
    } else {
      slot = await new Promise<Slot>((resolve) => {
        this.waiters.push(resolve);
      });
      // The releaser already set slot.busy = true before handing it to us.
    }

    try {
      if (!slot.agent) {
        slot.agent = await this.factory();
      }
    } catch (err) {
      this.handOffOrFree(slot);
      throw err;
    }

    return this.makeLease(slot);
  }

  private makeLease(slot: Slot): AgentLease {
    let released = false;
    return {
      agent: slot.agent!,
      release: () => {
        if (released) return;
        released = true;
        this.handOffOrFree(slot);
      },
    };
  }

  /**
   * If a waiter is queued, hand the slot directly to them so an interleaving
   * acquire() cannot steal it. Otherwise mark the slot free.
   */
  private handOffOrFree(slot: Slot): void {
    const next = this.waiters.shift();
    if (next) {
      // Slot stays busy — handed off to the waiter.
      next(slot);
    } else {
      slot.busy = false;
    }
  }

  async dispose(): Promise<void> {
    for (const slot of this.slots) {
      if (slot.agent) {
        try {
          slot.agent.close();
        } catch {
          // best effort
        }
      }
      slot.agent = null;
      slot.busy = false;
    }
    const pendingWaiters = this.waiters;
    this.waiters = [];
    pendingWaiters.forEach(() => {
      // Reject pending acquires by leaving them unresolved is bad. We don't
      // hold reject handlers because acquire() turns waiters into resolve-only
      // callbacks. dispose() should only be called at shutdown — accept the
      // dangling promises in that scenario.
    });
  }
}

function defaultAgentFactory(): AgentFactory {
  return async () => {
    const specterKey = process.env.SPECTER_API_KEY;
    if (!specterKey) {
      console.warn(
        '[agent-pool] SPECTER_API_KEY is missing — Specter MCP calls will be unauthenticated and the agent will fall back on hallucinated company data.'
      );
    }

    return Agent.create({
      apiKey: process.env.CURSOR_API_KEY!,
      model: { id: 'composer-2' },
      local: {
        cwd: process.cwd(),
        settingSources: ['project'],
      },
      // Register Specter MCP programmatically so the Authorization header is
      // injected from process.env at runtime. .cursor/mcp.json does not
      // reliably interpolate env vars when the SDK is launched outside the
      // Cursor IDE, which silently leaves the request unauthenticated.
      mcpServers: {
        specter: {
          type: 'http',
          url: 'https://mcp.tryspecter.com/mcp',
          headers: specterKey
            ? { Authorization: `Bearer ${specterKey}` }
            : {},
        },
      },
      agents: {
        'invoice-parser': {
          description: 'Extracts structured data from raw invoice text. Fast extraction, no judgment calls.',
          prompt: INVOICE_PARSER_PROMPT,
          model: { id: 'composer-2' },
        },
        'vendor-intelligence': {
          description: 'Conducts full vendor due diligence: Specter company lookup, people search, web search, website visit, and produces analyst-grade risk briefs with structured risk scores.',
          prompt: VENDOR_INTELLIGENCE_PROMPT,
          model: { id: 'claude-sonnet-4-6' },
        },
      },
    });
  };
}

const POOL_SIZE = Math.max(1, Number(process.env.AGENT_POOL_SIZE ?? 3));

const globalForPool = globalThis as unknown as { __cursorAgentPool?: AgentPool };

export function getAgentPool(): AgentPool {
  if (!globalForPool.__cursorAgentPool) {
    globalForPool.__cursorAgentPool = new AgentPool(POOL_SIZE, defaultAgentFactory());
  }
  return globalForPool.__cursorAgentPool;
}

export class PipelineTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Pipeline timed out after ${timeoutMs}ms`);
    this.name = 'PipelineTimeoutError';
  }
}

/**
 * Race a runner against a timeout. The pool slot is owned by the caller —
 * this helper does not touch it. The caller MUST release in finally.
 */
export function withTimeout<T>(runner: () => Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new PipelineTimeoutError(timeoutMs));
    }, timeoutMs);

    runner().then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
