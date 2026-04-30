import type { SDKAgent, ModelSelection, SDKMessage } from '@cursor/sdk';
import { getAgent } from './agent';
import { emitActivity } from './events';
import { store } from './store';
import {
  Invoice,
  VendorProfile,
  RiskAssessment,
  ProcessingResult,
  SpecterCompany,
  SpecterPerson,
  WebsiteCheck,
} from './types';
import { executePaymentDecision } from './mock-payment';

function log(invoiceId: string, ...args: unknown[]) {
  console.log(`[${new Date().toLocaleTimeString('en-GB')}] [${invoiceId}]`, ...args);
}

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1) {
    return text.substring(braceStart, braceEnd + 1);
  }
  return text.trim();
}

async function streamAgentResponse(
  agent: SDKAgent,
  prompt: string,
  invoiceId: string,
  label: string,
  opts?: { model?: ModelSelection }
): Promise<string> {
  log(invoiceId, `>>> Sending to agent (${label})...`);

  const run = await agent.send(prompt, opts);
  let fullText = '';
  let lastToolName = '';
  let thinkingBuffer = '';
  let lastThinkingEmit = 0;
  const THINKING_THROTTLE_MS = 3000;

  for await (const event of run.stream()) {
    const msg = event as SDKMessage;

    switch (msg.type) {
      case 'status':
        log(invoiceId, `[status] ${msg.status}${msg.message ? ': ' + msg.message : ''}`);
        if (msg.status === 'ERROR') {
          emitActivity(invoiceId, 'error', `Agent error: ${msg.message || 'Unknown error'}`);
        }
        break;

      case 'thinking': {
        thinkingBuffer += msg.text;
        const now = Date.now();
        // Throttle thinking emissions — batch into meaningful chunks
        if (now - lastThinkingEmit > THINKING_THROTTLE_MS && thinkingBuffer.length > 30) {
          const clean = thinkingBuffer.replace(/\s+/g, ' ').trim();
          if (clean.length > 10) {
            log(invoiceId, `[thinking] ${clean.substring(0, 250)}`);
            // Only emit non-trivial reasoning to the feed
            const trimmed = clean.length > 150 ? clean.substring(0, 147) + '...' : clean;
            emitActivity(invoiceId, 'agent_thinking', trimmed);
          }
          thinkingBuffer = '';
          lastThinkingEmit = now;
        }
        break;
      }

      case 'tool_call':
        if (msg.status === 'running') {
          lastToolName = msg.name;
          const argsStr = msg.args ? JSON.stringify(msg.args).substring(0, 300) : '';
          log(invoiceId, `[tool:start] ${msg.name}`, argsStr);
          emitToolActivity(invoiceId, msg.name, 'running', msg.args);
        } else if (msg.status === 'completed') {
          const resultPreview = msg.result ? String(typeof msg.result === 'string' ? msg.result : JSON.stringify(msg.result)).substring(0, 200) : '';
          log(invoiceId, `[tool:done]  ${msg.name}${resultPreview ? ' → ' + resultPreview : ''}`);
          emitToolActivity(invoiceId, msg.name, 'completed', undefined, msg.result);
        } else if (msg.status === 'error') {
          log(invoiceId, `[tool:error] ${msg.name}`, msg.result);
          emitActivity(invoiceId, 'error', `Tool ${msg.name} failed`);
        }
        break;

      case 'assistant':
        for (const block of msg.message.content) {
          if (block.type === 'text') {
            fullText += block.text;
          }
        }
        break;

      case 'task':
        if (msg.text) {
          log(invoiceId, `[task] ${msg.text}`);
          emitActivity(invoiceId, 'agent_thinking', `Subagent: ${msg.text}`);
        }
        break;
    }
  }

  // Flush remaining thinking buffer
  if (thinkingBuffer.trim().length > 10) {
    const clean = thinkingBuffer.replace(/\s+/g, ' ').trim();
    log(invoiceId, `[thinking:final] ${clean.substring(0, 250)}`);
  }

  log(invoiceId, `<<< Agent response complete (${label}). ${fullText.length} chars. Last tool: ${lastToolName}`);
  return fullText;
}

