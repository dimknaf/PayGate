import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import seedInvoices from '@/data/seed-invoices.json';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeResults = searchParams.get('results') === 'true';
  const invoiceId = searchParams.get('id');

  if (invoiceId) {
    const invoice = store.getInvoice(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const result = includeResults ? store.getProcessingResult(invoiceId) : undefined;
    const activity = store.getActivityLog(invoiceId);
    const transaction = store.getTransactionByInvoice(invoiceId);

    return NextResponse.json({
      invoice,
      result: result || undefined,
      activity,
      transaction: transaction || undefined,
    });
  }

  const invoices = store.getAllInvoices();
  const transactions = store.getAllTransactions();
  const vendors = store.getAllVendors();
  const patterns = store.getPatterns();

  return NextResponse.json({
    invoices,
    transactions,
    vendors,
    patterns,
    seedInvoices: seedInvoices.map((s) => ({
      id: s.id,
      vendorName: s.vendorName,
      amount: s.amount,
      currency: s.currency,
      description: s.description,
    })),
  });
}
