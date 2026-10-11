import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = 'http://localhost:4000';
const SIMULATOR_URL = 'http://localhost:5001';

describe('Integration Tests: Autonomous Orchestrator Scenarios', () => {
  it('1. Scenario A: Worker disabled happy path resolves, independently verifies, and completes', async () => {
    // 1. Trigger Scenario A
    const triggerRes = await fetch(`${API_URL}/api/v1/scenarios/scenario-a/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionMode: 'demo' })
    });
    const triggerData = await triggerRes.json();
    expect(triggerData.success).toBe(true);
    const taskId = triggerData.task.id;

    // 2. Poll until COMPLETED or timeout (max 12s)
    let completed = false;
    let taskRecord: any = null;

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`);
      const data = await res.json();
      taskRecord = data.task;

      if (taskRecord.status === 'COMPLETED') {
        completed = true;
        break;
      }
    }

    expect(completed).toBe(true);
    expect(taskRecord.status).toBe('COMPLETED');

    // 3. Verify final report generated
    const reportRes = await fetch(`${API_URL}/api/v1/tasks/${taskId}/report`);
    const reportData = await reportRes.json();
    expect(reportData.report).toBeDefined();
    expect(reportData.report.verificationStatus).toBe('FULLY_VERIFIED');
    expect(reportData.report.afterMetrics.workerRunning).toBe(true);
  });

  it('2. Scenario E: Approval gate stops execution at AWAITING_APPROVAL and resumes upon operator approval', async () => {
    // 1. Trigger Scenario E (Restricted Action)
    const triggerRes = await fetch(`${API_URL}/api/v1/scenarios/scenario-e/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executionMode: 'demo' })
    });
    const triggerData = await triggerRes.json();
    const taskId = triggerData.task.id;

    // 2. Poll until AWAITING_APPROVAL
    let isAwaiting = false;
    let pendingRequest: any = null;

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`);
      const data = await res.json();

      if (data.task.status === 'AWAITING_APPROVAL' && data.pendingApprovals?.length > 0) {
        isAwaiting = true;
        pendingRequest = data.pendingApprovals[0];
        break;
      }
    }

    expect(isAwaiting).toBe(true);
    expect(pendingRequest.toolName).toBe('restart_simulated_worker');
    expect(pendingRequest.riskLevel).toBe('RESTRICTED_REMEDIATION');

    // 3. Operator approves the action
    const approveRes = await fetch(`${API_URL}/api/v1/tasks/${taskId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: pendingRequest.id,
        user: 'lead-sre@sentinelops.local'
      })
    });
    const approveData = await approveRes.json();
    expect(approveData.success).toBe(true);

    // 4. Poll until COMPLETED
    let completed = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`);
      const data = await res.json();
      if (data.task.status === 'COMPLETED') {
        completed = true;
        break;
      }
    }

    expect(completed).toBe(true);
  });
});
