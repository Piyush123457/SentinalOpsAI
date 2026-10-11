import { z } from 'zod';

export const TaskStatusSchema = z.enum([
  'CREATED',
  'UNDERSTANDING',
  'INVESTIGATING',
  'PLANNING',
  'AWAITING_APPROVAL',
  'EXECUTING',
  'OBSERVING',
  'RECOVERING',
  'VERIFYING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const LEGAL_STATE_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  CREATED: ['UNDERSTANDING', 'CANCELLED'],
  UNDERSTANDING: ['INVESTIGATING', 'PLANNING', 'FAILED', 'CANCELLED'],
  INVESTIGATING: ['PLANNING', 'RECOVERING', 'FAILED', 'CANCELLED'],
  PLANNING: ['AWAITING_APPROVAL', 'EXECUTING', 'FAILED', 'CANCELLED'],
  AWAITING_APPROVAL: ['EXECUTING', 'RECOVERING', 'FAILED', 'CANCELLED'],
  EXECUTING: ['OBSERVING', 'VERIFYING', 'AWAITING_APPROVAL', 'RECOVERING', 'FAILED', 'CANCELLED'],
  OBSERVING: ['PLANNING', 'EXECUTING', 'RECOVERING', 'VERIFYING', 'FAILED', 'CANCELLED'],
  RECOVERING: ['PLANNING', 'EXECUTING', 'OBSERVING', 'AWAITING_APPROVAL', 'FAILED', 'CANCELLED'],
  VERIFYING: ['COMPLETED', 'RECOVERING', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
};

export const TaskSpecSchema = z.object({
  objective: z.string().min(1),
  affectedService: z.string().default('order-processing-service'),
  constraints: z.array(z.string()).default([]),
  successCriteria: z.array(z.string()).default([]),
  scenario: z.string().optional()
});

export type TaskSpec = z.infer<typeof TaskSpecSchema>;

export const TaskRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  userPrompt: z.string(),
  status: TaskStatusSchema,
  spec: TaskSpecSchema,
  executionMode: z.enum(['demo', 'llm']),
  modelName: z.string().optional(),
  currentStep: z.number().int().nonnegative().default(0),
  maxSteps: z.number().int().positive().default(20),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable().default(null),
  error: z.string().nullable().default(null)
});

export type TaskRecord = z.infer<typeof TaskRecordSchema>;
