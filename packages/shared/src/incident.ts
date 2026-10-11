import { z } from 'zod';

export const IncidentSeveritySchema = z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']);
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;

export const IncidentStatusSchema = z.enum([
  'TRIGGERED',
  'INVESTIGATING',
  'IDENTIFIED',
  'MITIGATING',
  'RESOLVED',
  'CLOSED'
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  service: z.string(),
  severity: IncidentSeveritySchema,
  status: IncidentStatusSchema,
  summary: z.string(),
  rootCause: z.string().nullable().default(null),
  impact: z.string().optional(),
  startedAt: z.string(),
  resolvedAt: z.string().nullable().default(null),
  mitigationAction: z.string().nullable().default(null)
});

export type IncidentRecord = z.infer<typeof IncidentRecordSchema>;
