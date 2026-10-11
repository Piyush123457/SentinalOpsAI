import { z } from 'zod';

export const RiskLevelSchema = z.enum([
  'READ_ONLY',
  'LOW_RISK_REMEDIATION',
  'RESTRICTED_REMEDIATION',
  'FORBIDDEN'
]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ActionProposalSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  arguments: z.record(z.any()),
  purpose: z.string(),
  preconditions: z.array(z.string()).default([]),
  expectedObservation: z.string(),
  riskLevel: RiskLevelSchema,
  requiresApproval: z.boolean().default(false)
});
export type ActionProposal = z.infer<typeof ActionProposalSchema>;

export const PlanStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  action: ActionProposalSchema,
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'AWAITING_APPROVAL']),
  output: z.any().nullable().default(null),
  error: z.string().nullable().default(null),
  retries: z.number().int().nonnegative().default(0),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  durationMs: z.number().nonnegative().nullable().default(null)
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  version: z.number().int().positive().default(1),
  objective: z.string(),
  steps: z.array(PlanStepSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Plan = z.infer<typeof PlanSchema>;

export const ActionResultSchema = z.object({
  success: z.boolean(),
  toolName: z.string(),
  input: z.record(z.any()),
  output: z.any().nullable().default(null),
  error: z.string().nullable().default(null),
  durationMs: z.number().nonnegative(),
  timestamp: z.string()
});
export type ActionResult = z.infer<typeof ActionResultSchema>;
