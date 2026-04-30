'use client';

import { useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { RiskBadge, StatusBadge } from './StatusBadge';

export function HistoryTable({
  transactions,
  onSelectInvoice,
}: {
  transactions: Transaction[];
  onSelectInvoice: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'risk'>('date');

  const filtered = transactions.filter(
    (t) =>
      t.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      t.invoiceId.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'amount':
        return b.amount - a.amount;
      case 'risk':
        return b.riskScore - a.riskScore;
      default:
        return new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime();
    }
  });

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="font-semibold text-sm">Processing History</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] focus:border-blue-500 focus:outline-none w-48"
            />
          </div>
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
            {(['date', 'amount', 'risk'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1.5 text-xs capitalize transition-colors ${
                  sortBy === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
          <ArrowUpDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border)]">
                <th className="text-left p-3 font-medium">Invoice</th>
                <th className="text-left p-3 font-medium">Vendor</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-center p-3 font-medium">Risk</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Decided By</th>
                <th className="text-right p-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectInvoice(tx.invoiceId)}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                >
                  <td className="p-3 font-mono text-xs">{tx.invoiceId}</td>
                  <td className="p-3 font-medium">{tx.vendorName}</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {tx.currency === 'GBP' ? '£' : '$'}{tx.amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <RiskBadge level={tx.riskLevel} />
                  </td>
                  <td className="p-3 text-center">
                    <StatusBadge
                      status={
                        tx.status === 'executed'
                          ? tx.approvedBy === 'agent'
                            ? 'auto_approved'
                            : 'manually_approved'
                          : tx.status === 'flagged_for_review'
                            ? 'flagged'
                            : 'blocked'
                      }
                    />
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.approvedBy === 'agent'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {tx.approvedBy === 'agent' ? 'AI Agent' : 'Human'}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs text-[var(--text-secondary)]">
                    {(tx.processingTimeMs / 1000).toFixed(1)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
