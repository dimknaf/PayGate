'use client';

import { useState } from 'react';
import { Mail, Check, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { NotificationRecipient } from '@/lib/types';

const priorityConfig = {
  required: { label: 'Required', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  recommended: { label: 'Recommended', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  fyi: { label: 'FYI', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

export function NotificationPanel({
  recipients: initialRecipients,
}: {
  recipients: NotificationRecipient[];
}) {
  const [recipients, setRecipients] = useState(initialRecipients);
  const [sent, setSent] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const toggleRecipient = (idx: number) => {
    setRecipients(prev =>
      prev.map((r, i) => i === idx ? { ...r, selected: !r.selected } : r)
    );
  };

  const selectAll = () => setRecipients(prev => prev.map(r => ({ ...r, selected: true })));
  const deselectAll = () => setRecipients(prev => prev.map(r => ({ ...r, selected: false })));

  const selectedCount = recipients.filter(r => r.selected).length;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 border-b border-[var(--border)] flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm">Suggested Notifications</h3>
          <span className="text-xs text-[var(--text-secondary)]">
            ({selectedCount}/{recipients.length} selected)
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-secondary)]">
              The agent selected these team members based on the invoice type, amount, and risk level.
            </p>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                All
              </button>
              <span className="text-xs text-[var(--text-secondary)]">/</span>
              <button onClick={deselectAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                None
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {recipients.map((recipient, idx) => {
              const pConfig = priorityConfig[recipient.priority];
              return (
                <label
                  key={recipient.employee.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={recipient.selected}
                    onChange={() => toggleRecipient(idx)}
                    className="mt-0.5 rounded border-[var(--border)] bg-[var(--bg-primary)] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{recipient.employee.name}</span>
                      <span className="text-xs text-[var(--text-secondary)]">{recipient.employee.role}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${pConfig.className}`}>
                        {pConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{recipient.reason}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            {sent ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Check className="w-4 h-4" />
                <span>Notifications sent to {selectedCount} recipients</span>
              </div>
            ) : (
              <button
                onClick={handleSend}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                Send to {selectedCount} recipient{selectedCount !== 1 ? 's' : ''}
              </button>
            )}
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
              <Info className="w-3 h-3" />
              <span>Mock — no emails sent</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
