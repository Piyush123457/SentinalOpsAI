'use client';

import React, { useEffect, useState } from 'react';
import { Bot, Shield, CheckCircle, AlertTriangle, Lock, Eye, Terminal } from 'lucide-react';
import { apiRequest } from '../lib/api';

export const AgentsView: React.FC = () => {
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    async function loadTools() {
      try {
        const res = await apiRequest<{ tools: any[] }>('/api/v1/tools');
        setTools(res.tools || []);
      } catch (e) {
        console.error('Failed to load tools:', e);
      }
    }
    loadTools();
  }, []);

  const stateMachineStates = [
    { name: 'CREATED', desc: 'Task initialized with user prompt' },
    { name: 'UNDERSTANDING', desc: 'Parses objective & affected services' },
    { name: 'INVESTIGATING', desc: 'Probes baseline health & reads logs' },
    { name: 'PLANNING', desc: 'Synthesizes runbooks into structured plan' },
    { name: 'AWAITING_APPROVAL', desc: 'Cryptographic human authorization gate' },
    { name: 'EXECUTING', desc: 'Invokes permitted tools under policy sandbox' },
    { name: 'OBSERVING', desc: 'Captures Playwright visual DOM evidence' },
    { name: 'RECOVERING', desc: 'Adaptive retry / stale state cleanup' },
    { name: 'VERIFYING', desc: 'Independent 5-criteria read-only probes' },
    { name: 'RESOLVED', desc: 'Generates grounded postmortem report' },
    { name: 'FAILED', desc: 'Escalation on exhausted retries' },
    { name: 'CANCELLED', desc: 'Halted by operator request' }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Agent Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">SentinelOps Autonomous SRE Agent</h1>
            <p className="text-xs text-slate-500">
              Model: <span className="font-semibold text-slate-700">Groq llama-3.3-70b-versatile</span> • Mode: Closed-Loop State Machine
            </p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            ONLINE
          </span>
        </div>
      </div>

      {/* 2. State Machine Flow */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
          Explicit 12-State Agent State Machine
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Strict deterministic lifecycle preventing hallucinated shortcuts or unverified completions.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {stateMachineStates.map((s, idx) => (
            <div key={s.name} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="font-mono text-xs font-bold text-slate-800">{s.name}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Registered Tool Security Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Tool Registry & Security Classification ({tools.length} Tools)
            </h2>
            <p className="text-xs text-slate-500">
              Server-enforced policy boundaries. Restricted operations require cryptographic approval tokens.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Tool Name</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Risk Classification</th>
                <th className="py-2.5 px-3">Permission Required</th>
                <th className="py-2.5 px-3">Timeout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {tools.map((t) => (
                <tr key={t.name} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-semibold text-blue-700">{t.name}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-600 text-xs max-w-xs">{t.description}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.riskLevel === 'READ_ONLY'
                          ? 'bg-blue-100 text-blue-800'
                          : t.riskLevel === 'LOW_RISK_REMEDIATION'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.riskLevel === 'RESTRICTED_REMEDIATION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {t.riskLevel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-500 text-xs">{t.requiredPermission}</td>
                  <td className="py-2.5 px-3 text-slate-500">{t.timeoutMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
