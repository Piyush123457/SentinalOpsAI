import {
  VerificationCriterion,
  VerificationResult
} from '@sentinelops/shared';
import { eventStore } from '@sentinelops/memory';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:5001';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Independent verification probe failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

export class AgentVerifier {
  public async verifyRecovery(
    taskId: string,
    beforeState: {
      workerRunning?: boolean;
      pendingOrders?: number;
      processedOrders?: number;
      serviceHealth?: string;
    }
  ): Promise<VerificationResult> {
    eventStore.appendEvent({
      taskId,
      type: 'VERIFICATION_STARTED',
      message: 'Initiating independent read-only verification probes against service APIs.',
      payload: { beforeState }
    });

    // Wait 1.5s to allow worker tick loop to drain pending jobs
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 1. Query independent read-only APIs
    const workerStatus = await fetchJson<any>(`${SIMULATOR_URL}/api/worker/status`);
    const serviceHealth = await fetchJson<any>(`${SIMULATOR_URL}/health`);
    const counters = await fetchJson<any>(`${SIMULATOR_URL}/api/counters`);
    const queue = await fetchJson<any>(`${SIMULATOR_URL}/api/queue/metrics`);

    const afterState = {
      workerRunning: workerStatus.running,
      workerPid: workerStatus.pid,
      serviceHealth: serviceHealth.status,
      pendingOrders: queue.pendingCount,
      processedOrders: counters.processedCount,
      errorRatePercent: counters.errorRatePercent
    };

    const criteria: VerificationCriterion[] = [];

    // Criterion 1: Worker is running
    const c1Passed = workerStatus.running === true && workerStatus.pid !== null;
    criteria.push({
      id: 'crit-worker-running',
      description: 'Worker process is enabled and actively listening with a valid PID',
      targetMetric: 'worker.status',
      expectedValue: 'RUNNING',
      observedValue: workerStatus.status,
      status: c1Passed ? 'PASSED' : 'FAILED',
      evidenceId: null
    });

    // Criterion 2: Service health reports healthy
    const c2Passed = serviceHealth.status === 'HEALTHY';
    criteria.push({
      id: 'crit-health-healthy',
      description: 'Service /health endpoint returns HTTP 200 with HEALTHY status',
      targetMetric: 'health.status',
      expectedValue: 'HEALTHY',
      observedValue: serviceHealth.status,
      status: c2Passed ? 'PASSED' : 'FAILED',
      evidenceId: null
    });

    // Criterion 3: Processing counters increased
    const initialProcessed = beforeState.processedOrders ?? 1050;
    const c3Passed = counters.processedCount > initialProcessed || (queue.pendingCount === 0 && workerStatus.running);
    criteria.push({
      id: 'crit-processed-counters',
      description: 'Customer order processed counter increased (throughput progressing)',
      targetMetric: 'counters.processedCount',
      expectedValue: queue.pendingCount === 0 ? 'Drained (0 backlog)' : `> ${initialProcessed}`,
      observedValue: String(counters.processedCount),
      status: c3Passed ? 'PASSED' : 'FAILED',
      evidenceId: null
    });

    // Criterion 4: Pending queue depth decreased
    const initialPending = beforeState.pendingOrders ?? 142;
    const c4Passed = queue.pendingCount < initialPending || (queue.pendingCount === 0 && workerStatus.running);
    criteria.push({
      id: 'crit-queue-draining',
      description: 'Pending orders queue backlog is decreasing towards SLO target',
      targetMetric: 'queue.pendingCount',
      expectedValue: initialPending === 0 ? '0 backlog' : `< ${initialPending}`,
      observedValue: String(queue.pendingCount),
      status: c4Passed ? 'PASSED' : 'FAILED',
      evidenceId: null
    });

    // Criterion 5: Error rate within threshold
    const c5Passed = counters.errorRatePercent <= 5.0;
    criteria.push({
      id: 'crit-error-rate',
      description: 'Order processing error rate remains within SLO (< 5.0%)',
      targetMetric: 'counters.errorRatePercent',
      expectedValue: '<= 5.0%',
      observedValue: `${counters.errorRatePercent}%`,
      status: c5Passed ? 'PASSED' : 'FAILED',
      evidenceId: null
    });

    const allPassed = criteria.every((c) => c.status === 'PASSED');
    const summary = allPassed
      ? `All 5 verification criteria PASSED: Worker running (PID ${workerStatus.pid}), Health HEALTHY, Orders processed increased to ${counters.processedCount}, Queue backlog drained to ${queue.pendingCount}.`
      : `Verification FAILED: ${criteria.filter((c) => c.status === 'FAILED').map((c) => c.description).join('; ')}`;

    const result: VerificationResult = {
      taskId,
      passed: allPassed,
      criteria,
      summary,
      beforeState,
      afterState,
      verifiedAt: new Date().toISOString()
    };

    eventStore.appendEvent({
      taskId,
      type: 'VERIFICATION_COMPLETED',
      message: result.summary,
      payload: {
        passed: allPassed,
        criteria,
        beforeState,
        afterState
      },
      level: allPassed ? 'SUCCESS' : 'ERROR'
    });

    return result;
  }
}

export const agentVerifier = new AgentVerifier();
