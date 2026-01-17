/**
 * Agent 12: Forge Implementer (Hardened) Frontend Page
 *
 * Executes approved Execution Plans. Does not think. Does not optimize.
 * Does not reorder. Does not retry. Executes tasks exactly once, in order,
 * and halts immediately on failure.
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

interface TaskExecutionEntry {
  taskId: string;
  type: 'CREATE_FILE' | 'MODIFY_FILE' | 'ADD_DEPENDENCY';
  target: string;
  status: 'success' | 'failure' | 'skipped';
  verification: 'passed' | 'failed' | 'not_run';
  stdout: string[];
  stderr: string[];
  durationMs: number;
}

interface ExecutionLog {
  executionLogId: string;
  executionPlanHash: string;
  buildPromptHash: string;
  logHash: string;
  startedAt: string;
  finishedAt: string;
  overallStatus: 'SUCCESS' | 'FAILURE' | 'HALTED';
  tasksExecutedCount: number;
  totalTasksCount: number;
  taskEntries: TaskExecutionEntry[];
  filesCreated: string[];
  filesModified: string[];
  dependenciesInstalled: string[];
}

// Mock execution logs showing successful execution of all 3 plans
const MOCK_EXECUTION_LOGS: ExecutionLog[] = [
  {
    executionLogId: 'exec-log-001-scaffolding',
    executionPlanHash: 'j4k5l6m7n8o9p0q1',
    buildPromptHash: 'a1b2c3d4e5f6g7h8',
    logHash: 'k1l2m3n4o5p6q7r8',
    startedAt: '2026-01-14T15:20:00Z',
    finishedAt: '2026-01-14T15:28:00Z',
    overallStatus: 'SUCCESS',
    tasksExecutedCount: 17,
    totalTasksCount: 17,
    filesCreated: [
      '.eslintrc.json',
      '.gitignore',
      'app/globals.css',
      'next.config.js',
      'package.json',
      'postcss.config.js',
      'tailwind.config.ts',
      'tsconfig.json',
    ],
    filesModified: [],
    dependenciesInstalled: [
      '@types/node@^20.10.0',
      '@types/react@^18.2.0',
      'autoprefixer@^10.4.0',
      'next@^14.0.4',
      'postcss@^8.4.0',
      'react-dom@^18.2.0',
      'react@^18.2.0',
      'tailwindcss@^3.4.0',
      'typescript@^5.3.0',
    ],
    taskEntries: [
      {
        taskId: 'task-001',
        type: 'ADD_DEPENDENCY',
        target: 'next@^14.0.4',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install next@^14.0.4', 'added 1 package', 'package.json updated'],
        stderr: [],
        durationMs: 1243,
      },
      {
        taskId: 'task-002',
        type: 'ADD_DEPENDENCY',
        target: 'react@^18.2.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install react@^18.2.0', 'added 1 package'],
        stderr: [],
        durationMs: 987,
      },
      {
        taskId: 'task-003',
        type: 'ADD_DEPENDENCY',
        target: 'react-dom@^18.2.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install react-dom@^18.2.0', 'added 1 package'],
        stderr: [],
        durationMs: 1021,
      },
      {
        taskId: 'task-004',
        type: 'ADD_DEPENDENCY',
        target: 'typescript@^5.3.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install typescript@^5.3.0', 'added 1 package'],
        stderr: [],
        durationMs: 1156,
      },
      {
        taskId: 'task-005',
        type: 'ADD_DEPENDENCY',
        target: 'tailwindcss@^3.4.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install tailwindcss@^3.4.0', 'added 1 package'],
        stderr: [],
        durationMs: 1432,
      },
      {
        taskId: 'task-006',
        type: 'ADD_DEPENDENCY',
        target: 'postcss@^8.4.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install postcss@^8.4.0', 'added 1 package'],
        stderr: [],
        durationMs: 876,
      },
      {
        taskId: 'task-007',
        type: 'ADD_DEPENDENCY',
        target: 'autoprefixer@^10.4.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install autoprefixer@^10.4.0', 'added 1 package'],
        stderr: [],
        durationMs: 921,
      },
      {
        taskId: 'task-008',
        type: 'ADD_DEPENDENCY',
        target: '@types/node@^20.10.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install @types/node@^20.10.0', 'added 1 package'],
        stderr: [],
        durationMs: 1087,
      },
      {
        taskId: 'task-009',
        type: 'ADD_DEPENDENCY',
        target: '@types/react@^18.2.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install @types/react@^18.2.0', 'added 1 package'],
        stderr: [],
        durationMs: 1198,
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: '.eslintrc.json',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: .eslintrc.json', 'Valid JSON syntax verified', 'ESLint config parsed successfully'],
        stderr: [],
        durationMs: 234,
      },
      {
        taskId: 'task-011',
        type: 'CREATE_FILE',
        target: '.gitignore',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: .gitignore', 'Contains node_modules', 'Contains .next'],
        stderr: [],
        durationMs: 156,
      },
      {
        taskId: 'task-012',
        type: 'CREATE_FILE',
        target: 'next.config.js',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: next.config.js', 'Valid Next.js config exported'],
        stderr: [],
        durationMs: 189,
      },
      {
        taskId: 'task-013',
        type: 'CREATE_FILE',
        target: 'package.json',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: package.json', 'Valid JSON syntax verified', 'Scripts present: dev, build, start'],
        stderr: [],
        durationMs: 267,
      },
      {
        taskId: 'task-014',
        type: 'CREATE_FILE',
        target: 'postcss.config.js',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: postcss.config.js', 'Tailwind plugin referenced'],
        stderr: [],
        durationMs: 178,
      },
      {
        taskId: 'task-015',
        type: 'CREATE_FILE',
        target: 'tailwind.config.ts',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: tailwind.config.ts', 'Content paths defined', 'TypeScript compiled without errors'],
        stderr: [],
        durationMs: 312,
      },
      {
        taskId: 'task-016',
        type: 'CREATE_FILE',
        target: 'tsconfig.json',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: tsconfig.json', 'Valid JSON syntax verified', 'Strict mode enabled'],
        stderr: [],
        durationMs: 245,
      },
      {
        taskId: 'task-017',
        type: 'CREATE_FILE',
        target: 'app/globals.css',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: app/globals.css', 'Tailwind directives present'],
        stderr: [],
        durationMs: 198,
      },
    ],
  },
  {
    executionLogId: 'exec-log-002-ui-screens',
    executionPlanHash: 'z9a8b7c6d5e4f3g2',
    buildPromptHash: 'r2s3t4u5v6w7x8y9',
    logHash: 's1t2u3v4w5x6y7z8',
    startedAt: '2026-01-14T15:29:00Z',
    finishedAt: '2026-01-14T15:41:00Z',
    overallStatus: 'SUCCESS',
    tasksExecutedCount: 19,
    totalTasksCount: 19,
    filesCreated: [
      'app/(auth)/login/page.tsx',
      'app/(auth)/signup/page.tsx',
      'app/dashboard/page.tsx',
      'app/habits/new/page.tsx',
      'app/habits/page.tsx',
      'app/layout.tsx',
      'app/page.tsx',
      'app/profile/page.tsx',
      'app/settings/page.tsx',
      'components/HabitCard.tsx',
      'components/HabitForm.tsx',
      'components/MetricCard.tsx',
      'components/Navbar.tsx',
      'components/StreakChart.tsx',
      'lib/types.ts',
      'lib/utils.ts',
      'public/logo.svg',
    ],
    filesModified: ['tailwind.config.ts', 'tsconfig.json'],
    dependenciesInstalled: [],
    taskEntries: [
      {
        taskId: 'task-001',
        type: 'CREATE_FILE',
        target: 'app/(auth)/login/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/(auth)/login/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 456,
      },
      {
        taskId: 'task-002',
        type: 'CREATE_FILE',
        target: 'app/(auth)/signup/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/(auth)/signup/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 423,
      },
      {
        taskId: 'task-003',
        type: 'CREATE_FILE',
        target: 'app/dashboard/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/dashboard/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 512,
      },
      {
        taskId: 'task-004',
        type: 'CREATE_FILE',
        target: 'app/habits/new/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/habits/new/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 489,
      },
      {
        taskId: 'task-005',
        type: 'CREATE_FILE',
        target: 'app/habits/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/habits/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 467,
      },
      {
        taskId: 'task-006',
        type: 'CREATE_FILE',
        target: 'app/layout.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/layout.tsx',
          'Default RootLayout component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 534,
      },
      {
        taskId: 'task-007',
        type: 'CREATE_FILE',
        target: 'app/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 501,
      },
      {
        taskId: 'task-008',
        type: 'CREATE_FILE',
        target: 'app/profile/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/profile/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 478,
      },
      {
        taskId: 'task-009',
        type: 'CREATE_FILE',
        target: 'app/settings/page.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/settings/page.tsx',
          'Default React component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 445,
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: 'components/HabitCard.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: components/HabitCard.tsx',
          'HabitCard component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 389,
      },
      {
        taskId: 'task-011',
        type: 'CREATE_FILE',
        target: 'components/HabitForm.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: components/HabitForm.tsx',
          'HabitForm component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 412,
      },
      {
        taskId: 'task-012',
        type: 'CREATE_FILE',
        target: 'components/MetricCard.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: components/MetricCard.tsx',
          'MetricCard component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 356,
      },
      {
        taskId: 'task-013',
        type: 'CREATE_FILE',
        target: 'components/Navbar.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: components/Navbar.tsx',
          'Navbar component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 398,
      },
      {
        taskId: 'task-014',
        type: 'CREATE_FILE',
        target: 'components/StreakChart.tsx',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: components/StreakChart.tsx',
          'StreakChart component exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 423,
      },
      {
        taskId: 'task-015',
        type: 'CREATE_FILE',
        target: 'lib/types.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: lib/types.ts',
          'TypeScript type definitions exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 289,
      },
      {
        taskId: 'task-016',
        type: 'CREATE_FILE',
        target: 'lib/utils.ts',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: lib/utils.ts', 'Utility functions exported', 'TypeScript compiled without errors'],
        stderr: [],
        durationMs: 312,
      },
      {
        taskId: 'task-017',
        type: 'CREATE_FILE',
        target: 'public/logo.svg',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: public/logo.svg', 'Valid SVG syntax verified'],
        stderr: [],
        durationMs: 167,
      },
      {
        taskId: 'task-018',
        type: 'MODIFY_FILE',
        target: 'tailwind.config.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File modified: tailwind.config.ts',
          'Existing configuration preserved',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 278,
      },
      {
        taskId: 'task-019',
        type: 'MODIFY_FILE',
        target: 'tsconfig.json',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File modified: tsconfig.json',
          'Existing configuration preserved',
          'Valid JSON syntax verified',
        ],
        stderr: [],
        durationMs: 234,
      },
    ],
  },
  {
    executionLogId: 'exec-log-003-auth-data',
    executionPlanHash: 'p9q8r7s6t5u4v3w2',
    buildPromptHash: 'h1i2j3k4l5m6n7o8',
    logHash: 'a9b8c7d6e5f4g3h2',
    startedAt: '2026-01-14T15:42:00Z',
    finishedAt: '2026-01-14T15:48:00Z',
    overallStatus: 'SUCCESS',
    tasksExecutedCount: 12,
    totalTasksCount: 12,
    filesCreated: [
      '.env.example',
      'app/api/auth/login/route.ts',
      'app/api/auth/signup/route.ts',
      'app/api/habits/route.ts',
      'lib/auth.ts',
      'lib/db.ts',
      'prisma/schema.prisma',
    ],
    filesModified: ['package.json', 'tsconfig.json'],
    dependenciesInstalled: ['@prisma/client@^5.7.0', 'bcryptjs@^2.4.3', 'prisma@^5.7.0'],
    taskEntries: [
      {
        taskId: 'task-001',
        type: 'ADD_DEPENDENCY',
        target: '@prisma/client@^5.7.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install @prisma/client@^5.7.0', 'added 1 package'],
        stderr: [],
        durationMs: 1567,
      },
      {
        taskId: 'task-002',
        type: 'ADD_DEPENDENCY',
        target: 'prisma@^5.7.0',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install prisma@^5.7.0', 'added 1 package'],
        stderr: [],
        durationMs: 1423,
      },
      {
        taskId: 'task-003',
        type: 'ADD_DEPENDENCY',
        target: 'bcryptjs@^2.4.3',
        status: 'success',
        verification: 'passed',
        stdout: ['npm install bcryptjs@^2.4.3', 'added 1 package'],
        stderr: [],
        durationMs: 987,
      },
      {
        taskId: 'task-004',
        type: 'CREATE_FILE',
        target: '.env.example',
        status: 'success',
        verification: 'passed',
        stdout: ['File created: .env.example', 'Contains DATABASE_URL'],
        stderr: [],
        durationMs: 145,
      },
      {
        taskId: 'task-005',
        type: 'CREATE_FILE',
        target: 'lib/auth.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: lib/auth.ts',
          'Authentication functions exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 389,
      },
      {
        taskId: 'task-006',
        type: 'CREATE_FILE',
        target: 'lib/db.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: lib/db.ts',
          'Prisma client instance exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 312,
      },
      {
        taskId: 'task-007',
        type: 'CREATE_FILE',
        target: 'prisma/schema.prisma',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: prisma/schema.prisma',
          'User and Habit models defined',
          'prisma validate passed',
        ],
        stderr: [],
        durationMs: 456,
      },
      {
        taskId: 'task-008',
        type: 'CREATE_FILE',
        target: 'app/api/auth/login/route.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/api/auth/login/route.ts',
          'POST handler exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 423,
      },
      {
        taskId: 'task-009',
        type: 'CREATE_FILE',
        target: 'app/api/auth/signup/route.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/api/auth/signup/route.ts',
          'POST handler exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 401,
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: 'app/api/habits/route.ts',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File created: app/api/habits/route.ts',
          'GET and POST handlers exported',
          'TypeScript compiled without errors',
        ],
        stderr: [],
        durationMs: 467,
      },
      {
        taskId: 'task-011',
        type: 'MODIFY_FILE',
        target: 'package.json',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File modified: package.json',
          'Prisma scripts added',
          'Valid JSON syntax verified',
        ],
        stderr: [],
        durationMs: 234,
      },
      {
        taskId: 'task-012',
        type: 'MODIFY_FILE',
        target: 'tsconfig.json',
        status: 'success',
        verification: 'passed',
        stdout: [
          'File modified: tsconfig.json',
          'Prisma type paths added',
          'Valid JSON syntax verified',
        ],
        stderr: [],
        durationMs: 267,
      },
    ],
  },
];

export default function ForgeImplementerPage() {
  // Get agent state from context
  const { currentState } = useAgentState('forge-implementer');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  const [expandedLog, setExpandedLog] = useState<number>(0);
  const [showFailureExample, setShowFailureExample] = useState(false);

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent 12: Forge Implementer (Hardened)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">FORGE_IMPLEMENTATION_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Executes approved Execution Plans. Does not think. Does not optimize. Does not reorder. Does not retry.
          Executes tasks exactly once, in order, and halts immediately on failure.
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
          <InputReference
            label="Execution Plan #1"
            hash="j4k5l6m7n8o9p0q1"
            description="Scaffolding (17 tasks)"
          />
          <InputReference
            label="Execution Plan #2"
            hash="z9a8b7c6d5e4f3g2"
            description="UI Screens (19 tasks)"
          />
          <InputReference label="Execution Plan #3" hash="p9q8r7s6t5u4v3w2" description="Auth & Data (12 tasks)" />
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
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-900">
            <strong>Context Isolation:</strong> This agent can only execute tasks listed in approved execution
            plans.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact - Execution Logs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Execution Logs</h3>
          <span className="text-sm text-gray-600">{MOCK_EXECUTION_LOGS.length} logs generated</span>
        </div>

        <div className="space-y-3">
          {MOCK_EXECUTION_LOGS.map((log, index) => (
            <ExecutionLogAccordion
              key={log.executionLogId}
              log={log}
              index={index}
              expanded={expandedLog === index}
              onToggle={() => setExpandedLog(expandedLog === index ? -1 : index)}
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
                <div className="text-sm font-semibold text-red-900 mb-2">Hypothetical Failure Scenario:</div>
                <div className="text-xs text-red-800 mb-3">
                  If task-005 failed verification, the system would halt immediately:
                </div>
              </div>
              <div className="space-y-2">
                <TaskEntryCard
                  entry={{
                    taskId: 'task-005',
                    type: 'CREATE_FILE',
                    target: 'app/dashboard/page.tsx',
                    status: 'failure',
                    verification: 'failed',
                    stdout: ['File created: app/dashboard/page.tsx'],
                    stderr: [
                      'ERROR: TypeScript compilation failed',
                      "Type 'string' is not assignable to type 'number'",
                      'Found 1 error',
                    ],
                    durationMs: 567,
                  }}
                />
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm font-semibold text-red-900 mb-1">🛑 HALTED AT task-005</p>
                  <p className="text-xs text-red-800">
                    No retry performed. Human intervention required. All remaining tasks skipped.
                  </p>
                </div>
                <TaskEntryCard
                  entry={{
                    taskId: 'task-006',
                    type: 'CREATE_FILE',
                    target: 'app/habits/page.tsx',
                    status: 'skipped',
                    verification: 'not_run',
                    stdout: [],
                    stderr: ['SKIPPED (system halted)'],
                    durationMs: 0,
                  }}
                />
                <TaskEntryCard
                  entry={{
                    taskId: 'task-007',
                    type: 'CREATE_FILE',
                    target: 'app/layout.tsx',
                    status: 'skipped',
                    verification: 'not_run',
                    stdout: [],
                    stderr: ['SKIPPED (system halted)'],
                    durationMs: 0,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part 4: Approval Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Accept Execution Logs</h3>
        <p className="text-sm text-gray-600 mb-4">
          Review all execution logs above. Acceptance locks the log hashes and unlocks the Verification Executor.
        </p>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            Accept Execution Log & Continue
          </button>
          <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
            Reject Execution Log (Requires Human Review)
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Awaiting Approval" status="awaiting" />
          <StateRow label="Logs Generated" value="3" status="completed" />
          <StateRow label="Total Tasks Executed" value="48" status="completed" />
          <StateRow label="Files Created" value="32" status="completed" />
          <StateRow label="Files Modified" value="4" status="completed" />
          <StateRow label="Dependencies Installed" value="12" status="completed" />
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
            <h4 className="font-semibold text-gray-900 mb-1">Next: Verification Executor</h4>
            <p className="text-sm text-gray-600">
              Unlocks after execution logs are accepted. Verification Executor runs mechanical verification
              commands on the built application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutionLogAccordion({
  log,
  index,
  expanded,
  onToggle,
}: {
  log: ExecutionLog;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusConfig = {
    SUCCESS: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    FAILURE: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    HALTED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  }[log.overallStatus];

  return (
    <div className={`border ${statusConfig.border} rounded-lg overflow-hidden`}>
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 ${statusConfig.bg} hover:opacity-80 transition-colors flex items-center justify-between text-left`}
      >
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-gray-900">Log {index + 1}</span>
          <span className={`px-2 py-0.5 ${statusConfig.bg} ${statusConfig.text} text-xs font-medium rounded border ${statusConfig.border}`}>
            {log.overallStatus}
          </span>
          <span className="text-sm text-gray-600">
            {log.tasksExecutedCount} / {log.totalTasksCount} tasks
          </span>
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
          {/* Log Metadata */}
          <div className="bg-gray-50 rounded p-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Execution Log ID:</span>
              <span className="font-mono text-xs text-gray-900">{log.executionLogId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Execution Plan Hash:</span>
              <HashBadge hash={log.executionPlanHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Build Prompt Hash:</span>
              <HashBadge hash={log.buildPromptHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Log Hash:</span>
              <HashBadge hash={log.logHash} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Started:</span>
              <span className="text-xs text-gray-700">{new Date(log.startedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Finished:</span>
              <span className="text-xs text-gray-700">{new Date(log.finishedAt).toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Note: Timestamps excluded from hash computation for determinism
            </div>
          </div>

          {/* Files Produced Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">Files Produced</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-semibold text-blue-800 mb-2">
                  Files Created ({log.filesCreated.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {log.filesCreated.map((file) => (
                    <div key={file} className="text-xs font-mono text-blue-700">
                      + {file}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-800 mb-2">
                  Files Modified ({log.filesModified.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {log.filesModified.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">None</div>
                  ) : (
                    log.filesModified.map((file) => (
                      <div key={file} className="text-xs font-mono text-amber-700">
                        ~ {file}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-purple-800 mb-2">
                  Dependencies Installed ({log.dependenciesInstalled.length})
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {log.dependenciesInstalled.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">None</div>
                  ) : (
                    log.dependenciesInstalled.map((dep) => (
                      <div key={dep} className="text-xs font-mono text-purple-700">
                        {dep}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Task Execution Entries */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Task Execution Sequence ({log.taskEntries.length} tasks)
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {log.taskEntries.map((entry) => (
                <TaskEntryCard key={entry.taskId} entry={entry} />
              ))}
            </div>
          </div>

          {/* Strict Footer */}
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-900 font-medium">
              🔒 This execution log is hash-locked and immutable. Any deviation is a contract violation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskEntryCard({ entry }: { entry: TaskExecutionEntry }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    success: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    failure: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    skipped: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  }[entry.status];

  const verificationConfig = {
    passed: { text: 'text-green-700', icon: '✓' },
    failed: { text: 'text-red-700', icon: '✗' },
    not_run: { text: 'text-gray-500', icon: '—' },
  }[entry.verification];

  const typeConfig = {
    CREATE_FILE: { bg: 'bg-blue-50', text: 'text-blue-700' },
    MODIFY_FILE: { bg: 'bg-amber-50', text: 'text-amber-700' },
    ADD_DEPENDENCY: { bg: 'bg-purple-50', text: 'text-purple-700' },
  }[entry.type];

  return (
    <div className={`border ${statusConfig.border} rounded-lg p-3 ${statusConfig.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-gray-500">{entry.taskId}</span>
            <span className={`px-2 py-0.5 ${typeConfig.bg} ${typeConfig.text} text-xs font-medium rounded`}>
              {entry.type}
            </span>
            <span className={`text-xs font-medium ${verificationConfig.text}`}>
              {verificationConfig.icon} {entry.verification.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{entry.durationMs}ms</span>
          </div>
          <div className="text-sm text-gray-900 font-mono">{entry.target}</div>
        </div>
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
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          {entry.stdout.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">stdout:</div>
              <div className="bg-gray-900 text-green-400 rounded p-2 font-mono text-xs max-h-32 overflow-y-auto">
                {entry.stdout.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>
          )}
          {entry.stderr.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">stderr:</div>
              <div className="bg-gray-900 text-red-400 rounded p-2 font-mono text-xs max-h-32 overflow-y-auto">
                {entry.stderr.map((line, idx) => (
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
