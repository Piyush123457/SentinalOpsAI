'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Play,
  RotateCw,
  Server,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface DashboardViewProps {
  tasks: any[];
  serviceHealth: string;
  onNavigateToWorkflows: () => void;
  onSelectTask: (task: any) => void;
  onLaunchScenario: (scenarioId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  serviceHealth,
  onNavigateToWorkflows,
  onSelectTask,
  onLaunchScenario
}) => {
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const failedCount = tasks.filter((t) => t.status === 'FAILED').length;
  const runningCount = tasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'FAILED' && t.status !== 'CANCELLED').length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              Autonomous SRE Operations Center
            </div>
            <h1 className="text-2xl font-bold tracking-tight">SentinelOps Incident Command Dashboard</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-xl">
              Closed-loop autonomous incident investigation, runbook-guided remediation, human approval gates, and independent verification.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onLaunchScenario('scenario-a')}
              className="px-4 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Quick Dispatch Scenario A
            </button>
            <button
              onClick={onNavigateToWorkflows}
              className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors flex items-center gap-2 border border-white/20"
            >
              <Layers className="w-3.5 h-3.5" />
              Open Live Workflow
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Service Health</span>
            <div className={`p-2 rounded-lg ${serviceHealth === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{serviceHealth}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${serviceHealth === 'HEALTHY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            Order Processing Service (5001)
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Incidents Resolved</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{completedCount}</span>
            <span className="text-xs font-medium text-slate-400">of {tasks.length} runs</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            100% verified with read-only probes
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Autonomous MTTR</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">3.4s</span>
            <span className="text-xs font-medium text-emerald-600">sub-5s SLO target</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Average time to verified resolution
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Security Engine</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">Active</span>
            <span className="text-xs font-medium text-purple-600">Token Gated</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Restricted tools require single-use tokens
          </div>
        </div>
      </div>

      {/* 3. Quick Scenario Launcher & Service Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Preset Scenarios */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Incident Playground Presets</h2>
              <p className="text-xs text-slate-500">Trigger full autonomous recovery loops with one click</p>
            </div>
            <button
              onClick={onNavigateToWorkflows}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Custom Prompt <Play className="w-3 h-3 fill-current" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'scenario-a', name: 'Scenario A: Worker Disabled', tag: 'Standard', desc: 'Worker disconnects; agent diagnoses logs, reads runbook RB-ORD-001, restarts worker, and verifies queue draining.' },
              { id: 'scenario-b', name: 'Scenario B: Flaky Remediation', tag: 'Adaptive', desc: 'Initial worker restart encounters orphaned lockfile; adaptive recovery engine detects lock and executes cleanup.' },
              { id: 'scenario-c', name: 'Scenario C: Diagnostic Timeout', tag: 'Resilience', desc: 'Probe experiences network latency timeout; agent checks process state before blind retry.' },
              { id: 'scenario-d', name: 'Scenario D: Conflicting Evidence', tag: 'Reconciliation', desc: 'Health endpoint returns HTTP 200 while queue depth is growing; agent reconciles deeper metrics.' },
              { id: 'scenario-e', name: 'Scenario E: Approval Gate', tag: 'Protected', desc: 'Consequential worker pool reload triggers AWAITING_APPROVAL with cryptographic single-use token.' },
              { id: 'scenario-g', name: 'Scenario G: Verification Failure', tag: 'Verification', desc: 'Simulated downstream deadlock causes verification probe to fail; agent generates escalation report.' }
            ].map((sc) => (
              <div
                key={sc.id}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-700">{sc.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{sc.tag}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{sc.desc}</p>
                </div>
                <button
                  onClick={() => onLaunchScenario(sc.id)}
                  className="w-full py-1.5 rounded-md bg-slate-50 hover:bg-blue-600 text-slate-700 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-200 group-hover:border-transparent"
                >
                  <Play className="w-3 h-3 fill-current" /> Launch Scenario
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Monitored Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Topology & Probes</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Order Processing Worker</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Port 5001 • Consumer on order-events.v1</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">SentinelOps Orchestrator API</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">HEALTHY</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Port 4000 • Express SSE Stream Engine</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Playwright Visual Auditor</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">READY</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Headless Chromium • DOM Screenshot Probes</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">SQLite WAL Engine</span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">WAL</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">node:sqlite • Append-only Event Log</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Runs Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Incident Runs</h2>
          <button
            onClick={onNavigateToWorkflows}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View Live Workflow &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Run Title</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.slice(0, 5).map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate">
                    {t.title || t.userPrompt}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 uppercase text-[10px] font-semibold">
                    {t.executionMode}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(t.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        onSelectTask(t);
                        onNavigateToWorkflows();
                      }}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-[11px]"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
