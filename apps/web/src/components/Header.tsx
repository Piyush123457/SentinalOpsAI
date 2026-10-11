'use client';

import React from 'react';
import {
  Clock,
  Play,
  RotateCw,
  XCircle,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface HeaderProps {
  task: any | null;
  onNewTaskClick: () => void;
  onRestartClick: () => void;
  onCancelClick: () => void;
  onViewReportClick: () => void;
  hasReport: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  task,
  onNewTaskClick,
  onRestartClick,
  onCancelClick,
  onViewReportClick,
  hasReport
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'FAILED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'AWAITING_APPROVAL':
        return 'bg-amber-100 text-amber-800 border-amber-400 animate-pulse';
      case 'EXECUTING':
      case 'INVESTIGATING':
      case 'PLANNING':
      case 'UNDERSTANDING':
      case 'OBSERVING':
      case 'VERIFYING':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const calculateDuration = () => {
    if (!task?.createdAt) return '0s';
    const start = new Date(task.createdAt).getTime();
    const end = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    const diffSec = Math.max(0, Math.floor((end - start) / 1000));
    return `${diffSec}s`;
  };

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Workflow Title & Metadata */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {task?.title || 'Autonomous Incident Investigation & Resolution'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-wide uppercase ${getStatusBadge(
                task?.status || 'IDLE'
              )}`}
            >
              {task?.status || 'READY'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
              [MODE: {task?.executionMode?.toUpperCase() || 'DEMO'}]
            </span>
          </div>

          {task?.userPrompt && task.title !== task.userPrompt && (
            <p className="text-xs text-slate-600 mt-1.5 max-w-4xl font-normal leading-relaxed">
              {task.userPrompt}
            </p>
          )}

          <div className="flex items-center gap-6 mt-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Started: {task?.createdAt ? new Date(task.createdAt).toLocaleTimeString() : 'N/A'}
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              Duration: {calculateDuration()}
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              Service: <span className="text-slate-700 font-semibold">{task?.spec?.affectedService || 'order-processing-service'}</span>
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasReport && (
            <button
              onClick={onViewReportClick}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              View Incident Report
            </button>
          )}

          <button
            onClick={onRestartClick}
            disabled={!task}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            Restart Run
          </button>

          {task && task.status !== 'COMPLETED' && task.status !== 'FAILED' && (
            <button
              onClick={onCancelClick}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}

          <button
            onClick={onNewTaskClick}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Trigger Task
          </button>
        </div>
      </div>
    </header>
  );
};
