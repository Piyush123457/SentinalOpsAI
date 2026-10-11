'use client';

import React, { useState } from 'react';
import { Bot, Send, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

interface OperatorPanelProps {
  onSubmitGoal: (prompt: string, scenarioId?: string, mode?: string) => void;
  isLoading: boolean;
  currentTaskSpec?: any;
}

export const OperatorPanel: React.FC<OperatorPanelProps> = ({
  onSubmitGoal,
  isLoading,
  currentTaskSpec
}) => {
  const [prompt, setPrompt] = useState(
    'The order processing service is failing. Investigate the issue, inspect the relevant logs and runbook, fix it if safe, verify that orders are processing again, and prepare an incident report.'
  );
  const [selectedScenario, setSelectedScenario] = useState('scenario-a');
  const [executionMode, setExecutionMode] = useState<'demo' | 'llm'>('demo');

  const scenarios = [
    { id: 'scenario-a', name: 'Scenario A: Worker Disabled', desc: 'Standard happy-path diagnosis, runbook, enable worker & verify' },
    { id: 'scenario-b', name: 'Scenario B: Flaky Remediation', desc: 'First enable attempt encounters lock; adapts and retries' },
    { id: 'scenario-c', name: 'Scenario C: Diagnostic Timeout', desc: 'Probe times out; checks state before blind retrying' },
    { id: 'scenario-d', name: 'Scenario D: Conflicting Evidence', desc: 'Health 200 vs growing queue; reconciles deeper metrics' },
    { id: 'scenario-e', name: 'Scenario E: Restricted Action Gate', desc: 'Worker restart requires human operator approval token' },
    { id: 'scenario-g', name: 'Scenario G: Verification Failure', desc: 'Downstream DB locked; correctly detects verification failure' }
  ];

  const handlePresetSelect = (sc: typeof scenarios[0]) => {
    setSelectedScenario(sc.id);
    if (sc.id === 'scenario-a') {
      setPrompt('The order processing service is failing. Investigate the issue, inspect the relevant logs and runbook, fix it if safe, verify that orders are processing again, and prepare an incident report.');
    } else if (sc.id === 'scenario-e') {
      setPrompt('Order processing worker is in a memory leak loop. Execute a full worker pool restart and configuration reload.');
    } else if (sc.id === 'scenario-b') {
      setPrompt('Investigate degraded order processing throughput. Attempt standard restart and adapt if the worker rejects the initial signal.');
    } else {
      setPrompt(`Investigate incident conditions for ${sc.name}. Diagnose, remediate if safe, and verify recovery.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmitGoal(prompt, selectedScenario, executionMode);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI SRE Operator Interface</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Execution Engine:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setExecutionMode('demo')}
              className={`px-3 py-1 rounded-md transition-all ${
                executionMode === 'demo' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deterministic Demo
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode('llm')}
              className={`px-3 py-1 rounded-md transition-all ${
                executionMode === 'llm' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Groq LLM
            </button>
          </div>
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Presets:
        </span>
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => handlePresetSelect(sc)}
            className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors font-medium border ${
              selectedScenario === sc.id
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {sc.name}
          </button>
        ))}
      </div>

      {/* Prompt Form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="Instruct SentinelOps AI SRE operator..."
            className="w-full text-sm rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono"
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2.5 bottom-2.5 px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isLoading ? 'Executing...' : 'Dispatch'}
          </button>
        </div>
      </form>

      {/* Interpreted Goal breakdown if available */}
      {currentTaskSpec && (
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-semibold block mb-1">Target Service</span>
            <span className="font-mono font-bold text-slate-800">{currentTaskSpec.affectedService}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-semibold block mb-1">Safety Constraints</span>
            <span className="text-slate-700">{currentTaskSpec.constraints?.[0] || 'Enforce server-side policy engine'}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 font-semibold block mb-1">Verification Target</span>
            <span className="text-emerald-700 font-medium">Independent read-only probe criteria</span>
          </div>
        </div>
      )}
    </div>
  );
};
