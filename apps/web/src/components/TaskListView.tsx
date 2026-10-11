'use client';

import React from 'react';
import { Eye, Shield, CheckCircle, Clock } from 'lucide-react';

interface TaskListViewProps {
  plan: any | null;
  onSelectStep: (stepNumber: number) => void;
  selectedStepNumber: number | null;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  plan,
  onSelectStep,
  selectedStepNumber
}) => {
  if (!plan?.steps) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        No task steps available.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Structured Step Registry</h3>
        <span className="text-xs font-medium text-slate-500">Total Steps: {plan.steps.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Tool Name</th>
              <th className="py-3 px-4">Risk Classification</th>
              <th className="py-3 px-4">Purpose</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Retries</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plan.steps.map((step: any) => {
              const isSelected = selectedStepNumber === step.stepNumber;
              return (
                <tr
                  key={step.stepNumber}
                  onClick={() => onSelectStep(step.stepNumber)}
                  className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-700">{step.stepNumber}</td>
                  <td className="py-3 px-4 font-mono font-bold text-blue-700">{step.action.toolName}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider uppercase ${
                        step.action.riskLevel === 'READ_ONLY'
                          ? 'bg-slate-100 text-slate-700'
                          : step.action.riskLevel === 'LOW_RISK_REMEDIATION'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {step.action.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{step.action.purpose}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        step.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : step.status === 'AWAITING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                          : step.status === 'FAILED'
                          ? 'bg-rose-100 text-rose-800'
                          : step.status === 'RUNNING'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {step.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {step.durationMs ? `${step.durationMs}ms` : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{step.retries}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStep(step.stepNumber);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                      title="Inspect Step Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