function emitToolActivity(invoiceId: string, toolName: string, status: string, args?: unknown, result?: unknown) {
  const name = toolName.toLowerCase();

  // Task / subagent — the most important one to make descriptive
  if (name === 'task' || name === 'create_task') {
    if (status === 'running') {
      const argsObj = args as Record<string, unknown> | undefined;
      const desc = argsObj?.description || argsObj?.prompt || '';
      const descStr = String(desc).substring(0, 120);
      emitActivity(invoiceId, 'agent_thinking',
        descStr ? `Spawning subagent: ${descStr}` : 'Spawning specialized subagent...'
      );
    } else {
      emitActivity(invoiceId, 'agent_thinking', 'Subagent completed analysis');
    }
    return;
  }

  // Web search
  if (name.includes('search') || name.includes('web_search')) {
    const query = args ? String((args as Record<string, unknown>).query || '').substring(0, 80) : '';
    if (status === 'running') {
      emitActivity(invoiceId, 'web_search_started', query ? `Searching the web: "${query}"` : 'Searching the web...');
    } else {
      emitActivity(invoiceId, 'web_search_complete', 'Web search results received');
    }
    return;
  }

  // Browser tools
  if (name.includes('browser') || name.includes('navigate') || name.includes('screenshot')) {
    const url = args ? String((args as Record<string, unknown>).url || '').substring(0, 80) : '';
    if (status === 'running') {
      if (name.includes('screenshot')) {
        emitActivity(invoiceId, 'browser_visit_started', 'Taking screenshot of website...');
      } else {
        emitActivity(invoiceId, 'browser_visit_started', url ? `Visiting ${url}` : 'Navigating to website...');
      }
    } else {
      emitActivity(invoiceId, 'browser_visit_complete', 'Website inspection complete');
    }
    return;
  }

  // MCP / Specter tools
  if (name.includes('specter') || name.includes('mcp')) {
    if (name.includes('people')) {
      emitActivity(invoiceId, status === 'running' ? 'specter_people_search' : 'specter_people_found',
        status === 'running' ? 'Looking up key people via Specter...' : 'Key people data loaded');
    } else {
      emitActivity(invoiceId, status === 'running' ? 'specter_company_search' : 'specter_company_found',
        status === 'running' ? 'Querying Specter for company intelligence...' : 'Specter company data loaded');
    }
    return;
  }

  // File read / semantic search (agent exploring files)
  if (name.includes('read') || name.includes('file') || name.includes('semantic')) {
    return; // suppress noisy file operations
  }

  // Generic fallback — show it but make it readable
  if (status === 'running') {
    const readable = toolName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
    emitActivity(invoiceId, 'agent_thinking', `Running: ${readable}`);
  }
}

// Layer 1: Parse the invoice
async function parseInvoice(invoice: Invoice): Promise<Record<string, unknown>> {
  emitActivity(invoice.id, 'parsing_started', `Parsing invoice ${invoice.invoiceNumber} from ${invoice.vendorName}...`);

  const agent = await getAgent();
  const prompt = `Parse this invoice and extract structured data. Return ONLY JSON, nothing else.\n\n${invoice.rawText}`;
  const response = await streamAgentResponse(agent, prompt, invoice.id, 'invoice-parser', { model: { id: 'composer-2' } });

  try {
    const parsed = JSON.parse(extractJSON(response));
    emitActivity(invoice.id, 'parsing_complete',
      `Parsed: ${parsed.vendorName || invoice.vendorName}, ${parsed.currency || invoice.currency} ${parsed.amount || invoice.amount}`,
      { parsed }
    );
    log(invoice.id, 'Invoice parsed successfully:', JSON.stringify(parsed).substring(0, 200));
    return parsed;
  } catch (e) {
    log(invoice.id, 'Parse failed, using defaults. Raw:', response.substring(0, 300));
    emitActivity(invoice.id, 'parsing_complete',
      `Parsed invoice from ${invoice.vendorName} for ${invoice.currency} ${invoice.amount}`
    );
    return {
      vendorName: invoice.vendorName,
      amount: invoice.amount,
      currency: invoice.currency,
    };
  }
}

