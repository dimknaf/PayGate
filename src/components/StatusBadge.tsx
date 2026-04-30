'use client';

import { Shield, ShieldCheck, ShieldAlert, ShieldX, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { InvoiceStatus, RiskLevel } from '@/lib/types';

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config: Record<InvoiceStatus, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Pending',
      className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    processing: {
      label: 'Processing',
      className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    auto_approved: {
      label: 'Auto-Approved',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    flagged: {
      label: 'Flagged for Review',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    blocked: {
      label: 'Blocked',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <ShieldX className="w-3.5 h-3.5" />,
    },
    manually_approved: {
      label: 'Human Approved',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    manually_rejected: {
      label: 'Human Rejected',
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
  };

  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${c.className}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { className: string; icon: React.ReactNode }> = {
    LOW: {
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    MEDIUM: {
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    HIGH: {
      className: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <ShieldX className="w-3.5 h-3.5" />,
    },
  };

  const c = config[level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${c.className}`}>
      {c.icon}
      {level} Risk
    </span>
  );
}
