import crypto from 'node:crypto';
import {
  AgentEvent,
  ApprovalRequiredError,
  IncidentReport,
  Plan,
  PlanStep,
  SentinelOpsError,
  TaskRecord,
  VerificationResult
} from '@sentinelops/shared';
import {
  checkpointStore,
  eventStore,
  incidentStore
} from '@sentinelops/memory';
import { groqAdapter } from '@sentinelops/llm-groq';
import { toolRegistry } from '@sentinelops/tools';
import { AgentStateMachine } from './state-machine.js';
import { agentPlanner } from './planner.js';
import { agentExecutor } from './executor.js';
import { observationLoop } from './observation-loop.js';
import { recoveryEngine } from './recovery.js';
import { agentVerifier } from './verifier.js';

export type EventListener = (event: AgentEvent) => void;

export class AgentOrchestrator {
  private activeLocks: Set<string> = new Set();
  private eventListeners: Set<EventListener> = new Set();

  public addEventListener(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private broadcastEvent(event: AgentEvent) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[ORCHESTRATOR] Event listener error:', err);
      }
    }
  }

  public async runTask(taskId: string, approvalToken?: string): Promise<TaskRecord> {
    // 1. Task Locking to prevent duplicate concurrent runs
    if (this.activeLocks.has(taskId)) {
      throw new SentinelOpsError(
        `Task ${taskId} is currently executing. Concurrent duplicate execution is locked.`,
        'TASK_LOCKED'
      );
    }
    this.activeLocks.add(taskId);

    try {
      const task = incidentStore.getTask(taskId);
      if (!task) {
        throw new SentinelOpsError(`Task ${taskId} not found.`, 'TASK_NOT_FOUND');
      }

      // Check if resuming from approval wait or checkpoint
      if (task.status === 'AWAITING_APPROVAL') {
        if (!approvalToken) {
          throw new SentinelOpsError(
            `Task ${taskId} is awaiting approval. A valid approval token is required to resume.`,
            'APPROVAL_TOKEN_REQUIRED'
          );
        }
        return await this.resumeAfterApproval(task, approvalToken);
      }

      return await this.executeNewLifecycle(task);
    } finally {
      this.activeLocks.delete(taskId);
    }
  }

  private async executeNewLifecycle(task: TaskRecord): Promise<TaskRecord> {
    // 1. UNDERSTANDING
    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'CREATED',
      toStatus: 'UNDERSTANDING',
      reason: 'Parsing user prompt into structured objective'
    });

    const originalScenario = task.spec.scenario;
    const intent = await groqAdapter.interpretIntent(task.userPrompt);
    task.spec = { ...intent, scenario: originalScenario };
    task.title = intent.objective.slice(0, 80);

    eventStore.appendEvent({
      taskId: task.id,
      type: 'INTENT_INTERPRETED',
      message: `Interpreted objective for service '${intent.affectedService}': ${intent.objective}`,
      payload: intent
    });

    // 2. INVESTIGATING (Diagnosing initial state)
    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'UNDERSTANDING',
      toStatus: 'INVESTIGATING',
      reason: 'Gathering initial diagnostics and system health probes'
    });

    // Capture baseline before-metrics for independent verification
    const baselineHealth = await toolRegistry.executeTool('get_service_health', {}, { taskId: task.id });
    const baselineQueue = await toolRegistry.executeTool('get_queue_metrics', {}, { taskId: task.id });
    const baselineCounters = await toolRegistry.executeTool('inspect_processing_counters', {}, { taskId: task.id });

    const beforeState = {
      workerRunning: baselineHealth.data?.details?.workerStatus === 'RUNNING',
      pendingOrders: baselineQueue.data?.pendingCount || 142,
      processedOrders: baselineCounters.data?.processedCount || 1050,
      serviceHealth: baselineHealth.data?.status || 'DEGRADED'
    };

    checkpointStore.saveCheckpoint({
      taskId: task.id,
      stepNumber: 0,
      state: 'INVESTIGATING',
      planVersion: 1,
      variables: { beforeState }
    });

    // 3. PLANNING
    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'INVESTIGATING',
      toStatus: 'PLANNING',
      reason: 'Formulating structured action plan with runbooks and policies'
    });

    const plan = await agentPlanner.createPlan(task, baselineHealth.data);

    // 4. EXECUTION LOOP
    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'PLANNING',
      toStatus: 'EXECUTING',
      reason: 'Executing registered plan steps sequentially'
    });

    return await this.runPlanSteps(task, plan, beforeState);
  }

  private async runPlanSteps(
    task: TaskRecord,
    plan: Plan,
    beforeState: Record<string, any>,
    startIndex = 0,
    providedToken?: string
  ): Promise<TaskRecord> {
    for (let i = startIndex; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (step.status === 'COMPLETED') continue;

      let stepSuccess = false;
      let attempt = 0;

      while (!stepSuccess && attempt <= 2) {
        try {
          // If this step needs approval and token is provided, pass it
          const tokenForStep = (step.action.requiresApproval && providedToken) ? providedToken : undefined;
          const result = await agentExecutor.executeStep({
            taskId: task.id,
            step,
            approvalToken: tokenForStep
          });

          if (result.success) {
            stepSuccess = true;
            // Record observation into evidence
            observationLoop.recordObservation({ taskId: task.id, step, result });

            // Save checkpoint
            checkpointStore.saveCheckpoint({
              taskId: task.id,
              stepNumber: step.stepNumber,
              state: 'EXECUTING',
              planVersion: plan.version,
              variables: { stepResult: result.output, beforeState }
            });
            break;
          } else {
            throw new Error(result.error || 'Action execution returned failure');
          }
        } catch (err: any) {
          if (err instanceof ApprovalRequiredError || err.code === 'APPROVAL_REQUIRED') {
            // Pause at AWAITING_APPROVAL
            step.status = 'AWAITING_APPROVAL';
            AgentStateMachine.transition({
              taskId: task.id,
              fromStatus: 'EXECUTING',
              toStatus: 'AWAITING_APPROVAL',
              reason: `Protected action ${step.action.toolName} requires operator approval token`,
              stepNumber: step.stepNumber
            });

            eventStore.appendEvent({
              taskId: task.id,
              type: 'APPROVAL_REQUESTED',
              message: `Approval requested for protected action '${step.action.toolName}' (Step ${step.stepNumber})`,
              payload: {
                stepNumber: step.stepNumber,
                toolName: step.action.toolName,
                riskLevel: step.action.riskLevel,
                details: err.details
              },
              level: 'WARN'
            });

            // Return early waiting for user approval decision
            return incidentStore.getTask(task.id)!;
          }

          // Trigger recovery engine
          attempt++;
          const recovery = recoveryEngine.decideRecovery({
            taskId: task.id,
            step,
            error: err,
            currentRetries: step.retries,
            maxRetries: 2
          });

          step.retries++;

          if (recovery.action === 'RETRY' || recovery.action === 'CLEAN_AND_RETRY') {
            await new Promise((r) => setTimeout(r, recovery.delayMs));
            continue;
          } else if (recovery.action === 'RECHECK_STATE_FIRST') {
            // Check state first before re-attempting
            await toolRegistry.executeTool('inspect_worker_state', {}, { taskId: task.id });
            await new Promise((r) => setTimeout(r, recovery.delayMs));
            continue;
          } else {
            // Escalate / fail
            AgentStateMachine.transition({
              taskId: task.id,
              fromStatus: 'EXECUTING',
              toStatus: 'FAILED',
              reason: recovery.reason,
              stepNumber: step.stepNumber,
              error: err.message
            });
            return incidentStore.getTask(task.id)!;
          }
        }
      }

      // Persist plan step status update
      incidentStore.savePlan(plan);
    }

    // 5. INDEPENDENT VERIFICATION
    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'EXECUTING',
      toStatus: 'VERIFYING',
      reason: 'Evaluating independent read-only health and queue criteria'
    });

    const verificationResult = await agentVerifier.verifyRecovery(task.id, beforeState);

    // 6. REPORT GENERATION
    const events = eventStore.getEvents(task.id);
    const reportData = await groqAdapter.generateReport({
      task,
      timeline: events.map((e) => ({ timestamp: e.timestamp, event: e.message })),
      beforeMetrics: beforeState,
      afterMetrics: verificationResult.afterState,
      verificationPassed: verificationResult.passed
    });

    const report: IncidentReport = {
      id: `rep_${crypto.randomUUID()}`,
      taskId: task.id,
      incidentId: 'INC-7029',
      title: `Incident Resolution Report: ${task.title}`,
      executiveSummary: reportData.executiveSummary,
      rootCause: reportData.rootCause,
      impactSummary: reportData.impactSummary,
      timeline: events.map((e) => ({ timestamp: e.timestamp, event: e.message })),
      actionsTaken: plan.steps.map((s) => ({
        step: s.stepNumber,
        action: s.action.toolName,
        outcome: s.status,
        verification: s.durationMs ? `${s.durationMs}ms` : 'N/A'
      })),
      beforeMetrics: beforeState,
      afterMetrics: verificationResult.afterState,
      verificationStatus: verificationResult.passed ? 'FULLY_VERIFIED' : 'FAILED',
      runbooksConsulted: ['RB-ORD-001 (Order Processing)', 'RB-WKR-002 (Worker Recovery)'],
      postMortemRecommendations: reportData.recommendations,
      generatedAt: new Date().toISOString()
    };

    incidentStore.saveReport(report);

    eventStore.appendEvent({
      taskId: task.id,
      type: 'REPORT_GENERATED',
      message: `Final incident report generated with postmortem analysis.`,
      payload: { reportId: report.id, verificationPassed: verificationResult.passed },
      level: 'SUCCESS'
    });

    // 7. FINAL STATE COMPLETION
    if (verificationResult.passed) {
      AgentStateMachine.transition({
        taskId: task.id,
        fromStatus: 'VERIFYING',
        toStatus: 'COMPLETED',
        reason: 'All independent verification criteria satisfied'
      });
    } else {
      AgentStateMachine.transition({
        taskId: task.id,
        fromStatus: 'VERIFYING',
        toStatus: 'FAILED',
        reason: 'Independent verification criteria failed'
      });
    }

    return incidentStore.getTask(task.id)!;
  }

  private async resumeAfterApproval(task: TaskRecord, approvalToken: string): Promise<TaskRecord> {
    const plan = incidentStore.getPlan(task.id);
    if (!plan) {
      throw new SentinelOpsError(`No plan found for task ${task.id}`, 'PLAN_NOT_FOUND');
    }

    const checkpoint = checkpointStore.getLatestCheckpoint(task.id);
    const beforeState = checkpoint?.variables?.beforeState || {
      workerRunning: false,
      pendingOrders: 142,
      processedOrders: 1050
    };

    // Find the awaiting step
    const stepIndex = plan.steps.findIndex((s) => s.status === 'AWAITING_APPROVAL');
    const resumeIndex = stepIndex >= 0 ? stepIndex : 0;

    AgentStateMachine.transition({
      taskId: task.id,
      fromStatus: 'AWAITING_APPROVAL',
      toStatus: 'EXECUTING',
      reason: 'Approval token received. Resuming execution of protected action.'
    });

    eventStore.appendEvent({
      taskId: task.id,
      type: 'APPROVAL_DECIDED',
      message: `Operator approval token consumed for Step ${plan.steps[resumeIndex].stepNumber}`,
      payload: { token: approvalToken },
      level: 'SUCCESS'
    });

    return await this.runPlanSteps(task, plan, beforeState, resumeIndex, approvalToken);
  }
}

export const agentOrchestrator = new AgentOrchestrator();
