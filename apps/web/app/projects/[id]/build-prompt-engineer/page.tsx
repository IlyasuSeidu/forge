/**
 * Build Prompt Engineer (Hardened) Page (Agent 10)
 *
 * Produces immutable build instructions (Build Prompt Contracts).
 * Does NOT write code. Does NOT implement features. ONLY produces deterministic instructions.
 *
 * USER FEELING: "Forge is not guessing. Forge is executing contracts."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { useAgentState } from '@/lib/context/AgentStateContext';
import { useApproval } from '@/lib/hooks/useApproval';
import { HashBadge } from '@/components/agents/HashBadge';

// Mock data - will be replaced with real API calls
const MOCK_PROJECT_RULES_HASH = 'a1b2c3d4e5f6g7h8';
const MOCK_SCREEN_INDEX_HASH = 'd7e3f9a1b8c4d2e6';
const MOCK_USER_JOURNEYS_HASH = 'e8f4b3c2d9a5e7f1';
const MOCK_VCRA_HASH = 'i3d9e6f4b1a5c7d3';

interface BuildPromptContract {
  sequenceNumber: number;
  title: string;
  intent: string;
  scope: {
    filesToCreate: string[];
    filesToModify: string[];
    filesForbidden: string[];
  };
  dependencies: {
    add: { name: string; version: string }[];
  };
  constraints: {
    mustFollowRulesHash: string;
    mustMatchScreens: string[];
    mustMatchJourneys: string[];
    mustMatchVisuals: string[];
  };
  verificationCriteria: string[];
  contractHash?: string;
}

const BUILD_PROMPT_CONTRACTS: BuildPromptContract[] = [
  {
    sequenceNumber: 1,
    title: 'Project Scaffolding & Dependencies',
    intent:
      'Establish base Next.js 14 project structure with TypeScript, Tailwind CSS, and required dependencies. Create foundational configuration files without implementing features.',
    scope: {
      filesToCreate: [
        '.eslintrc.json',
        '.gitignore',
        'next.config.js',
        'package.json',
        'postcss.config.js',
        'src/app/globals.css',
        'src/app/layout.tsx',
        'src/app/page.tsx',
        'tailwind.config.ts',
        'tsconfig.json',
      ],
      filesToModify: [],
      filesForbidden: [
        '.env',
        '.env.local',
        'node_modules/**',
        'package-lock.json',
        'prisma/migrations/**',
        'yarn.lock',
      ],
    },
    dependencies: {
      add: [
        { name: '@prisma/client', version: '^5.7.0' },
        { name: 'autoprefixer', version: '^10.4.16' },
        { name: 'next', version: '^14.0.4' },
        { name: 'postcss', version: '^8.4.32' },
        { name: 'prisma', version: '^5.7.0' },
        { name: 'react', version: '^18.2.0' },
        { name: 'react-dom', version: '^18.2.0' },
        { name: 'tailwindcss', version: '^3.4.0' },
        { name: 'typescript', version: '^5.3.3' },
      ],
    },
    constraints: {
      mustFollowRulesHash: MOCK_PROJECT_RULES_HASH,
      mustMatchScreens: [],
      mustMatchJourneys: [],
      mustMatchVisuals: [],
    },
    verificationCriteria: [
      'package.json must be valid JSON',
      'All dependencies must be listed in package.json',
      'tsconfig.json must enable strict mode',
      'npm run typecheck must pass without errors',
      'next build must complete successfully',
      'No files from filesForbidden list are created',
    ],
  },
  {
    sequenceNumber: 2,
    title: 'UI Screen Routes & Layout Components',
    intent:
      'Create Next.js App Router routes for all 10 screens from approved Screen Index. Establish shared layout components and navigation structure. No business logic implementation.',
    scope: {
      filesToCreate: [
        'src/app/(auth)/forgot-password/page.tsx',
        'src/app/(auth)/layout.tsx',
        'src/app/(auth)/login/page.tsx',
        'src/app/(auth)/signup/page.tsx',
        'src/app/(main)/dashboard/page.tsx',
        'src/app/(main)/layout.tsx',
        'src/app/(main)/log-workout/page.tsx',
        'src/app/(main)/profile/page.tsx',
        'src/app/(main)/progress/page.tsx',
        'src/app/(main)/settings/page.tsx',
        'src/app/(main)/streak/page.tsx',
        'src/app/(main)/workouts/page.tsx',
        'src/components/layout/Header.tsx',
        'src/components/layout/Navigation.tsx',
        'src/components/ui/Button.tsx',
        'src/components/ui/Card.tsx',
        'src/components/ui/Input.tsx',
      ],
      filesToModify: ['src/app/layout.tsx', 'src/app/page.tsx'],
      filesForbidden: [
        '.env',
        '.env.local',
        'node_modules/**',
        'package-lock.json',
        'prisma/migrations/**',
        'yarn.lock',
      ],
    },
    dependencies: {
      add: [],
    },
    constraints: {
      mustFollowRulesHash: MOCK_PROJECT_RULES_HASH,
      mustMatchScreens: [
        'Dashboard',
        'Forgot Password Screen',
        'Log Workout Screen',
        'Login Screen',
        'Profile Screen',
        'Progress Charts Screen',
        'Settings Screen',
        'Sign Up Screen',
        'Streak Calendar Screen',
        'Workout History Screen',
      ],
      mustMatchJourneys: [
        'Journey 1: New User Registration',
        'Journey 2: Existing User Login',
        'Journey 3: Password Reset',
        'Journey 4: Log Daily Workout',
        'Journey 5: Review Workout History',
        'Journey 6: View Streak Calendar',
        'Journey 7: View Progress Charts',
        'Journey 8: Configure Settings',
        'Journey 9: View Profile',
      ],
      mustMatchVisuals: ['All 10 VCRA rendering contracts'],
    },
    verificationCriteria: [
      'All 10 screen routes must exist and be accessible',
      'All routes must follow Next.js App Router conventions',
      'Layout components must not contain business logic',
      'All imports must resolve correctly',
      'npm run typecheck must pass without errors',
      'next build must complete successfully',
      'No runtime errors when navigating between routes',
    ],
  },
  {
    sequenceNumber: 3,
    title: 'Auth & Data Layer Skeleton',
    intent:
      'Create placeholder API routes for authentication and data operations. Establish Prisma schema structure for User and Workout models. No actual database operations or auth implementation.',
    scope: {
      filesToCreate: [
        'prisma/schema.prisma',
        'src/app/api/auth/login/route.ts',
        'src/app/api/auth/logout/route.ts',
        'src/app/api/auth/signup/route.ts',
        'src/app/api/workouts/[id]/route.ts',
        'src/app/api/workouts/route.ts',
        'src/lib/auth.ts',
        'src/lib/db.ts',
        'src/types/auth.ts',
        'src/types/workout.ts',
      ],
      filesToModify: [],
      filesForbidden: [
        '.env',
        '.env.local',
        'node_modules/**',
        'package-lock.json',
        'prisma/migrations/**',
        'yarn.lock',
      ],
    },
    dependencies: {
      add: [
        { name: 'bcryptjs', version: '^2.4.3' },
        { name: 'jose', version: '^5.1.3' },
        { name: 'zod', version: '^3.22.4' },
      ],
    },
    constraints: {
      mustFollowRulesHash: MOCK_PROJECT_RULES_HASH,
      mustMatchScreens: [],
      mustMatchJourneys: [],
      mustMatchVisuals: [],
    },
    verificationCriteria: [
      'prisma/schema.prisma must be valid Prisma schema',
      'All API routes must follow Next.js App Router route conventions',
      'All type definitions must be exportable',
      'No actual database connections are attempted',
      'No real authentication is performed (placeholder only)',
      'npm run typecheck must pass without errors',
      'next lint must pass without errors',
      'next build must complete successfully',
    ],
  },
];

// Calculate summary stats
const totalFilesToCreate = BUILD_PROMPT_CONTRACTS.reduce((sum, c) => sum + c.scope.filesToCreate.length, 0);
const totalFilesToModify = BUILD_PROMPT_CONTRACTS.reduce((sum, c) => sum + c.scope.filesToModify.length, 0);
const totalDependencies = BUILD_PROMPT_CONTRACTS.reduce((sum, c) => sum + c.dependencies.add.length, 0);
const estimatedExecutionTasks = totalFilesToCreate + totalFilesToModify + totalDependencies;

export default function BuildPromptEngineerPage() {
  // Get agent state from context
  const { currentState } = useAgentState('build-prompt');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  const [isLocked, setIsLocked] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState(0);

  const handleApprove = async () => {
    const success = await approve();

    if (success) {
      setIsLocked(true);
    }
  };

  const handleReject = async () => {
    const confirmed = confirm('Are you sure you want to reject?');
    if (!confirmed) return;

    await reject('User requested regeneration');
  };

  return (
    <div>
      {/* 1. CONTEXT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📝</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Build Prompt Engineer (Hardened)</h1>
            <p className="text-gray-600 mt-1">Produces immutable build instructions</p>
          </div>
        </div>

        {hash && (
          <div className="mt-4">
            <HashBadge hash={hash} size="md" />
          </div>
        )}
      </div>

      {/* Authority Statement */}
      {!isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900">How this works</h3>
              <p className="text-sm text-blue-800 mt-1">
                This agent generates deterministic build instructions (Build Prompt Contracts) from approved artifacts.
                It does NOT write code. It does NOT implement features. It ONLY produces strict manufacturing
                instructions for downstream execution. Every contract is immutable and hash-locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Input Sources</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">⚙️</span>
              <span className="text-sm font-medium text-gray-700">Project Rules</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_PROJECT_RULES_HASH} size="sm" />
            <span className="text-sm text-gray-600">Tech Stack & Constraints</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">🗺️</span>
              <span className="text-sm font-medium text-gray-700">Screen Cartographer</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_SCREEN_INDEX_HASH} size="sm" />
            <span className="text-sm text-gray-600">Screen Index</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">🔀</span>
              <span className="text-sm font-medium text-gray-700">Journey Orchestrator</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_USER_JOURNEYS_HASH} size="sm" />
            <span className="text-sm text-gray-600">User Journeys</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">📸</span>
              <span className="text-sm font-medium text-gray-700">VCRA</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_VCRA_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Rendering Contracts</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900 font-medium">
            ⚠️ Context Isolation: This agent can only generate prompts from hash-approved artifacts.
          </p>
        </div>
      </div>

      {/* 3. GENERATED ARTIFACT (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Artifact: Build Prompt Contracts</h2>
          <span className="text-xs text-gray-500 font-mono">Read-Only</span>
        </div>

        {/* Summary Stats */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-2xl font-bold text-purple-900">{BUILD_PROMPT_CONTRACTS.length}</div>
              <div className="text-xs text-purple-700 mt-1">Build Prompts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">{totalFilesToCreate}</div>
              <div className="text-xs text-purple-700 mt-1">Files to Create</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">{totalFilesToModify}</div>
              <div className="text-xs text-purple-700 mt-1">Files to Modify</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">{totalDependencies}</div>
              <div className="text-xs text-purple-700 mt-1">Dependencies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-900">{estimatedExecutionTasks}</div>
              <div className="text-xs text-purple-700 mt-1">Est. Tasks</div>
            </div>
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {BUILD_PROMPT_CONTRACTS.map((contract, index) => (
            <div key={contract.sequenceNumber} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => setExpandedPrompt(expandedPrompt === index ? -1 : index)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded-full font-bold text-sm">
                    {contract.sequenceNumber}
                  </span>
                  <div>
                    <div className="font-semibold text-gray-900">{contract.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {contract.scope.filesToCreate.length} files • {contract.dependencies.add.length} deps •{' '}
                      {contract.verificationCriteria.length} checks
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${expandedPrompt === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Accordion Content */}
              {expandedPrompt === index && (
                <div className="p-6 bg-white border-t border-gray-200">
                  {/* Intent */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Intent</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">{contract.intent}</p>
                  </div>

                  {/* Scope */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Scope</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Files to Create */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Files to Create ({contract.scope.filesToCreate.length})
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                          <ul className="space-y-1 text-xs font-mono">
                            {contract.scope.filesToCreate.map((file) => (
                              <li key={file} className="text-green-700">
                                + {file}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Files to Modify */}
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Files to Modify ({contract.scope.filesToModify.length})
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                          {contract.scope.filesToModify.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No files to modify</p>
                          ) : (
                            <ul className="space-y-1 text-xs font-mono">
                              {contract.scope.filesToModify.map((file) => (
                                <li key={file} className="text-blue-700">
                                  ~ {file}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Files Forbidden */}
                    <div className="mt-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Files Forbidden ({contract.scope.filesForbidden.length})
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <ul className="space-y-1 text-xs font-mono">
                          {contract.scope.filesForbidden.map((file) => (
                            <li key={file} className="text-red-700">
                              ✗ {file}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Dependencies */}
                  {contract.dependencies.add.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Dependencies to Add ({contract.dependencies.add.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <ul className="space-y-1 text-xs font-mono">
                          {contract.dependencies.add.map((dep) => (
                            <li key={dep.name} className="text-gray-700">
                              {dep.name}@{dep.version}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Constraints */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Constraints</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-medium text-gray-600 w-40 flex-shrink-0">
                          Must Follow Rules:
                        </span>
                        <HashBadge hash={contract.constraints.mustFollowRulesHash} size="sm" />
                      </div>

                      {contract.constraints.mustMatchScreens.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 w-40 flex-shrink-0">
                            Must Match Screens:
                          </span>
                          <div className="flex-1">
                            <div className="flex flex-wrap gap-1">
                              {contract.constraints.mustMatchScreens.map((screen) => (
                                <span
                                  key={screen}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {screen}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {contract.constraints.mustMatchJourneys.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 w-40 flex-shrink-0">
                            Must Match Journeys:
                          </span>
                          <div className="flex-1">
                            <ul className="space-y-1 text-xs text-gray-700">
                              {contract.constraints.mustMatchJourneys.map((journey) => (
                                <li key={journey}>• {journey}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.constraints.mustMatchVisuals.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-medium text-gray-600 w-40 flex-shrink-0">
                            Must Match Visuals:
                          </span>
                          <div className="flex-1">
                            <ul className="space-y-1 text-xs text-gray-700">
                              {contract.constraints.mustMatchVisuals.map((visual) => (
                                <li key={visual}>• {visual}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Criteria */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Verification Criteria ({contract.verificationCriteria.length})
                    </h4>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <ul className="space-y-2 text-sm text-gray-700">
                        {contract.verificationCriteria.map((criterion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <svg
                              className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
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
                            {criterion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Contract Footer */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 italic">
                        This build prompt is hash-locked and immutable. Any deviation is a contract violation.
                      </p>
                      {isLocked && contract.contractHash && (
                        <HashBadge hash={contract.contractHash} size="sm" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. APPROVAL CONTROLS */}
      {!isLocked && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Do these build instructions correctly represent the manufacturing plan?
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Once approved, these instructions cannot be changed without restarting manufacturing. The next agent
            (Execution Planner) will use these build prompts to generate deterministic execution plans. If any
            instructions are incorrect or incomplete, reject to regenerate.
          </p>

                    {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold text-red-900">Approval Failed</div>
                  <div className="text-sm text-red-800 mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          <ApprovalButton
            onApprove={handleApprove}
            onReject={handleReject}
            approveText="Approve & Lock Build Instructions"
            rejectText="Reject & Regenerate"
          />
        </div>
      )}

      {/* 5. STATE VISUALIZATION (Locked) */}
      {isLocked && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex gap-3">
            <svg
              className="w-6 h-6 text-green-600 flex-shrink-0"
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
              <h3 className="font-semibold text-green-900">Build Prompt Contracts Approved</h3>
              <p className="text-sm text-green-800 mt-1">
                All build prompt contracts have been approved and locked with hash:{' '}
                <code className="font-mono">{hash}</code>. The next agent (Execution Planner) will use these
                instructions to generate deterministic execution plans for actual implementation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. NEXT-AGENT UNLOCK */}
      {isLocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <h3 className="font-semibold text-blue-900">Next: Execution Planner</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Will convert build prompts into deterministic execution tasks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-full">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-700">Your Turn</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
