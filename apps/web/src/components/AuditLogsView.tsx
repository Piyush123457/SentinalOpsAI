'use client';

import React, { useState } from 'react';
import { FileText, Shield, Key, CheckCircle2, AlertOctagon, Search } from 'lucide-react';

interface AuditLogsViewProps {
  events: any[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ events }) => {
  const [filter, setFilter] = useState('');

  const displayEvents = events.filter((e) =>
    e.message?.toLowerCase().includes(filter.toLowerCase()) ||
    e.type?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Cryptographic Security & Compliance Audit Log
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only tamper-evident audit records of state transitions, tool invocations, and single-use tokens.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter audit records..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-slate-200 text-xs w-56 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4">Event Sequence</th>
              <th className="py-3 px-4">Classification</th>
              <th className="py-3 px-4">Audit Message</th>
              <th className="py-3 px-4">Level</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {displayEvents.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-sans">
                  No security audit records logged for the current filter.
                </td>
              </tr>
            ) : (
              displayEvents.map((evt, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-semibold text-slate-500">#{evt.sequence || idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {evt.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-800 text-xs max-w-md">
                    {evt.message}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.level === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.level === 'WARN'
                          ? 'bg-amber-100 text-amber-800'
                          : evt.level === 'ERROR'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {evt.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-sans text-xs">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
