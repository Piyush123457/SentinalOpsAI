import { PlanStep } from '@sentinelops/shared';
import { eventStore } from '@sentinelops/memory';

export type ErrorClassification =
  | 'TRANSIENT_TIMEOUT'
  | 'LOCKFILE_CONFLICT'
  | 'APPROVAL_REQUIRED'
  | 'POLICY_VIOLATION'
  | 'DOWNSTREAM_UNAVAILABLE'
  | 'UNKNOWN';

export interface RecoveryDecision {
  action: 'RETRY' | 'RECHECK_STATE_FIRST' | 'ESCALATE' | 'AWAIT_APPROVAL' | 'CLEAN_AND_RETRY';
  delayMs: number;
  reason: string;
}

export class RecoveryEngine {
  public classifyError(errorMessage: string): ErrorClassification {
    const lower = errorMessage.toLowerCase();
    if (lower.includes('timeout') || lower.includes('exceeded execution timeout')) {
      return 'TRANSIENT_TIMEOUT';
    }
    if (lower.includes('lockfile') || lower.includes('orphaned lock') || lower.includes('lock held')) {
      return 'LOCKFILE_CONFLICT';
    }
    if (lower.includes('approval') || lower.includes('approval required')) {
      return 'APPROVAL_REQUIRED';
    }
    if (lower.includes('policy') || lower.includes('forbidden')) {
      return 'POLICY_VIOLATION';
    }
    if (lower.includes('503') || lower.includes('econnreset') || lower.includes('unavailable')) {
      return 'DOWNSTREAM_UNAVAILABLE';
    }
    return 'UNKNOWN';
  }

  public decideRecovery(params: {
    taskId: string;
    step: PlanStep;
    error: Error;
    currentRetries: number;
    maxRetries?: number;
  }): RecoveryDecision {
    const { taskId, step, error, currentRetries, maxRetries = 2 } = params;
    const classification = this.classifyError(error.message);

    eventStore.appendEvent({
      taskId,
      type: 'RECOVERY_TRIGGERED',
      message: `Recovery analysis for Step ${step.stepNumber} (${step.action.toolName}): Error classified as ${classification}`,
      payload: {
        stepNumber: step.stepNumber,
        toolName: step.action.toolName,
        classification,
        attempt: currentRetries + 1,
        errorMessage: error.message
      },
      level: 'WARN'
    });

    // 1. Approval Required
    if (classification === 'APPROVAL_REQUIRED') {
      return {
        action: 'AWAIT_APPROVAL',
        delayMs: 0,
        reason: 'Operation requires explicit operator approval before execution.'
      };
    }

    // 2. Policy Violation (Forbidden)
    if (classification === 'POLICY_VIOLATION') {
      return {
        action: 'ESCALATE',
        delayMs: 0,
        reason: 'Forbidden policy violation cannot be automatically recovered. Escalating to human SRE.'
      };
    }

    // 3. Ambiguous Timeout -> Must check state before blind retry
    if (classification === 'TRANSIENT_TIMEOUT') {
      return {
        action: 'RECHECK_STATE_FIRST',
        delayMs: 1000,
        reason: 'Ambiguous tool timeout encountered. Inspecting service state before considering write retry.'
      };
    }

    // 4. Lockfile conflict / orphaned process (Scenario B)
    if (classification === 'LOCKFILE_CONFLICT') {
      if (currentRetries < maxRetries) {
        return {
          action: 'CLEAN_AND_RETRY',
          delayMs: 1500,
          reason: 'Lockfile conflict detected. Retrying remediation after allowing stale process cleanup.'
        };
      }
      return {
        action: 'ESCALATE',
        delayMs: 0,
        reason: 'Lockfile conflict persisted after maximum retries. Escalating to SRE.'
      };
    }

    // 5. Transient errors with bounded retries
    if (currentRetries < maxRetries) {
      const backoffMs = 1000 * Math.pow(2, currentRetries);
      return {
        action: 'RETRY',
        delayMs: backoffMs,
        reason: `Transient error encountered. Applying bounded retry with ${backoffMs}ms backoff (attempt ${currentRetries + 1}/${maxRetries}).`
      };
    }

    return {
      action: 'ESCALATE',
      delayMs: 0,
      reason: `Maximum retry limit (${maxRetries}) reached without recovery. Escalating to incident commander.`
    };
  }
}

export const recoveryEngine = new RecoveryEngine();
