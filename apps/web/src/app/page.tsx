'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sidebar
} from '../components/Sidebar';
import {
  Header
} from '../components/Header';
import {
  OperatorPanel
} from '../components/OperatorPanel';
import {
  TimelineView
} from '../components/TimelineView';
import {
  TaskListView
} from '../components/TaskListView';
import {
  ActivityMonitor
} from '../components/ActivityMonitor';
import {
  ExecutionDetails
} from '../components/ExecutionDetails';
import {
  ApprovalModal
} from '../components/ApprovalModal';
import {
  IncidentReportModal
} from '../components/IncidentReportModal';
import {
  DashboardView
} from '../components/DashboardView';
import {
  TaskRunsView
} from '../components/TaskRunsView';
import {
  AgentsView
} from '../components/AgentsView';
import {
  SchedulesView
} from '../components/SchedulesView';
import {
  IntegrationsView
} from '../components/IntegrationsView';
import {
  AuditLogsView
} from '../components/AuditLogsView';
import {
  SettingsView
} from '../components/SettingsView';
import {
  useTaskStream
} from '../hooks/useTaskStream';
import {
  fetchTasks,
  fetchTask,
  fetchEvidence,
  fetchReport,
  createTask,
  triggerScenario,
  approveAction,
  rejectAction,
  cancelTask,
  fetchSimulatorHealth
} from '../lib/api';

