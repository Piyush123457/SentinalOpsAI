# Runbook: Worker Recovery and Safe Restart Procedures (RB-WKR-002)

## Overview
This runbook guides safe recovery procedures for background consumer workers, worker pool autoscaling, and queue dead-letter routing.

## Safety & Approval Policies
- **Re-enabling a stopped worker**:
  - Safe operation. Allowed under standard policy without manual intervention if health probes pass.
- **Worker Process Restart**:
  - Requires human operator authorization (`RESTRICTED_REMEDIATION`).
  - Reason: Restarting an in-flight worker may abort active transaction chunks unless confirmed safe.
- **Queue Purge or Reset**:
  - **FORBIDDEN** for autonomous agents under all conditions. Must be escalated to Lead SRE.

## Escalation Matrix
- If worker fails to start after 2 attempts: Escalate to On-Call Engineer.
- If queue depth exceeds 10,000 orders: Raise Incident Severity to SEV1.
