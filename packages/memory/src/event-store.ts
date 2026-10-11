import crypto from 'node:crypto';
import { AgentEvent, AgentEventType } from '@sentinelops/shared';
import { getDatabase } from './db.js';

export class EventStore {
  public appendEvent(params: {
    taskId: string;
    type: AgentEventType;
    message: string;
    payload?: Record<string, any>;
    level?: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  }): AgentEvent {
    const db = getDatabase();
    const id = `evt_${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const level = params.level || 'INFO';
    const payload = params.payload || {};

    // Get current max sequence for task
    const seqStmt = db.prepare(`SELECT COALESCE(MAX(sequence), 0) + 1 AS nextSeq FROM events WHERE task_id = ?`);
    const seqRow = seqStmt.get(params.taskId) as any;
    const sequence = seqRow?.nextSeq || 1;

    const insertStmt = db.prepare(`
      INSERT INTO events (id, task_id, sequence, type, message, payload_json, level, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      params.taskId,
      sequence,
      params.type,
      params.message,
      JSON.stringify(payload),
      level,
      timestamp
    );

    return {
      id,
      taskId: params.taskId,
      sequence,
      type: params.type,
      message: params.message,
      payload,
      level,
      timestamp
    };
  }

  public getEvents(taskId: string, sinceSequence = 0): AgentEvent[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM events
      WHERE task_id = ? AND sequence > ?
      ORDER BY sequence ASC
    `);

    const rows = stmt.all(taskId, sinceSequence) as any[];
    return rows.map((r) => ({
      id: r.id,
      taskId: r.task_id,
      sequence: r.sequence,
      type: r.type as AgentEventType,
      message: r.message,
      payload: JSON.parse(r.payload_json),
      level: r.level as 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS',
      timestamp: r.timestamp
    }));
  }
}

export const eventStore = new EventStore();
