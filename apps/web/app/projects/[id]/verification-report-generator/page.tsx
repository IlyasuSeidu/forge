/**
 * Agent 14: Verification Report Generator (Hardened) Frontend Page
 *
 * Generates human-readable Verification Reports by mechanically projecting
 * Verification Results. Does not rerun commands. Does not interpret results.
 * Does not add recommendations. Does not soften failures. Only mirrors
 * verification results into report format.
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

interface StepLedgerEntry {
  stepId: string;
  command: string;
  status: 'PASSED' | 'FAILED' | 'NOT_RUN';
  exitCode: number | null;
  durationMs: number;
}

interface EvidenceEntry {
  stepId: string;
  stdoutExcerpt: string[];
  stderrExcerpt: string[];
  truncated: boolean;
}

interface VerificationReport {
  verificationReportId: string;
  verificationResultHash: string;
  buildPromptHash: string;
  executionPlanHash: string;
  rulesHash: string;
  reportHash: string;
  generatedAt: string;
  generator: string;
  summary: {
    overallStatus: 'PASSED' | 'FAILED';
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    notRunSteps: number;
  };
  stepLedger: StepLedgerEntry[];
  evidence: EvidenceEntry[];
  failureDetails?: {
    failedAtStep: string;
    haltedSteps: string[];
  };
}

// Mock verification reports mirroring the 3 verification results from Agent 13
const MOCK_VERIFICATION_REPORTS: VerificationReport[] = [
  {
    verificationReportId: 'verify-report-001-scaffolding',
    verificationResultHash: 'l1m2n3o4p5q6r7s8',
    buildPromptHash: 'a1b2c3d4e5f6g7h8',
    executionPlanHash: 'j4k5l6m7n8o9p0q1',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    reportHash: 'm1n2o3p4q5r6s7t8',
    generatedAt: '2026-01-14T15:52:00Z',
    generator: 'verification-report-generator-hardened',
    summary: {
      overallStatus: 'PASSED',
      totalSteps: 5,
      passedSteps: 5,
      failedSteps: 0,
      notRunSteps: 0,
    },
    stepLedger: [
      { stepId: 'step-001', command: 'npm run lint', status: 'PASSED', exitCode: 0, durationMs: 3421 },
      { stepId: 'step-002', command: 'npm run typecheck', status: 'PASSED', exitCode: 0, durationMs: 5234 },
      { stepId: 'step-003', command: 'npm run build', status: 'PASSED', exitCode: 0, durationMs: 18765 },
      { stepId: 'step-004', command: 'npm test', status: 'PASSED', exitCode: 0, durationMs: 2145 },
      { stepId: 'step-005', command: 'npm run format:check', status: 'PASSED', exitCode: 0, durationMs: 1876 },
    ],
    evidence: [
      {
        stepId: 'step-001',
        stdoutExcerpt: ['> fitness-habit-tracker@0.1.0 lint', '> next lint', '', '✔ No ESLint warnings or errors'],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-002',
        stdoutExcerpt: ['> fitness-habit-tracker@0.1.0 typecheck', '> tsc --noEmit', '', 'No type errors found'],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-003',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Collecting page data',
          '✓ Finalizing page optimization',
          'Build completed successfully',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-004',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/example.test.ts',
          '✓ basic configuration is valid (12 ms)',
          '',
          'Test Suites: 1 passed, 1 total',
          'Tests:       1 passed, 1 total',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-005',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'All matched files use Prettier code style!',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
    ],
  },
  {
    verificationReportId: 'verify-report-002-ui-screens',
    verificationResultHash: 't9u8v7w6x5y4z3a2',
    buildPromptHash: 'r2s3t4u5v6w7x8y9',
    executionPlanHash: 'z9a8b7c6d5e4f3g2',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    reportHash: 'u1v2w3x4y5z6a7b8',
    generatedAt: '2026-01-14T15:53:00Z',
    generator: 'verification-report-generator-hardened',
    summary: {
      overallStatus: 'PASSED',
      totalSteps: 5,
      passedSteps: 5,
      failedSteps: 0,
      notRunSteps: 0,
    },
    stepLedger: [
      { stepId: 'step-001', command: 'npm run lint', status: 'PASSED', exitCode: 0, durationMs: 4123 },
      { stepId: 'step-002', command: 'npm run typecheck', status: 'PASSED', exitCode: 0, durationMs: 6789 },
      { stepId: 'step-003', command: 'npm run build', status: 'PASSED', exitCode: 0, durationMs: 24531 },
      { stepId: 'step-004', command: 'npm test', status: 'PASSED', exitCode: 0, durationMs: 3456 },
      { stepId: 'step-005', command: 'npm run format:check', status: 'PASSED', exitCode: 0, durationMs: 2134 },
    ],
    evidence: [
      {
        stepId: 'step-001',
        stdoutExcerpt: ['> fitness-habit-tracker@0.1.0 lint', '> next lint', '', '✔ No ESLint warnings or errors'],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-002',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 typecheck',
          '> tsc --noEmit',
          '',
          'Checking 17 React component files...',
          'No type errors found',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-003',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Linting and checking validity of types',
          '✓ Collecting page data',
          '✓ Generating static pages (10/10)',
        ],
        stderrExcerpt: [],
        truncated: true,
      },
      {
        stepId: 'step-004',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/components/HabitCard.test.tsx',
          '✓ renders habit card with correct data (23 ms)',
          '',
          'PASS tests/components/MetricCard.test.tsx',
          '✓ displays metric value correctly (18 ms)',
        ],
        stderrExcerpt: [],
        truncated: true,
      },
      {
        stepId: 'step-005',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'Checking formatting...',
          'All matched files use Prettier code style!',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
    ],
  },
  {
    verificationReportId: 'verify-report-003-auth-data',
    verificationResultHash: 'b1c2d3e4f5g6h7i8',
    buildPromptHash: 'h1i2j3k4l5m6n7o8',
    executionPlanHash: 'p9q8r7s6t5u4v3w2',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    reportHash: 'c9d8e7f6g5h4i3j2',
    generatedAt: '2026-01-14T15:54:00Z',
    generator: 'verification-report-generator-hardened',
    summary: {
      overallStatus: 'PASSED',
      totalSteps: 6,
      passedSteps: 6,
      failedSteps: 0,
      notRunSteps: 0,
    },
    stepLedger: [
      { stepId: 'step-001', command: 'npm run lint', status: 'PASSED', exitCode: 0, durationMs: 3987 },
      { stepId: 'step-002', command: 'npm run typecheck', status: 'PASSED', exitCode: 0, durationMs: 7123 },
      { stepId: 'step-003', command: 'npx prisma validate', status: 'PASSED', exitCode: 0, durationMs: 1654 },
      { stepId: 'step-004', command: 'npm run build', status: 'PASSED', exitCode: 0, durationMs: 26789 },
      { stepId: 'step-005', command: 'npm test', status: 'PASSED', exitCode: 0, durationMs: 4234 },
      { stepId: 'step-006', command: 'npm run format:check', status: 'PASSED', exitCode: 0, durationMs: 2345 },
    ],
    evidence: [
      {
        stepId: 'step-001',
        stdoutExcerpt: ['> fitness-habit-tracker@0.1.0 lint', '> next lint', '', '✔ No ESLint warnings or errors'],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-002',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 typecheck',
          '> tsc --noEmit',
          '',
          'Checking Prisma client types...',
          'Checking API route types...',
          'No type errors found',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-003',
        stdoutExcerpt: [
          'Environment variables loaded from .env',
          'Prisma schema loaded from prisma/schema.prisma',
          '',
          'The schema is valid ✓',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
      {
        stepId: 'step-004',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Linting and checking validity of types',
          '✓ Collecting page data',
          '✓ Generating static pages (10/10)',
        ],
        stderrExcerpt: [],
        truncated: true,
      },
      {
        stepId: 'step-005',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/lib/auth.test.ts',
          '✓ hashes password correctly (45 ms)',
          '✓ validates password correctly (32 ms)',
          '',
          'PASS tests/api/habits.test.ts',
        ],
        stderrExcerpt: [],
        truncated: true,
      },
      {
        stepId: 'step-006',
        stdoutExcerpt: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'All matched files use Prettier code style!',
        ],
        stderrExcerpt: [],
        truncated: false,
      },
    ],
  },
];

export default function VerificationReportGeneratorPage() {
  const [expandedReport, setExpandedReport] = useState<number>(0);
  const [showFailureExample, setShowFailureExample] = useState(false);

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Agent 14: Verification Report Generator (Hardened)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">VERIFICATION_REPORT_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Generates human-readable Verification Reports by mechanically projecting Verification Results. Does not
          rerun commands. Does not interpret results. Does not add recommendations. Does not soften failures. Only
          mirrors verification results into report format.
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
          <InputReference
            label="Verification Result #1"
            hash="l1m2n3o4p5q6r7s8"
            description="Scaffolding (5 steps, all PASSED)"
          />
          <InputReference
            label="Verification Result #2"
            hash="t9u8v7w6x5y4z3a2"
            description="UI Screens (5 steps, all PASSED)"
          />
          <InputReference
            label="Verification Result #3"
            hash="b1c2d3e4f5g6h7i8"
            description="Auth & Data (6 steps, all PASSED)"
          />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Context Isolation:</strong> This agent can only project existing verification outcomes into a
            report. It cannot change results.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact - Verification Reports */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Verification Reports</h3>
          <span className="text-sm text-gray-600">{MOCK_VERIFICATION_REPORTS.length} reports generated</span>
        </div>

        <div className="space-y-3">
          {MOCK_VERIFICATION_REPORTS.map((report, index) => (
            <VerificationReportAccordion
              key={report.verificationReportId}
              report={report}
              index={index}
              expanded={expandedReport === index}
              onToggle={() => setExpandedReport(expandedReport === index ? -1 : index)}
            />
          ))}
        </div>

        {/* Failure Example */}
        <div className="mt-6">
          <button
            onClick={() => setShowFailureExample(!showFailureExample)}
            className="w-full px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-red-900">
              ⚠️ Failure Example (Example only - not this project)
            </span>
            <svg
              className={`w-5 h-5 text-red-700 transition-transform ${showFailureExample ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFailureExample && (
            <div className="mt-3 p-5 bg-red-50 border border-red-200 rounded-lg space-y-4">
              <div>
                <div className="text-sm font-semibold text-red-900 mb-2">
                  Hypothetical Failed Report (TypeCheck Failed):
                </div>
                <div className="text-xs text-red-800 mb-3">
                  This mirrors the failure example from Agent 13:
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overall Status:</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                      FAILED
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Steps:</span>
                    <span className="text-gray-900">4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passed:</span>
                    <span className="text-green-700 font-medium">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="text-red-700 font-medium">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Not Run:</span>
                    <span className="text-gray-500">2</span>
                  </div>
                </div>
              </div>

              {/* Step Ledger */}
              <div className="bg-white rounded p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Step Ledger</h4>
                <div className="space-y-2">
                  <StepLedgerRow
                    entry={{
                      stepId: 'step-001',
                      command: 'npm run lint',
                      status: 'PASSED',
                      exitCode: 0,
                      durationMs: 3421,
                    }}
                  />
                  <StepLedgerRow
                    entry={{
                      stepId: 'step-002',
                      command: 'npm run typecheck',
                      status: 'FAILED',
                      exitCode: 1,
                      durationMs: 4123,
                    }}
                  />
                  <StepLedgerRow
                    entry={{
                      stepId: 'step-003',
                      command: 'npm run build',
                      status: 'NOT_RUN',
                      exitCode: null,
                      durationMs: 0,
                    }}
                  />
                  <StepLedgerRow
                    entry={{
                      stepId: 'step-004',
                      command: 'npm test',
                      status: 'NOT_RUN',
                      exitCode: null,
                      durationMs: 0,
                    }}
                  />
                </div>
              </div>

              {/* Failure Details */}
              <div className="bg-red-100 border border-red-300 rounded p-4">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Failure Details</h4>
                <p className="text-sm text-red-800 mb-2">🛑 FAILED AT step-002. No retry performed.</p>
                <div className="text-xs text-red-700">
                  <div className="font-semibold mb-1">Halted Steps:</div>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>step-003: npm run build</li>
                    <li>step-004: npm test</li>
                  </ul>
                </div>
              </div>

              {/* Evidence Excerpt */}
              <div className="bg-white rounded p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Evidence (step-002)</h4>
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-1">stderr:</div>
                  <div className="bg-gray-900 text-red-400 rounded p-2 font-mono text-xs">
                    <div>app/dashboard/page.tsx:42:7 - error TS2322:</div>
                    <div>Type &apos;string&apos; is not assignable to type &apos;number&apos;.</div>
                    <div></div>
                    <div>42   const count: number = &quot;invalid&quot;;</div>
                    <div>         ~~~~~</div>
                    <div></div>
                    <div>Found 1 error.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Approval Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Verification Reports</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review all verification reports above. Acceptance locks the report hashes and unlocks the Repair Plan
          Generator (even if all tests passed, human approval is required).
        </p>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            Accept Verification Reports & Continue
          </button>
          <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
            Reject Reports (Requires Human Review)
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Awaiting Approval" status="awaiting" />
          <StateRow label="Reports Generated" value="3" status="completed" />
          <StateRow label="Overall Status" value="All PASSED" status="completed" />
          <StateRow label="Hash-Locked" value="No" status="pending" />
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
            <h4 className="font-semibold text-gray-900 mb-1">Next: Repair Plan Generator</h4>
            <p className="text-sm text-gray-600">
              Unlocks after verification reports are accepted. Repair Plan Generator proposes repair options if
              failures were detected (or confirms no repairs needed if all passed).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationReportAccordion({
  report,
  index,
  expanded,
  onToggle,
}: {
  report: VerificationReport;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    PASSED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }[report.summary.overallStatus];

  return (
    <div className={`border ${statusConfig.border} rounded-lg overflow-hidden`}>
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 ${statusConfig.bg} hover:opacity-80 transition-colors flex items-center justify-between text-left`}
      >
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-gray-900">Report {index + 1}</span>
          <span
            className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}
          >
            {report.summary.overallStatus}
          </span>
          <span className="text-sm text-gray-600">{report.summary.totalSteps} steps</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion Body */}
      {expanded && (
        <div className="p-5 space-y-5 bg-white">
          {/* Report Metadata */}
          <div className="bg-gray-50 rounded p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Verification Report ID:</span>
              <span className="font-mono text-xs text-gray-900">{report.verificationReportId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Verification Result Hash:</span>
              <HashBadge hash={report.verificationResultHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Build Prompt Hash:</span>
              <HashBadge hash={report.buildPromptHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Execution Plan Hash:</span>
              <HashBadge hash={report.executionPlanHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Rules Hash:</span>
              <HashBadge hash={report.rulesHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Report Hash:</span>
              <HashBadge hash={report.reportHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Generator:</span>
              <span className="text-xs font-mono text-gray-700">{report.generator}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Generated At:</span>
              <span className="text-xs text-gray-700">{new Date(report.generatedAt).toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Note: Timestamp excluded from hash computation for determinism
            </div>
          </div>

          {/* Section A: Summary */}
          <div className="border border-gray-200 rounded p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Overall Status:</span>
                <span
                  className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}
                >
                  {report.summary.overallStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Steps:</span>
                <span className="text-gray-900">{report.summary.totalSteps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Passed:</span>
                <span className="text-green-700 font-medium">{report.summary.passedSteps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className={report.summary.failedSteps > 0 ? 'text-red-700 font-medium' : 'text-gray-500'}>
                  {report.summary.failedSteps}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Not Run:</span>
                <span className="text-gray-500">{report.summary.notRunSteps}</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
              This report contains no interpretation. It mirrors verification output exactly.
            </div>
          </div>

          {/* Section B: Step Ledger */}
          <div className="border border-gray-200 rounded p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Step Ledger</h4>
            <div className="space-y-2">
              {report.stepLedger.map((entry) => (
                <StepLedgerRow key={entry.stepId} entry={entry} />
              ))}
            </div>
          </div>

          {/* Section C: Evidence */}
          <div className="border border-gray-200 rounded p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Evidence</h4>
            <div className="space-y-4">
              {report.evidence.map((evidence) => (
                <EvidenceCard key={evidence.stepId} evidence={evidence} />
              ))}
            </div>
          </div>

          {/* Section D: Failure Details (only if failed) */}
          {report.failureDetails && (
            <div className="bg-red-100 border border-red-300 rounded p-4">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Failure Details</h4>
              <p className="text-sm text-red-800 mb-2">
                🛑 FAILED AT {report.failureDetails.failedAtStep}. No retry performed.
              </p>
              <div className="text-xs text-red-700">
                <div className="font-semibold mb-1">Halted Steps:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {report.failureDetails.haltedSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Strict Footer */}
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-900 font-medium">
              🔒 This verification report is hash-locked and immutable. Any deviation is a contract violation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepLedgerRow({ entry }: { entry: StepLedgerEntry }) {
  const statusConfig = {
    PASSED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    NOT_RUN: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  }[entry.status];

  return (
    <div className={`flex items-center justify-between p-2 ${statusConfig.bg} border ${statusConfig.border} rounded text-xs`}>
      <div className="flex items-center gap-3">
        <span className="font-mono font-semibold text-gray-500">{entry.stepId}</span>
        <span className="font-mono text-gray-700">{entry.command}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} font-medium rounded border ${statusConfig.border}`}>
          {entry.status}
        </span>
        {entry.exitCode !== null && <span className="text-gray-500">exit {entry.exitCode}</span>}
        {entry.durationMs > 0 && <span className="text-gray-500">{entry.durationMs}ms</span>}
      </div>
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: EvidenceEntry }) {
  return (
    <div className="border border-gray-200 rounded p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">{evidence.stepId}</div>
      {evidence.stdoutExcerpt.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-semibold text-gray-600 mb-1">stdout:</div>
          <div className="bg-gray-900 text-green-400 rounded p-2 font-mono text-xs">
            {evidence.stdoutExcerpt.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
            {evidence.truncated && <div className="text-gray-500 italic mt-1">(truncated)</div>}
          </div>
        </div>
      )}
      {evidence.stderrExcerpt.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">stderr:</div>
          <div className="bg-gray-900 text-red-400 rounded p-2 font-mono text-xs">
            {evidence.stderrExcerpt.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
            {evidence.truncated && <div className="text-gray-500 italic mt-1">(truncated)</div>}
          </div>
        </div>
      )}
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
