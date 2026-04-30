'use client';

import { FileText } from 'lucide-react';
import { RiskAssessment } from '@/lib/types';
import { RiskGauge } from './RiskGauge';
import { RiskBadge } from './StatusBadge';

export function RiskBriefCard({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm">Risk Assessment</h3>
        </div>
        <RiskBadge level={assessment.riskLevel} />
      </div>

      <div className="p-4 space-y-4">
        <RiskGauge score={assessment.riskScore} size="lg" />

        {/* Reasoning */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Summary</p>
          <p className="text-sm leading-relaxed">{assessment.reasoning}</p>
        </div>

        {/* Thresholds triggered */}
        {assessment.thresholdsTriggered.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Risk Triggers</p>
            <div className="flex flex-wrap gap-1.5">
              {assessment.thresholdsTriggered.map((t, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {t.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full brief */}
        <div>
          <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Analyst Brief</p>
          <div className="bg-[var(--bg-primary)] rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {assessment.brief}
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Agent Confidence</span>
          <span className="font-mono font-bold">{Math.round(assessment.confidence * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
