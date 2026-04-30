import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { processInvoice } from '@/lib/pipeline';
import {
  getAgentPool,
  withTimeout,
  PipelineTimeoutError,
} from '@/lib/agent-pool';
import { emitActivity } from '@/lib/events';
import { Invoice } from '@/lib/types';
import seedInvoices from '@/data/seed-invoices.json';

const PIPELINE_TIMEOUT_MS = Math.max(
  60_000,
  Number(process.env.PIPELINE_TIMEOUT_MS ?? 30 * 60_000)
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, customInvoice } = body;

    let invoice: Invoice;

    if (invoiceId) {
      const seed = seedInvoices.find((s) => s.id === invoiceId);
      if (!seed) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      invoice = {
        ...seed,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
    } else if (customInvoice) {
      invoice = {
        ...customInvoice,
        id: `INV-${Date.now()}`,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
    } else {
      return NextResponse.json({ error: 'Provide invoiceId or customInvoice' }, { status: 400 });
    }

    const existing = store.getInvoice(invoice.id);
    if (existing && existing.status === 'processing') {
      return NextResponse.json({ error: 'Invoice is already being processed' }, { status: 409 });
    }

    store.addInvoice(invoice);

    void runPipeline(invoice);

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      message: `Processing started for ${invoice.vendorName}`,
    });
  } catch (err) {
    console.error('Process invoice error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Acquire a slot from the agent pool, then run the pipeline under a timeout.
 * The pool itself caps concurrency (no manual queue needed). If the pool is
 * full, we emit `pool_waiting` so the UI shows the invoice is queued.
 */
async function runPipeline(invoice: Invoice): Promise<void> {
  const pool = getAgentPool();

  if (!pool.hasFreeSlot()) {
    emitActivity(
      invoice.id,
      'pool_waiting',
      `Waiting for an agent slot (${pool.inFlight}/${pool.size} in flight, ${pool.waiting + 1} queued)...`
    );
  }

  let lease;
  try {
    lease = await pool.acquire();
  } catch (err) {
    console.error(`Pool acquire failed for ${invoice.id}:`, err);
    store.updateInvoice(invoice.id, { status: 'blocked' });
    emitActivity(
      invoice.id,
      'error',
      `Could not acquire agent: ${err instanceof Error ? err.message : String(err)}`
    );
    return;
  }

  emitActivity(
    invoice.id,
    'pool_acquired',
    `Agent slot acquired (${pool.inFlight}/${pool.size} in flight)`
  );

  try {
    await withTimeout(() => processInvoice(lease.agent, invoice), PIPELINE_TIMEOUT_MS);
  } catch (err: unknown) {
    const message =
      err instanceof PipelineTimeoutError
        ? `Pipeline timed out after ${(PIPELINE_TIMEOUT_MS / 1000).toFixed(0)}s — escalated to manual review`
        : `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`Pipeline error for ${invoice.id}:`, err);
    store.updateInvoice(invoice.id, { status: 'blocked' });
    emitActivity(invoice.id, 'error', message);
  } finally {
    lease.release();
  }
}
