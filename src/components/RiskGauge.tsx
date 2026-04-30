'use client';

export function RiskGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const percentage = Math.round(score * 100);
  const color =
    score < 0.3 ? '#10b981' :
    score < 0.6 ? '#f59e0b' :
    '#ef4444';

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-[var(--text-secondary)] tracking-wide">Risk Score</span>
        <span className="font-mono font-bold tabular-nums" style={{ color }}>
          {percentage}%
        </span>
      </div>
      <div className={`w-full ${sizeClasses[size]} bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border)]`}>
        <div
          className={`${sizeClasses[size]} rounded-full gauge-fill transition-all duration-500`}
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
        <span>Safe</span>
        <span>Caution</span>
        <span>Danger</span>
      </div>
    </div>
  );
}
