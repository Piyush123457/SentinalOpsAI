import { z } from 'zod';
import { RiskLevelSchema } from './action.js';

export const ApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string(),
  stepNumber: z.number().int().positive(),
  toolName: z.string(),
  toolArguments: z.record(z.any()),
  riskLevel: RiskLevelSchema,
  reason: z.string(),
  expectedEffect: z.string(),
  token: z.string(),
  status: ApprovalStatusSchema,
  requestedAt: z.string(),
  expiresAt: z.string(),
  decidedAt: z.string().nullable().default(null),
  decidedBy: z.string().nullable().default(null),
  rejectionReason: z.string().nullable().default(null)
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

export const ApprovalDecisionSchema = z.object({
  requestId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
  token: z.string().optional(),
  reason: z.string().optional(),
  user: z.string().default('operator@sentinelops.local')
});
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;
