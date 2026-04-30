'use client';

import { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';

export function PaymentActions({
  invoiceId,
  onAction,
}: {
  invoiceId: string;
  onAction: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(action);
    try {
      const res = await fetch('/api/approve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, action }),
      });
      if (res.ok) {
        onAction();
      }
    } catch {
      // silently handle
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleAction('approve')}
        disabled={loading !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Approve Payment
      </button>
      <button
        onClick={() => handleAction('reject')}
        disabled={loading !== null}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        Reject
      </button>
    </div>
  );
}
