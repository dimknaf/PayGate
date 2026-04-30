'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Clock, CreditCard, AlertTriangle, TrendingUp,
  History as HistoryIcon, LayoutDashboard
} from 'lucide-react';
import { Invoice, Transaction, VendorProfile, CrossInvoicePattern } from '@/lib/types';
import { InvoiceQueue } from './InvoiceQueue';
import { InvoiceDetail } from './InvoiceDetail';
import { ActivityFeed } from './ActivityFeed';
import { HistoryTable } from './HistoryTable';

interface DashboardData {
  invoices: Invoice[];
  transactions: Transaction[];
  vendors: VendorProfile[];
  patterns: CrossInvoicePattern[];
  seedInvoices: Array<{
    id: string;
    vendorName: string;
    amount: number;
    currency: string;
    description: string;
  }>;
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    invoices: [],
    transactions: [],
    vendors: [],
    patterns: [],
    seedInvoices: [],
  });
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices');
      const json = await res.json();
      setData(json);
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const stats = {
    total: data.invoices.length,
    processing: data.invoices.filter((i) => i.status === 'processing').length,
    approved: data.invoices.filter((i) => ['auto_approved', 'manually_approved'].includes(i.status)).length,
    flagged: data.invoices.filter((i) => i.status === 'flagged').length,
    blocked: data.invoices.filter((i) => ['blocked', 'manually_rejected'].includes(i.status)).length,
    totalPaid: data.transactions.filter((t) => t.status === 'executed').reduce((s, t) => s + t.amount, 0),
    avgTime: data.transactions.length
      ? data.transactions.reduce((s, t) => s + t.processingTimeMs, 0) / data.transactions.length / 1000
      : 0,
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Supplier Payment Agent</h1>
              <p className="text-xs text-[var(--text-secondary)]">AI-Powered Vendor Due Diligence & First Payment Approval</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => { setView('dashboard'); setSelectedInvoice(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                view === 'dashboard' ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => { setView('history'); setSelectedInvoice(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                view === 'history' ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              History
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<CreditCard className="w-4 h-4" />} label="Processed" value={stats.total} color="blue" />
          <StatCard icon={<Shield className="w-4 h-4" />} label="Approved" value={stats.approved} color="green" />
          <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Flagged" value={stats.flagged} color="amber" />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Total Paid" value={`£${stats.totalPaid.toLocaleString()}`} color="purple" />
          <StatCard icon={<Clock className="w-4 h-4" />} label="Avg Time" value={`${stats.avgTime.toFixed(1)}s`} color="cyan" />
        </div>

        {/* Patterns alert */}
        {data.patterns.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-400">Cross-Invoice Patterns Detected</h3>
            </div>
            {data.patterns.map((p) => (
              <p key={p.id} className="text-sm text-[var(--text-secondary)] ml-6">{p.description}</p>
            ))}
          </div>
        )}

        {view === 'dashboard' && !selectedInvoice && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <InvoiceQueue
                invoices={data.invoices}
                seedInvoices={data.seedInvoices}
                onSelectInvoice={setSelectedInvoice}
                onRefresh={fetchData}
              />
            </div>
            <div className="lg:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        )}

        {view === 'dashboard' && selectedInvoice && (
          <InvoiceDetail
            invoiceId={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
          />
        )}

        {view === 'history' && !selectedInvoice && (
          <HistoryTable
            transactions={data.transactions}
            onSelectInvoice={(id) => { setSelectedInvoice(id); setView('dashboard'); }}
          />
        )}

        {view === 'history' && selectedInvoice && (
          <InvoiceDetail
            invoiceId={selectedInvoice}
            onBack={() => setSelectedInvoice(null)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Cursor × Briefcase Hackathon 2026 — Track 1: Money Movement</span>
          <span>Powered by Cursor SDK + Specter API</span>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    green: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
