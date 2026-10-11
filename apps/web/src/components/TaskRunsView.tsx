'use client';

import React, { useState } from 'react';
import { PlaySquare, CheckCircle2, XCircle, Clock, Search, Filter, ExternalLink } from 'lucide-react';

interface TaskRunsViewProps {
  tasks: any[];
  onSelectTask: (task: any) => void;
  onNavigateToWorkflows: () => void;
}

export const TaskRunsView: React.FC<TaskRunsViewProps> = ({
  tasks,
  onSelectTask,
  onNavigateToWorkflows
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.userPrompt?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlaySquare className="w-5 h-5 text-blue-600" />
              Incident Task Runs History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete chronological audit of all autonomous investigation and remediation runs.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search runs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="py-1.5 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="AWAITING_APPROVAL">Awaiting Approval</option>
              <option value="EXECUTING">Executing</option>
            </select>
          </div>
        </div>
      </div>

      {/* Runs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px]">
            <tr>
              <th className="py-3 px-4">Run Identifier / Title</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Engine</th>
              <th className="py-3 px-4">Scenario</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No incident runs match the current criteria.
                </td>
              </tr>
            ) : (
              filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 max-w-md truncate">
                      {t.title || t.userPrompt}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {t.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                      {t.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-semibold uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {t.executionMode}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {t.spec?.scenario || 'standard'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        onSelectTask(t);
                        onNavigateToWorkflows();
                      }}
                      className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </button>
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