// Layers 2-5: Vendor intelligence (Specter + web search + browser + risk assessment)
async function investigateVendor(invoice: Invoice): Promise<{
  riskAssessment: RiskAssessment;
  companyData?: SpecterCompany;
  keyPeople?: SpecterPerson[];
  websiteCheck?: WebsiteCheck;
  webSearchSummary?: string;
}> {
  emitActivity(invoice.id, 'specter_company_search', `Starting vendor intelligence for "${invoice.vendorName}"...`);

  const agent = await getAgent();

  const investigationPrompt = `Investigate this vendor for a first-time payment approval decision.

VENDOR: ${invoice.vendorName}
DOMAIN: ${invoice.vendorDomain || 'unknown'}
ADDRESS: ${invoice.vendorAddress || 'unknown'}
INVOICE AMOUNT: ${invoice.currency} ${invoice.amount}
INVOICE FOR: ${invoice.description}
INVOICE NUMBER: ${invoice.invoiceNumber}

Perform the following steps IN ORDER:
1. Search for "${invoice.vendorName}" on Specter to get company data and key people.
2. Search the web for any news, red flags, or reputation info about "${invoice.vendorName}".
3. Visit ${invoice.vendorDomain ? `https://${invoice.vendorDomain}` : 'their website if you can find one'} to check if it looks legitimate.
4. Based on ALL findings, produce your risk assessment.

Return ONLY the JSON object as specified in your instructions. No markdown fences, no explanation.`;

  const response = await streamAgentResponse(agent, investigationPrompt, invoice.id, 'vendor-intelligence', {
    model: { id: 'claude-sonnet-4-6' },
  });

  log(invoice.id, 'Raw vendor intelligence response length:', response.length);

  try {
    const jsonStr = extractJSON(response);
    log(invoice.id, 'Extracted JSON length:', jsonStr.length, 'Preview:', jsonStr.substring(0, 200));
    const result = JSON.parse(jsonStr);

    // Emit activity events based on findings
    if (result.companyData?.name) {
      const msg = `Specter: Found ${result.companyData.name}${result.companyData.foundedYear ? ` — Founded ${result.companyData.foundedYear}` : ''}${result.companyData.employeeCount ? `, ${result.companyData.employeeCount} employees` : ''}${result.companyData.growthStage ? `, ${result.companyData.growthStage}` : ''}`;
      log(invoice.id, msg);
      emitActivity(invoice.id, 'specter_company_found', msg, { company: result.companyData });
    } else {
      log(invoice.id, 'No Specter company data found');
      emitActivity(invoice.id, 'specter_company_not_found',
        `Specter: No verified company data found for "${invoice.vendorName}"`
      );
    }

    if (result.keyPeople?.length > 0) {
      const ceo = result.keyPeople.find((p: SpecterPerson) => p.isCeo || p.isFounder);
      const msg = `Found ${result.keyPeople.length} key people${ceo ? ` — ${ceo.title || 'CEO'}: ${ceo.name}` : ''}`;
      log(invoice.id, msg);
      emitActivity(invoice.id, 'specter_people_found', msg, { people: result.keyPeople });
    }

    if (result.webSearchSummary) {
      log(invoice.id, 'Web findings:', result.webSearchSummary.substring(0, 200));
      emitActivity(invoice.id, 'web_search_complete',
        `Web search: ${result.webSearchSummary.substring(0, 150)}`,
        { summary: result.webSearchSummary }
      );
    }

    if (result.websiteAssessment) {
      const msg = `Website ${result.websiteAssessment.url}: ${result.websiteAssessment.looksLegitimate ? 'Looks legitimate' : 'Concerns identified'} — ${(result.websiteAssessment.description || '').substring(0, 100)}`;
      log(invoice.id, msg);
      emitActivity(invoice.id, 'browser_visit_complete', msg, { website: result.websiteAssessment });
    }

    const riskMsg = `Risk: ${result.riskLevel} (score: ${result.riskScore?.toFixed(2)}) — ${result.recommendation?.replace(/_/g, ' ')}`;
    log(invoice.id, '*** ' + riskMsg);
    emitActivity(invoice.id, 'risk_assessment_complete', riskMsg,
      { riskLevel: result.riskLevel, riskScore: result.riskScore }
    );

    const riskAssessment: RiskAssessment = {
      riskLevel: result.riskLevel || 'HIGH',
      riskScore: result.riskScore ?? 0.8,
      reasoning: result.reasoning || 'Unable to fully assess vendor.',
      recommendation: result.recommendation || 'block',
      thresholdsTriggered: result.thresholdsTriggered || ['insufficient_data'],
      brief: result.brief || 'Investigation could not be completed. Recommending manual review.',
      confidence: result.confidence ?? 0.5,
    };

    const companyData: SpecterCompany | undefined = result.companyData ? {
      id: result.companyData.id || '',
      name: result.companyData.name || invoice.vendorName,
      domain: result.companyData.domain,
      description: result.companyData.description,
      foundedYear: result.companyData.foundedYear,
      employeeCount: result.companyData.employeeCount,
      employeeCountRange: result.companyData.employeeCountRange,
      growthStage: result.companyData.growthStage,
      operatingStatus: result.companyData.operatingStatus,
      totalFundingUsd: result.companyData.totalFundingUsd,
      lastFundingDate: result.companyData.lastFundingDate,
      highlights: result.companyData.highlights,
      website: result.companyData.domain,
      headquarters: result.companyData.headquarters,
      industry: result.companyData.industry,
    } : undefined;

    const keyPeople: SpecterPerson[] = (result.keyPeople || []).map((p: Record<string, unknown>) => ({
      name: p.name as string,
      title: p.title as string | undefined,
      isCeo: p.isCeo as boolean | undefined,
      isFounder: p.isFounder as boolean | undefined,
    }));

    const websiteCheck: WebsiteCheck | undefined = result.websiteAssessment ? {
      url: result.websiteAssessment.url || '',
      visited: result.websiteAssessment.visited ?? false,
      looksLegitimate: result.websiteAssessment.looksLegitimate ?? false,
      description: result.websiteAssessment.description || '',
    } : undefined;

    return {
      riskAssessment,
      companyData,
      keyPeople,
      websiteCheck,
      webSearchSummary: result.webSearchSummary,
    };
  } catch (e) {
    log(invoice.id, 'FAILED to parse vendor intelligence JSON:', e);
    log(invoice.id, 'Raw response preview:', response.substring(0, 500));
    emitActivity(invoice.id, 'error', 'Failed to parse agent response. Defaulting to HIGH risk.');
    return {
      riskAssessment: {
        riskLevel: 'HIGH',
        riskScore: 0.9,
        reasoning: 'Agent response could not be parsed. Erring on the side of caution.',
        recommendation: 'block',
        thresholdsTriggered: ['parse_failure', 'safety_default'],
        brief: `The automated investigation of ${invoice.vendorName} encountered an error during analysis. The agent's response could not be reliably parsed into a structured risk assessment. As a safety measure, this invoice is being blocked for manual review.\n\nRaw agent output was received but could not be interpreted. A human analyst should review this vendor manually before any payment is approved.`,
        confidence: 0.1,
      },
    };
  }
}

