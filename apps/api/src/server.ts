import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Auto-load root .env
try {
  const rootEnv = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(rootEnv) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(rootEnv);
  }
} catch (_) {}

import {
  agentOrchestrator
} from '@sentinelops/agent-core';
import {
  approvalService
} from '@sentinelops/policy';
import {
  checkpointStore,
  eventStore,
  incidentStore
} from '@sentinelops/memory';
import {
  toolRegistry
} from '@sentinelops/tools';
import {
  groqAdapter,
  isGroqConfigured
} from '@sentinelops/llm-groq';
import { sseBroadcaster } from './sse/broadcaster.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_FILE = path.resolve(__dirname, '../../../data/incident-fixtures/scenarios.json');
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:5001';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.use(cors());
app.use(express.json());

// Subscribe SSE broadcaster to orchestrator events
agentOrchestrator.addEventListener((event) => {
  sseBroadcaster.broadcast(event);
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.url.includes('/events/stream')) {
      console.log(`[API] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// 1. Health & Config
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'sentinelops-agent-api',
    timestamp: new Date().toISOString(),
    executionMode: groqAdapter.getExecutionMode(),
    groqConfigured: isGroqConfigured(),
    model: groqAdapter.getModelName()
  });
});

app.get('/api/v1/config', (req, res) => {
  res.json({
    executionMode: groqAdapter.getExecutionMode(),
    modelName: groqAdapter.getModelName(),
    groqConfigured: isGroqConfigured(),
    registeredToolsCount: toolRegistry.list().length,
    simulatorUrl: SIMULATOR_URL
  });
});

// 2. Tools
app.get('/api/v1/tools', (req, res) => {
  const tools = toolRegistry.list().map((t) => ({
    name: t.name,
    description: t.description,
    riskLevel: t.riskClassification,
    requiredPermission: t.requiredPermission,
    timeoutMs: t.timeoutMs
  }));
  res.json({ tools });
});

// 3. Scenarios
app.get('/api/v1/scenarios', (req, res) => {
  try {
    if (fs.existsSync(FIXTURES_FILE)) {
      const data = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf-8'));
      return res.json(data);
    }
  } catch (err) {
    console.warn('[API] Could not load scenarios fixture:', err);
  }
  res.json({ scenarios: [] });
});

// 4. Tasks Endpoints
app.get('/api/v1/tasks', (req, res) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const tasks = incidentStore.listTasks(limit);
  res.json({ tasks });
});

app.post('/api/v1/tasks', async (req, res) => {
  const { prompt, scenarioId, executionMode } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: "Missing required string field 'prompt'." });
  }

  const scenario = scenarioId || 'scenario-a';

  // Reset simulator to target scenario to seed active incident state
  try {
    await fetch(`${SIMULATOR_URL}/api/simulator/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
  } catch (err) {
    console.warn('[API] Could not reset simulator:', err);
  }

  const mode = executionMode === 'llm' && isGroqConfigured() ? 'llm' : 'demo';

  // Resolve full, complete task title
  let taskTitle = prompt;
  if (fs.existsSync(FIXTURES_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf-8'));
      const sc = data.scenarios?.find((s: any) => s.id === scenario);
      if (sc?.name) {
        taskTitle = sc.name;
      }
    } catch (_) {}
  }
  if (!taskTitle || taskTitle === prompt) {
    taskTitle = prompt.length > 120 ? `${prompt.slice(0, 117).trim()}...` : prompt;
  }

  const task = incidentStore.createTask({
    title: taskTitle,
    userPrompt: prompt,
    spec: {
      objective: prompt,
      affectedService: 'order-processing-service',
      constraints: ['Verify independent read-only health and queue metrics'],
      successCriteria: ['Worker running', 'Service healthy', 'Queue draining'],
      scenario
    },
    executionMode: mode,
    modelName: mode === 'llm' ? groqAdapter.getModelName() : 'deterministic-demo'
  });

  // Record creation event
  eventStore.appendEvent({
    taskId: task.id,
    type: 'TASK_CREATED',
    message: `Task created: "${task.userPrompt.slice(0, 100)}"`,
    payload: { taskId: task.id, executionMode: mode }
  });

  // Launch execution asynchronously
  setImmediate(async () => {
    try {
      await agentOrchestrator.runTask(task.id);
    } catch (err: any) {
      console.error(`[API] Background task run failed for ${task.id}:`, err);
    }
  });

  res.status(201).json({
    success: true,
    task
  });
});

app.get('/api/v1/tasks/:id', (req, res) => {
  const { id } = req.params;
  const task = incidentStore.getTask(id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found.` });
  }

  const plan = incidentStore.getPlan(id);
  const pendingApprovals = approvalService.getPendingForTask(id);
  const report = incidentStore.getReport(id);

  res.json({
    task,
    plan,
    pendingApprovals,
    hasReport: Boolean(report)
  });
});

app.get('/api/v1/tasks/:id/events', (req, res) => {
  const { id } = req.params;
  const since = req.query.since ? parseInt(String(req.query.since), 10) : 0;
  const events = eventStore.getEvents(id, since);
  res.json({ events });
});

// SSE Stream
app.get('/api/v1/tasks/:id/events/stream', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const task = incidentStore.getTask(id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found.` });
  }

  sseBroadcaster.addClient(id, res);
});

