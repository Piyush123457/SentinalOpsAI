import { describe, it, expect, beforeEach } from 'vitest';
import { recoveryEngine } from '../../packages/agent-core/dist/recovery.js';
import { incidentStore } from '../../packages/memory/dist/index.js';

describe('Unit Tests: Recovery Engine', () => {
  let taskId: string;

  beforeEach(() => {
    const task = incidentStore.createTask({
      title: 'Recovery test task',
      userPrompt: 'Test recovery',
      spec: {
        objective: 'Test recovery',
        affectedService: 'order-processing-service',
        constraints: [],
        successCriteria: []
      },
      executionMode: 'demo'
    });
    taskId = task.id;
  });

  const dummyStep = {
    stepNumber: 2,
    action: {
      id: 'step-2',
      toolName: 'enable_simulated_worker',
      arguments: {},
      purpose: 'Enable worker',
      preconditions: [],
      expectedObservation: 'Running',
      riskLevel: 'LOW_RISK_REMEDIATION' as const,
      requiresApproval: false
    },
    status: 'FAILED' as const,
    output: null,
    error: 'Simulated failure',
    retries: 0,
    startedAt: null,
    completedAt: null,
    durationMs: null
  };

  it('1. Classifies timeout as TRANSIENT_TIMEOUT and prescribes state recheck before retry', () => {
    const error = new Error('Tool get_service_health exceeded execution timeout of 8000ms');
    const classification = recoveryEngine.classifyError(error.message);
    expect(classification).toBe('TRANSIENT_TIMEOUT');

    const decision = recoveryEngine.decideRecovery({
      taskId,
      step: dummyStep,
      error,
      currentRetries: 0
    });
    expect(decision.action).toBe('RECHECK_STATE_FIRST');
  });

  it('2. Classifies lock conflict as LOCKFILE_CONFLICT and prescribes cleanup and retry', () => {
    const error = new Error('Lockfile conflict: orphaned lock held by dead process /var/run/order-worker.lock');
    const classification = recoveryEngine.classifyError(error.message);
    expect(classification).toBe('LOCKFILE_CONFLICT');

    const decision = recoveryEngine.decideRecovery({
      taskId,
      step: dummyStep,
      error,
      currentRetries: 0
    });
    expect(decision.action).toBe('CLEAN_AND_RETRY');
  });

  it('3. Halts execution when approval is required', () => {
    const error = new Error('Action requires operator approval token');
    const decision = recoveryEngine.decideRecovery({
      taskId,
      step: dummyStep,
      error,
      currentRetries: 0
    });
    expect(decision.action).toBe('AWAIT_APPROVAL');
  });

  it('4. Escalates when retry limits are exceeded', () => {
    const error = new Error('Downstream 503 Service Unavailable');
    const decision = recoveryEngine.decideRecovery({
      taskId,
      step: dummyStep,
      error,
      currentRetries: 3,
      maxRetries: 2
    });
    expect(decision.action).toBe('ESCALATE');
  });
});
