import {
  ActionProposal,
  ApprovalRequiredError,
  PolicyViolationError,
  RiskLevel
} from '@sentinelops/shared';
import { getToolRiskLevel } from './risk-levels.js';
import { approvalService, ApprovalService } from './approval-service.js';

export interface PolicyEvaluationResult {
  allowed: boolean;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalRequestId?: string;
  reason?: string;
}

export class PolicyEngine {
  private approvals: ApprovalService;

  constructor(customApprovalService?: ApprovalService) {
    this.approvals = customApprovalService || approvalService;
  }

  public evaluateAction(
    taskId: string,
    stepNumber: number,
    action: ActionProposal,
    providedToken?: string
  ): PolicyEvaluationResult {
    const riskLevel = getToolRiskLevel(action.toolName);

    // 1. Strictly block FORBIDDEN actions
    if (riskLevel === 'FORBIDDEN') {
      throw new PolicyViolationError(
        `Action ${action.toolName} is strictly FORBIDDEN by security policy.`
      );
    }

    // 2. Sanitize and validate arguments against dangerous patterns
    this.validateArguments(action.arguments);

    // 3. READ_ONLY actions are safe and automatic
    if (riskLevel === 'READ_ONLY') {
      return {
        allowed: true,
        riskLevel,
        requiresApproval: false
      };
    }

    // 4. LOW_RISK_REMEDIATION is allowed automatically by policy
    if (riskLevel === 'LOW_RISK_REMEDIATION') {
      return {
        allowed: true,
        riskLevel,
        requiresApproval: false
      };
    }

    // 5. RESTRICTED_REMEDIATION requires explicit human approval token
    if (riskLevel === 'RESTRICTED_REMEDIATION') {
      if (!providedToken) {
        // Create an approval request if one does not already exist
        const pending = this.approvals.getPendingForTask(taskId);
        const existing = pending.find((p) => p.toolName === action.toolName && p.stepNumber === stepNumber);

        const request =
          existing ||
          this.approvals.createRequest({
            taskId,
            stepNumber,
            toolName: action.toolName,
            toolArguments: action.arguments,
            riskLevel,
            reason: `Protected remediation action: ${action.purpose}`,
            expectedEffect: action.expectedObservation
          });

        throw new ApprovalRequiredError(
          `Action ${action.toolName} requires human operator approval token before execution.`,
          {
            requestId: request.id,
            token: request.token,
            riskLevel,
            stepNumber
          }
        );
      }

      // If token provided, validate and consume it
      const validation = this.approvals.validateAndConsumeToken({
        taskId,
        toolName: action.toolName,
        token: providedToken
      });

      if (!validation.valid) {
        throw new PolicyViolationError(`Approval validation failed: ${validation.error}`);
      }

      return {
        allowed: true,
        riskLevel,
        requiresApproval: true
      };
    }

    throw new PolicyViolationError(`Unrecognized risk classification for tool: ${action.toolName}`);
  }

  private validateArguments(args: Record<string, any>) {
    if (!args || typeof args !== 'object') return;

    for (const [key, val] of Object.entries(args)) {
      if (typeof val === 'string') {
        // Check for shell command chaining or suspicious injection patterns
        if (/(\||;|`|\$\(|\brm\s+-rf\b|\bDROP\s+TABLE\b|\bDELETE\s+FROM\b)/i.test(val)) {
          throw new PolicyViolationError(
            `Potential injection pattern detected in argument '${key}': ${val}`
          );
        }
      } else if (typeof val === 'object' && val !== null) {
        this.validateArguments(val);
      }
    }
  }
}

export const policyEngine = new PolicyEngine();
