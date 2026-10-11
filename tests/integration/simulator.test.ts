import { describe, it, expect, beforeAll } from 'vitest';

const SIMULATOR_URL = 'http://localhost:5001';

describe('Integration Tests: Local Service Simulator', () => {
  beforeAll(async () => {
    // Reset simulator to scenario-a
    await fetch(`${SIMULATOR_URL}/api/simulator/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'scenario-a' })
    });
  });

  it('1. Returns degraded health when worker is stopped', async () => {
    const res = await fetch(`${SIMULATOR_URL}/health`);
    const data = await res.json();

    expect(data.service).toBe('order-processing-service');
    expect(data.status).toBe('DEGRADED');
    expect(data.details.workerStatus).toBe('STOPPED');
  });

  it('2. Search logs filters correctly by level and query keyword', async () => {
    const res = await fetch(`${SIMULATOR_URL}/api/logs?level=ERROR&query=consumer`);
    const data = await res.json();

    expect(data.logs).toBeDefined();
    expect(data.logs.length).toBeGreaterThan(0);
    expect(data.logs[0].level).toBe('ERROR');
    expect(data.logs[0].message.toLowerCase()).toContain('consumer');
  });

  it('3. Successfully enables worker and modifies actual process state', async () => {
    const enableRes = await fetch(`${SIMULATOR_URL}/api/worker/enable`, { method: 'POST' });
    const enableData = await enableRes.json();

    expect(enableData.success).toBe(true);
    expect(enableData.status).toBe('RUNNING');
    expect(enableData.workerPid).toBeGreaterThan(0);

    // Verify worker status endpoint reflects real state
    const statusRes = await fetch(`${SIMULATOR_URL}/api/worker/status`);
    const statusData = await statusRes.json();
    expect(statusData.running).toBe(true);
    expect(statusData.pid).toBe(enableData.workerPid);
  });

  it('4. Real dynamic state progression: Queue drains and processed count increases over time', async () => {
    const beforeCounters = await (await fetch(`${SIMULATOR_URL}/api/counters`)).json();

    // Allow 2 seconds of simulation ticks
    await new Promise((r) => setTimeout(r, 2000));

    const afterCounters = await (await fetch(`${SIMULATOR_URL}/api/counters`)).json();

    expect(afterCounters.processedCount).toBeGreaterThan(beforeCounters.processedCount);
    expect(afterCounters.pendingCount).toBeLessThan(beforeCounters.pendingCount);
  });

  it('5. Successfully retrieves and parses runbook RB-ORD-001', async () => {
    const res = await fetch(`${SIMULATOR_URL}/api/runbooks/order-processing`);
    const data = await res.json();

    expect(data.id).toBe('order-processing');
    expect(data.content).toContain('RB-ORD-001');
    expect(data.content).toContain('enable_simulated_worker');
  });
});
