export interface GroqConfig {
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  executionMode: 'demo' | 'llm';
}

export function getGroqConfig(): GroqConfig {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
  const executionMode = (process.env.EXECUTION_MODE === 'llm' && apiKey) ? 'llm' : 'demo';

  return {
    apiKey: apiKey || undefined,
    model,
    temperature: 0.1, // low temperature for deterministic structured reasoning
    maxTokens: 2048,
    timeoutMs: 15000,
    executionMode
  };
}

export function isGroqConfigured(): boolean {
  const config = getGroqConfig();
  return Boolean(config.apiKey && config.apiKey.length > 10);
}
