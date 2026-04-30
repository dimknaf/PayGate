'use client';

import { useState } from 'react';
import { Plus, FileText, Loader2, ChevronRight, Zap } from 'lucide-react';
import { Invoice } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface SeedInvoice {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  description: string;
}

export function InvoiceQueue({
  invoices,
  seedInvoices,
  onSelectInvoice,
  onRefresh,
}: {
  invoices: Invoice[];
  seedInvoices: SeedInvoice[];
  onSelectInvoice: (id: string) => void;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const submitInvoice = async (invoiceId: string) => {
    setSubmitting(invoiceId);
    try {
      await fetch('/api/process-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      onRefresh();
    } catch {
      // silently handle
    } finally {
      setSubmitting(null);
    }
  };

  const processAll = async () => {
    setProcessingAll(true);
    const unprocessed = seedInvoices.filter(
      (s) => !invoices.find((i) => i.id === s.id)
    );
    for (const seed of unprocessed) {
      await submitInvoice(seed.id);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setProcessingAll(false);
  };

  const isProcessed = (id: string) => invoices.some((i) => i.id === id);

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm">Invoice Queue</h3>
          <span className="text-xs text-[var(--text-secondary)]">
            ({invoices.length} processed)
          </span>
        </div>
        <button
          onClick={processAll}
          disabled={processingAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all disabled:opacity-50"
        >
          {processingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Process All
        </button>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {/* Seed invoices */}
        {seedInvoices.map((seed) => {
          const processed = invoices.find((i) => i.id === seed.id);
          const isSubmitting = submitting === seed.id;

          return (
            <div
              key={seed.id}
              className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              onClick={() => processed && onSelectInvoice(seed.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{seed.vendorName}</span>
                  {processed && <StatusBadge status={processed.status} />}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">{seed.id}</span>
                  <span className="text-xs font-mono font-bold">
                    {seed.currency === 'GBP' ? '£' : '$'}{seed.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] truncate">{seed.description}</span>
                </div>
              </div>
              <div className="ml-3 shrink-0">
                {!isProcessed(seed.id) ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      submitInvoice(seed.id);
                    }}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-blue-600 text-xs font-medium transition-all border border-[var(--border)] hover:border-blue-500 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Process
                  </button>
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
