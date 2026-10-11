import { describe, it, expect, beforeEach } from 'vitest';
import { checkpointStore, eventStore, incidentStore } from '../../packages/memory/dist/index.js';

describe('Integration Tests: Persistence & Checkpoint Recovery', () => {
  let taskId: string;

  beforeEach(() => {
    const task = incidentStore.createTask({
      title: 'Persistence test task',
      userPrompt: 'Persistence check',
      spec: {
        objective: 'Test checkpoints and events',
        affectedService: 'order-processing-service',
        constraints: [],
        successCriteria: []
      },
      executionMode: 'demo'
    });
    taskId = task.id;
  });

  it('1. Saves and retrieves checkpoints in chronological order', () => {
    checkpointStore.saveCheckpoint({
      taskId,
      stepNumber: 1,
      state: 'INVESTIGATING',
      planVersion: 1,
      variables: { initialQueue: 142 }
    });

    checkpointStore.saveCheckpoint({
      taskId,
      stepNumber: 5,
      state: 'EXECUTING',
      planVersion: 1,
      variables: { workerPid: 45012, initialQueue: 142 }
    });

    const latest = checkpointStore.getLatestCheckpoint(taskId);
    expect(latest).toBeDefined();
    expect(latest?.stepNumber).toBe(5);
    expect(latest?.variables.workerPid).toBe(45012);

    const all = checkpointStore.listCheckpoints(taskId);
    expect(all.length).toBe(2);
    expect(all[0].stepNumber).toBe(1);
    expect(all[1].stepNumber).toBe(5);
  });

  it('2. Preserves strict append-only sequential audit log', () => {
    const evt1 = eventStore.appendEvent({
      taskId,
      type: 'TASK_CREATED',
      message: 'Created task'
    });
    const evt2 = eventStore.appendEvent({
      taskId,
      type: 'STATE_TRANSITION',
      message: 'Moved to UNDERSTANDING'
    });
    const evt3 = eventStore.appendEvent({
      taskId,
      type: 'PLAN_GENERATED',
      message: 'Plan constructed'
    });

    expect(evt1.sequence).toBe(1);
    expect(evt2.sequence).toBe(2);
    expect(evt3.sequence).toBe(3);

    const retrieved = eventStore.getEvents(taskId);
    expect(retrieved.length).toBe(3);
    expect(retrieved[0].type).toBe('TASK_CREATED');
    expect(retrieved[1].type).toBe('STATE_TRANSITION');
    expect(retrieved[2].type).toBe('PLAN_GENERATED');
  });
});
