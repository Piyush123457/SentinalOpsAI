import {
  ActionProposal,
  IncidentReport,
  TaskRecord,
  TaskSpec
} from '@sentinelops/shared';
import {
  IntentOutput,
  PlanOutput,
  ReportOutput
} from './structured-output.js';

export class DemoPlanner {
  public interpretIntent(userPrompt: string): IntentOutput {
    const lower = userPrompt.toLowerCase();
    const service = lower.includes('payment')
      ? 'payment-gateway-service'
      : 'order-processing-service';

    return {
      reasoning: 'Deterministic parser matched order processing incident request.',
      objective:
        'Investigate order processing failure, inspect logs and runbook, apply permitted remediation, verify queue progression, and generate incident report.',
      affectedService: service,
      constraints: [
        'Do not execute unapproved destructive operations',
        'Verify independent read-only health and queue metrics before resolving',
        'Record all evidence in audit log'
      ],
      successCriteria: [
        'Worker process running with active PID',
        'Service health probe reports HEALTHY',
        'Pending queue depth decreases below backlog threshold',
        'Processing counter increments successfully',
        'Error rate remains within SLO (< 5.0%)'
      ]
    };
  }

  public generatePlan(params: {
    spec: TaskSpec;
    scenarioId?: string;
  }): PlanOutput {
    const scenario = params.scenarioId || 'scenario-a';

    const steps: ActionProposal[] = [
      {
        id: 'step-1',
        toolName: 'get_service_health',
        arguments: { service: params.spec.affectedService },
        purpose: 'Query current service health endpoint to determine degradation status',
        preconditions: ['Simulator running'],
        expectedObservation: 'Service health returns DEGRADED or error status with worker STOPPED',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-2',
        toolName: 'get_queue_metrics',
        arguments: { service: params.spec.affectedService },
        purpose: 'Measure pending orders backlog depth and worker consumer activity',
        preconditions: ['Health evaluated'],
        expectedObservation: 'Queue depth exceeds 100 pending orders with zero active consumers',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-3',
        toolName: 'search_service_logs',
        arguments: {
          service: params.spec.affectedService,
          level: 'ERROR',
          limit: 10
        },
        purpose: 'Inspect recent error logs to pinpoint root cause of worker failure',
        preconditions: ['Queue backlog identified'],
        expectedObservation: 'Logs show broker heartbeat timeout and unexpected consumer termination',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-4',
        toolName: 'read_runbook',
        arguments: { runbookId: 'order-processing' },
        purpose: 'Consult standard operating procedure RB-ORD-001 for permitted remediation',
        preconditions: ['Root cause error identified'],
        expectedObservation: 'Runbook authorizes enabling stopped worker under LOW_RISK_REMEDIATION',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-5',
        toolName: 'inspect_worker_state',
        arguments: { service: params.spec.affectedService },
        purpose: 'Inspect worker runtime process to confirm stopped state and PID',
        preconditions: ['Runbook consulted'],
        expectedObservation: 'Worker status is STOPPED with null active PID',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-6',
        toolName: 'capture_console_evidence',
        arguments: { consoleUrl: 'http://localhost:5001/console' },
        purpose: 'Use Playwright browser automation to capture visual and DOM evidence of initial degradation',
        preconditions: ['Diagnostics completed'],
        expectedObservation: 'Console DOM reports STOPPED worker status and high queue backlog',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      }
    ];

    // Scenario E requires restricted action with human approval gate
    if (scenario === 'scenario-e') {
      steps.push({
        id: 'step-7',
        toolName: 'restart_simulated_worker',
        arguments: { service: params.spec.affectedService },
        purpose: 'Execute full worker process restart and configuration reload',
        preconditions: ['Diagnostics completed', 'Human operator authorization obtained'],
        expectedObservation: 'Worker restarted and new process spawned',
        riskLevel: 'RESTRICTED_REMEDIATION',
        requiresApproval: true
      });
    } else {
      // Standard remediation
      steps.push({
        id: 'step-7',
        toolName: 'enable_simulated_worker',
        arguments: { service: params.spec.affectedService },
        purpose: 'Enable simulated order worker to resume queue consumption per RB-ORD-001',
        preconditions: ['Worker verified stopped', 'Policy permits LOW_RISK_REMEDIATION'],
        expectedObservation: 'Worker process enabled with new active PID',
        riskLevel: 'LOW_RISK_REMEDIATION',
        requiresApproval: false
      });
    }

    // Verification steps
    steps.push(
      {
        id: 'step-8',
        toolName: 'run_health_check',
        arguments: { service: params.spec.affectedService },
        purpose: 'Trigger active diagnostic probe to verify worker, database, and queue health',
        preconditions: ['Remediation executed'],
        expectedObservation: 'All diagnostic probes report PASS',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-9',
        toolName: 'inspect_processing_counters',
        arguments: { service: params.spec.affectedService },
        purpose: 'Verify order throughput counters are incrementing and queue backlog is draining',
        preconditions: ['Health probes passed'],
        expectedObservation: 'Processed orders counter increased and pending queue decreased',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      },
      {
        id: 'step-10',
        toolName: 'capture_console_evidence',
        arguments: { consoleUrl: 'http://localhost:5001/console' },
        purpose: 'Use Playwright browser automation to capture verified post-remediation console state',
        preconditions: ['Counters verified'],
        expectedObservation: 'Console DOM reports RUNNING worker and HEALTHY status badge',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      }
    );

    return {
      reasoning: 'Plan constructed systematically: Diagnostics -> Runbook -> Remediation -> Independent Verification -> Evidence Capture.',
      steps
    };
  }

  public generateReport(params: {
    task: TaskRecord;
    timeline: any[];
    beforeMetrics: any;
    afterMetrics: any;
    verificationPassed: boolean;
  }): ReportOutput {
    return {
      executiveSummary:
        'The Order Processing Service experienced critical consumer worker stoppage resulting in queue accumulation (142+ pending jobs). SentinelOps AI autonomously inspected diagnostics, verified runbook RB-ORD-001, re-enabled the worker consumer process, and confirmed successful queue draining and order settlement.',
      rootCause:
        'Order consumer worker (order-consumer-worker-1) terminated following an unhandled message broker heartbeat timeout (exit code 143). With zero active consumers, pending customer orders accumulated in the order-events.v1 queue.',
      impactSummary:
        'Customer checkout events were delayed by up to 18 minutes. No data loss occurred; all pending orders resumed processing immediately following worker reactivation.',
      recommendations: [
        'Configure worker consumer heartbeat watchdog with automatic container restart policy in Kubernetes deployment spec.',
        'Implement queue depth alert threshold at 75 pending orders (currently set at 150).',
        'Add broker connection retry exponential backoff handler in order-processing worker codebase.'
      ]
    };
  }
}

export const demoPlanner = new DemoPlanner();
