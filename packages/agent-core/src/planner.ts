import crypto from 'node:crypto';
import { Plan, PlanStep, TaskRecord } from '@sentinelops/shared';
import { runbookRetriever, incidentStore, eventStore } from '@sentinelops/memory';
import { groqAdapter } from '@sentinelops/llm-groq';

export class AgentPlanner {
  public async createPlan(task: TaskRecord, initialHealth: any): Promise<Plan> {
    // 1. Retrieve relevant runbooks based on task objective & affected service
    const excerpts = runbookRetriever.retrieve(
      `${task.spec.objective} ${task.userPrompt}`,
      task.spec.affectedService
    );

    const runbookSummaries = excerpts.map(
      (e) => `[${e.runbookId} - ${e.sectionHeading}]\n${e.content}`
    );

    eventStore.appendEvent({
      taskId: task.id,
      type: 'RUNBOOK_RETRIEVED',
      message: `Retrieved ${excerpts.length} relevant runbook sections for planning.`,
      payload: {
        runbooks: excerpts.map((e) => ({
          id: e.runbookId,
          heading: e.sectionHeading,
          score: e.relevanceScore
        }))
      }
    });

    // 2. Generate structured plan through LLM or demo planner
    const planOutput = await groqAdapter.generatePlan({
      spec: task.spec,
      scenarioId: task.spec.scenario,
      runbooks: runbookSummaries,
      initialHealth
    });

    const steps: PlanStep[] = planOutput.steps.map((action, index) => ({
      stepNumber: index + 1,
      action,
      status: 'PENDING',
      output: null,
      error: null,
      retries: 0,
      startedAt: null,
      completedAt: null,
      durationMs: null
    }));

    const now = new Date().toISOString();
    const plan: Plan = {
      id: `plan_${crypto.randomUUID()}`,
      taskId: task.id,
      version: 1,
      objective: task.spec.objective,
      steps,
      createdAt: now,
      updatedAt: now
    };

    // Save in persistent store
    incidentStore.savePlan(plan);

    eventStore.appendEvent({
      taskId: task.id,
      type: 'PLAN_GENERATED',
      message: `Constructed structured execution plan with ${steps.length} sequential steps.`,
      payload: {
        planId: plan.id,
        reasoning: planOutput.reasoning,
        stepCount: steps.length,
        tools: steps.map((s) => s.action.toolName)
      }
    });

    return plan;
  }
}

export const agentPlanner = new AgentPlanner();
