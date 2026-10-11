'use client';

import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronRight, Radio } from 'lucide-react';

interface ActivityMonitorProps {
  events: any[];
  isConnected: boolean;
}

export const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  events,
  isConnected
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getEventBadge = (type: string, level: string) => {
    if (level === 'ERROR') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (level === 'SUCCESS') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (level === 'WARN') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (type === 'STATE_TRANSITION') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (type.includes('TOOL')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Real-Time Activity Stream</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            {isConnected ? 'Live SSE Connected' : 'History Replay'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold">
            {events.length} events
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 font-mono text-xs">
        {events.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Awaiting orchestrator events...
          </div>
        ) : (
          events.map((evt) => {
            const isExpanded = expandedId === evt.id;
            return (
              <div
                key={evt.id}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50"
              >
                <div
                  onClick={() => toggleExpand(evt.id)}
                  className="flex items-start justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 shrink-0">
                      #{evt.sequence}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold shrink-0 ${getEventBadge(
                        evt.type,
                        evt.level
                      )}`}
                    >
                      {evt.type}
                    </span>
                    <span className="text-slate-800 text-xs font-normal break-all">
                      {evt.message}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && evt.payload && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                    <pre className="text-[11px] bg-slate-900 text-slate-100 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
