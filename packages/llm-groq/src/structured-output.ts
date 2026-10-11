import { z } from 'zod';
import { ActionProposalSchema, TaskSpecSchema } from '@sentinelops/shared';

export const IntentOutputSchema = TaskSpecSchema.extend({
  reasoning: z.string()
});
export type IntentOutput = z.infer<typeof IntentOutputSchema>;

export const PlanOutputSchema = z.object({
  reasoning: z.string(),
  steps: z.array(ActionProposalSchema)
});
export type PlanOutput = z.infer<typeof PlanOutputSchema>;

export const NextActionOutputSchema = z.object({
  reasoning: z.string(),
  isGoalAchieved: z.boolean(),
  verificationNeeded: z.boolean(),
  nextAction: ActionProposalSchema.nullable().default(null)
});
export type NextActionOutput = z.infer<typeof NextActionOutputSchema>;

export const ReportOutputSchema = z.object({
  executiveSummary: z.string(),
  rootCause: z.string(),
  impactSummary: z.string(),
  recommendations: z.array(z.string())
});
export type ReportOutput = z.infer<typeof ReportOutputSchema>;