// Main pipeline: orchestrates all layers
export async function processInvoice(invoice: Invoice): Promise<ProcessingResult> {
  const startTime = Date.now();

  log(invoice.id, '========================================');
  log(invoice.id, `PIPELINE START: ${invoice.vendorName} — ${invoice.currency} ${invoice.amount}`);
  log(invoice.id, '========================================');

  emitActivity(invoice.id, 'invoice_received',
    `Received invoice ${invoice.invoiceNumber} from ${invoice.vendorName} (${invoice.currency} ${invoice.amount.toLocaleString()})`,
    { amount: invoice.amount, vendor: invoice.vendorName }
  );

  store.updateInvoice(invoice.id, { status: 'processing' });

  // Layer 1: Parse
  log(invoice.id, '--- Layer 1: Invoice Parsing ---');
  await parseInvoice(invoice);

  // Layers 2-5: Vendor intelligence
  log(invoice.id, '--- Layers 2-5: Vendor Intelligence ---');
  emitActivity(invoice.id, 'risk_assessment_started', 'Starting vendor investigation and risk assessment...');
  const investigation = await investigateVendor(invoice);

  // Build/update vendor profile
  const existingVendor = store.getVendor(invoice.vendorName);
  const vendorProfile: VendorProfile = {
    name: invoice.vendorName,
    domain: invoice.vendorDomain,
    specterData: investigation.companyData || existingVendor?.specterData,
    keyPeople: investigation.keyPeople || existingVendor?.keyPeople,
    websiteCheck: investigation.websiteCheck || existingVendor?.websiteCheck,
    webSearchFindings: investigation.webSearchSummary || existingVendor?.webSearchFindings,
    trustScore: existingVendor?.trustScore ?? 50,
    invoiceCount: (existingVendor?.invoiceCount ?? 0) + 1,
    totalPaid: existingVendor?.totalPaid ?? 0,
    lastAssessment: investigation.riskAssessment,
    firstSeen: existingVendor?.firstSeen ?? new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  // Adjust trust score based on risk
  if (investigation.riskAssessment.riskLevel === 'LOW') {
    vendorProfile.trustScore = Math.min(100, vendorProfile.trustScore + 15);
  } else if (investigation.riskAssessment.riskLevel === 'HIGH') {
    vendorProfile.trustScore = Math.max(0, vendorProfile.trustScore - 25);
  }

  store.upsertVendor(vendorProfile);

  // Decision gate + payment execution
  const decisionMsg = `DECISION: ${investigation.riskAssessment.riskLevel} risk (score: ${investigation.riskAssessment.riskScore.toFixed(2)}) — ${investigation.riskAssessment.recommendation.replace(/_/g, ' ')}`;
  log(invoice.id, '*** ' + decisionMsg);
  emitActivity(invoice.id, 'decision_made', decisionMsg,
    { riskLevel: investigation.riskAssessment.riskLevel, recommendation: investigation.riskAssessment.recommendation }
  );

  const processingTimeMs = Date.now() - startTime;
  const transaction = executePaymentDecision(invoice, investigation.riskAssessment, processingTimeMs);

  const result: ProcessingResult = {
    invoice: store.getInvoice(invoice.id)!,
    vendorProfile,
    riskAssessment: investigation.riskAssessment,
    transaction,
  };

  store.setProcessingResult(invoice.id, result);
  detectPatterns(invoice);

  log(invoice.id, '========================================');
  log(invoice.id, `PIPELINE COMPLETE in ${(processingTimeMs / 1000).toFixed(1)}s — ${investigation.riskAssessment.riskLevel} risk`);
  log(invoice.id, '========================================');

  return result;
}

function detectPatterns(newInvoice: Invoice): void {
  const allInvoices = store.getAllInvoices().filter(i => i.id !== newInvoice.id && i.status !== 'pending');

  const recentNewVendors = allInvoices.filter(i => {
    const daysSince = (Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7;
  });

  if (recentNewVendors.length >= 3) {
    const existingPattern = store.getPatterns().find(p => p.type === 'rapid_onboarding');
    if (!existingPattern) {
      store.addPattern({
        id: `pattern-${Date.now()}`,
        type: 'rapid_onboarding',
        description: `${recentNewVendors.length + 1} new vendors onboarded within 7 days. Consider reviewing for coordinated fraud.`,
        invoiceIds: [...recentNewVendors.map(i => i.id), newInvoice.id],
        severity: 'MEDIUM',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  const similarAmountInvoices = allInvoices.filter(i =>
    Math.abs(i.amount - newInvoice.amount) / newInvoice.amount < 0.1
  );

  if (similarAmountInvoices.length >= 2) {
    store.addPattern({
      id: `pattern-${Date.now()}-amt`,
      type: 'similar_amounts',
      description: `${similarAmountInvoices.length + 1} invoices with similar amounts (~${newInvoice.currency} ${newInvoice.amount}). Could be coincidental or structured.`,
      invoiceIds: [...similarAmountInvoices.map(i => i.id), newInvoice.id],
      severity: 'LOW',
      detectedAt: new Date().toISOString(),
    });
  }
}
