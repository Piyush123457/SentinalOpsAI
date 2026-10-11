const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const SIMULATOR_BASE = process.env.NEXT_PUBLIC_SIMULATOR_URL || 'http://localhost:5001';

export async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API error (${res.status}): ${errorBody || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchTasks() {
  return apiRequest<{ tasks: any[] }>('/api/v1/tasks');
}

export async function fetchTask(id: string) {
  return apiRequest<{ task: any; plan: any; pendingApprovals: any[]; hasReport: boolean }>(`/api/v1/tasks/${id}`);
}

export async function createTask(prompt: string, scenarioId?: string, executionMode = 'demo') {
  return apiRequest<{ success: boolean; task: any }>('/api/v1/tasks', {
    method: 'POST',
    body: JSON.stringify({ prompt, scenarioId, executionMode })
  });
}

export async function triggerScenario(id: string, executionMode = 'demo', prompt?: string) {
  return apiRequest<{ success: boolean; task: any }>(`/api/v1/scenarios/${id}/trigger`, {
    method: 'POST',
    body: JSON.stringify({ executionMode, prompt })
  });
}

export async function fetchEvidence(taskId: string) {
  return apiRequest<{ evidence: any[] }>(`/api/v1/tasks/${taskId}/evidence`);
}

export async function fetchReport(taskId: string) {
  return apiRequest<{ report: any }>(`/api/v1/tasks/${taskId}/report`);
}

export async function approveAction(taskId: string, requestId?: string, user?: string) {
  return apiRequest<{ success: boolean; approval: any }>(`/api/v1/tasks/${taskId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ requestId, user })
  });
}

export async function rejectAction(taskId: string, requestId?: string, reason?: string) {
  return apiRequest<{ success: boolean; approval: any }>(`/api/v1/tasks/${taskId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ requestId, reason })
  });
}

export async function cancelTask(taskId: string) {
  return apiRequest<{ success: boolean }>(`/api/v1/tasks/${taskId}/cancel`, {
    method: 'POST'
  });
}

export async function fetchConfig() {
  return apiRequest<any>('/api/v1/config');
}

export async function fetchTools() {
  return apiRequest<{ tools: any[] }>('/api/v1/tools');
}

export async function fetchScenarios() {
  return apiRequest<{ scenarios: any[] }>('/api/v1/scenarios');
}

export async function fetchSimulatorHealth() {
  try {
    const res = await fetch(`${SIMULATOR_BASE}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'UNAVAILABLE', error: 'Simulator unreachable' };
  }
}
