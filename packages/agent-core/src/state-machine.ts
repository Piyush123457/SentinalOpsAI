import {
  LEGAL_STATE_TRANSITIONS,
  SentinelOpsError,
  TaskStatus
} from '@sentinelops/shared';
import { eventStore } from '@sentinelops/memory';
import { incidentStore } from '@sentinelops/memory';

export class AgentStateMachine {
  public static transition(params: {
    taskId: string;
    fromStatus: TaskStatus;
    toStatus: TaskStatus;
    reason?: string;
    stepNumber?: number;
    error?: string | null;
  }): void {
    const { taskId, fromStatus, toStatus, reason, stepNumber, error } = params;

    // Check if transition is legal
    const allowed = LEGAL_STATE_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw new SentinelOpsError(
        `Illegal state transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: [${allowed.join(', ')}]`,
        'ILLEGAL_STATE_TRANSITION'
      );
    }

    // Persist status change to database
    incidentStore.updateTaskStatus(taskId, toStatus, {
      currentStep: stepNumber,
      error: error || null,
      completed: toStatus === 'COMPLETED' || toStatus === 'FAILED' || toStatus === 'CANCELLED'
    });

    // Record audit event
    eventStore.appendEvent({
      taskId,
      type: 'STATE_TRANSITION',
      message: `State transitioned: ${fromStatus} -> ${toStatus}${reason ? ` (${reason})` : ''}`,
      payload: {
        from: fromStatus,
        to: toStatus,
        reason,
        stepNumber
      },
      level: toStatus === 'FAILED' ? 'ERROR' : toStatus === 'COMPLETED' ? 'SUCCESS' : 'INFO'
    });
  }
}