export default function WorkflowDashboard() {
  const [currentNav, setCurrentNav] = useState('workflows');
  const [activeTab, setActiveTab] = useState<'timeline' | 'tasks' | 'activity'>('timeline');

  // Task & Execution State
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentTask, setCurrentTask] = useState<any | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);

  // Modals
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [incidentReport, setIncidentReport] = useState<any | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [serviceHealth, setServiceHealth] = useState('HEALTHY');

  // Refresh current task data
  const refreshTaskData = useCallback(async (taskId?: string) => {
    const id = taskId || currentTask?.id;
    if (!id) return;

    try {
      const data = await fetchTask(id);
      setCurrentTask(data.task);
      setCurrentPlan(data.plan);
      setPendingApprovals(data.pendingApprovals || []);

      if (data.pendingApprovals?.length > 0) {
        setShowApprovalModal(true);
      }

      // Fetch evidence
      const evData = await fetchEvidence(id);
      setEvidenceList(evData.evidence || []);

      // Check report
      if (data.hasReport) {
        try {
          const repData = await fetchReport(id);
          setIncidentReport(repData.report);
        } catch (_) {}
      }
    } catch (err) {
      console.error('[WEB] Error refreshing task:', err);
    }
  }, [currentTask?.id]);

  // Hook up SSE stream
  const { events, isConnected } = useTaskStream(
    currentTask?.id || null,
    () => refreshTaskData()
  );

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const taskRes = await fetchTasks();
        setTasks(taskRes.tasks || []);
        if (taskRes.tasks?.length > 0) {
          const latest = taskRes.tasks[0];
          setCurrentTask(latest);
          await refreshTaskData(latest.id);
        }

        const simHealth = await fetchSimulatorHealth();
        setServiceHealth(simHealth?.status || 'HEALTHY');
      } catch (err) {
        console.error('[WEB] Init error:', err);
      }
    }
    init();

    const healthInterval = setInterval(async () => {
      const simHealth = await fetchSimulatorHealth();
      setServiceHealth(simHealth?.status || 'HEALTHY');
    }, 5000);

    return () => clearInterval(healthInterval);
  }, []);

  // Active status polling fallback while task is in flight
  useEffect(() => {
    if (!currentTask?.id) return;
    if (currentTask.status === 'COMPLETED' || currentTask.status === 'FAILED' || currentTask.status === 'CANCELLED') {
      return;
    }

    const pollInterval = setInterval(() => {
      refreshTaskData();
    }, 1500);

    return () => clearInterval(pollInterval);
  }, [currentTask?.id, currentTask?.status, refreshTaskData]);

  // Submit Goal
  const handleGoalSubmit = async (prompt: string, scenarioId?: string, mode = 'demo') => {
    setIsLoading(true);
    try {
      let res;
      if (scenarioId) {
        res = await triggerScenario(scenarioId, mode, prompt);
      } else {
        res = await createTask(prompt, undefined, mode);
      }

      if (res?.task) {
        setCurrentTask(res.task);
        setSelectedStepNumber(null);
        setIncidentReport(null);
        await refreshTaskData(res.task.id);
        const taskRes = await fetchTasks();
        setTasks(taskRes.tasks || []);
      }
    } catch (err: any) {
      alert(`Execution Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Approvals
  const handleApprove = async (requestId: string, user: string) => {
    if (!currentTask?.id) return;
    setIsSubmittingApproval(true);
    try {
      await approveAction(currentTask.id, requestId, user);
      setShowApprovalModal(false);
      await refreshTaskData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    if (!currentTask?.id) return;
    setIsSubmittingApproval(true);
    try {
      await rejectAction(currentTask.id, requestId, reason);
      setShowApprovalModal(false);
      await refreshTaskData();
    } catch (err: any) {
      alert(`Reject error: ${err.message}`);
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleCancel = async () => {
    if (!currentTask?.id) return;
    try {
      await cancelTask(currentTask.id);
      await refreshTaskData();
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  // Selected Step Object
  const selectedStep = currentPlan?.steps?.find(
    (s: any) => s.stepNumber === selectedStepNumber
  ) || currentPlan?.steps?.[0] || null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentTab={currentNav}
        onTabChange={setCurrentNav}
        serviceHealthStatus={serviceHealth}
        executionMode={currentTask?.executionMode || 'demo'}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          task={currentTask}
          onNewTaskClick={() => {
            setCurrentNav('workflows');
            const defaultPrompt = 'The order processing service is failing. Investigate the issue, inspect the relevant logs and runbook, fix it if safe, verify that orders are processing again, and produce a postmortem report.';
            handleGoalSubmit(defaultPrompt, 'scenario-a', currentTask?.executionMode || 'demo');
          }}
          onRestartClick={() => {
            if (!currentTask) return;
            setCurrentNav('workflows');
            handleGoalSubmit(currentTask.userPrompt, currentTask.spec?.scenario || 'scenario-a', currentTask.executionMode || 'demo');
          }}
          onCancelClick={handleCancel}
          onViewReportClick={async () => {
            if (!incidentReport && currentTask?.id) {
              try {
                const repData = await fetchReport(currentTask.id);
                setIncidentReport(repData.report);
              } catch (_) {}
            }
            setShowReportModal(true);
          }}
          hasReport={Boolean(incidentReport)}
        />

        {/* Scrollable Workspace depending on selected sidebar tab */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentNav === 'dashboard' && (
            <DashboardView
              tasks={tasks}
              serviceHealth={serviceHealth}
              onNavigateToWorkflows={() => setCurrentNav('workflows')}
              onSelectTask={(task) => {
                setCurrentTask(task);
                refreshTaskData(task.id);
              }}
              onLaunchScenario={(scenarioId) => {
                handleGoalSubmit('The order processing service is failing. Investigate and resolve.', scenarioId);
                setCurrentNav('workflows');
              }}
            />
          )}

          {currentNav === 'runs' && (
            <TaskRunsView
              tasks={tasks}
              onSelectTask={(task) => {
                setCurrentTask(task);
                refreshTaskData(task.id);
              }}
              onNavigateToWorkflows={() => setCurrentNav('workflows')}
            />
          )}

          {currentNav === 'agents' && <AgentsView />}

          {currentNav === 'schedules' && <SchedulesView />}

          {currentNav === 'integrations' && <IntegrationsView />}

          {currentNav === 'audit' && <AuditLogsView events={events} />}

          {currentNav === 'settings' && (
            <SettingsView executionMode={currentTask?.executionMode || 'demo'} />
          )}

          {currentNav === 'workflows' && (
            <>
              {/* AI Operator Dispatch Interface */}
              <OperatorPanel
                onSubmitGoal={handleGoalSubmit}
                isLoading={isLoading}
                currentTaskSpec={currentTask?.spec}
              />

              {/* Workflow Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'timeline'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Timeline Track
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'tasks'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Task List ({currentPlan?.steps?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'activity'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Activity Monitor ({events.length})
                </button>
              </div>

              {/* Primary View based on Tab */}
              {activeTab === 'timeline' && (
                <TimelineView
                  plan={currentPlan}
                  selectedStepNumber={selectedStepNumber}
                  onSelectStep={setSelectedStepNumber}
                />
              )}

              {activeTab === 'tasks' && (
                <TaskListView
                  plan={currentPlan}
                  onSelectStep={setSelectedStepNumber}
                  selectedStepNumber={selectedStepNumber}
                />
              )}

              {activeTab === 'activity' && (
                <ActivityMonitor
                  events={events}
                  isConnected={isConnected}
                />
              )}

              {/* Bottom Split: Execution Details & Activity Stream */}
              {activeTab !== 'activity' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  <ExecutionDetails
                    step={selectedStep}
                    evidence={evidenceList}
                  />
                  <ActivityMonitor
                    events={events}
                    isConnected={isConnected}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Human Approval Gate Modal */}
      {showApprovalModal && pendingApprovals.length > 0 && (
        <ApprovalModal
          approval={pendingApprovals[0]}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setShowApprovalModal(false)}
          isSubmitting={isSubmittingApproval}
        />
      )}

      {/* 4. Incident Report Modal */}
      {showReportModal && (
        <IncidentReportModal
          report={incidentReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
