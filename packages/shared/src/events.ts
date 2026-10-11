import { z } from 'zod';

export const AgentEventTypeSchema = z.enum([
  'TASK_CREATED',
  'STATE_TRANSITION',
  'INTENT_INTERPRETED',
  'RUNBOOK_RETRIEVED',
  'PLAN_GENERATED',
  'TOOL_CALL_STARTED',
  'TOOL_CALL_COMPLETED',
  'TOOL_CALL_FAILED',
  'APPROVAL_REQUESTED',
  'APPROVAL_DECIDED',
  'RECOVERY_TRIGGERED',
  'VERIFICATION_STARTED',
  'VERIFICATION_COMPLETED',
  'REPORT_GENERATED',
  'CHECKPOINT_SAVED',
  'TASK_COMPLETED',
  'TASK_FAILED',
  'TASK_CANCELLED'
]);
export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentEventSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  sequence: z.number().int().nonnegative(),
  type: AgentEventTypeSchema,
  message: z.string(),
  payload: z.record(z.any()).default({}),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'SUCCESS']).default('INFO'),
  timestamp: z.string()
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const CheckpointSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  stepNumber: z.number(),
  state: z.string(),
  planVersion: z.number(),
  variables: z.record(z.any()),
  timestamp: z.string()
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;
