import crypto from 'node:crypto';
import {
  EvidenceItem,
  IncidentReport,
  Plan,
  PlanStep,
  TaskRecord,
  TaskSpec,
  TaskStatus
} from '@sentinelops/shared';
import { getDatabase } from './db.js';

export class IncidentStore {
  // Tasks
  public createTask(params: {
    id?: string;
    title: string;
    userPrompt: string;
    status?: TaskStatus;
    spec: TaskSpec;
    executionMode: 'demo' | 'llm';
    modelName?: string;
    maxSteps?: number;
  }): TaskRecord {
    const db = getDatabase();
    const id = params.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const status: TaskStatus = params.status || 'CREATED';
    const maxSteps = params.maxSteps || 20;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, title, user_prompt, status, spec_json, execution_mode,
        model_name, current_step, max_steps, created_at, updated_at, completed_at, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, NULL)
    `);

    stmt.run(
      id,
      params.title,
      params.userPrompt,
      status,
      JSON.stringify(params.spec),
      params.executionMode,
      params.modelName || null,
      maxSteps,
      now,
      now
    );

    return {
      id,
      title: params.title,
      userPrompt: params.userPrompt,
      status,
      spec: params.spec,
      executionMode: params.executionMode,
      modelName: params.modelName,
      currentStep: 0,
      maxSteps,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      error: null
    };
  }

  public getTask(id: string): TaskRecord | null {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM tasks WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      userPrompt: row.user_prompt,
      status: row.status as TaskStatus,
      spec: JSON.parse(row.spec_json),
      executionMode: row.execution_mode as 'demo' | 'llm',
      modelName: row.model_name || undefined,
      currentStep: row.current_step,
      maxSteps: row.max_steps,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      error: row.error
    };
  }

  public listTasks(limit = 50): TaskRecord[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`);
    const rows = stmt.all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      userPrompt: row.user_prompt,
      status: row.status as TaskStatus,
      spec: JSON.parse(row.spec_json),
      executionMode: row.execution_mode as 'demo' | 'llm',
      modelName: row.model_name || undefined,
      currentStep: row.current_step,
      maxSteps: row.max_steps,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      error: row.error
    }));
  }

  public updateTaskStatus(
    id: string,
    status: TaskStatus,
    extra?: { currentStep?: number; error?: string | null; completed?: boolean }
  ): void {
    const db = getDatabase();
    const now = new Date().toISOString();
    const task = this.getTask(id);
    if (!task) return;

    const currentStep = extra?.currentStep !== undefined ? extra.currentStep : task.currentStep;
    const error = extra?.error !== undefined ? extra.error : task.error;
    const completedAt = extra?.completed ? now : task.completedAt;

    const stmt = db.prepare(`
      UPDATE tasks
      SET status = ?, current_step = ?, error = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `);

    stmt.run(status, currentStep, error, now, completedAt, id);
  }

  // Plans
  public savePlan(plan: Plan): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO plans (id, task_id, version, objective, steps_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        objective = excluded.objective,
        steps_json = excluded.steps_json,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      plan.id,
      plan.taskId,
      plan.version,
      plan.objective,
      JSON.stringify(plan.steps),
      plan.createdAt,
      plan.updatedAt
    );
  }

  public getPlan(taskId: string): Plan | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM plans
      WHERE task_id = ?
      ORDER BY version DESC
      LIMIT 1
    `);

    const row = stmt.get(taskId) as any;
    if (!row) return null;

    return {
      id: row.id,
      taskId: row.task_id,
      version: row.version,
      objective: row.objective,
      steps: JSON.parse(row.steps_json) as PlanStep[],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Evidence
  public addEvidence(item: EvidenceItem): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO evidence (id, task_id, type, source, title, description, data_json, verified, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.taskId,
      item.type,
      item.source,
      item.title,
      item.description || null,
      JSON.stringify(item.data),
      item.verified ? 1 : 0,
      item.timestamp
    );
  }

  public getEvidence(taskId: string): EvidenceItem[] {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM evidence WHERE task_id = ? ORDER BY timestamp ASC`);
    const rows = stmt.all(taskId) as any[];

    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      type: r.type,
      source: r.source,
      title: r.title,
      description: r.description || undefined,
      data: JSON.parse(r.data_json),
      verified: Boolean(r.verified),
      timestamp: r.timestamp
    }));
  }

  // Reports
  public saveReport(report: IncidentReport): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO reports (id, task_id, incident_id, report_json, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET report_json = excluded.report_json
    `);

    stmt.run(
      report.id,
      report.taskId,
      report.incidentId || null,
      JSON.stringify(report),
      report.generatedAt
    );
  }

  public getReport(taskId: string): IncidentReport | null {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM reports WHERE task_id = ? LIMIT 1`);
    const row = stmt.get(taskId) as any;
    if (!row) return null;
    return JSON.parse(row.report_json);
  }
}

export const incidentStore = new IncidentStore();
