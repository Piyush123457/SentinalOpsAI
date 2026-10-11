import Groq from 'groq-sdk';
import { TaskRecord, TaskSpec } from '@sentinelops/shared';
import { getGroqConfig, isGroqConfigured } from './model-config.js';
import {
  SYSTEM_SRE_PROMPT,
  buildIntentPrompt,
  buildPlanPrompt,
  buildReportPrompt
} from './prompts.js';
import {
  IntentOutput,
  IntentOutputSchema,
  PlanOutput,
  PlanOutputSchema,
  ReportOutput,
  ReportOutputSchema
} from './structured-output.js';
import { demoPlanner } from './demo-planner.js';

export class GroqAdapter {
  private groqClient: Groq | null = null;
  private config = getGroqConfig();

  constructor() {
    if (this.config.apiKey && this.config.apiKey.length > 5) {
      try {
        this.groqClient = new Groq({ apiKey: this.config.apiKey });
      } catch (err: any) {
        console.warn(`[GROQ] Failed to initialize Groq client: ${err.message}. Defaulting to Demo Planner.`);
      }
    }
  }

  public getExecutionMode(): 'demo' | 'llm' {
    return this.groqClient && this.config.executionMode === 'llm' ? 'llm' : 'demo';
  }

  public getModelName(): string {
    return this.config.model;
  }

  private cleanJson(raw: string): string {
    return raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  private async callGroqWithRetry(systemPrompt: string, userPrompt: string, maxRetries = 2): Promise<string> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }

    let lastError: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.groqClient.chat.completions.create({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('Empty response from Groq');
        return content;
      } catch (err: any) {
        lastError = err;
        console.warn(`[GROQ] Attempt ${attempt + 1} failed: ${err.message}`);
        // Backoff if rate limited
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  }

  public async interpretIntent(userPrompt: string): Promise<IntentOutput> {
    if (this.getExecutionMode() === 'demo') {
      return demoPlanner.interpretIntent(userPrompt);
    }

    try {
      const raw = await this.callGroqWithRetry(SYSTEM_SRE_PROMPT, buildIntentPrompt(userPrompt));
      const parsed = JSON.parse(this.cleanJson(raw));
      return IntentOutputSchema.parse(parsed);
    } catch (err: any) {
      console.warn(`[GROQ] Failed LLM intent parsing (${err.message}). Falling back to deterministic planner.`);
      return demoPlanner.interpretIntent(userPrompt);
    }
  }

  public async generatePlan(params: {
    spec: TaskSpec;
    scenarioId?: string;
    runbooks: string[];
    initialHealth: any;
  }): Promise<PlanOutput> {
    if (this.getExecutionMode() === 'demo') {
      return demoPlanner.generatePlan({
        spec: params.spec,
        scenarioId: params.scenarioId
      });
    }

    try {
      const prompt = buildPlanPrompt({
        objective: params.spec.objective,
        affectedService: params.spec.affectedService,
        runbooks: params.runbooks,
        initialHealth: params.initialHealth
      });
      const raw = await this.callGroqWithRetry(SYSTEM_SRE_PROMPT, prompt);
      const parsed = JSON.parse(this.cleanJson(raw));
      return PlanOutputSchema.parse(parsed);
    } catch (err: any) {
      console.warn(`[GROQ] Failed LLM plan generation (${err.message}). Falling back to deterministic planner.`);
      return demoPlanner.generatePlan({
        spec: params.spec,
        scenarioId: params.scenarioId
      });
    }
  }

  public async generateReport(params: {
    task: TaskRecord;
    timeline: any[];
    beforeMetrics: any;
    afterMetrics: any;
    verificationPassed: boolean;
  }): Promise<ReportOutput> {
    if (this.getExecutionMode() === 'demo') {
      return demoPlanner.generateReport(params);
    }

    try {
      const prompt = buildReportPrompt({
        objective: params.task.spec.objective,
        timeline: params.timeline,
        beforeMetrics: params.beforeMetrics,
        afterMetrics: params.afterMetrics,
        verificationPassed: params.verificationPassed
      });
      const raw = await this.callGroqWithRetry(SYSTEM_SRE_PROMPT, prompt);
      const parsed = JSON.parse(this.cleanJson(raw));
      return ReportOutputSchema.parse(parsed);
    } catch (err: any) {
      console.warn(`[GROQ] Failed LLM report generation (${err.message}). Falling back to deterministic planner.`);
      return demoPlanner.generateReport(params);
    }
  }
}

export const groqAdapter = new GroqAdapter();
