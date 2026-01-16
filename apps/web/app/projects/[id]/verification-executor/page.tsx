/**
 * Agent 13: Verification Executor (Hardened) Frontend Page
 *
 * Runs verification commands exactly as declared in Build Prompt/Execution Plan
 * verification criteria. Does not interpret results. Does not retry. Does not fix.
 * Does not modify commands. Executes steps in order and records raw outputs.
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

interface VerificationStep {
  stepId: string;
  criterion: string;
  command: string;
  status: 'PASSED' | 'FAILED' | 'NOT_RUN';
  exitCode: number | null;
  durationMs: number;
  stdout: string[];
  stderr: string[];
}

interface VerificationResult {
  verificationResultId: string;
  buildPromptHash: string;
  executionPlanHash: string;
  executionLogHash: string;
  rulesHash: string;
  resultHash: string;
  executedAt: string;
  overallStatus: 'PASSED' | 'FAILED';
  verifier: string;
  steps: VerificationStep[];
}

// Mock verification results showing successful verification for all 3 plans
const MOCK_VERIFICATION_RESULTS: VerificationResult[] = [
  {
    verificationResultId: 'verify-result-001-scaffolding',
    buildPromptHash: 'a1b2c3d4e5f6g7h8',
    executionPlanHash: 'j4k5l6m7n8o9p0q1',
    executionLogHash: 'k1l2m3n4o5p6q7r8',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    resultHash: 'l1m2n3o4p5q6r7s8',
    executedAt: '2026-01-14T15:49:00Z',
    overallStatus: 'PASSED',
    verifier: 'verification-executor-hardened',
    steps: [
      {
        stepId: 'step-001',
        criterion: 'All files must pass ESLint without errors or warnings',
        command: 'npm run lint',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 3421,
        stdout: [
          '> fitness-habit-tracker@0.1.0 lint',
          '> next lint',
          '',
          '✔ No ESLint warnings or errors',
        ],
        stderr: [],
      },
      {
        stepId: 'step-002',
        criterion: 'All TypeScript files must compile without type errors',
        command: 'npm run typecheck',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 5234,
        stdout: [
          '> fitness-habit-tracker@0.1.0 typecheck',
          '> tsc --noEmit',
          '',
          'No type errors found',
        ],
        stderr: [],
      },
      {
        stepId: 'step-003',
        criterion: 'Application must build successfully for production',
        command: 'npm run build',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 18765,
        stdout: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Collecting page data',
          '✓ Finalizing page optimization',
          'Build completed successfully',
        ],
        stderr: [],
      },
      {
        stepId: 'step-004',
        criterion: 'All unit tests must pass',
        command: 'npm test',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 2145,
        stdout: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/example.test.ts',
          '✓ basic configuration is valid (12 ms)',
          '',
          'Test Suites: 1 passed, 1 total',
          'Tests:       1 passed, 1 total',
        ],
        stderr: [],
      },
      {
        stepId: 'step-005',
        criterion: 'Code formatting must match project standards',
        command: 'npm run format:check',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 1876,
        stdout: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'All matched files use Prettier code style!',
        ],
        stderr: [],
      },
    ],
  },
  {
    verificationResultId: 'verify-result-002-ui-screens',
    buildPromptHash: 'r2s3t4u5v6w7x8y9',
    executionPlanHash: 'z9a8b7c6d5e4f3g2',
    executionLogHash: 's1t2u3v4w5x6y7z8',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    resultHash: 't9u8v7w6x5y4z3a2',
    executedAt: '2026-01-14T15:50:00Z',
    overallStatus: 'PASSED',
    verifier: 'verification-executor-hardened',
    steps: [
      {
        stepId: 'step-001',
        criterion: 'All files must pass ESLint without errors or warnings',
        command: 'npm run lint',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 4123,
        stdout: [
          '> fitness-habit-tracker@0.1.0 lint',
          '> next lint',
          '',
          '✔ No ESLint warnings or errors',
        ],
        stderr: [],
      },
      {
        stepId: 'step-002',
        criterion: 'All TypeScript files must compile without type errors',
        command: 'npm run typecheck',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 6789,
        stdout: [
          '> fitness-habit-tracker@0.1.0 typecheck',
          '> tsc --noEmit',
          '',
          'Checking 17 React component files...',
          'No type errors found',
        ],
        stderr: [],
      },
      {
        stepId: 'step-003',
        criterion: 'Application must build successfully for production',
        command: 'npm run build',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 24531,
        stdout: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Linting and checking validity of types',
          '✓ Collecting page data',
          '✓ Generating static pages (10/10)',
          '✓ Finalizing page optimization',
          'Route (app)                              Size',
          '/',
          '  ├ ○ /                                 1.2 kB',
          '  ├ ○ /dashboard                        2.4 kB',
          '  └ ○ /habits                           1.8 kB',
          'Build completed successfully',
        ],
        stderr: [],
      },
      {
        stepId: 'step-004',
        criterion: 'All unit tests must pass',
        command: 'npm test',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 3456,
        stdout: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/components/HabitCard.test.tsx',
          '✓ renders habit card with correct data (23 ms)',
          '',
          'PASS tests/components/MetricCard.test.tsx',
          '✓ displays metric value correctly (18 ms)',
          '',
          'Test Suites: 2 passed, 2 total',
          'Tests:       2 passed, 2 total',
        ],
        stderr: [],
      },
      {
        stepId: 'step-005',
        criterion: 'Code formatting must match project standards',
        command: 'npm run format:check',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 2134,
        stdout: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'Checking formatting...',
          'All matched files use Prettier code style!',
        ],
        stderr: [],
      },
    ],
  },
  {
    verificationResultId: 'verify-result-003-auth-data',
    buildPromptHash: 'h1i2j3k4l5m6n7o8',
    executionPlanHash: 'p9q8r7s6t5u4v3w2',
    executionLogHash: 'a9b8c7d6e5f4g3h2',
    rulesHash: 'i3d9e6f4b1a5c7d3',
    resultHash: 'b1c2d3e4f5g6h7i8',
    executedAt: '2026-01-14T15:51:00Z',
    overallStatus: 'PASSED',
    verifier: 'verification-executor-hardened',
    steps: [
      {
        stepId: 'step-001',
        criterion: 'All files must pass ESLint without errors or warnings',
        command: 'npm run lint',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 3987,
        stdout: [
          '> fitness-habit-tracker@0.1.0 lint',
          '> next lint',
          '',
          '✔ No ESLint warnings or errors',
        ],
        stderr: [],
      },
      {
        stepId: 'step-002',
        criterion: 'All TypeScript files must compile without type errors',
        command: 'npm run typecheck',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 7123,
        stdout: [
          '> fitness-habit-tracker@0.1.0 typecheck',
          '> tsc --noEmit',
          '',
          'Checking Prisma client types...',
          'Checking API route types...',
          'No type errors found',
        ],
        stderr: [],
      },
      {
        stepId: 'step-003',
        criterion: 'Prisma schema must be valid',
        command: 'npx prisma validate',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 1654,
        stdout: [
          'Environment variables loaded from .env',
          'Prisma schema loaded from prisma/schema.prisma',
          '',
          'The schema is valid ✓',
        ],
        stderr: [],
      },
      {
        stepId: 'step-004',
        criterion: 'Application must build successfully for production',
        command: 'npm run build',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 26789,
        stdout: [
          '> fitness-habit-tracker@0.1.0 build',
          '> next build',
          '',
          '✓ Creating an optimized production build',
          '✓ Compiled successfully',
          '✓ Linting and checking validity of types',
          '✓ Collecting page data',
          '✓ Generating static pages (10/10)',
          '✓ Collecting build traces',
          '✓ Finalizing page optimization',
          'Build completed successfully',
        ],
        stderr: [],
      },
      {
        stepId: 'step-005',
        criterion: 'All unit tests must pass',
        command: 'npm test',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 4234,
        stdout: [
          '> fitness-habit-tracker@0.1.0 test',
          '> jest',
          '',
          'PASS tests/lib/auth.test.ts',
          '✓ hashes password correctly (45 ms)',
          '✓ validates password correctly (32 ms)',
          '',
          'PASS tests/api/habits.test.ts',
          '✓ creates habit successfully (28 ms)',
          '',
          'Test Suites: 2 passed, 2 total',
          'Tests:       3 passed, 3 total',
        ],
        stderr: [],
      },
      {
        stepId: 'step-006',
        criterion: 'Code formatting must match project standards',
        command: 'npm run format:check',
        status: 'PASSED',
        exitCode: 0,
        durationMs: 2345,
        stdout: [
          '> fitness-habit-tracker@0.1.0 format:check',
          '> prettier --check .',
          '',
          'All matched files use Prettier code style!',
        ],
        stderr: [],
      },
    ],
  },
];

export default function VerificationExecutorPage() {
  const [expandedResult, setExpandedResult] = useState<number>(0);
  const [showFailureExample, setShowFailureExample] = useState(false);

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent 13: Verification Executor (Hardened)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">VERIFICATION_EXECUTION_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Runs verification commands exactly as declared in Build Prompt and Execution Plan verification criteria.
          Does not interpret results. Does not retry. Does not fix. Does not modify commands. Executes steps in
          order and records raw outputs.
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
          <InputReference label="Execution Log #1" hash="k1l2m3n4o5p6q7r8" description="Scaffolding" />
          <InputReference label="Execution Log #2" hash="s1t2u3v4w5x6y7z8" description="UI Screens" />
          <InputReference label="Execution Log #3" hash="a9b8c7d6e5f4g3h2" description="Auth & Data" />
          <InputReference label="Execution Plan #1" hash="j4k5l6m7n8o9p0q1" description="Scaffolding" />
          <InputReference label="Execution Plan #2" hash="z9a8b7c6d5e4f3g2" description="UI Screens" />
          <InputReference label="Execution Plan #3" hash="p9q8r7s6t5u4v3w2" description="Auth & Data" />
          <InputReference
            label="Build Prompt #1"
            hash="a1b2c3d4e5f6g7h8"
            description="Project Scaffolding & Dependencies"
          />
          <InputReference
            label="Build Prompt #2"
            hash="r2s3t4u5v6w7x8y9"
            description="UI Screens (Login, Dashboard, Habits, etc.)"
          />
          <InputReference
            label="Build Prompt #3"
            hash="h1i2j3k4l5m6n7o8"
            description="Auth & Data Layer (Prisma, bcrypt)"
          />
          <InputReference label="Project Rules" hash="i3d9e6f4b1a5c7d3" description="Tech stack rules" />
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Context Isolation:</strong> This agent can only execute verification steps that already exist
            in approved contracts.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact - Verification Results */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Verification Results</h3>
          <span className="text-sm text-gray-600">{MOCK_VERIFICATION_RESULTS.length} results generated</span>
        </div>

        <div className="space-y-3">
          {MOCK_VERIFICATION_RESULTS.map((result, index) => (
            <VerificationResultAccordion
              key={result.verificationResultId}
              result={result}
              index={index}
              expanded={expandedResult === index}
              onToggle={() => setExpandedResult(expandedResult === index ? -1 : index)}
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
            <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="mb-3">
                <div className="text-sm font-semibold text-red-900 mb-2">
                  Hypothetical Failure Scenario (TypeCheck Failed):
                </div>
                <div className="text-xs text-red-800 mb-3">
                  If step-002 (typecheck) failed, system would halt immediately:
                </div>
              </div>
              <div className="space-y-2">
                <StepCard
                  step={{
                    stepId: 'step-001',
                    criterion: 'All files must pass ESLint without errors or warnings',
                    command: 'npm run lint',
                    status: 'PASSED',
                    exitCode: 0,
                    durationMs: 3421,
                    stdout: ['> next lint', '✔ No ESLint warnings or errors'],
                    stderr: [],
                  }}
                />
                <StepCard
                  step={{
                    stepId: 'step-002',
                    criterion: 'All TypeScript files must compile without type errors',
                    command: 'npm run typecheck',
                    status: 'FAILED',
                    exitCode: 1,
                    durationMs: 4123,
                    stdout: ['> tsc --noEmit'],
                    stderr: [
                      'app/dashboard/page.tsx:42:7 - error TS2322:',
                      "Type 'string' is not assignable to type 'number'.",
                      '',
                      '42   const count: number = "invalid";',
                      '         ~~~~~',
                      '',
                      'Found 1 error.',
                    ],
                  }}
                />
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm font-semibold text-red-900 mb-1">🛑 FAILED AT step-002</p>
                  <p className="text-xs text-red-800 mb-2">No retry performed. No repairs executed automatically.</p>
                </div>
                <StepCard
                  step={{
                    stepId: 'step-003',
                    criterion: 'Application must build successfully for production',
                    command: 'npm run build',
                    status: 'NOT_RUN',
                    exitCode: null,
                    durationMs: 0,
                    stdout: [],
                    stderr: ['NOT RUN (halted)'],
                  }}
                />
                <StepCard
                  step={{
                    stepId: 'step-004',
                    criterion: 'All unit tests must pass',
                    command: 'npm test',
                    status: 'NOT_RUN',
                    exitCode: null,
                    durationMs: 0,
                    stdout: [],
                    stderr: ['NOT RUN (halted)'],
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Approval Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Verification Results</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review all verification results above. Acceptance locks the result hashes and unlocks the Verification
          Report Generator.
        </p>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            Accept Verification Results & Continue
          </button>
          <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
            Reject Verification Results (Requires Human Review)
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Awaiting Approval" status="awaiting" />
          <StateRow label="Results Generated" value="3" status="completed" />
          <StateRow label="Total Steps Executed" value="16" status="completed" />
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
            <h4 className="font-semibold text-gray-900 mb-1">Next: Verification Report Generator</h4>
            <p className="text-sm text-gray-600">
              Unlocks after verification results are accepted. Verification Report Generator projects verification
              results into a human-readable report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerificationResultAccordion({
  result,
  index,
  expanded,
  onToggle,
}: {
  result: VerificationResult;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    PASSED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  }[result.overallStatus];

  return (
    <div className={`border ${statusConfig.border} rounded-lg overflow-hidden`}>
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 ${statusConfig.bg} hover:opacity-80 transition-colors flex items-center justify-between text-left`}
      >
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-gray-900">Result {index + 1}</span>
          <span
            className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}
          >
            {result.overallStatus}
          </span>
          <span className="text-sm text-gray-600">{result.steps.length} steps</span>
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
          {/* Result Metadata */}
          <div className="bg-gray-50 rounded p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Verification Result ID:</span>
              <span className="font-mono text-xs text-gray-900">{result.verificationResultId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Build Prompt Hash:</span>
              <HashBadge hash={result.buildPromptHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Execution Plan Hash:</span>
              <HashBadge hash={result.executionPlanHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Execution Log Hash:</span>
              <HashBadge hash={result.executionLogHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Rules Hash:</span>
              <HashBadge hash={result.rulesHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Result Hash:</span>
              <HashBadge hash={result.resultHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Verifier:</span>
              <span className="text-xs font-mono text-gray-700">{result.verifier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Executed At:</span>
              <span className="text-xs text-gray-700">{new Date(result.executedAt).toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Note: Timestamp excluded from hash computation for determinism
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Verification Steps ({result.steps.length} steps)
            </h4>
            <div className="space-y-2">
              {result.steps.map((step) => (
                <StepCard key={step.stepId} step={step} />
              ))}
            </div>
          </div>

          {/* Strict Footer */}
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-900 font-medium">
              🔒 This verification result is hash-locked and immutable. Any deviation is a contract violation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step }: { step: VerificationStep }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    PASSED: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    NOT_RUN: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  }[step.status];

  return (
    <div className={`border ${statusConfig.border} rounded-lg p-3 ${statusConfig.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-gray-500">{step.stepId}</span>
            <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}>
              {step.status}
            </span>
            {step.exitCode !== null && (
              <span className="text-xs text-gray-500">exit {step.exitCode}</span>
            )}
            {step.durationMs > 0 && (
              <span className="text-xs text-gray-500">{step.durationMs}ms</span>
            )}
          </div>
          <div className="text-sm text-gray-900 mb-1">{step.criterion}</div>
          <div className="text-xs font-mono text-gray-600">$ {step.command}</div>
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
