export class SentinelOpsError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code = 'SENTINEL_ERROR', details?: Record<string, any>) {
    super(message);
    this.name = 'SentinelOpsError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PolicyViolationError extends SentinelOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'POLICY_VIOLATION', details);
    this.name = 'PolicyViolationError';
  }
}

export class ApprovalRequiredError extends SentinelOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'APPROVAL_REQUIRED', details);
    this.name = 'ApprovalRequiredError';
  }
}

export class ToolExecutionError extends SentinelOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'ToolExecutionError';
  }
}

export class VerificationFailedError extends SentinelOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VERIFICATION_FAILED', details);
    this.name = 'VerificationFailedError';
  }
}

export class TimeoutError extends SentinelOpsError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}
