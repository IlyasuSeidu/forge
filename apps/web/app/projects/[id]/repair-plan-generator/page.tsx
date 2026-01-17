/**
 * Agent 15: Repair Plan Generator (Human-in-the-loop) Frontend Page
 *
 * Reads FAILED verification results and proposes bounded repair candidates.
 * Does not modify code. Does not execute repairs. Does not approve anything.
 * Does not generate code. Does not choose the best option. Only explains failures
 * and proposes bounded repair candidates requiring explicit human selection.
 *
 * Constitutional Pattern (6 parts):
 * 1. Context Header
 * 2. Inputs Section
 * 3. Generated Artifact
 * 4. Approval Controls (Human Selection)
 * 5. State Visualization
 * 6. Next-Agent Unlock
 */

'use client';

import { useState } from 'react';

interface RepairCandidate {
  candidateId: string;
  title: string;
  boundedFileTargets: string[];
  boundedActions: string[];
  constraints: {
    noNewFiles: boolean;
    noNewDependencies: boolean;
    noScopeExpansion: boolean;
  };
}

interface DraftRepairPlan {
  draftPlanId: string;
  verificationResultHash: string;
  failureSummary: {
    failedStep: string;
    expected: string;
    actual: string;
    evidence: string[];
  };
  candidateRepairs: RepairCandidate[];
  draftPlanHash: string;
}

// Mock draft repair plan for failure demonstration
const MOCK_DRAFT_REPAIR_PLAN: DraftRepairPlan = {
  draftPlanId: 'draft-repair-001-typecheck-failure',
  verificationResultHash: 'example-failed-result-hash',
  failureSummary: {
    failedStep: 'step-002',
    expected: 'All TypeScript files must compile without type errors',
    actual: 'TypeScript compilation failed with 1 error',
    evidence: [
      'app/dashboard/page.tsx:42:7 - error TS2322:',
      "Type 'string' is not assignable to type 'number'.",
      '',
      '42   const count: number = "invalid";',
      '         ~~~~~',
    ],
  },
  candidateRepairs: [
    {
      candidateId: 'repair-1',
      title: 'Fix type mismatch in app/dashboard/page.tsx line 42',
      boundedFileTargets: ['app/dashboard/page.tsx'],
      boundedActions: [
        'Locate line 42 in app/dashboard/page.tsx',
        'Change variable type from number to string, OR',
        'Change value from "invalid" to a valid number',
        'Verify TypeScript compiles without errors',
      ],
      constraints: {
        noNewFiles: true,
        noNewDependencies: true,
        noScopeExpansion: true,
      },
    },
    {
      candidateId: 'repair-2',
      title: 'Remove problematic variable declaration',
      boundedFileTargets: ['app/dashboard/page.tsx'],
      boundedActions: [
        'Locate line 42 in app/dashboard/page.tsx',
        'Remove the entire variable declaration',
        'Update any code that references this variable',
        'Verify TypeScript compiles without errors',
      ],
      constraints: {
        noNewFiles: true,
        noNewDependencies: true,
        noScopeExpansion: true,
      },
    },
    {
      candidateId: 'repair-3',
      title: 'Refactor to use type-safe constant',
      boundedFileTargets: ['app/dashboard/page.tsx'],
      boundedActions: [
        'Locate line 42 in app/dashboard/page.tsx',
        'Replace with properly typed constant declaration',
        'Ensure value matches declared type',
        'Verify TypeScript compiles without errors',
      ],
      constraints: {
        noNewFiles: true,
        noNewDependencies: true,
        noScopeExpansion: true,
      },
    },
  ],
  draftPlanHash: 'n1o2p3q4r5s6t7u8',
};

