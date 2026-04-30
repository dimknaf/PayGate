import { NextRequest, NextResponse } from 'next/server';
import { humanApprove, humanReject } from '@/lib/mock-payment';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, action } = await req.json();

    if (!invoiceId || !action) {
      return NextResponse.json({ error: 'invoiceId and action required' }, { status: 400 });
    }

    if (action === 'approve') {
      const tx = humanApprove(invoiceId);
      if (!tx) {
        return NextResponse.json({ error: 'Invoice not found or not in reviewable state' }, { status: 404 });
      }
      return NextResponse.json({ success: true, transaction: tx });
    }

    if (action === 'reject') {
      const success = humanReject(invoiceId);
      if (!success) {
        return NextResponse.json({ error: 'Invoice not found or not in reviewable state' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
  } catch (err) {
    console.error('Approve payment error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
