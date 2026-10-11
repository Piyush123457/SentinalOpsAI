import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: Record<string, any>;
}

export interface DeploymentRecord {
  id: string;
  service: string;
  version: string;
  commitSha: string;
  deployedBy: string;
  status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  timestamp: string;
  notes: string;
}

export interface JobItem {
  id: string;
  orderId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt?: string;
  retries: number;
}

export class SimulatorState {
  public scenarioId = 'scenario-a';
  public workerRunning = false;
  public workerPid = 41208;
  public workerThreads = 4;
  public workerRestarts = 0;
  public lastStartedAt: string | null = null;
  public lastStoppedAt: string = new Date(Date.now() - 3600000).toISOString();

  // Behavioral flags for testing scenarios
  public simulateTimeout = false;
  public simulateFlakyFirstAttempt = false;
  public simulateStalledQueue = false;
  public flakyAttemptCount = 0;

  // Queue state
  public pendingQueue: JobItem[] = [];
  public completedQueue: JobItem[] = [];
  public failedQueue: JobItem[] = [];

  // Metrics & Counters
  public processedCount = 1050;
  public failedCount = 42;
  public totalIncoming = 1250;

  // Logs & Deployments & History
  public logs: LogEntry[] = [];
  public deployments: DeploymentRecord[] = [];
  public remediationHistory: Array<{
    action: string;
    timestamp: string;
    success: boolean;
    operator: string;
    details?: any;
  }> = [];

  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.resetToScenario('scenario-a');
    this.startSimulationLoop();
  }

  public resetToScenario(scenarioId: string = 'scenario-a') {
    this.scenarioId = scenarioId;
    this.flakyAttemptCount = 0;
    this.simulateTimeout = false;
    this.simulateFlakyFirstAttempt = false;
    this.simulateStalledQueue = false;

    // Reset base metrics
    this.processedCount = 1050;
    this.failedCount = 42;
    this.completedQueue = [];
    this.failedQueue = [];
    this.pendingQueue = [];
    this.remediationHistory = [];

    // Seed pending jobs
    const initialPendingCount = scenarioId === 'scenario-b' ? 210 : 142;
    for (let i = 1; i <= initialPendingCount; i++) {
      this.pendingQueue.push({
        id: `job-ord-${1000 + i}`,
        orderId: `ORD-${80000 + i}`,
        amount: Math.round((20 + Math.random() * 200) * 100) / 100,
        status: 'PENDING',
        createdAt: new Date(Date.now() - (initialPendingCount - i) * 12000).toISOString(),
        retries: 0
      });
    }

    // Default: worker disabled
    this.workerRunning = false;
    this.lastStoppedAt = new Date(Date.now() - 1800000).toISOString();
    this.lastStartedAt = null;

    if (scenarioId === 'scenario-b') {
      this.simulateFlakyFirstAttempt = true;
    } else if (scenarioId === 'scenario-c') {
      this.simulateTimeout = true;
    } else if (scenarioId === 'scenario-e') {
      this.workerRunning = true;
      this.lastStartedAt = new Date(Date.now() - 7200000).toISOString();
    } else if (scenarioId === 'scenario-g') {
      this.simulateStalledQueue = true;
    }

    this.seedLogs();
    this.seedDeployments();
  }

  private seedDeployments() {
    const now = Date.now();
    this.deployments = [
      {
        id: 'dep-901',
        service: 'order-processing-service',
        version: 'v2.4.1',
        commitSha: 'a7c93e1',
        deployedBy: 'ci-bot@sentinelops.local',
        status: 'SUCCESS',
        timestamp: new Date(now - 7200000).toISOString(),
        notes: 'Upgrade dependency axios and update worker graceful shutdown hook.'
      },
      {
        id: 'dep-900',
        service: 'order-processing-service',
        version: 'v2.4.0',
        commitSha: 'f31b028',
        deployedBy: 'deployer@sentinelops.local',
        status: 'SUCCESS',
        timestamp: new Date(now - 86400000).toISOString(),
        notes: 'Add batching pipeline optimizations.'
      }
    ];
  }

  private seedLogs() {
    const now = Date.now();
    this.logs = [
      {
        id: 'log-1',
        timestamp: new Date(now - 3600000).toISOString(),
        service: 'order-processing-service',
        level: 'INFO',
        message: 'Order worker consumer started listening on topic order-events.v1'
      },
      {
        id: 'log-2',
        timestamp: new Date(now - 2400000).toISOString(),
        service: 'order-processing-service',
        level: 'WARN',
        message: 'High queue latency detected: 48 jobs queued, processing lag 12.4s'
      },
      {
        id: 'log-3',
        timestamp: new Date(now - 1800000).toISOString(),
        service: 'order-processing-service',
        level: 'ERROR',
        message: 'Worker received SIGTERM / unhandled disconnect from message broker. Consumer worker stopped unexpectedly.',
        context: { worker: 'order-consumer-worker-1', exitCode: 143, reason: 'BROKER_HEARTBEAT_TIMEOUT' }
      },
      {
        id: 'log-4',
        timestamp: new Date(now - 1200000).toISOString(),
        service: 'order-processing-service',
        level: 'ERROR',
        message: 'Queue backlog threshold exceeded! 140+ orders pending with 0 active workers consuming.'
      }
    ];

    if (this.simulateFlakyFirstAttempt) {
      this.logs.push({
        id: 'log-b1',
        timestamp: new Date(now - 600000).toISOString(),
        service: 'order-processing-service',
        level: 'WARN',
        message: 'Stale lockfile detected at /var/run/order-worker.lock from previous abrupt shutdown.'
      });
    }
  }

  public appendLog(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      service: 'order-processing-service',
      level,
      message,
      context
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) {
      this.logs.pop();
    }
    return entry;
  }

  public enableWorker(): { success: boolean; message: string } {
    if (this.simulateFlakyFirstAttempt && this.flakyAttemptCount === 0) {
      this.flakyAttemptCount++;
      this.appendLog(
        'ERROR',
        'Failed to start worker: lockfile /var/run/order-worker.lock held by orphaned PID 40112.',
        { lockFile: '/var/run/order-worker.lock' }
      );
      return {
        success: false,
        message: 'Lockfile conflict: orphaned lock held by dead process. Retry or clean stale lock.'
      };
    }

    this.workerRunning = true;
    this.workerPid = Math.floor(40000 + Math.random() * 5000);
    this.lastStartedAt = new Date().toISOString();
    this.workerRestarts++;
    this.appendLog('INFO', `Order worker process spawned successfully with PID ${this.workerPid}. Consumer listening.`, {
      pid: this.workerPid,
      threads: this.workerThreads
    });

    this.remediationHistory.push({
      action: 'enable_simulated_worker',
      timestamp: new Date().toISOString(),
      success: true,
      operator: 'sentinelops-agent'
    });

    return {
      success: true,
      message: `Worker enabled successfully with PID ${this.workerPid}. Queue consumption initiated.`
    };
  }

  public disableWorker(): { success: boolean; message: string } {
    this.workerRunning = false;
    this.lastStoppedAt = new Date().toISOString();
    this.appendLog('WARN', 'Order worker stopped by administrative request.');
    this.remediationHistory.push({
      action: 'disable_simulated_worker',
      timestamp: new Date().toISOString(),
      success: true,
      operator: 'sentinelops-agent'
    });
    return { success: true, message: 'Worker stopped successfully.' };
  }

  public restartWorker(): { success: boolean; message: string } {
    this.disableWorker();
    this.simulateFlakyFirstAttempt = false; // restart cleans stale state
    return this.enableWorker();
  }

  private startSimulationLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    // If worker is running and not stalled, process orders from pending queue
    if (this.workerRunning && !this.simulateStalledQueue) {
      if (this.pendingQueue.length > 0) {
        // Process up to 5 jobs per second
        const batchSize = Math.min(5, this.pendingQueue.length);
        const batch = this.pendingQueue.splice(0, batchSize);
        const now = new Date().toISOString();
        for (const job of batch) {
          job.status = 'COMPLETED';
          job.processedAt = now;
          this.completedQueue.push(job);
          this.processedCount++;
        }
      }
    }
  }

  public getHealthSummary() {
    if (!this.workerRunning) {
      return {
        status: 'DEGRADED',
        service: 'order-processing-service',
        timestamp: new Date().toISOString(),
        details: {
          workerStatus: 'STOPPED',
          queueBacklog: this.pendingQueue.length,
          dbConnection: 'HEALTHY',
          cacheConnection: 'HEALTHY'
        }
      };
    }

    if (this.simulateStalledQueue) {
      return {
        status: 'DEGRADED',
        service: 'order-processing-service',
        timestamp: new Date().toISOString(),
        details: {
          workerStatus: 'STALLED',
          queueBacklog: this.pendingQueue.length,
          dbConnection: 'READ_ONLY_LOCK',
          cacheConnection: 'HEALTHY'
        }
      };
    }

    return {
      status: 'HEALTHY',
      service: 'order-processing-service',
      timestamp: new Date().toISOString(),
      details: {
        workerStatus: 'RUNNING',
        workerPid: this.workerPid,
        queueBacklog: this.pendingQueue.length,
        dbConnection: 'HEALTHY',
        cacheConnection: 'HEALTHY'
      }
    };
  }

  public getQueueMetrics() {
    return {
      service: 'order-processing-service',
      queueName: 'order-events.v1',
      pendingCount: this.pendingQueue.length,
      processingCount: this.workerRunning ? 2 : 0,
      completedCount: this.completedQueue.length,
      failedCount: this.failedQueue.length,
      oldestJobAgeSeconds: this.pendingQueue.length > 0 ? 120 : 0,
      workerActive: this.workerRunning
    };
  }

  public getCounters() {
    const total = this.processedCount + this.failedCount;
    const errorRate = total > 0 ? Math.round((this.failedCount / total) * 1000) / 10 : 0;
    return {
      service: 'order-processing-service',
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      pendingCount: this.pendingQueue.length,
      errorRatePercent: errorRate,
      timestamp: new Date().toISOString()
    };
  }
}

export const simulatorState = new SimulatorState();
