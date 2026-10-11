import { Response } from 'express';
import { AgentEvent } from '@sentinelops/shared';
import { eventStore } from '@sentinelops/memory';

class SseBroadcaster {
  private clients: Map<string, Set<Response>> = new Map();

  public addClient(taskId: string, res: Response): () => void {
    if (!this.clients.has(taskId)) {
      this.clients.set(taskId, new Set());
    }
    const set = this.clients.get(taskId)!;
    set.add(res);

    // Send headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Replay existing events for this task
    const historical = eventStore.getEvents(taskId);
    for (const evt of historical) {
      res.write(`data: ${JSON.stringify(evt)}\n\n`);
    }

    // Keepalive ping
    const ping = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    const cleanup = () => {
      clearInterval(ping);
      set.delete(res);
      if (set.size === 0) {
        this.clients.delete(taskId);
      }
    };

    res.on('close', cleanup);
    res.on('error', cleanup);

    return cleanup;
  }

  public broadcast(event: AgentEvent): void {
    const set = this.clients.get(event.taskId);
    if (!set) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of set) {
      try {
        client.write(payload);
      } catch (err) {
        console.error('[SSE] Failed to send event to client:', err);
      }
    }
  }
}

export const sseBroadcaster = new SseBroadcaster();
