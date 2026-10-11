import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStateMachine } from '../../packages/agent-core/dist/state-machine.js';
import { incidentStore, eventStore } from '../../packages/memory/dist/index.js';
import { SentinelOpsError } from '../../packages/shared/dist/errors.js';

describe('Unit Tests: State Machine', () => {
  let taskId: string;

  beforeEach(() => {
    const task = incidentStore.createTask({
      title: 'State machine test task',
      userPrompt: 'Test prompt',
      spec: {
        objective: 'Test state machine',
        affectedService: 'order-processing-service',
        constraints: [],
        successCriteria: []
      },
      executionMode: 'demo'
    });
    taskId = task.id;
  });

  it('1. Allows legal sequence of transitions', () => {
    expect(() => {
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'CREATED',
        toStatus: 'UNDERSTANDING',
        reason: 'Analyzing request'
      });
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'UNDERSTANDING',
        toStatus: 'INVESTIGATING',
        reason: 'Gathering diagnostics'
      });
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'INVESTIGATING',
        toStatus: 'PLANNING',
        reason: 'Creating plan'
      });
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'PLANNING',
        toStatus: 'EXECUTING',
        reason: 'Executing tools'
      });
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'EXECUTING',
        toStatus: 'VERIFYING',
        reason: 'Verifying results'
      });
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'VERIFYING',
        toStatus: 'COMPLETED',
        reason: 'All checks passed'
      });
    }).not.toThrow();

    const task = incidentStore.getTask(taskId);
    expect(task?.status).toBe('COMPLETED');
  });

  it('2. Strictly rejects illegal transitions', () => {
    expect(() => {
      // Cannot jump from CREATED directly to COMPLETED
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'CREATED',
        toStatus: 'COMPLETED'
      });
    }).toThrow(SentinelOpsError);
  });

  it('3. Terminal states cannot transition further', () => {
    expect(() => {
      AgentStateMachine.transition({
        taskId,
        fromStatus: 'COMPLETED',
        toStatus: 'EXECUTING'
      });
    }).toThrow(SentinelOpsError);
  });
});
