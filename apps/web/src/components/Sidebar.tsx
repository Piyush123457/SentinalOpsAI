'use client';

import React from 'react';
import {
  Activity,
  Layers,
  PlaySquare,
  Bot,
  Calendar,
  Puzzle,
  FileText,
  Settings,
  ShieldCheck,
  Server
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  serviceHealthStatus?: string;
  executionMode?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  serviceHealthStatus = 'HEALTHY',
  executionMode = 'demo'
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'workflows', label: 'Workflows', icon: Layers },
    { id: 'runs', label: 'Task Runs', icon: PlaySquare },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-slate-900 text-sm tracking-tight block">SentinelOps AI</span>
          <span className="text-[11px] text-slate-500 font-medium tracking-normal">Autonomous SRE</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              {item.label}
              {item.id === 'workflows' && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Server className="w-3.5 h-3.5" />
            Order Worker
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              serviceHealthStatus === 'HEALTHY'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {serviceHealthStatus}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Mode</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200 text-slate-700 uppercase">
            {executionMode}
          </span>
        </div>
      </div>
    </aside>
  );
};
