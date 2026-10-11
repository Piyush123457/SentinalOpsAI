import crypto from 'node:crypto';
import { ActionResult, EvidenceItem, EvidenceType, PlanStep } from '@sentinelops/shared';
import { incidentStore } from '@sentinelops/memory';

export class ObservationLoop {
  public recordObservation(params: {
    taskId: string;
    step: PlanStep;
    result: ActionResult;
  }): EvidenceItem | null {
    const { taskId, step, result } = params;
    if (!result.success || !result.output) return null;

    let type: EvidenceType = 'HEALTH_CHECK';
    let title = `Observation from ${result.toolName}`;

    switch (result.toolName) {
      case 'get_service_health':
      case 'run_health_check':
        type = 'HEALTH_CHECK';
        title = `Health Probe: ${result.output.status || result.output.overallStatus || 'Result'}`;
        break;
      case 'get_queue_metrics':
        type = 'QUEUE_METRIC';
        title = `Queue Depth: ${result.output.pendingCount} pending orders`;
        break;
      case 'search_service_logs':
        type = 'LOG_ENTRY';
        title = `Service Error Logs (${result.output.total} matches)`;
        break;
      case 'inspect_processing_counters':
        type = 'COUNTER_SNAPSHOT';
        title = `Counters: ${result.output.processedCount} processed, error rate ${result.output.errorRatePercent}%`;
        break;
      case 'inspect_worker_state':
        type = 'WORKER_STATUS';
        title = `Worker Runtime: ${result.output.status} (PID: ${result.output.pid || 'None'})`;
        break;
      case 'read_runbook':
        type = 'RUNBOOK_EXCERPT';
        title = `Runbook SOP: ${result.output.id}`;
        break;
      case 'get_recent_deployments':
        type = 'DEPLOYMENT_RECORD';
        title = `Recent Deployments (${result.output.deployments?.length || 0} releases)`;
        break;
      case 'capture_console_evidence':
        type = 'SCREENSHOT';
        title = `Console Snapshot: ${result.output.healthBadge} | Queue: ${result.output.queueDepth}`;
        break;
    }

    const item: EvidenceItem = {
      id: `evi_${crypto.randomUUID()}`,
      taskId,
      type,
      source: result.toolName,
      title,
      description: `Observed at Step ${step.stepNumber}: ${step.action.purpose}`,
      data: result.output,
      verified: true,
      timestamp: result.timestamp
    };

    incidentStore.addEvidence(item);
    return item;
  }
}

export const observationLoop = new ObservationLoop();
