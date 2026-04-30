'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Search, Building2, Users, Globe, Eye,
  ShieldCheck, ShieldAlert, ShieldX, CreditCard,
  AlertTriangle, Brain, Zap, Radio
} from 'lucide-react';
import { ActivityEvent } from '@/lib/types';

const eventIcons: Record<string, React.ReactNode> = {
  invoice_received: <FileText className="w-3.5 h-3.5 text-blue-400" />,
  parsing_started: <Zap className="w-3.5 h-3.5 text-purple-400" />,
  parsing_complete: <FileText className="w-3.5 h-3.5 text-emerald-400" />,
  specter_company_search: <Search className="w-3.5 h-3.5 text-blue-400" />,
  specter_company_found: <Building2 className="w-3.5 h-3.5 text-emerald-400" />,
  specter_company_not_found: <Building2 className="w-3.5 h-3.5 text-red-400" />,
  specter_people_search: <Users className="w-3.5 h-3.5 text-blue-400" />,
  specter_people_found: <Users className="w-3.5 h-3.5 text-emerald-400" />,
  web_search_started: <Globe className="w-3.5 h-3.5 text-blue-400" />,
  web_search_complete: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
  browser_visit_started: <Eye className="w-3.5 h-3.5 text-blue-400" />,
  browser_visit_complete: <Eye className="w-3.5 h-3.5 text-emerald-400" />,
  risk_assessment_started: <Brain className="w-3.5 h-3.5 text-purple-400" />,
  risk_assessment_complete: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />,
  decision_made: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
  payment_executed: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />,
  payment_blocked: <ShieldX className="w-3.5 h-3.5 text-red-400" />,
  payment_flagged: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
  human_approved: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
  human_rejected: <ShieldX className="w-3.5 h-3.5 text-red-400" />,
  error: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
  agent_thinking: <Brain className="w-3.5 h-3.5 text-purple-400" />,
};

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const addEvent = useCallback((event: ActivityEvent) => {
    if (seenIds.current.has(event.id)) return;
    seenIds.current.add(event.id);
    setEvents((prev) => [...prev, event]);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource('/api/activity-stream');

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connected' || data.type === 'heartbeat') return;
          if (data.id && data.message) {
            addEvent(data as ActivityEvent);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        // EventSource auto-reconnects, but if it fully fails, retry
        reconnectTimer = setTimeout(() => {
          if (es?.readyState === EventSource.CLOSED) {
            es?.close();
            connect();
          }
        }, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [addEvent]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm">Live Activity Feed</h3>
          {events.length > 0 && (
            <span className="text-xs text-[var(--text-secondary)]">({events.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-[var(--text-secondary)]">
            {connected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-0.5 min-h-[200px] max-h-[600px]">
        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] text-sm gap-2">
            <Radio className="w-6 h-6 opacity-30" />
            <p>Waiting for activity...</p>
            <p className="text-xs">Process an invoice to see the agent work</p>
          </div>
        )}
        {events.map((event) => (
          <div key={event.id} className="activity-line flex items-start gap-2 py-1 px-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5 shrink-0 w-16">
              {formatTime(event.timestamp)}
            </span>
            <span className="mt-0.5 shrink-0">
              {eventIcons[event.type] || <Zap className="w-3.5 h-3.5 text-gray-400" />}
            </span>
            <span className="text-xs text-[var(--text-primary)] leading-relaxed break-words">{event.message}</span>
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <div className="px-4 py-2 border-t border-[var(--border)]">
          <button
            onClick={() => { setEvents([]); seenIds.current.clear(); }}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear feed
          </button>
        </div>
      )}
    </div>
  );
}
