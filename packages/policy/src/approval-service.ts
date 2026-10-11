import crypto from 'node:crypto';
import {
  ApprovalRequest,
  ApprovalStatus,
  PolicyViolationError
} from '@sentinelops/shared';

export interface ConsumedTokenRecord {
  token: string;
  consumedAt: string;
  taskId: string;
  toolName: string;
}

export class ApprovalService {
  private requests: Map<string, ApprovalRequest> = new Map();
  private consumedTokens: Map<string, ConsumedTokenRecord> = new Map();
  private defaultTtlSeconds: number = 300; // 5 minutes

  constructor(ttlSeconds?: number) {
    if (ttlSeconds) this.defaultTtlSeconds = ttlSeconds;
  }

  public createRequest(params: {
    taskId: string;
    stepNumber: number;
    toolName: string;
    toolArguments: Record<string, any>;
    riskLevel: 'RESTRICTED_REMEDIATION' | 'FORBIDDEN' | 'LOW_RISK_REMEDIATION' | 'READ_ONLY';
    reason: string;
    expectedEffect: string;
  }): ApprovalRequest {
    const id = crypto.randomUUID();
    const token = `appr_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTtlSeconds * 1000).toISOString();

    const request: ApprovalRequest = {
      id,
      taskId: params.taskId,
      stepNumber: params.stepNumber,
      toolName: params.toolName,
      toolArguments: params.toolArguments,
      riskLevel: params.riskLevel,
      reason: params.reason,
      expectedEffect: params.expectedEffect,
      token,
      status: 'PENDING',
      requestedAt: now.toISOString(),
      expiresAt,
      decidedAt: null,
      decidedBy: null,
      rejectionReason: null
    };

    this.requests.set(id, request);
    return request;
  }

  public getRequest(id: string): ApprovalRequest | undefined {
    const req = this.requests.get(id);
    if (!req) return undefined;

    // Check expiration if still pending
    if (req.status === 'PENDING' && new Date() > new Date(req.expiresAt)) {
      req.status = 'EXPIRED';
    }
    return req;
  }

  public getPendingForTask(taskId: string): ApprovalRequest[] {
    const now = new Date();
    return Array.from(this.requests.values()).filter((r) => {
      if (r.taskId !== taskId) return false;
      if (r.status === 'PENDING') {
        if (now > new Date(r.expiresAt)) {
          r.status = 'EXPIRED';
          return false;
        }
        return true;
      }
      return false;
    });
  }

  public approve(requestId: string, decidedBy = 'operator@sentinelops.local'): ApprovalRequest {
    const req = this.getRequest(requestId);
    if (!req) {
      throw new PolicyViolationError(`Approval request ${requestId} not found.`);
    }
    if (req.status === 'EXPIRED') {
      throw new PolicyViolationError(`Approval request ${requestId} has expired.`);
    }
    if (req.status !== 'PENDING') {
      throw new PolicyViolationError(`Cannot approve request in status: ${req.status}`);
    }

    req.status = 'APPROVED';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = decidedBy;
    return req;
  }

  public reject(requestId: string, reason = 'Operator rejected execution', decidedBy = 'operator@sentinelops.local'): ApprovalRequest {
    const req = this.getRequest(requestId);
    if (!req) {
      throw new PolicyViolationError(`Approval request ${requestId} not found.`);
    }
    if (req.status !== 'PENDING') {
      throw new PolicyViolationError(`Cannot reject request in status: ${req.status}`);
    }

    req.status = 'REJECTED';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = decidedBy;
    req.rejectionReason = reason;
    return req;
  }

  public validateAndConsumeToken(params: {
    taskId: string;
    toolName: string;
    token: string;
  }): { valid: boolean; error?: string } {
    const { taskId, toolName, token } = params;

    if (!token) {
      return { valid: false, error: 'Approval token is required for restricted operations.' };
    }

    // Check if token was already consumed (single-use enforcement)
    if (this.consumedTokens.has(token)) {
      return { valid: false, error: 'Approval token has already been consumed (single-use violation).' };
    }

    // Find corresponding request
    const request = Array.from(this.requests.values()).find((r) => r.token === token);
    if (!request) {
      return { valid: false, error: 'Invalid or unknown approval token.' };
    }

    // Check expiration
    if (new Date() > new Date(request.expiresAt)) {
      request.status = 'EXPIRED';
      return { valid: false, error: 'Approval token has expired.' };
    }

    // Check status
    if (request.status !== 'APPROVED') {
      return { valid: false, error: `Approval token status is ${request.status}, must be APPROVED.` };
    }

    // Check taskId binding
    if (request.taskId !== taskId) {
      return { valid: false, error: `Approval token was issued for task ${request.taskId}, but received for ${taskId}.` };
    }

    // Check toolName binding
    if (request.toolName !== toolName) {
      return { valid: false, error: `Approval token was issued for tool ${request.toolName}, not ${toolName}.` };
    }

    // Mark consumed immediately
    this.consumedTokens.set(token, {
      token,
      consumedAt: new Date().toISOString(),
      taskId,
      toolName
    });

    return { valid: true };
  }
}

export const approvalService = new ApprovalService();
