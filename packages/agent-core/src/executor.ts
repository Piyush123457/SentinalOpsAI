import {
  ActionResult,
  ApprovalRequiredError,
  PlanStep
} from '@sentinelops/shared';
import { policyEngine } from '@sentinelops/policy';
import { toolRegistry } from '@sentinelops/tools';
import { eventStore } from '@sentinelops/memory';

export class AgentExecutor {
  public async executeStep(params: {
    taskId: string;
    step: PlanStep;
    approvalToken?: string;
  }): Promise<ActionResult> {
    const { taskId, step, approvalToken } = params;
    const action = step.action;
    const startTime = Date.now();

    // 1. Policy & Authorization Evaluation
    policyEngine.evaluateAction(taskId, step.stepNumber, action, approvalToken);

    // 2. Emit Tool Started Event
    eventStore.appendEvent({
      taskId,
      type: 'TOOL_CALL_STARTED',
      message: `Executing tool '${action.toolName}' (Step ${step.stepNumber}): ${action.purpose}`,
      payload: {
        stepNumber: step.stepNumber,
        toolName: action.toolName,
        arguments: action.arguments,
        riskLevel: action.riskLevel
      }
    });

    step.status = 'RUNNING';
    step.startedAt = new Date().toISOString();

    // 3. Dispatch to Tool Registry
    try {
      const execResult = await toolRegistry.executeTool(action.toolName, action.arguments, {
        taskId,
        approvalToken
      });

      const completedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      step.status = 'COMPLETED';
      step.output = execResult.data;
      step.completedAt = completedAt;
      step.durationMs = durationMs;

      eventStore.appendEvent({
        taskId,
        type: 'TOOL_CALL_COMPLETED',
        message: `Tool '${action.toolName}' succeeded in ${durationMs}ms`,
        payload: {
          stepNumber: step.stepNumber,
          toolName: action.toolName,
          durationMs,
          output: execResult.data
        },
        level: 'SUCCESS'
      });

      return {
        success: true,
        toolName: action.toolName,
        input: action.arguments,
        output: execResult.data,
        error: null,
        durationMs,
        timestamp: completedAt
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      step.status = 'FAILED';
      step.error = err.message;
      step.durationMs = durationMs;

      eventStore.appendEvent({
        taskId,
        type: 'TOOL_CALL_FAILED',
        message: `Tool '${action.toolName}' failed: ${err.message}`,
        payload: {
          stepNumber: step.stepNumber,
          toolName: action.toolName,
          durationMs,
          error: err.message
        },
        level: 'ERROR'
      });

      return {
        success: false,
        toolName: action.toolName,
        input: action.arguments,
        output: null,
        error: err.message,
        durationMs,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const agentExecutor = new AgentExecutor();
