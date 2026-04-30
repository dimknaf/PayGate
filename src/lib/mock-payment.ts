import { Invoice, RiskAssessment, Transaction, PaymentStatus } from './types';
import { store } from './store';
import { emitActivity } from './events';

export function executePaymentDecision(
  invoice: Invoice,
  assessment: RiskAssessment,
  processingTimeMs: number
): Transaction {
  let paymentStatus: PaymentStatus;
  let invoiceStatus: Invoice['status'];

  switch (assessment.recommendation) {
    case 'auto_approve':
      paymentStatus = 'executed';
      invoiceStatus = 'auto_approved';
      emitActivity(invoice.id, 'payment_executed',
        `Payment of ${invoice.currency} ${invoice.amount.toLocaleString()} to ${invoice.vendorName} auto-approved and executed.`,
        { amount: invoice.amount, vendor: invoice.vendorName }
      );
      break;

    case 'flag_for_review':
      paymentStatus = 'flagged_for_review';
      invoiceStatus = 'flagged';
      emitActivity(invoice.id, 'payment_flagged',
        `Payment flagged for human review. Reason: ${assessment.reasoning}`,
        { amount: invoice.amount, vendor: invoice.vendorName, reasoning: assessment.reasoning }
      );
      break;

    case 'block':
      paymentStatus = 'blocked';
      invoiceStatus = 'blocked';
      emitActivity(invoice.id, 'payment_blocked',
        `Payment BLOCKED. ${assessment.thresholdsTriggered.length} risk triggers: ${assessment.thresholdsTriggered.join(', ')}`,
        { amount: invoice.amount, vendor: invoice.vendorName, triggers: assessment.thresholdsTriggered }
      );
      break;

    default:
      paymentStatus = 'blocked';
      invoiceStatus = 'blocked';
  }

  store.updateInvoice(invoice.id, {
    status: invoiceStatus,
    processedAt: new Date().toISOString(),
  });

  const transaction: Transaction = {
    id: `tx-${Date.now()}-${invoice.id}`,
    invoiceId: invoice.id,
    vendorName: invoice.vendorName,
    amount: invoice.amount,
    currency: invoice.currency,
    status: paymentStatus,
    riskLevel: assessment.riskLevel,
    riskScore: assessment.riskScore,
    approvedBy: assessment.recommendation === 'auto_approve' ? 'agent' : 'human',
    approvedAt: new Date().toISOString(),
    brief: assessment.brief,
    processingTimeMs,
  };

  store.addTransaction(transaction);

  // Update vendor trust and total paid
  const vendor = store.getVendor(invoice.vendorName);
  if (vendor && paymentStatus === 'executed') {
    vendor.totalPaid += invoice.amount;
    store.upsertVendor(vendor);
  }

  return transaction;
}

export function humanApprove(invoiceId: string): Transaction | null {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || (invoice.status !== 'flagged' && invoice.status !== 'blocked')) {
    return null;
  }

  store.updateInvoice(invoiceId, { status: 'manually_approved', processedAt: new Date().toISOString() });

  const existingTx = store.getTransactionByInvoice(invoiceId);
  if (existingTx) {
    existingTx.status = 'executed';
    existingTx.approvedBy = 'human';
    existingTx.approvedAt = new Date().toISOString();

    const vendor = store.getVendor(invoice.vendorName);
    if (vendor) {
      vendor.totalPaid += invoice.amount;
      vendor.trustScore = Math.min(100, vendor.trustScore + 10);
      store.upsertVendor(vendor);
    }

    emitActivity(invoiceId, 'human_approved',
      `Human APPROVED payment of ${invoice.currency} ${invoice.amount.toLocaleString()} to ${invoice.vendorName}`,
      { amount: invoice.amount, vendor: invoice.vendorName }
    );

    return existingTx;
  }
  return null;
}

export function humanReject(invoiceId: string): boolean {
  const invoice = store.getInvoice(invoiceId);
  if (!invoice || (invoice.status !== 'flagged' && invoice.status !== 'blocked')) {
    return false;
  }

  store.updateInvoice(invoiceId, { status: 'manually_rejected', processedAt: new Date().toISOString() });

  const existingTx = store.getTransactionByInvoice(invoiceId);
  if (existingTx) {
    existingTx.status = 'blocked';
    existingTx.approvedBy = 'human';
  }

  const vendor = store.getVendor(invoice.vendorName);
  if (vendor) {
    vendor.trustScore = Math.max(0, vendor.trustScore - 20);
    store.upsertVendor(vendor);
  }

  emitActivity(invoiceId, 'human_rejected',
    `Human REJECTED payment of ${invoice.currency} ${invoice.amount.toLocaleString()} to ${invoice.vendorName}`,
    { amount: invoice.amount, vendor: invoice.vendorName }
  );

  return true;
}
