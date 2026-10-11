'use client';

import React from 'react';
import { Layers, Shield, Terminal, CheckCircle2, Clock, ImageIcon, Code } from 'lucide-react';

interface ExecutionDetailsProps {
  step: any | null;
  evidence: any[];
}

export const ExecutionDetails: React.FC<ExecutionDetailsProps> = ({
  step,
  evidence
}) => {
  if (!step) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
        Select a step from the Timeline or Task List to inspect live execution results, output payloads, and DOM evidence.
      </div>
    );
  }

  // Find relevant evidence items
  const relevantEvidence = evidence.filter(
    (e) => e.source === step.action?.toolName
  );

  const screenshotData = step.output?.screenshotBase64;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Step {step.stepNumber}: {step.action?.toolName}
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
            step.status === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : step.status === 'AWAITING_APPROVAL'
              ? 'bg-amber-100 text-amber-800'
              : step.status === 'FAILED'
              ? 'bg-rose-100 text-rose-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {step.status}
        </span>
      </div>

      <div className="space-y-3 text-xs">
        {/* Purpose & Rationale */}
        <div>
          <span className="text-slate-500 font-semibold block mb-1">Diagnostic Purpose</span>
          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {step.action?.purpose}
          </p>
        </div>

        {/* Expected Observation */}
        <div>
          <span className="text-slate-500 font-semibold block mb-1">Expected Observation</span>
          <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {step.action?.expectedObservation}
          </p>
        </div>

        {/* Output Payload */}
        {step.output && (
          <div>
            <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-blue-500" />
              Verified Tool Output ({step.durationMs ? `${step.durationMs}ms` : 'instant'})
            </span>
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-56">
              {JSON.stringify(
                // Omit large base64 string from json preview
                { ...step.output, screenshotBase64: screenshotData ? '[Playwright Screenshot Captured - Rendered Below]' : undefined },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* Playwright Screenshot Viewer */}
        {screenshotData && (
          <div>
            <span className="text-slate-500 font-semibold block mb-1 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              Playwright Browser Console Evidence Capture
            </span>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 p-1">
              <img
                src={screenshotData}
                alt="Playwright Console Evidence"
                className="w-full h-auto rounded border border-slate-800 shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Relevant Recorded Evidence */}
        {relevantEvidence.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-slate-500 font-semibold block mb-2">Audit Evidence Trail</span>
            <div className="space-y-1.5">
              {relevantEvidence.map((evi) => (
                <div key={evi.id} className="bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{evi.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(evi.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
