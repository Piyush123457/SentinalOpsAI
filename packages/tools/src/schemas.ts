import { z } from 'zod';
import { RiskLevelSchema } from '@sentinelops/shared';

export interface ToolDefinition<TIn = any, TOut = any> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TIn>;
  outputSchema: z.ZodType<TOut>;
  requiredPermission: string;
  riskClassification: z.infer<typeof RiskLevelSchema>;
  timeoutMs: number;
  maxRetries: number;
  handler: (input: TIn, context: { taskId: string; approvalToken?: string }) => Promise<TOut>;
}

// 1. get_service_health
export const GetServiceHealthInput = z.object({
  service: z.string().default('order-processing-service')
});

export const GetServiceHealthOutput = z.object({
  status: z.string(),
  service: z.string(),
  timestamp: z.string(),
  details: z.record(z.any())
});

// 2. get_queue_metrics
export const GetQueueMetricsInput = z.object({
  service: z.string().default('order-processing-service')
});

export const GetQueueMetricsOutput = z.object({
  service: z.string(),
  queueName: z.string(),
  pendingCount: z.number(),
  processingCount: z.number(),
  completedCount: z.number(),
  failedCount: z.number(),
  oldestJobAgeSeconds: z.number(),
  workerActive: z.boolean()
});

// 3. search_service_logs
export const SearchServiceLogsInput = z.object({
  service: z.string().default('order-processing-service'),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  query: z.string().optional(),
  limit: z.number().int().positive().default(20)
});

export const SearchServiceLogsOutput = z.object({
  total: z.number(),
  service: z.string(),
  logs: z.array(
    z.object({
      id: z.string(),
      timestamp: z.string(),
      service: z.string(),
      level: z.string(),
      message: z.string(),
      context: z.record(z.any()).optional()
    })
  )
});

// 4. get_recent_deployments
export const GetRecentDeploymentsInput = z.object({
  service: z.string().default('order-processing-service')
});

export const GetRecentDeploymentsOutput = z.object({
  service: z.string(),
  deployments: z.array(
    z.object({
      id: z.string(),
      service: z.string(),
      version: z.string(),
      commitSha: z.string(),
      deployedBy: z.string(),
      status: z.string(),
      timestamp: z.string(),
      notes: z.string()
    })
  )
});

// 5. read_runbook
export const ReadRunbookInput = z.object({
  runbookId: z.string()
});

export const ReadRunbookOutput = z.object({
  id: z.string(),
  filePath: z.string(),
  content: z.string()
});

// 6. inspect_worker_state
export const InspectWorkerStateInput = z.object({
  service: z.string().default('order-processing-service')
});

export const InspectWorkerStateOutput = z.object({
  service: z.string(),
  workerName: z.string(),
  status: z.string(),
  running: z.boolean(),
  pid: z.number().nullable(),
  threads: z.number(),
  restarts: z.number(),
  lastStartedAt: z.string().nullable(),
  lastStoppedAt: z.string().nullable()
});

// 7. enable_simulated_worker
export const EnableSimulatedWorkerInput = z.object({
  service: z.string().default('order-processing-service')
});

export const EnableSimulatedWorkerOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  workerPid: z.number().optional(),
  status: z.string().optional()
});

// 8. disable_simulated_worker
export const DisableSimulatedWorkerInput = z.object({
  service: z.string().default('order-processing-service')
});

export const DisableSimulatedWorkerOutput = z.object({
  success: z.boolean(),
  message: z.string()
});

// 9. restart_simulated_worker
export const RestartSimulatedWorkerInput = z.object({
  service: z.string().default('order-processing-service')
});

export const RestartSimulatedWorkerOutput = z.object({
  success: z.boolean(),
  message: z.string(),
  workerPid: z.number().optional(),
  status: z.string().optional()
});

// 10. run_health_check
export const RunHealthCheckInput = z.object({
  service: z.string().default('order-processing-service')
});

export const RunHealthCheckOutput = z.object({
  timestamp: z.string(),
  overallStatus: z.string(),
  probes: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      details: z.string()
    })
  )
});

// 11. inspect_processing_counters
export const InspectProcessingCountersInput = z.object({
  service: z.string().default('order-processing-service')
});

export const InspectProcessingCountersOutput = z.object({
  service: z.string(),
  processedCount: z.number(),
  failedCount: z.number(),
  pendingCount: z.number(),
  errorRatePercent: z.number(),
  timestamp: z.string()
});

// 12. read_incident_state
export const ReadIncidentStateInput = z.object({
  service: z.string().default('order-processing-service')
});

export const ReadIncidentStateOutput = z.object({
  activeIncident: z.object({
    id: z.string(),
    service: z.string(),
    title: z.string(),
    severity: z.string(),
    status: z.string(),
    detectedAt: z.string(),
    remediationHistory: z.array(z.any())
  })
});

// 13. capture_console_evidence
export const CaptureConsoleEvidenceInput = z.object({
  consoleUrl: z.string().default('http://localhost:5001/console')
});

export const CaptureConsoleEvidenceOutput = z.object({
  url: z.string(),
  title: z.string(),
  healthBadge: z.string(),
  workerStatus: z.string(),
  queueDepth: z.number(),
  processedCount: z.number(),
  screenshotBase64: z.string().optional(),
  timestamp: z.string()
});
