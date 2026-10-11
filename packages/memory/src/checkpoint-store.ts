import crypto from 'node:crypto';
import { Checkpoint } from '@sentinelops/shared';
import { getDatabase } from './db.js';

export class CheckpointStore {
  public saveCheckpoint(params: {
    taskId: string;
    stepNumber: number;
    state: string;
    planVersion: number;
    variables: Record<string, any>;
  }): Checkpoint {
    const db = getDatabase();
    const id = `chk_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO checkpoints (id, task_id, step_number, state, plan_version, variables_json, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      params.taskId,
      params.stepNumber,
      params.state,
      params.planVersion,
      JSON.stringify(params.variables),
      timestamp
    );

    return {
      id,
      taskId: params.taskId,
      stepNumber: params.stepNumber,
      state: params.state,
      planVersion: params.planVersion,
      variables: params.variables,
      timestamp
    };
  }

  public getLatestCheckpoint(taskId: string): Checkpoint | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM checkpoints
      WHERE task_id = ?
      ORDER BY step_number DESC, timestamp DESC
      LIMIT 1
    `);

    const row = stmt.get(taskId) as any;
    if (!row) return null;

    return {
      id: row.id,
      taskId: row.task_id,
      stepNumber: row.step_number,
      state: row.state,
      planVersion: row.plan_version,
      variables: JSON.parse(row.variables_json),
      timestamp: row.timestamp
    };
  }

  public listCheckpoints(taskId: string): Checkpoint[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM checkpoints
      WHERE task_id = ?
      ORDER BY step_number ASC, timestamp ASC
    `);

    const rows = stmt.all(taskId) as any[];
    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      stepNumber: row.step_number,
      state: row.state,
      planVersion: row.plan_version,
      variables: JSON.parse(row.variables_json),
      timestamp: row.timestamp
    }));
  }
}

export const checkpointStore = new CheckpointStore();
