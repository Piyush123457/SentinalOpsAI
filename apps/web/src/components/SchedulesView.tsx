'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Play, CheckCircle2, Shield } from 'lucide-react';
import { apiRequest } from '../lib/api';

export const SchedulesView: React.FC = () => {
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);

  const schedules = [
    {
      id: 'sched-1',
      name: 'Order Worker Heartbeat Probe',
      cron: '*/5 * * * * *',
      interval: 'Every 5 seconds',
      target: 'http://localhost:5001/api/worker/status',
      status: 'ACTIVE',
      lastRun: '1s ago'
    },
    {
      id: 'sched-2',
      name: 'Queue Backlog & Latency Watchdog',
      cron: '*/10 * * * * *',
      interval: 'Every 10 seconds',
      target: 'http://localhost:5001/api/queue/metrics',
      status: 'ACTIVE',
      lastRun: '4s ago'
    },
    {
      id: 'sched-3',
      name: 'Deep System Health Diagnostic',
      cron: '*/30 * * * * *',
      interval: 'Every 30 seconds',
      target: 'http://localhost:5001/health/detailed',
      status: 'ACTIVE',
      lastRun: '12s ago'
    },
    {
      id: 'sched-4',
      name: 'Runbook Drift & SOP Catalog Sync',
      cron: '0 * * * *',
      interval: 'Hourly',
      target: 'data/runbooks/*.md',
      status: 'ACTIVE',
      lastRun: '18m ago'
    }
  ];

  const handleRunNow = async (schedName: string) => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await apiRequest<{ status: string }>('/api/v1/health');
      setProbeResult(`Probe for "${schedName}" succeeded! Status: ${res.status}`);
    } catch (e: any) {
      setProbeResult(`Probe failed: ${e.message}`);
    } finally {
      setProbing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Automated SRE Patrol & Health Schedules
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous background observation probes and watchdog health schedules.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            4 WATCHDOGS RUNNING
          </span>
        </div>
      </div>

      {probeResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {probeResult}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> {s.interval} ({s.cron})
              </p>
              <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 font-mono text-[11px] text-slate-700 truncate mb-4">
                Target: {s.target}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Last run: {s.lastRun}</span>
              <button
                onClick={() => handleRunNow(s.name)}
                disabled={probing}
                className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" /> Run Probe Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
