'use client';

import React from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ChevronRight
} from 'lucide-react';

interface TimelineViewProps {
  plan: any | null;
  selectedStepNumber: number | null;
  onSelectStep: (stepNumber: number) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  plan,
  selectedStepNumber,
  onSelectStep
}) => {
  if (!plan || !plan.steps || plan.steps.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-700">No active execution plan</h3>
        <p className="text-xs text-slate-500 mt-1">Submit an incident goal or trigger a scenario to view the execution timeline.</p>
      </div>
    );
  }

  const steps = plan.steps;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Execution Timeline (Gantt View)</h3>
          <p className="text-xs text-slate-500 mt-0.5">Horizontal task tracks with execution durations, risk classification, and approval gates.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span> Awaiting Approval
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Pending
          </span>
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="space-y-2.5">
        {steps.map((step: any, idx: number) => {
          const isSelected = selectedStepNumber === step.stepNumber;
          const isAwaiting = step.status === 'AWAITING_APPROVAL';
          const isCompleted = step.status === 'COMPLETED';
          const isRunning = step.status === 'RUNNING';
          const isFailed = step.status === 'FAILED';

          return (
            <div
              key={step.stepNumber}
              onClick={() => onSelectStep(step.stepNumber)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {/* Step Info */}
              <div className="flex items-center gap-3 min-w-[280px]">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isAwaiting
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : isFailed
                      ? 'bg-rose-100 text-rose-800'
                      : isRunning
                      ? 'bg-blue-100 text-blue-800 animate-spin'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {step.stepNumber}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{step.action.toolName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tracking-wider uppercase ${
                        step.action.riskLevel === 'READ_ONLY'
                          ? 'bg-slate-100 text-slate-700'
                          : step.action.riskLevel === 'LOW_RISK_REMEDIATION'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {step.action.riskLevel.replace('_REMEDIATION', '')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate max-w-sm mt-0.5">
                    {step.action.purpose}
                  </span>
                </div>
              </div>

              {/* Gantt Bar Visualization */}
              <div className="flex-1 max-w-md mx-4">
                <div className="h-6 rounded-md bg-slate-100 w-full relative overflow-hidden flex items-center px-2">
                  <div
                    className={`h-full absolute left-0 rounded-md transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/80 w-full'
                        : isAwaiting
                        ? 'bg-amber-400 w-3/4 animate-pulse'
                        : isRunning
                        ? 'bg-blue-500 w-1/2 animate-pulse'
                        : isFailed
                        ? 'bg-rose-500 w-full'
                        : 'w-0'
                    }`}
                  />
                  <span className="relative z-10 text-[10px] font-mono font-semibold text-slate-800 flex items-center gap-1.5">
                    {isAwaiting && <Lock className="w-3 h-3 text-amber-900" />}
                    {isCompleted && `${step.durationMs ? `${step.durationMs}ms` : 'Instant'}`}
                    {isAwaiting && 'BLOCKED AT APPROVAL GATE'}
                    {isRunning && 'Executing...'}
                    {step.status === 'PENDING' && 'Pending queue order'}
                  </span>
                </div>
              </div>

              {/* Status Badge & Arrow */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800'
                      : isAwaiting
                      ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                      : isFailed
                      ? 'bg-rose-100 text-rose-800'
                      : isRunning
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {step.status}
                </span>
                <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
