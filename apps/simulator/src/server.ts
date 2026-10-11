import express, { type Express } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulatorState } from './state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');

const app: Express = express();
const PORT = process.env.SIMULATOR_PORT ? parseInt(process.env.SIMULATOR_PORT, 10) : 5001;

app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // only log non-health endpoints or errors to reduce noise
    if (!req.url.startsWith('/health') || res.statusCode >= 400) {
      console.log(`[SIMULATOR] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// 1. Service Health Endpoints
app.get('/health', (req, res) => {
  if (simulatorState.simulateTimeout) {
    // Delay response to simulate timeout
    setTimeout(() => {
      res.json(simulatorState.getHealthSummary());
    }, 4000);
    return;
  }

  const health = simulatorState.getHealthSummary();
  res.status(health.status === 'HEALTHY' ? 200 : 200).json(health);
});

app.get('/health/detailed', (req, res) => {
  res.json({
    ...simulatorState.getHealthSummary(),
    uptimeSeconds: process.uptime(),
    memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    workerActive: simulatorState.workerRunning,
    pendingJobs: simulatorState.pendingQueue.length,
    scenario: simulatorState.scenarioId
  });
});

// 2. Worker Status & Remediation Controls
app.get('/api/worker/status', (req, res) => {
  res.json({
    service: 'order-processing-service',
    workerName: 'order-consumer-worker-1',
    status: simulatorState.workerRunning ? 'RUNNING' : 'STOPPED',
    running: simulatorState.workerRunning,
    pid: simulatorState.workerRunning ? simulatorState.workerPid : null,
    threads: simulatorState.workerThreads,
    restarts: simulatorState.workerRestarts,
    lastStartedAt: simulatorState.lastStartedAt,
    lastStoppedAt: simulatorState.lastStoppedAt
  });
});

app.post('/api/worker/enable', (req, res) => {
  const result = simulatorState.enableWorker();
  if (!result.success) {
    return res.status(409).json({
      success: false,
      error: result.message,
      status: 'STOPPED'
    });
  }
  res.json({
    success: true,
    message: result.message,
    workerPid: simulatorState.workerPid,
    status: 'RUNNING'
  });
});

app.post('/api/worker/disable', (req, res) => {
  const result = simulatorState.disableWorker();
  res.json(result);
});

app.post('/api/worker/restart', (req, res) => {
  const result = simulatorState.restartWorker();
  res.json(result);
});

// 3. Queue Metrics & Counters
app.get('/api/queue/metrics', (req, res) => {
  res.json(simulatorState.getQueueMetrics());
});

app.get('/api/counters', (req, res) => {
  res.json(simulatorState.getCounters());
});

// 4. Logs Search
app.get('/api/logs', (req, res) => {
  const { service, level, query, limit = '50' } = req.query;
  let filtered = [...simulatorState.logs];

  if (service) {
    filtered = filtered.filter((l) => l.service === String(service));
  }
  if (level) {
    filtered = filtered.filter((l) => l.level === String(level).toUpperCase());
  }
  if (query) {
    const q = String(query).toLowerCase();
    filtered = filtered.filter((l) => l.message.toLowerCase().includes(q));
  }

  const maxItems = parseInt(String(limit), 10);
  res.json({
    total: filtered.length,
    service: service || 'all',
    logs: filtered.slice(0, maxItems)
  });
});

// 5. Deployments
app.get('/api/deployments', (req, res) => {
  res.json({
    service: 'order-processing-service',
    deployments: simulatorState.deployments
  });
});

// 6. Runbooks
app.get('/api/runbooks', (req, res) => {
  try {
    const runbooksDir = path.join(DATA_DIR, 'runbooks');
    if (!fs.existsSync(runbooksDir)) {
      return res.json({ runbooks: [] });
    }
    const files = fs.readdirSync(runbooksDir).filter((f) => f.endsWith('.md'));
    const list = files.map((file) => {
      const content = fs.readFileSync(path.join(runbooksDir, file), 'utf-8');
      const firstLine = content.split('\n')[0] || file;
      return {
        id: file.replace('.md', ''),
        filename: file,
        title: firstLine.replace(/^#\s*/, '').trim()
      };
    });
    res.json({ runbooks: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/runbooks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(DATA_DIR, 'runbooks', `${id}.md`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Runbook ${id} not found` });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({
      id,
      filePath,
      content
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Incident State & Remediation History
app.get('/api/incidents', (req, res) => {
  res.json({
    activeIncident: {
      id: 'INC-7029',
      service: 'order-processing-service',
      title: 'Order Processing Degradation: Queue Backlog Accumulation',
      severity: 'SEV2',
      status: simulatorState.workerRunning ? 'RESOLVED' : 'ACTIVE',
      detectedAt: simulatorState.lastStoppedAt,
      remediationHistory: simulatorState.remediationHistory
    }
  });
});

// 8. Active Diagnostic Probe
app.post('/api/health-check', (req, res) => {
  const health = simulatorState.getHealthSummary();
  const metrics = simulatorState.getQueueMetrics();
  const counters = simulatorState.getCounters();

  res.json({
    timestamp: new Date().toISOString(),
    overallStatus: health.status,
    probes: [
      { name: 'worker_process', status: simulatorState.workerRunning ? 'PASS' : 'FAIL', details: `Running: ${simulatorState.workerRunning}` },
      { name: 'queue_backpressure', status: metrics.pendingCount < 100 ? 'PASS' : 'WARN', details: `Pending jobs: ${metrics.pendingCount}` },
      { name: 'order_error_rate', status: counters.errorRatePercent < 5.0 ? 'PASS' : 'FAIL', details: `Error rate: ${counters.errorRatePercent}%` }
    ]
  });
});

// 9. Simulator Reset / Scenario Switcher
app.post('/api/simulator/reset', (req, res) => {
  const scenario = req.body?.scenario || 'scenario-a';
  simulatorState.resetToScenario(scenario);
  res.json({
    success: true,
    message: `Simulator successfully reset to scenario: ${scenario}`,
    state: {
      scenario: simulatorState.scenarioId,
      workerRunning: simulatorState.workerRunning,
      pendingOrders: simulatorState.pendingQueue.length,
      processedOrders: simulatorState.processedCount
    }
  });
});

// 10. Incident Console (HTML View for Playwright browser inspection and screenshots)
app.get('/console', (req, res) => {
  const health = simulatorState.getHealthSummary();
  const queue = simulatorState.getQueueMetrics();
  const counters = simulatorState.getCounters();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SentinelOps - Service Console</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 16px; }
    .badge { padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 14px; text-transform: uppercase; }
    .badge-healthy { background: #065f46; color: #34d399; }
    .badge-degraded { background: #831843; color: #f472b6; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }
    .metric-value { font-size: 32px; font-weight: bold; margin-top: 8px; color: #38bdf8; }
    .logs-box { background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; margin-top: 24px; max-height: 250px; overflow-y: auto; }
    .log-line { margin-bottom: 6px; }
    .log-error { color: #f87171; }
    .log-warn { color: #fbbf24; }
    .log-info { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin: 0;">Order Processing Service — Operations Console</h1>
      <p style="margin: 4px 0 0; color: #94a3b8;">Cluster: us-east-prod-1 | Scenario: <span id="scenario-id">${simulatorState.scenarioId}</span></p>
    </div>
    <div id="service-health-badge" class="badge ${health.status === 'HEALTHY' ? 'badge-healthy' : 'badge-degraded'}">
      ${health.status}
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <div style="color: #94a3b8; font-size: 14px;">Worker Process Status</div>
      <div id="worker-status-text" class="metric-value" style="color: ${simulatorState.workerRunning ? '#34d399' : '#ef4444'};">
        ${simulatorState.workerRunning ? 'RUNNING' : 'STOPPED'}
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">PID: ${simulatorState.workerPid || 'N/A'} | Threads: ${simulatorState.workerThreads}</div>
    </div>
    <div class="card">
      <div style="color: #94a3b8; font-size: 14px;">Pending Queue Depth</div>
      <div id="queue-depth-metric" class="metric-value">${queue.pendingCount}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Target SLO: &lt; 50 orders</div>
    </div>
    <div class="card">
      <div style="color: #94a3b8; font-size: 14px;">Processed Orders</div>
      <div id="processed-count-metric" class="metric-value">${counters.processedCount}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Error rate: ${counters.errorRatePercent}%</div>
    </div>
  </div>

  <h3 style="margin-top: 24px; margin-bottom: 8px;">Real-Time Console Event Stream</h3>
  <div id="console-logs-container" class="logs-box">
    ${simulatorState.logs
      .map(
        (l) => `<div class="log-line ${l.level === 'ERROR' ? 'log-error' : l.level === 'WARN' ? 'log-warn' : 'log-info'}">
          [${l.timestamp}] [${l.level}] ${l.message}
        </div>`
      )
      .join('')}
  </div>
</body>
</html>`;

  res.send(html);
});

// Start Server
export const server = app.listen(PORT, () => {
  console.log(`[SIMULATOR] Service Simulator running on http://localhost:${PORT}`);
  console.log(`[SIMULATOR] Incident Console accessible at http://localhost:${PORT}/console`);
});

export default app;