app.get('/api/v1/tasks/:id/evidence', (req, res) => {
  const { id } = req.params;
  const evidence = incidentStore.getEvidence(id);
  res.json({ evidence });
});

app.get('/api/v1/tasks/:id/report', (req, res) => {
  const { id } = req.params;
  const report = incidentStore.getReport(id);
  if (!report) {
    return res.status(404).json({ error: `Report for task ${id} not yet generated.` });
  }
  res.json({ report });
});

// 5. Approvals Endpoints
app.get('/api/v1/approvals', (req, res) => {
  const taskId = req.query.taskId ? String(req.query.taskId) : undefined;
  if (taskId) {
    return res.json({ approvals: approvalService.getPendingForTask(taskId) });
  }
  res.json({ approvals: [] });
});

app.post('/api/v1/tasks/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { requestId, user } = req.body;

  try {
    const pending = approvalService.getPendingForTask(id);
    const target = requestId ? pending.find((p) => p.id === requestId) : pending[0];

    if (!target) {
      return res.status(404).json({ error: 'No pending approval request found for task.' });
    }

    const approved = approvalService.approve(target.id, user || 'operator@sentinelops.local');

    // Resume execution with the approved token
    setImmediate(async () => {
      try {
        await agentOrchestrator.runTask(id, approved.token);
      } catch (err) {
        console.error(`[API] Resume execution error after approval for task ${id}:`, err);
      }
    });

    res.json({
      success: true,
      message: `Operation '${target.toolName}' approved by ${approved.decidedBy}. Resuming orchestrator execution.`,
      approval: approved
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/tasks/:id/reject', (req, res) => {
  const { id } = req.params;
  const { requestId, reason, user } = req.body;

  try {
    const pending = approvalService.getPendingForTask(id);
    const target = requestId ? pending.find((p) => p.id === requestId) : pending[0];

    if (!target) {
      return res.status(404).json({ error: 'No pending approval request found for task.' });
    }

    const rejected = approvalService.reject(
      target.id,
      reason || 'Operator rejected execution',
      user || 'operator@sentinelops.local'
    );

    incidentStore.updateTaskStatus(id, 'FAILED', {
      error: `Operator rejected protected action '${target.toolName}': ${rejected.rejectionReason}`
    });

    eventStore.appendEvent({
      taskId: id,
      type: 'APPROVAL_DECIDED',
      message: `Operator rejected protected action '${target.toolName}'`,
      payload: { reason: rejected.rejectionReason, decidedBy: rejected.decidedBy },
      level: 'ERROR'
    });

    res.json({
      success: true,
      message: `Operation '${target.toolName}' rejected. Task marked as failed/escalated.`,
      approval: rejected
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/v1/tasks/:id/cancel', (req, res) => {
  const { id } = req.params;
  const task = incidentStore.getTask(id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found.` });
  }

  incidentStore.updateTaskStatus(id, 'CANCELLED', { error: 'Task cancelled by user.' });
  eventStore.appendEvent({
    taskId: id,
    type: 'TASK_CANCELLED',
    message: 'Task cancelled by user request.',
    level: 'WARN'
  });

  res.json({ success: true, message: `Task ${id} cancelled.` });
});

// 6. Trigger Scenario Convenience Endpoint
app.post('/api/v1/scenarios/:id/trigger', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Reset simulator to this scenario
    await fetch(`${SIMULATOR_URL}/api/simulator/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: id })
    });

    // 2. Load scenario metadata
    let prompt = req.body?.prompt || 'The order processing service is failing. Investigate and resolve the issue.';
    let scenarioName = `Scenario ${id.toUpperCase()}`;
    if (fs.existsSync(FIXTURES_FILE)) {
      const data = JSON.parse(fs.readFileSync(FIXTURES_FILE, 'utf-8'));
      const sc = data.scenarios?.find((s: any) => s.id === id);
      if (sc?.name) scenarioName = sc.name;
      if (!req.body?.prompt && sc?.prompt) prompt = sc.prompt;
    }

    // 3. Create task with complete title
    const task = incidentStore.createTask({
      title: scenarioName,
      userPrompt: prompt,
      spec: {
        objective: prompt,
        affectedService: 'order-processing-service',
        constraints: ['Verify independent read-only health and queue metrics'],
        successCriteria: ['Worker running', 'Service healthy', 'Queue draining'],
        scenario: id
      },
      executionMode: req.body?.executionMode === 'llm' && isGroqConfigured() ? 'llm' : 'demo',
      modelName: isGroqConfigured() ? groqAdapter.getModelName() : 'deterministic-demo'
    });

    // 4. Launch task
    setImmediate(async () => {
      try {
        await agentOrchestrator.runTask(task.id);
      } catch (err) {
        console.error(`[API] Scenario execution error for task ${task.id}:`, err);
      }
    });

    res.status(201).json({
      success: true,
      message: `Scenario '${id}' seeded and launched.`,
      task
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
export const server = app.listen(PORT, () => {
  console.log(`[API] SentinelOps API server listening on http://localhost:${PORT}`);
  console.log(`[API] Execution mode: ${groqAdapter.getExecutionMode()} | Groq configured: ${isGroqConfigured()}`);
});

export default app;
