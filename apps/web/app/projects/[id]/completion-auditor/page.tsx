/**
 * Agent 17: Completion Auditor (Final Gate)
 *
 * Performs final binary audit of entire Forge manufacturing chain.
 * Issues immutable verdict: COMPLETE or NOT_COMPLETE.
 * No approval required - this agent judges, not proposes.
 */

'use client';

import { use, useState } from 'react';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface CompletionReport {
  reportId: string;
  verdict: 'COMPLETE' | 'NOT_COMPLETE';
  completionHash: string;
  rulesHash: string;
  totalAgents: number;
  approvedAgents: number;
  buildPromptsApproved: number;
  executionPlansApproved: number;
  executionLogsPresent: number;
  verificationStatus: 'PASSED' | 'FAILED' | 'PENDING';
  conductorState: 'completed' | 'paused' | 'failed';
  hashChain: string[];
  failedChecks?: FailedCheck[];
}

interface FailedCheck {
  checkId: string;
  checkName: string;
  expected: string;
  actual: string;
  severity: 'CRITICAL' | 'BLOCKING';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INPUT_HASHES = {
  projectRuleSet: 'fa8c7d2e9b1a4f6e',
  buildPrompts: ['j1k2l3m4n5o6p7q8', 'j2k3l4m5n6o7p8q9', 'j3k4l5m6n7o8p9q1'],
  executionPlans: ['k1l2m3n4o5p6q7r8', 'k2l3m4n5o6p7q8r9', 'k3l4m5n6o7p8q9r1'],
  executionLogs: ['l1m2n3o4p5q6r7s8', 'l2m3n4o5p6q7r8s9', 'l3m4n5o6p7q8r9s1'],
  verificationResults: ['m1n2o3p4q5r6s7t8', 'm2n3o4p5q6r7s8t9', 'm3n4o5p6q7s8t9u1'],
  verificationReports: ['n1o2p3q4r5s6t7u8', 'n2o3p4q5r6s7t8u9', 'n3o4p5q6r7s8t9u1'],
  repairExecutionLog: 'p1q2r3s4t5u6v7w8',
};

const MOCK_COMPLETE_REPORT: CompletionReport = {
  reportId: 'completion-report-001',
  verdict: 'COMPLETE',
  completionHash: 'q1r2s3t4u5v6w7x8y9z0',
  rulesHash: 'fa8c7d2e9b1a4f6e',
  totalAgents: 17,
  approvedAgents: 17,
  buildPromptsApproved: 3,
  executionPlansApproved: 3,
  executionLogsPresent: 3,
  verificationStatus: 'PASSED',
  conductorState: 'completed',
  hashChain: [
    'fa8c7d2e9b1a4f6e', // Base Prompt
    'c4f8a2d9e7b1f3a6', // Plans
    'd7e3f9a1b8c4d2e6', // Screens
    'e8f4b3c2d9a5e7f1', // Journeys
    'i3d9e6f4b1a5c7d3', // Visual Contracts
    'j1k2l3m4n5o6p7q8', // Build Prompts
    'k1l2m3n4o5p6q7r8', // Execution Plans
    'l1m2n3o4p5q6r7s8', // Execution Logs
    'm1n2o3p4q5r6s7t8', // Verification
    'q1r2s3t4u5v6w7x8y9z0', // Completion
  ],
};

const MOCK_INCOMPLETE_REPORT: CompletionReport = {
  reportId: 'completion-report-002',
  verdict: 'NOT_COMPLETE',
  completionHash: '',
  rulesHash: 'fa8c7d2e9b1a4f6e',
  totalAgents: 17,
  approvedAgents: 15,
  buildPromptsApproved: 3,
  executionPlansApproved: 3,
  executionLogsPresent: 2,
  verificationStatus: 'FAILED',
  conductorState: 'paused',
  hashChain: [],
  failedChecks: [
    {
      checkId: 'check-001',
      checkName: 'Verification Result Missing',
      expected: 'VerificationResult for plan-3 must exist',
      actual: 'VerificationResult for plan-3 not found',
      severity: 'CRITICAL',
    },
    {
      checkId: 'check-002',
      checkName: 'Conductor State',
      expected: 'Conductor state must be completed',
      actual: 'Conductor paused awaiting approval',
      severity: 'BLOCKING',
    },
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CompletionAuditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [auditState, setAuditState] = useState<'locked' | 'ready_to_audit' | 'auditing' | 'complete' | 'not_complete'>(
    'ready_to_audit'
  );
  const [completionReport, setCompletionReport] = useState<CompletionReport | null>(null);
  const [showIncompleteDemo, setShowIncompleteDemo] = useState(false);

  const handleRunAudit = () => {
    setAuditState('auditing');
    // Simulate audit process
    setTimeout(() => {
      setCompletionReport(MOCK_COMPLETE_REPORT);
      setAuditState('complete');
    }, 1500);
  };

  const handleLockProject = () => {
    // TODO: Implement project lock
    alert('Project locked. All execution halted.');
  };

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* 1. CONTEXT HEADER */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">✅</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Completion Auditor</h1>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-gray-700">Authority:</span>
                <code className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-mono">
                  COMPLETION_AUDIT_AUTHORITY
                </code>
              </div>
              <p className="text-sm text-gray-600">
                Performs final binary audit of entire Forge manufacturing chain. Issues immutable verdict: COMPLETE or
                NOT_COMPLETE. No retry. No interpretation. No approval required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. INPUTS SECTION */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Context: Hash-Locked Artifacts</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-900">
              This agent can only judge using hash-locked artifacts. No human text is considered. All inputs must be
              approved and immutable.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Project RuleSet */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Project RuleSet</div>
            <div className="bg-gray-50 rounded p-3">
              <HashBadge hash={MOCK_INPUT_HASHES.projectRuleSet} label="RuleSet" />
            </div>
          </div>

          {/* Build Prompts */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Build Prompts (3 approved)</div>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {MOCK_INPUT_HASHES.buildPrompts.map((hash, idx) => (
                <HashBadge key={hash} hash={hash} label={`Build Prompt ${idx + 1}`} />
              ))}
            </div>
          </div>

          {/* Execution Plans */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Execution Plans (3 approved)</div>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {MOCK_INPUT_HASHES.executionPlans.map((hash, idx) => (
                <HashBadge key={hash} hash={hash} label={`Execution Plan ${idx + 1}`} />
              ))}
            </div>
          </div>

          {/* Execution Logs */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Execution Logs (3 present)</div>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {MOCK_INPUT_HASHES.executionLogs.map((hash, idx) => (
                <HashBadge key={hash} hash={hash} label={`Execution Log ${idx + 1}`} />
              ))}
            </div>
          </div>

          {/* Verification Results */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Verification Results (3 present)</div>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {MOCK_INPUT_HASHES.verificationResults.map((hash, idx) => (
                <HashBadge key={hash} hash={hash} label={`Verification Result ${idx + 1}`} />
              ))}
            </div>
          </div>

          {/* Verification Reports */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Verification Reports (3 reference only)</div>
            <div className="bg-gray-50 rounded p-3 space-y-2">
              {MOCK_INPUT_HASHES.verificationReports.map((hash, idx) => (
                <HashBadge key={hash} hash={hash} label={`Verification Report ${idx + 1}`} />
              ))}
            </div>
          </div>

          {/* Repair Log (optional) */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Repair Execution Log (optional)</div>
            <div className="bg-gray-50 rounded p-3">
              <HashBadge hash={MOCK_INPUT_HASHES.repairExecutionLog} label="Repair Log" />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 3. GENERATED ARTIFACT */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Generated Artifact: Completion Report</h2>

        {completionReport ? (
          <div className="space-y-6">
            {/* Verdict Card */}
            {completionReport.verdict === 'COMPLETE' ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">✅</div>
                <div className="text-3xl font-bold text-green-900 mb-2">COMPLETE</div>
                <p className="text-sm text-green-700">All checks passed. Project manufacturing chain verified.</p>
              </div>
            ) : (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">❌</div>
                <div className="text-3xl font-bold text-red-900 mb-2">NOT_COMPLETE</div>
                <p className="text-sm text-red-700">Critical checks failed. Human intervention required.</p>
              </div>
            )}

            {/* Report Details */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Report Details</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Report ID</div>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                    {completionReport.reportId}
                  </code>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Verdict</div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      completionReport.verdict === 'COMPLETE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {completionReport.verdict}
                  </span>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Total Agents</div>
                  <div className="font-mono text-sm">{completionReport.totalAgents}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Approved Agents</div>
                  <div className="font-mono text-sm">{completionReport.approvedAgents}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Build Prompts Approved</div>
                  <div className="font-mono text-sm">{completionReport.buildPromptsApproved}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Execution Plans Approved</div>
                  <div className="font-mono text-sm">{completionReport.executionPlansApproved}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Execution Logs Present</div>
                  <div className="font-mono text-sm">{completionReport.executionLogsPresent}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Verification Status</div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      completionReport.verificationStatus === 'PASSED'
                        ? 'bg-green-100 text-green-800'
                        : completionReport.verificationStatus === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {completionReport.verificationStatus}
                  </span>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Conductor State</div>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      completionReport.conductorState === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : completionReport.conductorState === 'paused'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {completionReport.conductorState}
                  </span>
                </div>
                {completionReport.completionHash && (
                  <div className="col-span-2">
                    <div className="text-gray-600 mb-1">Completion Hash</div>
                    <HashBadge hash={completionReport.completionHash} label="Completion" />
                  </div>
                )}
              </div>
            </div>

            {/* Hash Chain Summary */}
            {completionReport.verdict === 'COMPLETE' && completionReport.hashChain.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Hash Chain Summary</h3>
                <div className="space-y-2">
                  {[
                    'Base Prompt',
                    'Plans',
                    'Screens',
                    'Journeys',
                    'Visual Contracts',
                    'Build Prompts',
                    'Execution Plans',
                    'Execution Logs',
                    'Verification',
                    'Completion',
                  ].map((label, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-gray-600">{label}</div>
                      <div className="flex-1">
                        <HashBadge hash={completionReport.hashChain[idx]} label="" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 italic">This verdict is binary and immutable.</p>
                </div>
              </div>
            )}

            {/* Failed Checks (if NOT_COMPLETE) */}
            {completionReport.verdict === 'NOT_COMPLETE' && completionReport.failedChecks && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="font-semibold text-red-900 mb-4">Failed Checks</h3>
                <div className="space-y-4">
                  {completionReport.failedChecks.map((check) => (
                    <div key={check.checkId} className="bg-white rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900">{check.checkName}</div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            check.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {check.severity}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Expected:</span>{' '}
                          <span className="text-gray-900">{check.expected}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Actual:</span>{' '}
                          <span className="text-red-700">{check.actual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-800 font-semibold">
                    System locked. Human intervention required. No retry performed.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-sm">No audit performed yet. Run completion audit to generate report.</p>
          </div>
        )}

        {/* Demo: NOT_COMPLETE State */}
        <div className="mt-6">
          <button
            onClick={() => setShowIncompleteDemo(!showIncompleteDemo)}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            {showIncompleteDemo ? '− Hide' : '+ Show'} NOT_COMPLETE demo
          </button>

          {showIncompleteDemo && (
            <div className="mt-4 p-6 bg-gray-50 border border-gray-300 rounded-lg space-y-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Demonstration: NOT_COMPLETE State
              </div>

              {/* Verdict Card */}
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">❌</div>
                <div className="text-3xl font-bold text-red-900 mb-2">NOT_COMPLETE</div>
                <p className="text-sm text-red-700">Critical checks failed. Human intervention required.</p>
              </div>

              {/* Failed Checks */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="font-semibold text-red-900 mb-4">Failed Checks (Example)</h3>
                <div className="space-y-4">
                  {MOCK_INCOMPLETE_REPORT.failedChecks?.map((check) => (
                    <div key={check.checkId} className="bg-white rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900">{check.checkName}</div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            check.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {check.severity}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Expected:</span>{' '}
                          <span className="text-gray-900">{check.expected}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Actual:</span>{' '}
                          <span className="text-red-700">{check.actual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-800 font-semibold">
                    System locked. Human intervention required. No retry performed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 4. APPROVAL CONTROLS */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Controls</h2>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-purple-900">
            Completion Auditor does not require approval. It issues a verdict. This verdict is binary and immutable.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRunAudit}
            disabled={auditState === 'locked' || auditState === 'auditing' || auditState === 'complete'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {auditState === 'auditing' ? 'Auditing...' : 'Run Final Completion Audit'}
          </button>

          <button
            onClick={handleLockProject}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Lock Project (Stop All Execution)
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <div>• "Run" disabled unless all previous agents are approved</div>
          <div>• After "Run", verdict appears and becomes immutable</div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5. STATE VISUALIZATION */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">State</h2>

        <div className="flex items-center gap-3">
          <StateBadge state={auditState} />
          {completionReport && completionReport.completionHash && (
            <HashBadge hash={completionReport.completionHash} label="Completion Hash" />
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <div>States: locked → ready_to_audit → auditing → complete OR not_complete</div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 6. NEXT-STEP UNLOCK */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">What Happens Next</h2>

        {completionReport?.verdict === 'COMPLETE' ? (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/projects/${projectId}/preview`}
                className="block bg-blue-50 border-2 border-blue-500 rounded-lg p-6 hover:bg-blue-100 transition-colors text-center"
              >
                <div className="text-3xl mb-2">👁️</div>
                <div className="font-semibold text-blue-900 mb-1">Preview App</div>
                <div className="text-xs text-blue-700">Run isolated preview session</div>
              </Link>

              <Link
                href={`/projects/${projectId}/download`}
                className="block bg-green-50 border-2 border-green-500 rounded-lg p-6 hover:bg-green-100 transition-colors text-center"
              >
                <div className="text-3xl mb-2">📦</div>
                <div className="font-semibold text-green-900 mb-1">Download Source Code</div>
                <div className="text-xs text-green-700">Export complete workspace ZIP</div>
              </Link>
            </div>

            {/* What You Own */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">What You Now Own</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-700">Source code</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-700">Build logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-700">Verification evidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-700">Completion certificate (hash)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Disabled Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 text-center opacity-50 cursor-not-allowed">
                <div className="text-3xl mb-2">👁️</div>
                <div className="font-semibold text-gray-600 mb-1">Preview App</div>
                <div className="text-xs text-gray-500">Available after COMPLETE verdict</div>
              </div>

              <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 text-center opacity-50 cursor-not-allowed">
                <div className="text-3xl mb-2">📦</div>
                <div className="font-semibold text-gray-600 mb-1">Download Source Code</div>
                <div className="text-xs text-gray-500">Available after COMPLETE verdict</div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                Preview and Download are only available when the project receives a COMPLETE verdict. Run the
                completion audit first.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function HashBadge({ hash, label }: { hash: string; label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded px-3 py-1.5">
      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      {label && <span className="text-xs text-gray-600">{label}:</span>}
      <code className="text-xs font-mono text-gray-900">{hash}</code>
    </div>
  );
}

function StateBadge({
  state,
}: {
  state: 'locked' | 'ready_to_audit' | 'auditing' | 'complete' | 'not_complete';
}) {
  const config = {
    locked: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Locked' },
    ready_to_audit: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Ready to Audit' },
    auditing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Auditing...' },
    complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'COMPLETE' },
    not_complete: { bg: 'bg-red-100', text: 'text-red-700', label: 'NOT_COMPLETE' },
  }[state];

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text} text-sm font-semibold`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
