'use client';

import React from 'react';
import { FileText, CheckCircle2, X, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';

interface IncidentReportModalProps {
  report: any | null;
  onClose: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  report,
  onClose
}) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">{report.title}</h2>
              <span className="text-xs text-slate-500 font-mono">Incident ID: {report.incidentId || 'INC-7029'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* Status Banner */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-900 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Independent Verification: {report.verificationStatus}</span>
            </div>
            <span className="text-[11px] text-emerald-700 font-mono">
              Generated: {new Date(report.generatedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Executive Summary */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Executive Summary</h3>
            <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed text-slate-800">
              {report.executiveSummary}
            </p>
          </div>

          {/* Root Cause */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Technical Root Cause Analysis</h3>
            <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed text-slate-800 font-mono text-[11px]">
              {report.rootCause}
            </p>
          </div>

          {/* Before vs After State Comparison */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Before & After Metrics Verification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-rose-50/50 p-3.5 rounded-lg border border-rose-200 space-y-1.5">
                <span className="font-bold text-rose-900 block mb-1">Before Remediation (Degraded)</span>
                <div>Worker: <strong className="text-rose-700">{report.beforeMetrics?.workerRunning ? 'RUNNING' : 'STOPPED'}</strong></div>
                <div>Queue Depth: <strong className="text-rose-700">{report.beforeMetrics?.pendingOrders} orders</strong></div>
                <div>Processed Orders: <strong className="text-rose-700">{report.beforeMetrics?.processedOrders}</strong></div>
                <div>Health: <strong className="text-rose-700">{report.beforeMetrics?.serviceHealth}</strong></div>
              </div>

              <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200 space-y-1.5">
                <span className="font-bold text-emerald-900 block mb-1">After Remediation (Recovered)</span>
                <div>Worker: <strong className="text-emerald-700">{report.afterMetrics?.workerRunning ? 'RUNNING' : 'STOPPED'}</strong> (PID: {report.afterMetrics?.workerPid})</div>
                <div>Queue Depth: <strong className="text-emerald-700">{report.afterMetrics?.pendingOrders} orders</strong></div>
                <div>Processed Orders: <strong className="text-emerald-700">{report.afterMetrics?.processedOrders}</strong></div>
                <div>Health: <strong className="text-emerald-700">{report.afterMetrics?.serviceHealth}</strong></div>
              </div>
            </div>
          </div>

          {/* Runbooks Consulted */}
          {report.runbooksConsulted && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                Standard Operating Procedures Consulted
              </h3>
              <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {report.runbooksConsulted.map((rb: string, i: number) => (
                  <li key={i} className="text-slate-700">{rb}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Postmortem Recommendations */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Preventive Postmortem Recommendations</h3>
            <ul className="space-y-1.5">
              {report.postMortemRecommendations?.map((rec: string, i: number) => (
                <li key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-800 leading-normal">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors text-xs"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
