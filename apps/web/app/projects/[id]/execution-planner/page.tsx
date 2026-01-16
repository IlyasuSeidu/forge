/**
 * Agent 11: Execution Planner (Hardened) Frontend Page
 *
 * Converts approved Build Prompt Contracts into deterministic execution plans.
 * No code writing, no execution, no optimization—only strict task sequencing.
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

interface ExecutionTask {
  taskId: string;
  type: 'CREATE_FILE' | 'MODIFY_FILE' | 'ADD_DEPENDENCY';
  target: string;
  dependsOn?: string[];
  verificationCriteria: string[];
}

interface ExecutionPlanContract {
  planId: string;
  buildPromptSequenceNumber: number;
  buildPromptHash: string;
  taskCount: number;
  estimatedDuration: string;
  tasks: ExecutionTask[];
  contractHash: string;
}

// Mock execution plans corresponding to the 3 Build Prompts from Agent 10
const MOCK_EXECUTION_PLANS: ExecutionPlanContract[] = [
  {
    planId: 'exec-plan-001-scaffolding',
    buildPromptSequenceNumber: 1,
    buildPromptHash: 'a1b2c3d4e5f6g7h8',
    taskCount: 17,
    estimatedDuration: '~8 minutes',
    contractHash: 'j4k5l6m7n8o9p0q1',
    tasks: [
      {
        taskId: 'task-001',
        type: 'ADD_DEPENDENCY',
        target: 'next@^14.0.4',
        verificationCriteria: [
          'package.json must list next@^14.0.4',
          'npm install must complete without errors',
        ],
      },
      {
        taskId: 'task-002',
        type: 'ADD_DEPENDENCY',
        target: 'react@^18.2.0',
        verificationCriteria: ['package.json must list react@^18.2.0'],
      },
      {
        taskId: 'task-003',
        type: 'ADD_DEPENDENCY',
        target: 'react-dom@^18.2.0',
        verificationCriteria: ['package.json must list react-dom@^18.2.0'],
      },
      {
        taskId: 'task-004',
        type: 'ADD_DEPENDENCY',
        target: 'typescript@^5.3.0',
        verificationCriteria: ['package.json must list typescript@^5.3.0'],
      },
      {
        taskId: 'task-005',
        type: 'ADD_DEPENDENCY',
        target: 'tailwindcss@^3.4.0',
        verificationCriteria: ['package.json must list tailwindcss@^3.4.0'],
      },
      {
        taskId: 'task-006',
        type: 'ADD_DEPENDENCY',
        target: 'postcss@^8.4.0',
        verificationCriteria: ['package.json must list postcss@^8.4.0'],
      },
      {
        taskId: 'task-007',
        type: 'ADD_DEPENDENCY',
        target: 'autoprefixer@^10.4.0',
        verificationCriteria: ['package.json must list autoprefixer@^10.4.0'],
      },
      {
        taskId: 'task-008',
        type: 'ADD_DEPENDENCY',
        target: '@types/node@^20.10.0',
        verificationCriteria: ['package.json must list @types/node@^20.10.0'],
      },
      {
        taskId: 'task-009',
        type: 'ADD_DEPENDENCY',
        target: '@types/react@^18.2.0',
        verificationCriteria: ['package.json must list @types/react@^18.2.0'],
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: '.eslintrc.json',
        verificationCriteria: [
          'File must exist at .eslintrc.json',
          'File must be valid JSON',
          'ESLint must parse config without errors',
        ],
      },
      {
        taskId: 'task-011',
        type: 'CREATE_FILE',
        target: '.gitignore',
        verificationCriteria: [
          'File must exist at .gitignore',
          'File must contain node_modules',
          'File must contain .next',
        ],
      },
      {
        taskId: 'task-012',
        type: 'CREATE_FILE',
        target: 'next.config.js',
        verificationCriteria: [
          'File must exist at next.config.js',
          'File must export valid Next.js config object',
        ],
      },
      {
        taskId: 'task-013',
        type: 'CREATE_FILE',
        target: 'package.json',
        verificationCriteria: [
          'File must exist at package.json',
          'File must be valid JSON',
          'File must have scripts: dev, build, start',
        ],
      },
      {
        taskId: 'task-014',
        type: 'CREATE_FILE',
        target: 'postcss.config.js',
        verificationCriteria: [
          'File must exist at postcss.config.js',
          'File must reference tailwindcss plugin',
        ],
      },
      {
        taskId: 'task-015',
        type: 'CREATE_FILE',
        target: 'tailwind.config.ts',
        verificationCriteria: [
          'File must exist at tailwind.config.ts',
          'File must define content paths',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-016',
        type: 'CREATE_FILE',
        target: 'tsconfig.json',
        verificationCriteria: [
          'File must exist at tsconfig.json',
          'File must be valid JSON',
          'File must enable strict mode',
        ],
      },
      {
        taskId: 'task-017',
        type: 'CREATE_FILE',
        target: 'app/globals.css',
        verificationCriteria: [
          'File must exist at app/globals.css',
          'File must include Tailwind directives',
        ],
      },
    ],
  },
  {
    planId: 'exec-plan-002-ui-screens',
    buildPromptSequenceNumber: 2,
    buildPromptHash: 'r2s3t4u5v6w7x8y9',
    taskCount: 19,
    estimatedDuration: '~12 minutes',
    contractHash: 'z9a8b7c6d5e4f3g2',
    tasks: [
      {
        taskId: 'task-001',
        type: 'CREATE_FILE',
        target: 'app/(auth)/login/page.tsx',
        verificationCriteria: [
          'File must exist at app/(auth)/login/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-002',
        type: 'CREATE_FILE',
        target: 'app/(auth)/signup/page.tsx',
        verificationCriteria: [
          'File must exist at app/(auth)/signup/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-003',
        type: 'CREATE_FILE',
        target: 'app/dashboard/page.tsx',
        verificationCriteria: [
          'File must exist at app/dashboard/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-004',
        type: 'CREATE_FILE',
        target: 'app/habits/new/page.tsx',
        verificationCriteria: [
          'File must exist at app/habits/new/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-005',
        type: 'CREATE_FILE',
        target: 'app/habits/page.tsx',
        verificationCriteria: [
          'File must exist at app/habits/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-006',
        type: 'CREATE_FILE',
        target: 'app/layout.tsx',
        verificationCriteria: [
          'File must exist at app/layout.tsx',
          'File must export default RootLayout component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-007',
        type: 'CREATE_FILE',
        target: 'app/page.tsx',
        verificationCriteria: [
          'File must exist at app/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-008',
        type: 'CREATE_FILE',
        target: 'app/profile/page.tsx',
        verificationCriteria: [
          'File must exist at app/profile/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-009',
        type: 'CREATE_FILE',
        target: 'app/settings/page.tsx',
        verificationCriteria: [
          'File must exist at app/settings/page.tsx',
          'File must export default React component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: 'components/HabitCard.tsx',
        verificationCriteria: [
          'File must exist at components/HabitCard.tsx',
          'File must export HabitCard component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-011',
        type: 'CREATE_FILE',
        target: 'components/HabitForm.tsx',
        verificationCriteria: [
          'File must exist at components/HabitForm.tsx',
          'File must export HabitForm component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-012',
        type: 'CREATE_FILE',
        target: 'components/MetricCard.tsx',
        verificationCriteria: [
          'File must exist at components/MetricCard.tsx',
          'File must export MetricCard component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-013',
        type: 'CREATE_FILE',
        target: 'components/Navbar.tsx',
        verificationCriteria: [
          'File must exist at components/Navbar.tsx',
          'File must export Navbar component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-014',
        type: 'CREATE_FILE',
        target: 'components/StreakChart.tsx',
        verificationCriteria: [
          'File must exist at components/StreakChart.tsx',
          'File must export StreakChart component',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-015',
        type: 'CREATE_FILE',
        target: 'lib/types.ts',
        verificationCriteria: [
          'File must exist at lib/types.ts',
          'File must export TypeScript type definitions',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-016',
        type: 'CREATE_FILE',
        target: 'lib/utils.ts',
        verificationCriteria: [
          'File must exist at lib/utils.ts',
          'File must export utility functions',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-017',
        type: 'CREATE_FILE',
        target: 'public/logo.svg',
        verificationCriteria: ['File must exist at public/logo.svg', 'File must be valid SVG'],
      },
      {
        taskId: 'task-018',
        type: 'MODIFY_FILE',
        target: 'tailwind.config.ts',
        verificationCriteria: [
          'File must exist at tailwind.config.ts',
          'Modifications must preserve existing configuration',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-019',
        type: 'MODIFY_FILE',
        target: 'tsconfig.json',
        verificationCriteria: [
          'File must exist at tsconfig.json',
          'Modifications must preserve existing configuration',
          'File must remain valid JSON',
        ],
      },
    ],
  },
  {
    planId: 'exec-plan-003-auth-data',
    buildPromptSequenceNumber: 3,
    buildPromptHash: 'h1i2j3k4l5m6n7o8',
    taskCount: 12,
    estimatedDuration: '~6 minutes',
    contractHash: 'p9q8r7s6t5u4v3w2',
    tasks: [
      {
        taskId: 'task-001',
        type: 'ADD_DEPENDENCY',
        target: '@prisma/client@^5.7.0',
        verificationCriteria: ['package.json must list @prisma/client@^5.7.0'],
      },
      {
        taskId: 'task-002',
        type: 'ADD_DEPENDENCY',
        target: 'prisma@^5.7.0',
        verificationCriteria: ['package.json must list prisma@^5.7.0'],
      },
      {
        taskId: 'task-003',
        type: 'ADD_DEPENDENCY',
        target: 'bcryptjs@^2.4.3',
        verificationCriteria: ['package.json must list bcryptjs@^2.4.3'],
      },
      {
        taskId: 'task-004',
        type: 'CREATE_FILE',
        target: '.env.example',
        verificationCriteria: ['File must exist at .env.example', 'File must contain DATABASE_URL'],
      },
      {
        taskId: 'task-005',
        type: 'CREATE_FILE',
        target: 'lib/auth.ts',
        verificationCriteria: [
          'File must exist at lib/auth.ts',
          'File must export authentication functions',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-006',
        type: 'CREATE_FILE',
        target: 'lib/db.ts',
        verificationCriteria: [
          'File must exist at lib/db.ts',
          'File must export Prisma client instance',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-007',
        type: 'CREATE_FILE',
        target: 'prisma/schema.prisma',
        verificationCriteria: [
          'File must exist at prisma/schema.prisma',
          'File must define User and Habit models',
          'prisma validate must pass without errors',
        ],
      },
      {
        taskId: 'task-008',
        type: 'CREATE_FILE',
        target: 'app/api/auth/login/route.ts',
        verificationCriteria: [
          'File must exist at app/api/auth/login/route.ts',
          'File must export POST handler',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-009',
        type: 'CREATE_FILE',
        target: 'app/api/auth/signup/route.ts',
        verificationCriteria: [
          'File must exist at app/api/auth/signup/route.ts',
          'File must export POST handler',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-010',
        type: 'CREATE_FILE',
        target: 'app/api/habits/route.ts',
        verificationCriteria: [
          'File must exist at app/api/habits/route.ts',
          'File must export GET and POST handlers',
          'TypeScript must compile without errors',
        ],
      },
      {
        taskId: 'task-011',
        type: 'MODIFY_FILE',
        target: 'package.json',
        verificationCriteria: [
          'File must exist at package.json',
          'Modifications must add Prisma scripts',
          'File must remain valid JSON',
        ],
      },
      {
        taskId: 'task-012',
        type: 'MODIFY_FILE',
        target: 'tsconfig.json',
        verificationCriteria: [
          'File must exist at tsconfig.json',
          'Modifications must add Prisma type paths',
          'File must remain valid JSON',
        ],
      },
    ],
  },
];

export default function ExecutionPlannerPage() {
  const [expandedPlan, setExpandedPlan] = useState<number>(0);

  // Calculate summary statistics
  const totalPlans = MOCK_EXECUTION_PLANS.length;
  const totalTasks = MOCK_EXECUTION_PLANS.reduce((sum, plan) => sum + plan.taskCount, 0);
  const dependencyTasks = MOCK_EXECUTION_PLANS.reduce(
    (sum, plan) => sum + plan.tasks.filter((t) => t.type === 'ADD_DEPENDENCY').length,
    0
  );
  const createFileTasks = MOCK_EXECUTION_PLANS.reduce(
    (sum, plan) => sum + plan.tasks.filter((t) => t.type === 'CREATE_FILE').length,
    0
  );
  const modifyFileTasks = MOCK_EXECUTION_PLANS.reduce(
    (sum, plan) => sum + plan.tasks.filter((t) => t.type === 'MODIFY_FILE').length,
    0
  );

  return (
    <div className="space-y-8">
      {/* Part 1: Context Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent 11: Execution Planner (Hardened)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Authority: <span className="font-mono text-xs">EXECUTION_PLANNING_AUTHORITY</span>
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-gray-700 leading-relaxed">
          Converts approved Build Prompt Contracts into deterministic execution plans. Does not write code. Does
          not execute tasks. Does not optimize or reorder work. Only generates deterministic tasks in strict
          order: dependencies first, file creates (alphabetical), file modifies (alphabetical).
        </p>
      </div>

      {/* Part 2: Inputs Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hash-Locked Inputs</h3>
        <div className="space-y-3 mb-4">
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
            <strong>Context Isolation:</strong> This agent can only plan tasks from approved build prompt
            contracts.
          </p>
        </div>
      </div>

      {/* Part 3: Generated Artifact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Execution Plans</h3>
        </div>

        {/* Summary Panel */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <SummaryMetric label="Total Plans" value={totalPlans.toString()} />
          <SummaryMetric label="Total Tasks" value={totalTasks.toString()} />
          <SummaryMetric label="Dependencies" value={dependencyTasks.toString()} color="purple" />
          <SummaryMetric label="Create Files" value={createFileTasks.toString()} color="blue" />
          <SummaryMetric label="Modify Files" value={modifyFileTasks.toString()} color="amber" />
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {MOCK_EXECUTION_PLANS.map((plan, index) => (
            <div key={plan.planId} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => setExpandedPlan(expandedPlan === index ? -1 : index)}
                className="w-full px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-gray-900">Plan {index + 1}</span>
                  <span className="text-sm text-gray-600">
                    Build Prompt #{plan.buildPromptSequenceNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {plan.taskCount} tasks
                  </span>
                  <span className="text-xs text-gray-500">{plan.estimatedDuration}</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedPlan === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Accordion Body */}
              {expandedPlan === index && (
                <div className="p-5 space-y-5">
                  {/* Plan Metadata */}
                  <div className="bg-gray-50 rounded p-4 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Plan ID:</span>
                      <span className="font-mono text-xs text-gray-900">{plan.planId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Build Prompt Hash:</span>
                      <HashBadge hash={plan.buildPromptHash} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contract Hash:</span>
                      <HashBadge hash={plan.contractHash} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Estimated Duration:</span>
                      <span className="text-gray-900 font-medium">{plan.estimatedDuration}</span>
                    </div>
                  </div>

                  {/* Task List */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Task Sequence ({plan.taskCount} tasks)
                    </h4>
                    <div className="space-y-2">
                      {plan.tasks.map((task) => (
                        <TaskCard key={task.taskId} task={task} />
                      ))}
                    </div>
                  </div>

                  {/* Strict Footer */}
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-900 font-medium">
                      ⚠️ This execution plan is hash-locked and immutable. Tasks cannot be reordered.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Part 4: Approval Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Execution Plans</h3>
        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4">
          <p className="text-sm text-amber-900 font-medium mb-2">⚠️ Warning</p>
          <p className="text-sm text-amber-800">
            Once approved, Forge Implementer must execute tasks exactly as listed. No reordering, no skipping, no
            optimization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors">
            Approve All Plans
          </button>
          <button className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors">
            Reject & Regenerate
          </button>
        </div>
      </div>

      {/* Part 5: State Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan State</h3>
        <div className="space-y-3">
          <StateRow label="Status" value="Awaiting Approval" status="awaiting" />
          <StateRow label="Plans Generated" value={totalPlans.toString()} status="generated" />
          <StateRow label="Tasks Queued" value={totalTasks.toString()} status="pending" />
          <StateRow label="Hash-Locked" value="No" status="pending" />
          <StateRow label="Human Approval" value="Required" status="awaiting" />
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
            <h4 className="font-semibold text-gray-900 mb-1">Next: Forge Implementer</h4>
            <p className="text-sm text-gray-600">
              Unlocks after execution plans are approved. Forge Implementer executes tasks sequentially, creating
              and modifying files exactly as specified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  color = 'gray',
}: {
  label: string;
  value: string;
  color?: 'gray' | 'purple' | 'blue' | 'amber';
}) {
  const colorConfig = {
    gray: 'text-gray-900',
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
  }[color];

  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colorConfig}`}>{value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
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

function TaskCard({ task }: { task: ExecutionTask }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = {
    CREATE_FILE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'CREATE FILE' },
    MODIFY_FILE: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      label: 'MODIFY FILE',
    },
    ADD_DEPENDENCY: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      label: 'ADD DEPENDENCY',
    },
  }[task.type];

  return (
    <div className={`border ${typeConfig.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-semibold text-gray-500">{task.taskId}</span>
            <span className={`px-2 py-0.5 ${typeConfig.bg} ${typeConfig.text} text-xs font-medium rounded`}>
              {typeConfig.label}
            </span>
          </div>
          <div className="text-sm text-gray-900 font-medium font-mono">{task.target}</div>
          {task.dependsOn && task.dependsOn.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">Depends on:</span>
              {task.dependsOn.map((dep) => (
                <span key={dep} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                  {dep}
                </span>
              ))}
            </div>
          )}
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
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Verification Criteria ({task.verificationCriteria.length}):
          </div>
          <ul className="space-y-1.5">
            {task.verificationCriteria.map((criterion, idx) => (
              <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                <svg className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
  status: 'generated' | 'pending' | 'awaiting';
}) {
  const statusConfig = {
    generated: { bg: 'bg-blue-100', text: 'text-blue-700' },
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
