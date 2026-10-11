import { z } from 'zod';

export const EvidenceTypeSchema = z.enum([
  'HEALTH_CHECK',
  'LOG_ENTRY',
  'QUEUE_METRIC',
  'COUNTER_SNAPSHOT',
  'RUNBOOK_EXCERPT',
  'DEPLOYMENT_RECORD',
  'SCREENSHOT',
  'WORKER_STATUS'
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceItemSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  type: EvidenceTypeSchema,
  source: z.string(),
  title: z.string(),
  description: z.string().optional(),
  data: z.any(),
  verified: z.boolean().default(true),
  timestamp: z.string()
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const VerificationCriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  targetMetric: z.string(),
  expectedValue: z.string(),
  observedValue: z.string().nullable().default(null),
  status: z.enum(['PASSED', 'FAILED', 'PENDING']),
  evidenceId: z.string().nullable().default(null)
});
export type VerificationCriterion = z.infer<typeof VerificationCriterionSchema>;

export const VerificationResultSchema = z.object({
  taskId: z.string(),
  passed: z.boolean(),
  criteria: z.array(VerificationCriterionSchema),
  summary: z.string(),
  beforeState: z.record(z.any()),
  afterState: z.record(z.any()),
  verifiedAt: z.string()
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const IncidentReportSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  incidentId: z.string().optional(),
  title: z.string(),
  executiveSummary: z.string(),
  rootCause: z.string(),
  impactSummary: z.string(),
  timeline: z.array(
    z.object({
      timestamp: z.string(),
      event: z.string(),
      details: z.string().optional()
    })
  ),
  actionsTaken: z.array(
    z.object({
      step: z.number(),
      action: z.string(),
      outcome: z.string(),
      verification: z.string()
    })
  ),
  beforeMetrics: z.record(z.any()),
  afterMetrics: z.record(z.any()),
  verificationStatus: z.enum(['FULLY_VERIFIED', 'PARTIALLY_VERIFIED', 'FAILED']),
  runbooksConsulted: z.array(z.string()),
  postMortemRecommendations: z.array(z.string()),
  generatedAt: z.string()
});
export type IncidentReport = z.infer<typeof IncidentReportSchema>;
