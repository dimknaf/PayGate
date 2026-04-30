import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { processInvoice } from '@/lib/pipeline';
import { Invoice } from '@/lib/types';
import seedInvoices from '@/data/seed-invoices.json';

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

    // Process async — don't await in the response
    processInvoice(invoice).catch((err) => {
      console.error(`Pipeline error for ${invoice.id}:`, err);
      store.updateInvoice(invoice.id, { status: 'blocked' });
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
