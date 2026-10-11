import { RiskLevel } from '@sentinelops/shared';

export const TOOL_RISK_MAP: Record<string, RiskLevel> = {
  // Read-only diagnostics
  get_service_health: 'READ_ONLY',
  get_queue_metrics: 'READ_ONLY',
  search_service_logs: 'READ_ONLY',
  get_recent_deployments: 'READ_ONLY',
  read_runbook: 'READ_ONLY',
  inspect_worker_state: 'READ_ONLY',
  run_health_check: 'READ_ONLY',
  inspect_processing_counters: 'READ_ONLY',
  read_incident_state: 'READ_ONLY',
  capture_console_evidence: 'READ_ONLY',

  // Safe automatic remediation
  enable_simulated_worker: 'LOW_RISK_REMEDIATION',

  // Restricted remediation (Requires Human Approval)
  disable_simulated_worker: 'RESTRICTED_REMEDIATION',
  restart_simulated_worker: 'RESTRICTED_REMEDIATION',
  scale_worker_pool: 'RESTRICTED_REMEDIATION',
  rollback_deployment: 'RESTRICTED_REMEDIATION',

  // Forbidden
  purge_queue: 'FORBIDDEN',
  drop_database_tables: 'FORBIDDEN',
  execute_arbitrary_shell: 'FORBIDDEN'
};

export function getToolRiskLevel(toolName: string): RiskLevel {
  return TOOL_RISK_MAP[toolName] || 'RESTRICTED_REMEDIATION';
}
