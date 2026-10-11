# Runbook: Downstream Payment Gateway Timeout (RB-PAY-003)

## Overview
Deals with cascading backpressure from third-party payment partner timeouts causing order queue accumulation.

## Diagnostics
- Run `search_service_logs` with query `PAYMENT_TIMEOUT` or `HTTP 504 Gateway Timeout`.
- Check `payment-gateway-service` health.

## Mitigation
- Enable circuit-breaker fallback.
- Verify payment queue retry policy.
