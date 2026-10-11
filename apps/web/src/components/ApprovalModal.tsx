'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface ApprovalModalProps {
  approval: any;
  onApprove: (requestId: string, user: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  approval,
  onApprove,
  onReject,
  onClose,
  isSubmitting
}) => {
  const [rejectReason, setRejectReason] = useState('Safety check: Operator rejected action');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [operatorName, setOperatorName] = useState('sre-lead@sentinelops.local');

  if (!approval) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Protected Operation Approval Gate</h3>
            <p className="text-xs text-amber-900 mt-0.5">Human operator sign-off required by enterprise policy</p>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Execution Halted:</strong> The orchestrator has stopped at step {approval.stepNumber}. This protected operation has <u>not</u> been executed.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-1">Target Operation</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{approval.toolName}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-1">Risk Classification</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px] uppercase">
                {approval.riskLevel}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-slate-700 block">Why Approval is Required</span>
            <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              {approval.reason}
            </p>
          </div>

          <div className="space-y-1">
            <span className="font-semibold text-slate-700 block">Expected System Effect</span>
            <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              {approval.expectedEffect}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 pt-1">
            <span>Requested: {new Date(approval.requestedAt).toLocaleTimeString()}</span>
            <span>Expires: {new Date(approval.expiresAt).toLocaleTimeString()}</span>
          </div>

          {showRejectForm ? (
            <div className="pt-2">
              <label className="font-semibold text-slate-700 block mb-1">Rejection Reason</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 mb-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onReject(approval.id, rejectReason)}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <label className="font-semibold text-slate-700 block mb-1">Approver Identity</label>
              <input
                type="text"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 font-medium"
                >
                  Dismiss Modal
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onApprove(approval.id, operatorName)}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Resume
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
