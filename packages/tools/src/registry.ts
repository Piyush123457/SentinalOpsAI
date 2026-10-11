import {
  ToolExecutionError,
  TimeoutError
} from '@sentinelops/shared';
import {
  ToolDefinition,
  GetServiceHealthInput,
  GetServiceHealthOutput,
  GetQueueMetricsInput,
  GetQueueMetricsOutput,
  SearchServiceLogsInput,
  SearchServiceLogsOutput,
  GetRecentDeploymentsInput,
  GetRecentDeploymentsOutput,
  ReadRunbookInput,
  ReadRunbookOutput,
  InspectWorkerStateInput,
  InspectWorkerStateOutput,
  EnableSimulatedWorkerInput,
  EnableSimulatedWorkerOutput,
  DisableSimulatedWorkerInput,
  DisableSimulatedWorkerOutput,
  RestartSimulatedWorkerInput,
  RestartSimulatedWorkerOutput,
  RunHealthCheckInput,
  RunHealthCheckOutput,
  InspectProcessingCountersInput,
  InspectProcessingCountersOutput,
  ReadIncidentStateInput,
  ReadIncidentStateOutput,
  CaptureConsoleEvidenceInput,
  CaptureConsoleEvidenceOutput
} from './schemas.js';
import { captureConsoleEvidence } from './browser/console-capture.js';

