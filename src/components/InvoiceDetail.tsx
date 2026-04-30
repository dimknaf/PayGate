'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, Clock, Loader2 } from 'lucide-react';
import { Invoice, ProcessingResult, ActivityEvent, Transaction } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { VendorProfileCard } from './VendorProfile';
import { RiskBriefCard } from './RiskBrief';
import { PaymentActions } from './PaymentActions';

export function InvoiceDetail({
  invoiceId,
  onBack,
}: {
  invoiceId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<{
    invoice: Invoice;
    result?: ProcessingResult;
    activity: ActivityEvent[];
    transaction?: Transaction;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices?id=${invoiceId}&results=true`);
      const json = await res.json();
      setData(json);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const { invoice, result, transaction } = data;
  const isReviewable = invoice.status === 'flagged' || invoice.status === 'blocked';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to queue
        </button>
        {isReviewable && (
          <PaymentActions invoiceId={invoiceId} onAction={fetchData} />
        )}
      </div>

      {/* Invoice info */}
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm">Invoice {invoice.invoiceNumber}</h3>
          </div>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Vendor</p>
              <p className="text-sm font-medium mt-0.5">{invoice.vendorName}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Amount</p>
              <p className="text-lg font-bold mt-0.5">
                {invoice.currency === 'GBP' ? '£' : '$'}{invoice.amount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Due Date</p>
              <p className="text-sm font-medium mt-0.5">{invoice.dueDate}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Processing Time</p>
              <p className="text-sm font-medium mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {transaction
                  ? `${(transaction.processingTimeMs / 1000).toFixed(1)}s`
                  : invoice.status === 'processing'
                    ? 'In progress...'
                    : '—'}
              </p>
            </div>
          </div>

          {/* Line items */}
          {invoice.lineItems.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">Line Items</p>
              <div className="bg-[var(--bg-primary)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Qty</th>
                      <th className="text-right p-2 font-medium">Unit Price</th>
                      <th className="text-right p-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right font-mono">£{item.unitPrice.toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">£{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vendor profile + Risk assessment */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VendorProfileCard vendor={result.vendorProfile} />
          <RiskBriefCard assessment={result.riskAssessment} />
        </div>
      )}

      {/* Processing state if still running */}
      {invoice.status === 'processing' && !result && (
        <div className="bg-[var(--bg-secondary)] rounded-xl border border-blue-500/20 p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center pulse-processing">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
          <p className="text-sm font-medium">Agent is analyzing this invoice...</p>
          <p className="text-xs text-[var(--text-secondary)]">Watch the Live Activity Feed for real-time updates</p>
        </div>
      )}
    </div>
  );
}
