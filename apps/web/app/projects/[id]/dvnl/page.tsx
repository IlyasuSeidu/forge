/**
 * Deterministic Visual Normalizer Page (Agent 7)
 *
 * Generates Visual Normalization Contracts that constrain density and complexity.
 * Produces: Visual Normalization Contracts (HOW MUCH is allowed per screen).
 *
 * USER FEELING: "Forge protects me from busy/ugly UIs through constraints."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { useAgentState } from '@/lib/context/AgentStateContext';
import { useApproval } from '@/lib/hooks/useApproval';
import { HashBadge } from '@/components/agents/HashBadge';

// Mock data - will be replaced with real API calls
const MOCK_VRA_HASH = 'f9a5c3d1e8b6f4a2';
const MOCK_SCREEN_INDEX_HASH = 'd7e3f9a1b8c4d2e6';

type ComplexityCap = 'low' | 'medium' | 'high';

interface DVNLContract {
  screenName: string;
  complexityCap: ComplexityCap;
  maxMetricCards: number;
  maxCharts: number;
  maxLists: number;
  maxTables: number;
  disallowedVisuals: string[];
  gridSystem: '12-column';
  maxCardsPerRow: number;
  rationale: string[];
}

const DVNL_CONTRACTS: DVNLContract[] = [
  {
    screenName: 'Login Screen',
    complexityCap: 'low',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Authentication screens must be simple and focused',
      'No data visualization needed',
      'Single-column centered layout only',
    ],
  },
  {
    screenName: 'Sign Up Screen',
    complexityCap: 'low',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Registration must be straightforward',
      'No distractions from form completion',
      'Single-column centered layout only',
    ],
  },
  {
    screenName: 'Forgot Password Screen',
    complexityCap: 'low',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Password recovery must be simple',
      'No data visualization needed',
      'Single-column centered layout only',
    ],
  },
  {
    screenName: 'Dashboard',
    complexityCap: 'medium',
    maxMetricCards: 3,
    maxCharts: 1,
    maxLists: 1,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'ornamental_icons', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 3,
    rationale: [
      'Dashboard shows key metrics without overwhelming user',
      'One chart maximum to prevent visual noise',
      'Metric cards limited to current streak, last workout, and quick entry',
      'Recent activity list constrained to 3-5 items',
    ],
  },
  {
    screenName: 'Log Workout Screen',
    complexityCap: 'low',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Form must complete in under 30 seconds',
      'No visual distractions allowed',
      'Speed is the priority',
    ],
  },
  {
    screenName: 'Workout History Screen',
    complexityCap: 'medium',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 1,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'ornamental_icons'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Single scrollable list of workouts',
      'No charts on this screen (they belong in Progress)',
      'Pagination limits to 20 items per page',
    ],
  },
  {
    screenName: 'Streak Calendar Screen',
    complexityCap: 'medium',
    maxMetricCards: 2,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'ornamental_icons', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 2,
    rationale: [
      'Heatmap calendar is the primary visual',
      'Metric cards limited to current and longest streak',
      'Calendar grid uses color intensity, not additional visuals',
    ],
  },
  {
    screenName: 'Progress Charts Screen',
    complexityCap: 'high',
    maxMetricCards: 4,
    maxCharts: 2,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'ornamental_icons', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 4,
    rationale: [
      'Progress screen is the only place for multiple charts',
      'Four metric cards for summary stats',
      'Two charts maximum: weekly consistency + workout distribution',
      'No radial gauges or speedometers (poor readability)',
    ],
  },
  {
    screenName: 'Settings Screen',
    complexityCap: 'low',
    maxMetricCards: 0,
    maxCharts: 0,
    maxLists: 1,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 1,
    rationale: [
      'Settings must be simple and focused',
      'One list of preferences',
      'No visual complexity needed',
    ],
  },
  {
    screenName: 'Profile Screen',
    complexityCap: 'low',
    maxMetricCards: 4,
    maxCharts: 0,
    maxLists: 0,
    maxTables: 0,
    disallowedVisuals: ['radial_gauges', 'speedometers', 'excessive_badges', 'decorative_meters'],
    gridSystem: '12-column',
    maxCardsPerRow: 4,
    rationale: [
      'Profile shows user stats in simple grid',
      'Four metric cards maximum (workouts, streaks, minutes)',
      'No charts (they belong in Progress screen)',
    ],
  },
];

export default function DVNLPage() {
  // Get agent state from context
  const { currentState } = useAgentState('dvnl');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  const [isLocked, setIsLocked] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState(0); // First screen expanded by default

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

  // Calculate summary stats
  const complexityDistribution = DVNL_CONTRACTS.reduce(
    (acc, c) => {
      acc[c.complexityCap]++;
      return acc;
    },
    { low: 0, medium: 0, high: 0 }
  );

  const allDisallowedVisuals = Array.from(
    new Set(DVNL_CONTRACTS.flatMap((c) => c.disallowedVisuals))
  );

  return (
    <div>
      {/* 1. CONTEXT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📐</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deterministic Visual Normalizer</h1>
            <p className="text-gray-600 mt-1">Constrains visual density and complexity per screen</p>
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
                This agent generates Visual Normalization Contracts defining HOW MUCH is allowed on each screen (max
                cards, charts, lists, complexity caps, disallowed visuals). It does not change screen names, invent
                components, or remove required elements. It only sets density constraints.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Input Sources</h2>
        <div className="space-y-4">
          {/* Input 1: Visual Expansion Contracts */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">👁️</span>
              <span className="text-sm font-medium text-gray-700">VRA</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_VRA_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Expansion Contracts</span>
          </div>

          {/* Input 2: Screen Index */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">🗺️</span>
              <span className="text-sm font-medium text-gray-700">Screen Cartographer</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_SCREEN_INDEX_HASH} size="sm" />
            <span className="text-sm text-gray-600">Screen Index (10 screens)</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          This agent reads both approved artifacts. Every density constraint must be traceable to these sources. It
          cannot access any other data.
        </p>
      </div>

      {/* 3. GENERATED ARTIFACT (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Artifact: Visual Normalization Contracts</h2>
          <span className="text-xs text-gray-500 font-mono">Read-Only</span>
        </div>

        {/* Strict Statement */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-900 font-medium">
            This contract limits density. It does not add or remove features.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
          <span>
            <strong className="text-gray-900">{DVNL_CONTRACTS.length}</strong> screens
          </span>
          <span>
            <strong className="text-gray-900">{complexityDistribution.low}</strong> low complexity
          </span>
          <span>
            <strong className="text-gray-900">{complexityDistribution.medium}</strong> medium complexity
          </span>
          <span>
            <strong className="text-gray-900">{complexityDistribution.high}</strong> high complexity
          </span>
          <span>
            <strong className="text-gray-900">{allDisallowedVisuals.length}</strong> disallowed visual types
          </span>
        </div>

        {/* Accordion - Contracts per Screen */}
        <div className="space-y-3">
          {DVNL_CONTRACTS.map((contract, index) => (
            <div key={contract.screenName} className="border border-gray-200 rounded-lg">
              {/* Accordion Header */}
              <button
                onClick={() => setExpandedScreen(expandedScreen === index ? -1 : index)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedScreen === index ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-gray-900">{contract.screenName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      contract.complexityCap === 'low'
                        ? 'bg-green-100 text-green-700'
                        : contract.complexityCap === 'medium'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {contract.complexityCap}
                  </span>
                </div>
              </button>

              {/* Accordion Content */}
              {expandedScreen === index && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Metric Cards:</span>
                        <span className="font-semibold text-gray-900">{contract.maxMetricCards}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Charts:</span>
                        <span className="font-semibold text-gray-900">{contract.maxCharts}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Lists:</span>
                        <span className="font-semibold text-gray-900">{contract.maxLists}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Tables:</span>
                        <span className="font-semibold text-gray-900">{contract.maxTables}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Grid System:</span>
                        <span className="font-semibold text-gray-900">{contract.gridSystem}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Max Cards Per Row:</span>
                        <span className="font-semibold text-gray-900">{contract.maxCardsPerRow}</span>
                      </div>
                    </div>
                  </div>

                  {/* Disallowed Visuals */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Disallowed Visuals</h4>
                    <div className="flex flex-wrap gap-2">
                      {contract.disallowedVisuals.map((visual) => (
                        <span
                          key={visual}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-mono"
                        >
                          {visual}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rationale */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Rationale</h4>
                    <ul className="space-y-1">
                      {contract.rationale.map((reason, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
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
            Do these density constraints protect users from overwhelming UIs?
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Once you approve, all Visual Normalization Contracts will be locked and hash-sealed. Density constraints
            cannot be changed without restarting visual planning. The next agent (VCA) will use these constraints to
            compose screen layouts. If any constraints are too restrictive or too loose, reject to revise.
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
            approveText="Approve & Lock Density Constraints"
            rejectText="Reject & Revise"
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
              <h3 className="font-semibold text-green-900">Density Constraints Approved</h3>
              <p className="text-sm text-green-800 mt-1">
                All visual normalization contracts have been approved and locked with hash:{' '}
                <code className="font-mono">{hash}</code>. The next agent (VCA) will use these constraints to
                compose screen layouts.
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
              <span className="text-3xl">🧩</span>
              <div>
                <h3 className="font-semibold text-blue-900">Next: Visual Composition Authority</h3>
                <p className="text-sm text-blue-800 mt-1">Will compose screen layouts using these constraints</p>
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
