import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { processInvoice } from '@/lib/pipeline';
import { enqueuePipelineWithTimeout, PipelineTimeoutError } from '@/lib/pipeline-queue';
import { emitActivity } from '@/lib/events';
import { Invoice } from '@/lib/types';
import seedInvoices from '@/data/seed-invoices.json';

const PIPELINE_TIMEOUT_MS = 120_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { invoiceId, customInvoice } = body;

    let invoice: Invoice;

    if (invoiceId) {
      // Load from seed data
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

    // Check if already processing
    const existing = store.getInvoice(invoice.id);
    if (existing && existing.status === 'processing') {
      return NextResponse.json({ error: 'Invoice is already being processed' }, { status: 409 });
    }

    store.addInvoice(invoice);

    // Queue: one Cursor SDK agent — never run overlapping pipelines.
    // Timeout: a single hung run cannot stall subsequent invoices.
    enqueuePipelineWithTimeout(
      () => processInvoice(invoice),
      PIPELINE_TIMEOUT_MS
    ).catch((err: unknown) => {
      const message =
        err instanceof PipelineTimeoutError
          ? `Pipeline timed out after ${PIPELINE_TIMEOUT_MS / 1000}s — escalated to manual review`
          : `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`Pipeline error for ${invoice.id}:`, err);
      store.updateInvoice(invoice.id, { status: 'blocked' });
      emitActivity(invoice.id, 'error', message);
    });

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
