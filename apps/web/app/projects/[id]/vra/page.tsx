/**
 * Visual Rendering Authority Page (Agent 6)
 *
 * Expands approved screens into explicit Visual Expansion Contracts.
 * Produces: Visual Expansion Contracts (WHAT appears on each screen).
 *
 * USER FEELING: "Forge is not designing. It's documenting what must exist visually."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { HashBadge } from '@/components/agents/HashBadge';

// Mock data - will be replaced with real API calls
const MOCK_SCREEN_INDEX_HASH = 'd7e3f9a1b8c4d2e6';
const MOCK_USER_JOURNEYS_HASH = 'e8f4b3c2d9a5e7f1';

// Visual Expansion Contracts for each screen
const VISUAL_CONTRACTS = [
  {
    screenName: 'Login Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Header',
        components: [
          { type: 'Logo', content: 'Fitness Habit Tracker logo' },
          { type: 'Title', content: 'Welcome Back' },
        ],
      },
      {
        name: 'Form Container',
        components: [
          { type: 'Input Field', content: 'Email: user@example.com' },
          { type: 'Input Field', content: 'Password: ••••••••' },
          { type: 'Link', content: 'Forgot password?' },
          { type: 'Button', content: 'Log In' },
        ],
      },
      {
        name: 'Footer',
        components: [{ type: 'Link', content: "Don't have an account? Sign up" }],
      },
    ],
  },
  {
    screenName: 'Sign Up Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Header',
        components: [
          { type: 'Logo', content: 'Fitness Habit Tracker logo' },
          { type: 'Title', content: 'Create Account' },
        ],
      },
      {
        name: 'Form Container',
        components: [
          { type: 'Input Field', content: 'Email: user@example.com' },
          { type: 'Input Field', content: 'Password: ••••••••' },
          { type: 'Input Field', content: 'Confirm Password: ••••••••' },
          { type: 'Password Strength Indicator', content: 'Strength: Medium' },
          { type: 'Button', content: 'Create Account' },
        ],
      },
      {
        name: 'Footer',
        components: [{ type: 'Link', content: 'Already have an account? Log in' }],
      },
    ],
  },
  {
    screenName: 'Forgot Password Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Header',
        components: [
          { type: 'Icon', content: 'Key icon' },
          { type: 'Title', content: 'Reset Password' },
          { type: 'Subtitle', content: 'Enter your email to receive a reset link' },
        ],
      },
      {
        name: 'Form Container',
        components: [
          { type: 'Input Field', content: 'Email: user@example.com' },
          { type: 'Button', content: 'Send Reset Link' },
        ],
      },
      {
        name: 'Footer',
        components: [{ type: 'Link', content: '← Back to login' }],
      },
    ],
  },
  {
    screenName: 'Dashboard',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Top Navigation',
        components: [
          { type: 'Logo', content: 'Fitness Habit Tracker logo' },
          { type: 'Nav Links', content: 'Dashboard, History, Streak, Progress' },
          { type: 'User Menu', content: 'Settings, Profile, Logout' },
        ],
      },
      {
        name: 'Streak Display',
        components: [
          { type: 'Large Number', content: '7 days' },
          { type: 'Icon', content: 'Fire emoji' },
          { type: 'Label', content: 'Current Streak' },
          { type: 'Secondary Stat', content: 'Longest: 14 days' },
        ],
      },
      {
        name: 'Last Workout',
        components: [
          { type: 'Title', content: 'Last Workout' },
          { type: 'Date', content: 'Today, 6:30 PM' },
          { type: 'Badge', content: 'Cardio' },
          { type: 'Duration', content: '45 minutes' },
        ],
      },
      {
        name: 'Quick Entry',
        components: [{ type: 'Button', content: "+ Log Today's Workout" }],
      },
      {
        name: 'Weekly Chart',
        components: [
          { type: 'Title', content: 'This Week' },
          { type: 'Bar Chart', content: '7 bars showing M-S activity' },
        ],
      },
      {
        name: 'Recent Activity',
        components: [
          { type: 'Title', content: 'Recent Activity' },
          { type: 'List Item', content: 'Jan 15: Strength, 30 min' },
          { type: 'List Item', content: 'Jan 14: Cardio, 45 min' },
          { type: 'List Item', content: 'Jan 13: Flexibility, 20 min' },
          { type: 'Link', content: 'View All' },
        ],
      },
    ],
  },
  {
    screenName: 'Log Workout Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Page Header',
        components: [
          { type: 'Title', content: 'Log Workout' },
          { type: 'Subtitle', content: 'Quick entry - less than 30 seconds' },
        ],
      },
      {
        name: 'Form Container',
        components: [
          { type: 'Date Picker', content: 'Date: Today (Jan 15, 2026)' },
          { type: 'Dropdown', content: 'Workout Type: Cardio, Strength, Flexibility, Sports, Other' },
          { type: 'Number Input', content: 'Duration: 30 minutes' },
          { type: 'Textarea', content: 'Notes: Felt strong today (optional)' },
          { type: 'Button', content: 'Save Workout' },
          { type: 'Button', content: 'Cancel' },
        ],
      },
    ],
  },
  {
    screenName: 'Workout History Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Page Header',
        components: [{ type: 'Title', content: 'Workout History' }],
      },
      {
        name: 'Filter Bar',
        components: [
          { type: 'Date Range Picker', content: 'Jan 1 - Jan 15' },
          { type: 'Type Filter', content: 'All, Cardio, Strength, Flexibility, Sports, Other' },
          { type: 'Search Input', content: 'Search notes...' },
          { type: 'Button', content: 'Clear Filters' },
        ],
      },
      {
        name: 'Workout List',
        components: [
          { type: 'Workout Card', content: 'Jan 15, Mon | Cardio | 45 min | Felt great' },
          { type: 'Workout Card', content: 'Jan 14, Sun | Strength | 30 min | Upper body focus' },
          { type: 'Workout Card', content: 'Jan 13, Sat | Flexibility | 20 min | Morning stretch' },
        ],
      },
      {
        name: 'Pagination',
        components: [
          { type: 'Button', content: 'Previous' },
          { type: 'Page Numbers', content: '1, 2, 3' },
          { type: 'Button', content: 'Next' },
        ],
      },
    ],
  },
  {
    screenName: 'Streak Calendar Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Page Header',
        components: [{ type: 'Title', content: 'Streak Calendar' }],
      },
      {
        name: 'Streak Summary',
        components: [
          { type: 'Stat', content: 'Current Streak: 7 days 🔥' },
          { type: 'Stat', content: 'Longest Streak: 14 days 🏆' },
        ],
      },
      {
        name: 'Calendar Controls',
        components: [
          { type: 'Button', content: '←' },
          { type: 'Month Display', content: 'January 2026' },
          { type: 'Button', content: '→' },
        ],
      },
      {
        name: 'Calendar Grid',
        components: [
          { type: 'Heatmap Cell', content: 'Jan 1: 30 min (light blue)' },
          { type: 'Heatmap Cell', content: 'Jan 2: 0 min (gray)' },
          { type: 'Heatmap Cell', content: 'Jan 3: 60 min (dark blue)' },
          { type: 'Legend', content: 'Less → More' },
        ],
      },
    ],
  },
  {
    screenName: 'Progress Charts Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Page Header',
        components: [{ type: 'Title', content: 'Progress' }],
      },
      {
        name: 'Summary Stats',
        components: [
          { type: 'Stat Card', content: 'Total Workouts: 42 📊' },
          { type: 'Stat Card', content: 'Current Streak: 7 days 🔥' },
          { type: 'Stat Card', content: 'Total Minutes: 1,260 ⏱️' },
          { type: 'Stat Card', content: 'Avg/Week: 3.5 workouts 📈' },
        ],
      },
      {
        name: 'Weekly Consistency',
        components: [
          { type: 'Title', content: 'Weekly Consistency (Last 12 Weeks)' },
          { type: 'Bar Chart', content: '12 bars showing workouts per week' },
        ],
      },
      {
        name: 'Workout Distribution',
        components: [
          { type: 'Title', content: 'Workout Types' },
          { type: 'Pie Chart', content: 'Cardio 40%, Strength 30%, Flexibility 20%, Sports 10%' },
        ],
      },
    ],
  },
  {
    screenName: 'Settings Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Page Header',
        components: [{ type: 'Title', content: 'Settings' }],
      },
      {
        name: 'Reminder Settings',
        components: [
          { type: 'Section Title', content: 'Daily Reminders' },
          { type: 'Toggle', content: 'Enable daily workout reminders: ON' },
          { type: 'Time Picker', content: 'Reminder Time: 6:00 PM' },
          { type: 'Day Selector', content: 'M, T, W, T, F, S, S (all checked)' },
        ],
      },
      {
        name: 'Account Settings',
        components: [
          { type: 'Section Title', content: 'Account' },
          { type: 'Display Field', content: 'Email: user@example.com' },
          { type: 'Button', content: 'Change Password' },
        ],
      },
      {
        name: 'Danger Zone',
        components: [{ type: 'Button', content: 'Delete Account' }],
      },
      {
        name: 'Save Button',
        components: [{ type: 'Button', content: 'Save Changes' }],
      },
    ],
  },
  {
    screenName: 'Profile Screen',
    layoutType: 'desktop',
    sections: [
      {
        name: 'Header Section',
        components: [
          { type: 'Avatar', content: 'User initials: JD' },
          { type: 'Email', content: 'user@example.com' },
          { type: 'Member Since', content: 'Member since Jan 1, 2026' },
        ],
      },
      {
        name: 'Stats Grid',
        components: [
          { type: 'Stat', content: 'Total Workouts: 42' },
          { type: 'Stat', content: 'Current Streak: 7 days' },
          { type: 'Stat', content: 'Longest Streak: 14 days' },
          { type: 'Stat', content: 'Total Minutes: 1,260' },
        ],
      },
      {
        name: 'Actions',
        components: [
          { type: 'Button', content: 'Edit Profile' },
          { type: 'Button', content: 'Logout' },
        ],
      },
    ],
  },
];

export default function VRAPage() {
  const [isLocked, setIsLocked] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState(0); // First screen expanded by default

  const handleApprove = async () => {
    // TODO: Call API to save visual contracts and lock
    console.log('Approving Visual Expansion Contracts');

    // Mock: Generate a hash and lock
    const mockHash = 'f9a5c3d1e8b6f4a2';
    setHash(mockHash);
    setIsLocked(true);

    // In real implementation, this would:
    // 1. POST /api/projects/:id/agents/vra/approve
    // 2. Receive hash back
    // 3. Update agent state
    // 4. Unlock DVNL (Agent 7)
  };

  const handleReject = async () => {
    // TODO: Call API to revise
    console.log('Rejecting - must revise visual contracts');
    alert('Rejection would require re-generation of visual contracts from approved sources.');
  };

  const totalSections = VISUAL_CONTRACTS.reduce((sum, contract) => sum + contract.sections.length, 0);
  const totalComponents = VISUAL_CONTRACTS.reduce(
    (sum, contract) => sum + contract.sections.reduce((s, section) => s + section.components.length, 0),
    0
  );

  return (
    <div>
      {/* 1. CONTEXT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">👁️</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visual Rendering Authority</h1>
            <p className="text-gray-600 mt-1">Expands screens into explicit visual contracts</p>
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
                This agent creates Visual Expansion Contracts defining WHAT must appear on each screen (sections,
                components, realistic content). It does not decide layout composition, density, or styling. These
                contracts make rendering deterministic and auditable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Input Sources</h2>
        <div className="space-y-4">
          {/* Input 1: Screen Index */}
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

          {/* Input 2: User Journeys */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">🔀</span>
              <span className="text-sm font-medium text-gray-700">Journey Orchestrator</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_USER_JOURNEYS_HASH} size="sm" />
            <span className="text-sm text-gray-600">User Journeys (10 journeys)</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          This agent reads both approved artifacts. Every visual contract must be traceable to these sources. It
          cannot access any other data.
        </p>
      </div>

      {/* 3. GENERATED ARTIFACT (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Artifact: Visual Expansion Contracts</h2>
          <span className="text-xs text-gray-500 font-mono">Read-Only</span>
        </div>

        {/* Strict Statement */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-900 font-medium">
            This contract defines WHAT exists on the screen. It does not decide layout or styling.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
          <span>
            <strong className="text-gray-900">{VISUAL_CONTRACTS.length}</strong> screens
          </span>
          <span>
            <strong className="text-gray-900">{totalSections}</strong> sections
          </span>
          <span>
            <strong className="text-gray-900">{totalComponents}</strong> components
          </span>
        </div>

        {/* Accordion - Contracts per Screen */}
        <div className="space-y-3">
          {VISUAL_CONTRACTS.map((contract, index) => (
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
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{contract.sections.length} sections</span>
                  <span>
                    {contract.sections.reduce((sum, s) => sum + s.components.length, 0)} components
                  </span>
                </div>
              </button>

              {/* Accordion Content */}
              {expandedScreen === index && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="mb-3 text-sm text-gray-600">
                    <strong>Layout Type:</strong> {contract.layoutType}
                  </div>

                  {/* Sections */}
                  <div className="space-y-4">
                    {contract.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">{section.name}</h4>
                        <div className="space-y-2">
                          {section.components.map((component, componentIndex) => (
                            <div key={componentIndex} className="flex items-start gap-3 text-sm">
                              <span className="font-mono text-blue-600 min-w-[120px]">{component.type}</span>
                              <span className="text-gray-700">{component.content}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
            Do these visual contracts accurately represent what must appear on each screen?
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Once you approve, all Visual Expansion Contracts will be locked and hash-sealed. Visual requirements
            cannot be changed without restarting visual planning. The next agent (DVNL) will use these contracts to
            normalize density and constraints. If any contracts are incomplete or incorrect, reject to revise.
          </p>

          <ApprovalButton
            onApprove={handleApprove}
            onReject={handleReject}
            approveText="Approve & Lock Visual Contracts"
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
              <h3 className="font-semibold text-green-900">Visual Contracts Approved</h3>
              <p className="text-sm text-green-800 mt-1">
                All visual expansion contracts have been approved and locked with hash:{' '}
                <code className="font-mono">{hash}</code>. The next agent (DVNL) will use these contracts to
                normalize density and visual constraints.
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
              <span className="text-3xl">📐</span>
              <div>
                <h3 className="font-semibold text-blue-900">Next: Deterministic Visual Normalizer</h3>
                <p className="text-sm text-blue-800 mt-1">Will normalize density and visual constraints</p>
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
