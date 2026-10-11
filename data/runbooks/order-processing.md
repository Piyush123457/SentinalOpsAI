# Runbook: Order Processing Service Degradation (RB-ORD-001)

## Overview
The Order Processing Service manages asynchronous customer order consumption from the `order-queue`. 
When pending queue depth increases beyond 50 or processing rate drops to zero, investigate immediately.

## Diagnostic Procedures
1. **Check Service Health & Worker Status**:
   - Query `get_service_health` for `order-processing-service`.
   - Query `inspect_worker_state` to verify if `order-consumer-worker-1` is in `running` or `stopped` state.
2. **Inspect Queue Depth**:
   - Query `get_queue_metrics` to measure pending jobs, processing jobs, and queue age.
3. **Inspect Application Logs**:
   - Query `search_service_logs` filtering for `service: order-processing-service` with `severity: error`.
   - Check if logs indicate worker crash, shutdown signal, memory exhaustion, or downstream timeout.
4. **Review Deployments**:
   - Query `get_recent_deployments` to determine if a recent configuration change or bad commit was released.

## Remediation Actions
### Primary Remediation (Worker Disabled / Inactive)
- If `inspect_worker_state` indicates the worker is `disabled` or `stopped`:
  - Execute `enable_simulated_worker` with `service: "order-processing-service"`.
  - Risk classification: **LOW_RISK_REMEDIATION**.
  - Permitted automatic execution: **YES** (Standard remediation policy allows re-enabling stopped workers).

### Secondary Remediation (Worker Stuck or Unresponsive)
- If the worker is running but queue metrics are not progressing:
  - Execute `restart_simulated_worker`.
  - Risk classification: **RESTRICTED_REMEDIATION**.
  - Permitted automatic execution: **NO** (Requires Human Approval).

## Verification Criteria
After remediation:
1. Worker state must show `status: "running"`.
2. Service health endpoint must return `healthy` (`status: 200`).
3. Pending queue depth must decrease.
4. Processing counters must reflect increasing `processed_count`.
5. Error rate must drop below `1.0%`.
