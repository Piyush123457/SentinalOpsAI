import { describe, it, expect } from 'vitest';
import { policyEngine } from '../../packages/policy/dist/policy-engine.js';
import { approvalService } from '../../packages/policy/dist/approval-service.js';
import { toolRegistry } from '../../packages/tools/dist/registry.js';
import { PolicyViolationError, ToolExecutionError, ApprovalRequiredError } from '../../packages/shared/dist/errors.js';

describe('Unit Tests: Policy Engine & Security', () => {
  it('1. Rejects unknown unregistered tools', async () => {
    await expect(
      toolRegistry.executeTool('non_existent_exploit_tool', {}, { taskId: 'test-task' })
    ).rejects.toThrow(/Unknown tool/i);
  });

  it('2. Rejects invalid tool arguments via Zod validation', async () => {
    await expect(
      toolRegistry.executeTool(
        'search_service_logs',
        { limit: -5 }, // limit must be positive integer
        { taskId: 'test-task' }
      )
    ).rejects.toThrow(/Invalid arguments/i);
  });

  it('3. Automatically allows READ_ONLY diagnostic tools', () => {
    const evalResult = policyEngine.evaluateAction('task-1', 1, {
      id: 'step-1',
      toolName: 'get_service_health',
      arguments: {},
      purpose: 'Health probe',
      preconditions: [],
      expectedObservation: 'ok',
      riskLevel: 'READ_ONLY',
      requiresApproval: false
    });
    expect(evalResult.allowed).toBe(true);
    expect(evalResult.requiresApproval).toBe(false);
  });

  it('4. Automatically allows permitted LOW_RISK_REMEDIATION tools', () => {
    const evalResult = policyEngine.evaluateAction('task-1', 2, {
      id: 'step-2',
      toolName: 'enable_simulated_worker',
      arguments: { service: 'order-processing-service' },
      purpose: 'Enable worker',
      preconditions: [],
      expectedObservation: 'running',
      riskLevel: 'LOW_RISK_REMEDIATION',
      requiresApproval: false
    });
    expect(evalResult.allowed).toBe(true);
    expect(evalResult.requiresApproval).toBe(false);
  });

  it('5. Strictly rejects FORBIDDEN operations', () => {
    expect(() => {
      policyEngine.evaluateAction('task-1', 3, {
        id: 'step-3',
        toolName: 'purge_queue',
        arguments: {},
        purpose: 'Dangerous queue drop',
        preconditions: [],
        expectedObservation: 'purged',
        riskLevel: 'FORBIDDEN',
        requiresApproval: false
      });
    }).toThrow(PolicyViolationError);
  });

  it('6. Requires human approval token for RESTRICTED_REMEDIATION', () => {
    expect(() => {
      policyEngine.evaluateAction('task-1', 4, {
        id: 'step-4',
        toolName: 'restart_simulated_worker',
        arguments: { service: 'order-processing-service' },
        purpose: 'Restart worker',
        preconditions: [],
        expectedObservation: 'restarted',
        riskLevel: 'RESTRICTED_REMEDIATION',
        requiresApproval: true
      });
    }).toThrow(ApprovalRequiredError);
  });

  it('7. Enforces single-use approval token semantics', () => {
    const req = approvalService.createRequest({
      taskId: 'task-sec',
      stepNumber: 5,
      toolName: 'restart_simulated_worker',
      toolArguments: {},
      riskLevel: 'RESTRICTED_REMEDIATION',
      reason: 'Memory leak restart',
      expectedEffect: 'Worker running'
    });

    // Approve the token
    approvalService.approve(req.id, 'lead-sre@company.com');

    // First use: Valid
    const firstUse = approvalService.validateAndConsumeToken({
      taskId: 'task-sec',
      toolName: 'restart_simulated_worker',
      token: req.token
    });
    expect(firstUse.valid).toBe(true);

    // Second use: Replay attack rejected!
    const secondUse = approvalService.validateAndConsumeToken({
      taskId: 'task-sec',
      toolName: 'restart_simulated_worker',
      token: req.token
    });
    expect(secondUse.valid).toBe(false);
    expect(secondUse.error).toMatch(/already been consumed/i);
  });

  it('8. Rejects token when task ID or tool name mismatches', () => {
    const req = approvalService.createRequest({
      taskId: 'task-orig',
      stepNumber: 1,
      toolName: 'restart_simulated_worker',
      toolArguments: {},
      riskLevel: 'RESTRICTED_REMEDIATION',
      reason: 'Restart',
      expectedEffect: 'Restarted'
    });
    approvalService.approve(req.id, 'lead-sre@company.com');

    // Mismatched task ID
    const resMismatchedTask = approvalService.validateAndConsumeToken({
      taskId: 'task-different',
      toolName: 'restart_simulated_worker',
      token: req.token
    });
    expect(resMismatchedTask.valid).toBe(false);

    // Mismatched tool name
    const resMismatchedTool = approvalService.validateAndConsumeToken({
      taskId: 'task-orig',
      toolName: 'disable_simulated_worker',
      token: req.token
    });
    expect(resMismatchedTool.valid).toBe(false);
  });

  it('9. Rejects prompt-injection and command chaining attempts inside arguments', () => {
    expect(() => {
      policyEngine.evaluateAction('task-1', 6, {
        id: 'step-6',
        toolName: 'get_service_health',
        arguments: { service: 'order-service; rm -rf /; cat /etc/passwd' },
        purpose: 'Probe',
        preconditions: [],
        expectedObservation: 'ok',
        riskLevel: 'READ_ONLY',
        requiresApproval: false
      });
    }).toThrow(PolicyViolationError);
  });
});
