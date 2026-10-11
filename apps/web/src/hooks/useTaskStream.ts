'use client';

import { useEffect, useState, useRef } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useTaskStream(taskId: string | null, onTaskUpdated?: () => void) {
  const [events, setEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) {
      setEvents([]);
      return;
    }

    setEvents([]);
    const url = `${API_BASE}/api/v1/tasks/${taskId}/events/stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setEvents((prev) => {
          if (prev.some((p) => p.id === data.id)) return prev;
          return [...prev, data];
        });

        if (
          data.type === 'STATE_TRANSITION' ||
          data.type === 'APPROVAL_REQUESTED' ||
          data.type === 'TASK_COMPLETED' ||
          data.type === 'TASK_FAILED' ||
          data.type === 'REPORT_GENERATED'
        ) {
          onTaskUpdated?.();
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event payload:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [taskId]);

  return { events, isConnected };
}
