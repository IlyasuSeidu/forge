/**
 * Agent 16: Repair Agent (Hardened) Frontend Page
 *
 * Executes ONLY human-approved RepairPlans. Does not invent fixes. Does not
 * generate code. Does not expand scope. Does not add dependencies. Does not
 * create new files. Does not retry failed steps. Does not continue after failure.
 * Only reads approved RepairPlan, executes bounded actions exactly once in order,
 * verifies outcomes mechanically, emits immutable RepairExecutionLog, and halts
 * immediately on any failure or scope violation.
 *
 * Constitutional Pattern (6 parts):
 * 1. Context Header
 * 2. Inputs Section
 * 3. Generated Artifact
 * 4. Approval Controls
 * 5. State Visualization
 * 6. Next-Agent Unlock
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { useAgentState } from '@/lib/context/AgentStateContext';
import { useApproval } from '@/lib/hooks/useApproval';

interface RepairExecutionStep {
  stepId: string;
  type: 'MODIFY_FILE';
  targetFile: string;
  status: 'success' | 'failure' | 'skipped';
  verification: 'passed' | 'failed' | 'not_run';
  durationMs: number;
  stdout: string[];
  stderr: string[];
}

interface RepairExecutionLog {
  logId: string;
  approvedPlanHash: string;
  verificationResultHash: string;
  rulesHash: string;
  logHash: string;
  status: 'SUCCESS' | 'FAILURE' | 'HALTED';
  startedAt: string;
  finishedAt: string;
  tasksExecuted: number;
  tasksTotal: number;
  steps: RepairExecutionStep[];
}

// Mock repair execution log for demonstration
const MOCK_REPAIR_EXECUTION_LOG: RepairExecutionLog = {
  logId: 'repair-exec-log-001',
  approvedPlanHash: 'o1p2q3r4s5t6u7v8',
  verificationResultHash: 'example-failed-result-hash',
  rulesHash: 'i3d9e6f4b1a5c7d3',
  logHash: 'p1q2r3s4t5u6v7w8',
  status: 'SUCCESS',
  startedAt: '2026-01-14T16:00:00Z',
  finishedAt: '2026-01-14T16:00:03Z',
  tasksExecuted: 1,
  tasksTotal: 1,
  steps: [
    {
      stepId: 'repair-step-001',
      type: 'MODIFY_FILE',
      targetFile: 'app/dashboard/page.tsx',
      status: 'success',
      verification: 'passed',
      durationMs: 2876,
      stdout: [
        'Locating line 42 in app/dashboard/page.tsx',
        'Found: const count: number = "invalid";',
        'Changed to: const count: number = 0;',
        'File modified successfully',
        'Running TypeScript verification...',
        'TypeScript compilation: SUCCESS',
        'No type errors found',
      ],
      stderr: [],
    },
  ],
};

export default function RepairAgentPage() {
  // Get agent state from context
  const { currentState } = useAgentState('repair');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  const [showScopeViolationDemo, setShowScopeViolationDemo] = useState(false);

  // For demo: verification passed, so no repair plan approved
  const noRepairNeeded = true;

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent 16: Repair Agent (Hardened)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">REPAIR_EXECUTION_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Executes ONLY human-approved RepairPlans. Does not invent fixes. Does not generate code. Does not expand
          scope. Does not add dependencies. Does not create new files. Does not retry failed steps. Does not
          continue after failure. Only reads approved RepairPlan, executes bounded actions exactly once in order,
          verifies outcomes mechanically, emits immutable RepairExecutionLog, and halts immediately on any failure
          or scope violation.
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
          <InputReference
            label="Approved Repair Plan"
            hash="none"
            description="No repair plan approved (verification passed)"
            status="inactive"
          />
          <InputReference
            label="Draft Repair Plan"
            hash="n1o2p3q4r5s6t7u8"
            description="Reference only (not approved)"
            status="reference"
          />
          <InputReference
            label="Verification Result #1"
            hash="l1m2n3o4p5q6r7s8"
            description="Reference only"
            status="reference"
          />
          <InputReference
            label="Project Rules"
            hash="i3d9e6f4b1a5c7d3"
            description="Reference only"
            status="reference"
          />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Context Isolation:</strong> This agent can only execute actions explicitly listed in the
            approved repair plan.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Repair Execution Log</h3>
        </div>

        {/* STATE A: No Repair Needed (Normal State) */}
        {noRepairNeeded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-lg font-semibold text-green-900 mb-2">No Repair Execution Required</h4>
                <p className="text-sm text-green-800 mb-3">
                  Verification PASSED. No repair plan was generated or approved. No repair execution is needed.
                </p>
                <div className="bg-white border border-green-200 rounded p-3 text-sm text-green-900">
                  <strong>Result:</strong> RepairExecutionLog is not generated because no repairs were executed.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scope Violation Demonstration (Collapsible) */}
        <div>
          <button
            onClick={() => setShowScopeViolationDemo(!showScopeViolationDemo)}
            className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-orange-900">
              💡 Scope Violation Demonstration (Example Only - Not This Project)
            </span>
            <svg
              className={`w-5 h-5 text-orange-700 transition-transform ${
                showScopeViolationDemo ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showScopeViolationDemo && (
            <div className="mt-3 p-5 bg-orange-50 border border-orange-200 rounded-lg space-y-5">
              <div className="text-xs text-orange-800 mb-4">
                This demonstrates what would happen if a repair attempted to violate scope constraints:
              </div>

              {/* Example: Successful Execution Log First */}
              <div className="bg-white border border-green-200 rounded p-4">
                <h4 className="text-sm font-semibold text-green-900 mb-3">
                  Example 1: Successful Repair Execution
                </h4>

                {/* Log Metadata */}
                <div className="bg-gray-50 rounded p-3 space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Log ID:</span>
                    <span className="font-mono text-xs text-gray-900">{MOCK_REPAIR_EXECUTION_LOG.logId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Approved Plan Hash:</span>
                    <HashBadge hash={MOCK_REPAIR_EXECUTION_LOG.approvedPlanHash} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Log Hash:</span>
                    <HashBadge hash={MOCK_REPAIR_EXECUTION_LOG.logHash} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      {MOCK_REPAIR_EXECUTION_LOG.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Tasks Executed:</span>
                    <span className="text-gray-900">
                      {MOCK_REPAIR_EXECUTION_LOG.tasksExecuted} / {MOCK_REPAIR_EXECUTION_LOG.tasksTotal}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Note: Timestamps excluded from hash computation for determinism
                  </div>
                </div>

                {/* Execution Steps */}
                <div className="space-y-2">
                  {MOCK_REPAIR_EXECUTION_LOG.steps.map((step) => (
                    <RepairStepCard key={step.stepId} step={step} />
                  ))}
                </div>
              </div>

              {/* Example: Scope Violation */}
              <div className="bg-white border border-red-200 rounded p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-3">Example 2: Scope Violation (Halted)</h4>

                <div className="space-y-2">
                  <RepairStepCard
                    step={{
                      stepId: 'repair-step-001',
                      type: 'MODIFY_FILE',
                      targetFile: 'package.json',
                      status: 'failure',
                      verification: 'failed',
                      durationMs: 234,
                      stdout: ['Attempting to modify package.json'],
                      stderr: [
                        'ERROR: SCOPE VIOLATION',
                        'File package.json is in the FORBIDDEN list',
                        'Repair plan constraints: noNewDependencies = true',
                        'package.json modifications are not allowed',
                        'SYSTEM HALTED',
                      ],
                    }}
                  />

                  <div className="bg-red-100 border border-red-300 rounded p-3">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      🛑 SCOPE VIOLATION — SYSTEM HALTED. NO RETRY.
                    </p>
                    <p className="text-xs text-red-800">
                      Repair attempted to modify a forbidden file. Execution terminated immediately. All remaining
                      steps skipped.
                    </p>
                  </div>

                  <RepairStepCard
                    step={{
                      stepId: 'repair-step-002',
                      type: 'MODIFY_FILE',
                      targetFile: 'app/dashboard/page.tsx',
                      status: 'skipped',
                      verification: 'not_run',
                      durationMs: 0,
                      stdout: [],
                      stderr: ['SKIPPED (system halted)'],
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Approval Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repair Execution Controls</h3>
        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4">
          <p className="text-sm text-amber-900 font-medium mb-2">⚠️ Mechanical Execution</p>
          <p className="text-sm text-amber-800">
            This execution is mechanical. It cannot be edited or re-ordered. The agent will execute the approved
            repair plan exactly once.
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Since no repair plan was approved (verification passed), execution is not required.
        </p>
        <div className="flex items-center gap-3">
          <button
            disabled
            className="px-6 py-2.5 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
          >
            Run Approved Repair Plan (No Plan Available)
          </button>
          <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
            Abort (Pause System)
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repair Execution State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Locked (No Approved Plan)" status="pending" />
          <StateRow label="Approved Repair Plan" value="None" status="pending" />
          <StateRow label="Execution Log" value="Not Generated" status="pending" />
          <StateRow label="Repairs Executed" value="0" status="pending" />
        </div>
      </div>

      {/* Part 6: Next-Agent Unlock */}
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Next: Completion Auditor</h4>
            <p className="text-sm text-gray-600 mb-2">
              Since no repairs were needed, the system can proceed directly to Completion Auditor for final
              verification.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> If repairs had been executed, the system would re-run Verification Executor
                to confirm the repair before proceeding to Completion Auditor.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairStepCard({ step }: { step: RepairExecutionStep }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    failure: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    skipped: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  }[step.status];

  const verificationConfig = {
    passed: { text: 'text-green-700', icon: '✓' },
    failed: { text: 'text-red-700', icon: '✗' },
    not_run: { text: 'text-gray-500', icon: '—' },
  }[step.verification];

  return (
    <div className={`border ${statusConfig.border} rounded-lg p-3 ${statusConfig.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-gray-500">{step.stepId}</span>
            <span className={`px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded`}>
              {step.type}
            </span>
            <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}>
              {step.status.toUpperCase()}
            </span>
            <span className={`text-xs font-medium ${verificationConfig.text}`}>
              {verificationConfig.icon} {step.verification.toUpperCase()}
            </span>
            {step.durationMs > 0 && <span className="text-xs text-gray-500">{step.durationMs}ms</span>}
          </div>
          <div className="text-sm text-gray-900 font-mono mb-1">{step.targetFile}</div>
          <div className="text-xs text-gray-600 italic">Executed once. No retry.</div>
        </div>
        {(step.stdout.length > 0 || step.stderr.length > 0) && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="ml-3 text-gray-400 hover:text-gray-600">
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {isExpanded && (step.stdout.length > 0 || step.stderr.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          {step.stdout.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">stdout:</div>
              <div className="bg-gray-900 text-green-400 rounded p-2 font-mono text-xs max-h-48 overflow-y-auto">
                {step.stdout.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          )}
          {step.stderr.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">stderr:</div>
              <div className="bg-gray-900 text-red-400 rounded p-2 font-mono text-xs max-h-48 overflow-y-auto">
                {step.stderr.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InputReference({
  label,
  hash,
  description,
  status = 'active',
}: {
  label: string;
  hash: string;
  description: string;
  status?: 'active' | 'inactive' | 'reference';
}) {
  const statusConfig = {
    active: { icon: 'text-green-600', border: 'border-gray-200', bg: 'bg-gray-50' },
    inactive: { icon: 'text-gray-400', border: 'border-gray-200', bg: 'bg-gray-50' },
    reference: { icon: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50' },
  }[status];

  return (
    <div className={`flex items-center justify-between p-3 rounded border ${statusConfig.border} ${statusConfig.bg}`}>
      <div className="flex items-center gap-3">
        <svg
          className={`w-5 h-5 ${statusConfig.icon} flex-shrink-0`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          <div className="text-xs text-gray-600">{description}</div>
        </div>
      </div>
      {hash !== 'none' && <HashBadge hash={hash} />}
    </div>
  );
}

function HashBadge({ hash }: { hash: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded">
      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span className="font-mono text-xs text-green-700">{hash}</span>
    </div>
  );
}

function StateRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: 'completed' | 'pending' | 'awaiting';
}) {
  const statusConfig = {
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
    awaiting: { bg: 'bg-amber-100', text: 'text-amber-700' },
  }[status];

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`px-3 py-1 ${statusConfig.bg} ${statusConfig.text} text-sm font-medium rounded`}>
        {value}
      </span>
    </div>
  );
}