const SIMULATOR_BASE_URL = process.env.SIMULATOR_URL || 'http://localhost:5001';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errorBody = await res.text();
    throw new ToolExecutionError(
      `Simulator API error (${res.status}): ${errorBody || res.statusText}`,
      { status: res.status, url }
    );
  }
  return res.json() as Promise<T>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerStandardTools();
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public has(name: string): boolean {
    return this.tools.has(name);
  }

  public list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(
    name: string,
    rawInput: any,
    context: { taskId: string; approvalToken?: string }
  ): Promise<{ success: boolean; data: any; durationMs: number; error?: string }> {
    const tool = this.get(name);
    if (!tool) {
      throw new ToolExecutionError(`Unknown tool '${name}'. Tool is not registered in ToolRegistry.`, {
        toolName: name
      });
    }

    // 1. Validate Input Schema with Zod
    const parseResult = tool.inputSchema.safeParse(rawInput || {});
    if (!parseResult.success) {
      throw new ToolExecutionError(
        `Invalid arguments for tool '${name}': ${parseResult.error.message}`,
        {
          toolName: name,
          validationErrors: parseResult.error.format()
        }
      );
    }
    const validatedInput = parseResult.data;

    // 2. Execute with bounded timeout
    const startTime = Date.now();
    try {
      const output = await Promise.race([
        tool.handler(validatedInput, context),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new TimeoutError(`Tool '${name}' exceeded execution timeout of ${tool.timeoutMs}ms`)),
            tool.timeoutMs
          )
        )
      ]);

      // 3. Validate Output Schema with Zod
      const validatedOutput = tool.outputSchema.parse(output);
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        data: validatedOutput,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      throw new ToolExecutionError(err.message || `Execution failed for tool ${name}`, {
        toolName: name,
        durationMs,
        originalError: err
      });
    }
  }

  private registerStandardTools() {
    // 1. get_service_health
    this.register({
      name: 'get_service_health',
      description: 'Reads service health status and component indicators from the simulator.',
      inputSchema: GetServiceHealthInput,
      outputSchema: GetServiceHealthOutput,
      requiredPermission: 'read:health',
      riskClassification: 'READ_ONLY',
      timeoutMs: 8000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/health`);
      }
    });

    // 2. get_queue_metrics
    this.register({
      name: 'get_queue_metrics',
      description: 'Retrieves current queue depth, pending jobs, and processing metrics.',
      inputSchema: GetQueueMetricsInput,
      outputSchema: GetQueueMetricsOutput,
      requiredPermission: 'read:queue',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/queue/metrics`);
      }
    });

    // 3. search_service_logs
    this.register({
      name: 'search_service_logs',
      description: 'Searches application logs filtered by service, level, and query keywords.',
      inputSchema: SearchServiceLogsInput,
      outputSchema: SearchServiceLogsOutput,
      requiredPermission: 'read:logs',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async (input) => {
        const queryParams = new URLSearchParams();
        if (input.service) queryParams.set('service', input.service);
        if (input.level) queryParams.set('level', input.level);
        if (input.query) queryParams.set('query', input.query);
        if (input.limit) queryParams.set('limit', String(input.limit));
        return fetchJson(`${SIMULATOR_BASE_URL}/api/logs?${queryParams.toString()}`);
      }
    });

    // 4. get_recent_deployments
    this.register({
      name: 'get_recent_deployments',
      description: 'Retrieves recent deployment releases, commit hashes, and authors.',
      inputSchema: GetRecentDeploymentsInput,
      outputSchema: GetRecentDeploymentsOutput,
      requiredPermission: 'read:deployments',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/deployments`);
      }
    });

    // 5. read_runbook
    this.register({
      name: 'read_runbook',
      description: 'Retrieves standard operating procedure runbook documentation.',
      inputSchema: ReadRunbookInput,
      outputSchema: ReadRunbookOutput,
      requiredPermission: 'read:runbook',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async (input) => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/runbooks/${input.runbookId}`);
      }
    });

    // 6. inspect_worker_state
    this.register({
      name: 'inspect_worker_state',
      description: 'Inspects worker runtime process details, PID, and thread status.',
      inputSchema: InspectWorkerStateInput,
      outputSchema: InspectWorkerStateOutput,
      requiredPermission: 'read:worker',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/worker/status`);
      }
    });

    // 7. enable_simulated_worker (Low Risk Remediation)
    this.register({
      name: 'enable_simulated_worker',
      description: 'Starts and enables the simulated order processing worker process.',
      inputSchema: EnableSimulatedWorkerInput,
      outputSchema: EnableSimulatedWorkerOutput,
      requiredPermission: 'write:worker',
      riskClassification: 'LOW_RISK_REMEDIATION',
      timeoutMs: 5000,
      maxRetries: 1,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/worker/enable`, { method: 'POST' });
      }
    });

    // 8. disable_simulated_worker (Restricted)
    this.register({
      name: 'disable_simulated_worker',
      description: 'Stops and disables the simulated order processing worker process.',
      inputSchema: DisableSimulatedWorkerInput,
      outputSchema: DisableSimulatedWorkerOutput,
      requiredPermission: 'write:worker:admin',
      riskClassification: 'RESTRICTED_REMEDIATION',
      timeoutMs: 5000,
      maxRetries: 1,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/worker/disable`, { method: 'POST' });
      }
    });

    // 9. restart_simulated_worker (Restricted)
    this.register({
      name: 'restart_simulated_worker',
      description: 'Restarts the order consumer worker and resets locks.',
      inputSchema: RestartSimulatedWorkerInput,
      outputSchema: RestartSimulatedWorkerOutput,
      requiredPermission: 'write:worker:restart',
      riskClassification: 'RESTRICTED_REMEDIATION',
      timeoutMs: 8000,
      maxRetries: 1,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/worker/restart`, { method: 'POST' });
      }
    });

    // 10. run_health_check
    this.register({
      name: 'run_health_check',
      description: 'Performs deep active diagnostic health probes on queues, workers, and databases.',
      inputSchema: RunHealthCheckInput,
      outputSchema: RunHealthCheckOutput,
      requiredPermission: 'read:health',
      riskClassification: 'READ_ONLY',
      timeoutMs: 8000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/health-check`, { method: 'POST' });
      }
    });

    // 11. inspect_processing_counters
    this.register({
      name: 'inspect_processing_counters',
      description: 'Inspects throughput counters (processed orders, failed orders, error rate).',
      inputSchema: InspectProcessingCountersInput,
      outputSchema: InspectProcessingCountersOutput,
      requiredPermission: 'read:counters',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/counters`);
      }
    });

    // 12. read_incident_state
    this.register({
      name: 'read_incident_state',
      description: 'Queries active incident metadata, alert status, and historical remediation logs.',
      inputSchema: ReadIncidentStateInput,
      outputSchema: ReadIncidentStateOutput,
      requiredPermission: 'read:incident',
      riskClassification: 'READ_ONLY',
      timeoutMs: 5000,
      maxRetries: 2,
      handler: async () => {
        return fetchJson(`${SIMULATOR_BASE_URL}/api/incidents`);
      }
    });

    // 13. capture_console_evidence (Playwright)
    this.register({
      name: 'capture_console_evidence',
      description: 'Uses Playwright browser automation to visually inspect the incident console, verify DOM state, and capture evidence screenshot.',
      inputSchema: CaptureConsoleEvidenceInput,
      outputSchema: CaptureConsoleEvidenceOutput,
      requiredPermission: 'read:console',
      riskClassification: 'READ_ONLY',
      timeoutMs: 15000,
      maxRetries: 1,
      handler: async (input) => {
        return captureConsoleEvidence(input.consoleUrl);
      }
    });
  }
}

export const toolRegistry = new ToolRegistry();
