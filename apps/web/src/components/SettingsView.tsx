'use client';

import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, Shield, Key, Sliders, Database, Globe } from 'lucide-react';

interface SettingsViewProps {
  executionMode: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ executionMode: initialMode }) => {
  const [mode, setMode] = useState(initialMode || 'demo');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [ttl, setTtl] = useState(300);
  const [maxSteps, setMaxSteps] = useState(20);
  const [timeoutMs, setTimeoutMs] = useState(15000);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              SentinelOps System & Agent Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune AI reasoning models, execution boundaries, and human approval security gates.
            </p>
          </div>
          {saved && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Configuration Saved
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* LLM & Planner Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Sliders className="w-4 h-4 text-blue-600" /> LLM Reasoning & Inference Engine
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Execution Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="demo">Deterministic Demo Mode (Offline / Fast)</option>
                <option value="llm">Groq Cloud LLM SDK (Online / Dynamic)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Toggle between deterministic mock and live Groq inference.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Groq Model Target</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Ultra Fast)</option>
              </select>
              <span className="text-[11px] text-slate-400 mt-1 block">Selected model for intent parsing and report synthesis.</span>
            </div>
          </div>
        </div>

        {/* Security & Token Policy */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Shield className="w-4 h-4 text-purple-600" /> Security & Human Approval Policies
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approval Token TTL</label>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Lifetime in seconds before token expires.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Plan Steps Limit</label>
              <input
                type="number"
                value={maxSteps}
                onChange={(e) => setMaxSteps(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Maximum sequential tool steps allowed.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tool Timeout (ms)</label>
              <input
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default invocation timeout for safe tools.</span>
            </div>
          </div>
        </div>

        {/* Environment & Network Ports */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Globe className="w-4 h-4 text-indigo-600" /> Monorepo Topology Endpoints
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-sans font-bold">FRONTEND WEB</span>
              <span className="text-slate-800 font-bold">http://localhost:3000</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-sans font-bold">AGENT API SERVER</span>
              <span className="text-slate-800 font-bold">http://localhost:4000</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-400 block text-[10px] font-sans font-bold">SERVICE SIMULATOR</span>
              <span className="text-slate-800 font-bold">http://localhost:5001</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