export default function RepairPlanGeneratorPage() {
  const [showFailureDemo, setShowFailureDemo] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);

  // For demo: verification PASSED, so no repair needed
  const verificationPassed = true;

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Agent 15: Repair Plan Generator (Human-in-the-loop)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">REPAIR_PLANNING_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Reads FAILED verification results and proposes bounded repair candidates. Does not modify code. Does not
          execute repairs. Does not approve anything. Does not generate code. Does not choose the best option. Only
          explains failures and proposes bounded repair candidates requiring explicit human selection.
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
          <InputReference
            label="Verification Result #1"
            hash="l1m2n3o4p5q6r7s8"
            description="Scaffolding (all PASSED)"
          />
          <InputReference
            label="Verification Result #2"
            hash="t9u8v7w6x5y4z3a2"
            description="UI Screens (all PASSED)"
          />
          <InputReference
            label="Verification Result #3"
            hash="b1c2d3e4f5g6h7i8"
            description="Auth & Data (all PASSED)"
          />
          <InputReference
            label="Verification Report #1"
            hash="m1n2o3p4q5r6s7t8"
            description="Secondary reference"
          />
          <InputReference
            label="Verification Report #2"
            hash="u1v2w3x4y5z6a7b8"
            description="Secondary reference"
          />
          <InputReference
            label="Verification Report #3"
            hash="c9d8e7f6g5h4i3j2"
            description="Secondary reference"
          />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Context Isolation:</strong> This agent can only read FAILED verification outputs and propose
            bounded repair options. It cannot execute repairs.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Draft Repair Plan</h3>
        </div>

        {/* STATE A: No Repair Needed (Normal State) */}
        {verificationPassed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-lg font-semibold text-green-900 mb-2">No Repair Plan Required</h4>
                <p className="text-sm text-green-800 mb-3">
                  Verification PASSED. All 16 verification steps executed successfully across all 3 execution plans.
                  No repairs needed.
                </p>
                <div className="bg-white border border-green-200 rounded p-3 text-sm text-green-900">
                  <strong>Result:</strong> DraftRepairPlan is not generated because no failures were detected.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE B: Failure Demonstration (Collapsible) */}
        <div>
          <button
            onClick={() => setShowFailureDemo(!showFailureDemo)}
            className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-orange-900">
              💡 Failure Demonstration (Example Only - Not This Project)
            </span>
            <svg
              className={`w-5 h-5 text-orange-700 transition-transform ${showFailureDemo ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFailureDemo && (
            <div className="mt-3 p-5 bg-orange-50 border border-orange-200 rounded-lg space-y-5">
              <div className="text-xs text-orange-800 mb-4">
                This demonstrates what a Draft Repair Plan would look like if verification had failed:
              </div>

              {/* Draft Plan Metadata */}
              <div className="bg-white rounded p-4 space-y-2.5 text-sm border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Draft Plan ID:</span>
                  <span className="font-mono text-xs text-gray-900">{MOCK_DRAFT_REPAIR_PLAN.draftPlanId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Verification Result Hash:</span>
                  <HashBadge hash={MOCK_DRAFT_REPAIR_PLAN.verificationResultHash} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Draft Plan Hash:</span>
                  <HashBadge hash={MOCK_DRAFT_REPAIR_PLAN.draftPlanHash} />
                </div>
              </div>

              {/* Section A: Failure Summary */}
              <div className="bg-white border border-red-200 rounded p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-3">Failure Summary</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Failed Step:</span>{' '}
                    <span className="font-mono text-xs text-gray-900">
                      {MOCK_DRAFT_REPAIR_PLAN.failureSummary.failedStep}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Expected:</span>{' '}
                    <span className="text-gray-900">{MOCK_DRAFT_REPAIR_PLAN.failureSummary.expected}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Actual:</span>{' '}
                    <span className="text-red-700">{MOCK_DRAFT_REPAIR_PLAN.failureSummary.actual}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium mb-1 block">Evidence:</span>
                    <div className="bg-gray-900 text-red-400 rounded p-2 font-mono text-xs">
                      {MOCK_DRAFT_REPAIR_PLAN.failureSummary.evidence.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Candidate Repairs */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Candidate Repairs ({MOCK_DRAFT_REPAIR_PLAN.candidateRepairs.length} options)
                </h4>
                <div className="space-y-3">
                  {MOCK_DRAFT_REPAIR_PLAN.candidateRepairs.map((candidate) => (
                    <RepairCandidateCard
                      key={candidate.candidateId}
                      candidate={candidate}
                      selected={selectedCandidate === candidate.candidateId}
                      onSelect={() => setSelectedCandidate(candidate.candidateId)}
                    />
                  ))}
                </div>
              </div>

              {/* Section C: Human Selection Required */}
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-2">⚠️ Human Selection Required</h4>
                <p className="text-sm text-red-800">
                  Forge will not apply any repair unless you explicitly select and approve ONE option above.
                </p>
              </div>

              {/* Demo Approval Controls */}
              <div className="bg-white border border-gray-200 rounded p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Demo: Human Selection</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Select one repair candidate above, then approve or reject:
                </p>
                <div className="flex items-center gap-3">
                  <button
                    disabled={!selectedCandidate}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                      selectedCandidate
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Approve Selected Repair Plan
                  </button>
                  <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
                    Reject All Options (Manual Intervention Required)
                  </button>
                </div>
                {selectedCandidate && (
                  <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
                    ✓ Selected: {selectedCandidate}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-100 border border-gray-300 rounded p-3">
                <p className="text-sm text-gray-700 font-medium">
                  📋 This draft repair plan is not executable. It is decision support only.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Approval Controls (Main Project - No Repair Needed) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval Decision</h3>
        <p className="text-sm text-gray-600 mb-4">
          Since all verification steps passed, no repair plan was generated. You can proceed to the next agent.
        </p>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            Acknowledge & Continue (No Repairs Needed)
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Repair Planning State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Awaiting Approval" status="awaiting" />
          <StateRow label="Verification Status" value="All PASSED" status="completed" />
          <StateRow label="Draft Repair Plan" value="Not Generated" status="pending" />
          <StateRow label="Human Selection" value="Not Required" status="pending" />
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
            <h4 className="font-semibold text-gray-900 mb-1">Next: Repair Agent (Hardened)</h4>
            <p className="text-sm text-gray-600">
              Unlocks after approval. If repairs are needed, Repair Agent executes the approved repair plan. If no
              repairs needed (like this project), it confirms no action required and proceeds to Completion
              Auditor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairCandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: RepairCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        selected
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={selected}
          onChange={onSelect}
          className="mt-1 w-4 h-4 text-green-600"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-semibold text-gray-500">{candidate.candidateId}</span>
            <h5 className="text-sm font-semibold text-gray-900">{candidate.title}</h5>
          </div>

          {/* Bounded File Targets */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-1">
              Bounded File Targets ({candidate.boundedFileTargets.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {candidate.boundedFileTargets.map((file) => (
                <span key={file} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-mono rounded">
                  {file}
                </span>
              ))}
            </div>
          </div>

          {/* Bounded Actions */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-700 mb-1">
              Bounded Actions ({candidate.boundedActions.length}):
            </div>
            <ul className="space-y-1">
              {candidate.boundedActions.map((action, idx) => (
                <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Constraints */}
          <div className="flex items-center gap-3 text-xs">
            <ConstraintBadge label="No New Files" enabled={candidate.constraints.noNewFiles} />
            <ConstraintBadge label="No New Dependencies" enabled={candidate.constraints.noNewDependencies} />
            <ConstraintBadge label="No Scope Expansion" enabled={candidate.constraints.noScopeExpansion} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConstraintBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {enabled && (
        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className={enabled ? 'text-green-700' : 'text-gray-400'}>{label}</span>
    </div>
  );
}

function InputReference({ label, hash, description }: { label: string; hash: string; description: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <HashBadge hash={hash} />
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
