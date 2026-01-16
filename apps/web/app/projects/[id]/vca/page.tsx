/**
 * VCA (Visual Composition Authority) Page (Agent 8)
 *
 * Defines HOW screens should be composed: ordering, grouping, priority, spacing.
 * Produces ONE artifact: Visual Composition Contracts (composition rules per screen).
 *
 * USER FEELING: "This defines the composition structure, not the design details."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { HashBadge } from '@/components/agents/HashBadge';

// Mock data - will be replaced with real API calls
const MOCK_VRA_HASH = 'f9a5b6d3e1c7f8a2';
const MOCK_DVNL_HASH = 'g1b7c4e2f8a3d9e5';
const MOCK_SCREEN_INDEX_HASH = 'd7e3f9a1b8c4d2e6';

interface VCAContract {
  screenName: string;
  primarySections: string[];
  secondarySections: string[];
  visualPriority: string[];
  groupingRules: string[];
  spacing: {
    sectionSpacing: 'tight' | 'medium' | 'loose';
    cardDensity: 'compact' | 'comfortable';
  };
  gridStrategy: {
    system: '12-column';
    maxCardsPerRow: number;
    contentWidth: 'boxed' | 'full';
  };
  emphasisRules: {
    emphasize: string[];
    deEmphasize: string[];
  };
  intentionalOmissions: string[];
  compositionNotes: string[];
}

const VCA_CONTRACTS: VCAContract[] = [
  {
    screenName: 'Login Screen',
    primarySections: ['Header', 'Form Container'],
    secondarySections: ['Footer'],
    visualPriority: [
      'App Logo',
      'Welcome Back Title',
      'Email Input',
      'Password Input',
      'Log In Button',
      'Forgot Password Link',
      'Sign Up Link',
    ],
    groupingRules: [
      'Header and Form Container must be vertically centered',
      'Form inputs must be grouped together with minimal spacing',
      'Action buttons must be separated from input fields',
      'Footer links must be grouped at bottom',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Log In Button', 'Email Input', 'Password Input'],
      deEmphasize: ['Footer', 'Forgot Password Link'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column centered layout for authentication flow',
      'Primary action (Log In) receives highest visual emphasis',
      'Helper links are de-emphasized but remain accessible',
      'Tight vertical grouping of form elements maintains focus',
    ],
  },
  {
    screenName: 'Sign Up Screen',
    primarySections: ['Header', 'Form Container'],
    secondarySections: ['Footer'],
    visualPriority: [
      'App Logo',
      'Get Started Title',
      'Name Input',
      'Email Input',
      'Password Input',
      'Confirm Password Input',
      'Sign Up Button',
      'Log In Link',
    ],
    groupingRules: [
      'Header and Form Container must be vertically centered',
      'All input fields must be grouped together',
      'Password fields must be visually adjacent',
      'Footer links must be separated from primary action',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Sign Up Button', 'Email Input', 'Password Input'],
      deEmphasize: ['Footer', 'Log In Link'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column centered layout for registration flow',
      'Input fields maintain consistent spacing and width',
      'Primary action (Sign Up) receives highest visual weight',
      'Existing user link is accessible but de-emphasized',
    ],
  },
  {
    screenName: 'Forgot Password Screen',
    primarySections: ['Header', 'Form Container'],
    secondarySections: ['Footer'],
    visualPriority: [
      'Reset Password Title',
      'Instructions Text',
      'Email Input',
      'Send Reset Link Button',
      'Back to Login Link',
    ],
    groupingRules: [
      'Header and instructions must be tightly grouped',
      'Form Container must follow instructions with medium spacing',
      'Footer must be clearly separated from primary action',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Send Reset Link Button', 'Email Input'],
      deEmphasize: ['Footer', 'Back to Login Link'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column centered layout for password reset flow',
      'Instructions text provides context before form interaction',
      'Primary action clearly emphasized for user confidence',
      'Navigation link de-emphasized to prevent distraction',
    ],
  },
  {
    screenName: 'Dashboard',
    primarySections: ['Stats Header', 'Quick Entry Section'],
    secondarySections: ['Recent Activity', 'Navigation Links'],
    visualPriority: [
      'Current Streak Metric',
      'Last Workout Metric',
      'Quick Entry Button',
      'Recent Activity List',
      'Streak Calendar Link',
      'Progress Charts Link',
      'Workout History Link',
      'Settings Link',
      'Profile Link',
    ],
    groupingRules: [
      'Stats Header metrics must be displayed horizontally as cards',
      'Quick Entry Section must be prominently placed below stats',
      'Recent Activity must be separated from stats with medium spacing',
      'Navigation Links must be grouped in a grid or list',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 3,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Current Streak Metric', 'Quick Entry Button', 'Last Workout Metric'],
      deEmphasize: ['Navigation Links', 'Settings Link', 'Profile Link'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Horizontal card layout for key metrics maintains scanability',
      'Quick Entry Section receives primary emphasis for frequent action',
      'Recent Activity list constrained to 3-5 items per DVNL',
      'Navigation Links grid provides clear wayfinding without overwhelming',
      'Medium spacing maintains balance between density and breathing room',
    ],
  },
  {
    screenName: 'Log Workout Screen',
    primarySections: ['Header', 'Form Container', 'Action Footer'],
    secondarySections: [],
    visualPriority: [
      'Log Workout Title',
      'Exercise Type Input',
      'Duration Input',
      'Notes Input',
      'Save Workout Button',
      'Cancel Button',
    ],
    groupingRules: [
      'Header must establish context',
      'Form inputs must be vertically stacked with consistent spacing',
      'Action Footer buttons must be grouped horizontally',
      'Primary action (Save) must be visually dominant over Cancel',
    ],
    spacing: {
      sectionSpacing: 'tight',
      cardDensity: 'compact',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Save Workout Button', 'Exercise Type Input', 'Duration Input'],
      deEmphasize: ['Cancel Button', 'Notes Input'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column form layout optimized for speed (target: under 30 seconds)',
      'Tight spacing reduces visual distance between form elements',
      'Primary action receives maximum emphasis for quick completion',
      'Notes field de-emphasized as optional input',
    ],
  },
  {
    screenName: 'Workout History Screen',
    primarySections: ['Header', 'Filters Section', 'Workout List'],
    secondarySections: [],
    visualPriority: [
      'Workout History Title',
      'Date Range Filter',
      'Exercise Type Filter',
      'Workout Entry 1',
      'Workout Entry 2',
      'Workout Entry 3',
      'Load More Button',
    ],
    groupingRules: [
      'Header and Filters Section must be tightly grouped',
      'Filters must be displayed horizontally for quick access',
      'Workout List must be separated from filters with medium spacing',
      'Each workout entry must have consistent internal structure',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Workout List', 'Date Range Filter', 'Exercise Type Filter'],
      deEmphasize: ['Load More Button'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column list layout maintains chronological readability',
      'Filters receive high priority for data exploration',
      'Workout entries use consistent card structure per DVNL',
      'Load More de-emphasized to reduce UI clutter',
    ],
  },
  {
    screenName: 'Streak Calendar Screen',
    primarySections: ['Header', 'Stats Summary', 'Calendar Grid'],
    secondarySections: ['Legend'],
    visualPriority: [
      'Streak Calendar Title',
      'Current Streak Stat',
      'Longest Streak Stat',
      'Calendar Heatmap',
      'Activity Legend',
    ],
    groupingRules: [
      'Header and Stats Summary must be tightly grouped',
      'Stats must be displayed as horizontal metric cards',
      'Calendar Grid must be the dominant visual element',
      'Legend must be positioned below calendar for reference',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 2,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Calendar Heatmap', 'Current Streak Stat', 'Longest Streak Stat'],
      deEmphasize: ['Legend'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Calendar Grid receives maximum emphasis as primary data visualization',
      'Stats cards provide context before calendar interaction',
      'Horizontal card layout for stats maintains scanability',
      'Legend de-emphasized but accessible for interpretation',
    ],
  },
  {
    screenName: 'Progress Charts Screen',
    primarySections: ['Header', 'Stats Summary', 'Chart Section', 'Filters'],
    secondarySections: ['History Table'],
    visualPriority: [
      'Progress Charts Title',
      'Total Workouts Metric',
      'Average Duration Metric',
      'Weekly Trend Metric',
      'Consistency Score Metric',
      'Main Trend Chart',
      'Exercise Breakdown Chart',
      'Time Period Filter',
      'Exercise Type Filter',
      'History Table',
    ],
    groupingRules: [
      'Header and Stats Summary must be tightly grouped',
      'Stats cards must be displayed in horizontal grid (max 4 per DVNL)',
      'Chart Section must be the dominant visual focus',
      'Filters must be positioned adjacent to charts',
      'History Table must be clearly separated as secondary data',
    ],
    spacing: {
      sectionSpacing: 'loose',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 4,
      contentWidth: 'full',
    },
    emphasisRules: {
      emphasize: ['Main Trend Chart', 'Exercise Breakdown Chart', 'Stats Summary'],
      deEmphasize: ['History Table', 'Filters'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Horizontal stats card grid provides quick metrics overview',
      'Charts receive maximum emphasis as primary analytical tools',
      'Loose spacing accommodates high-complexity visualization per DVNL',
      'History Table de-emphasized as supplementary data reference',
      'Full-width content layout maximizes chart legibility',
    ],
  },
  {
    screenName: 'Settings Screen',
    primarySections: ['Header', 'Settings List', 'Action Footer'],
    secondarySections: [],
    visualPriority: [
      'Settings Title',
      'Notification Settings',
      'Reminder Time',
      'Account Settings',
      'Privacy Settings',
      'Save Changes Button',
    ],
    groupingRules: [
      'Header must establish context',
      'Settings List must be vertically stacked with consistent spacing',
      'Related settings must be visually grouped (notifications, account, privacy)',
      'Action Footer must be separated from settings list',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 1,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Save Changes Button', 'Notification Settings'],
      deEmphasize: ['Privacy Settings'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Single-column list layout maintains settings hierarchy',
      'Settings grouped by category for logical organization',
      'Primary action (Save) clearly emphasized for confirmation',
      'Medium spacing balances density with readability',
    ],
  },
  {
    screenName: 'Profile Screen',
    primarySections: ['Header', 'Profile Info', 'Stats Grid'],
    secondarySections: ['Account Actions'],
    visualPriority: [
      'Profile Title',
      'User Avatar',
      'User Name',
      'Email Address',
      'Total Workouts Stat',
      'Current Streak Stat',
      'Longest Streak Stat',
      'Member Since Stat',
      'Edit Profile Button',
      'Sign Out Button',
    ],
    groupingRules: [
      'Header and Profile Info must be tightly grouped',
      'Profile Info must display avatar and text information together',
      'Stats Grid must be displayed as horizontal metric cards (max 4 per DVNL)',
      'Account Actions must be clearly separated from stats',
    ],
    spacing: {
      sectionSpacing: 'medium',
      cardDensity: 'comfortable',
    },
    gridStrategy: {
      system: '12-column',
      maxCardsPerRow: 4,
      contentWidth: 'boxed',
    },
    emphasisRules: {
      emphasize: ['Stats Grid', 'User Avatar', 'User Name'],
      deEmphasize: ['Account Actions', 'Sign Out Button'],
    },
    intentionalOmissions: [],
    compositionNotes: [
      'Profile Info section establishes user identity context',
      'Stats Grid uses horizontal card layout for quick metrics overview',
      'Account Actions de-emphasized to prevent accidental clicks',
      'Medium spacing balances information density with visual clarity',
    ],
  },
];

// Calculate summary stats
const totalPrimarySections = VCA_CONTRACTS.reduce((sum, c) => sum + c.primarySections.length, 0);
const totalSecondarySections = VCA_CONTRACTS.reduce((sum, c) => sum + c.secondarySections.length, 0);
const spacingDistribution = VCA_CONTRACTS.reduce(
  (acc, c) => {
    acc[c.spacing.sectionSpacing]++;
    return acc;
  },
  { tight: 0, medium: 0, loose: 0 }
);

export default function VCAPage() {
  const [isLocked, setIsLocked] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState(0); // First screen expanded by default

  const handleApprove = async () => {
    // TODO: Call API to save VCA contracts and lock
    console.log('Approving Visual Composition Contracts');

    // Mock: Generate a hash and lock
    const mockHash = 'h2c8d5f3a9b4e6f2';
    setHash(mockHash);
    setIsLocked(true);

    // In real implementation, this would:
    // 1. POST /api/projects/:id/agents/vca/approve
    // 2. Receive hash back
    // 3. Update agent state
    // 4. Unlock VCRA (Agent 9)
  };

  const handleReject = async () => {
    // TODO: Call API to revise
    console.log('Rejecting - must revise composition contracts');
    alert('Rejection would require re-composition from the approved VRA and DVNL contracts.');
  };

  return (
    <div>
      {/* 1. CONTEXT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🎯</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visual Composition Authority</h1>
            <p className="text-gray-600 mt-1">Defines HOW screens should be composed</p>
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
                This agent defines composition rules for each screen: section ordering, visual priority, grouping,
                spacing, and grid strategy. It reads from approved VRA and DVNL contracts and cannot invent new
                components or change density constraints. This contract defines composition only. It does not change
                features or visual density constraints.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. INPUTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Input Sources</h2>
        <div className="space-y-4">
          {/* Input 1: VRA */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">👁️</span>
              <span className="text-sm font-medium text-gray-700">Visual Requirements Analyst</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_VRA_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Expansion Contracts</span>
          </div>

          {/* Input 2: DVNL */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">📐</span>
              <span className="text-sm font-medium text-gray-700">DVNL</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_DVNL_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Normalization Contracts</span>
          </div>

          {/* Input 3: Screen Index */}
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
        </div>
        <p className="text-sm text-gray-600 mt-4">
          This agent reads approved contracts from VRA, DVNL, and Screen Cartographer. All composition rules must
          reference existing sections and components. It cannot access any other data.
        </p>
      </div>

      {/* 3. GENERATED ARTIFACT (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Artifact: Visual Composition Contracts</h2>
          <span className="text-xs text-gray-500 font-mono">Read-Only</span>
        </div>

        {/* Summary Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-900">{VCA_CONTRACTS.length}</div>
              <div className="text-xs text-blue-700 mt-1">Screens</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{totalPrimarySections}</div>
              <div className="text-xs text-blue-700 mt-1">Primary Sections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{totalSecondarySections}</div>
              <div className="text-xs text-blue-700 mt-1">Secondary Sections</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {spacingDistribution.tight}T / {spacingDistribution.medium}M / {spacingDistribution.loose}L
              </div>
              <div className="text-xs text-blue-700 mt-1">Spacing Distribution</div>
            </div>
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {VCA_CONTRACTS.map((contract, index) => (
            <div key={contract.screenName} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => setExpandedScreen(expandedScreen === index ? -1 : index)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{contract.screenName}</span>
                  <span className="text-xs text-gray-500">
                    {contract.primarySections.length + contract.secondarySections.length} sections •{' '}
                    {contract.spacing.sectionSpacing} spacing
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${expandedScreen === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Accordion Content */}
              {expandedScreen === index && (
                <div className="p-6 bg-white border-t border-gray-200">
                  <div className="space-y-6">
                    {/* Primary Sections */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Primary Sections</h4>
                      <div className="flex flex-wrap gap-2">
                        {contract.primarySections.map((section) => (
                          <span
                            key={section}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium"
                          >
                            {section}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Secondary Sections */}
                    {contract.secondarySections.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Secondary Sections</h4>
                        <div className="flex flex-wrap gap-2">
                          {contract.secondarySections.map((section) => (
                            <span
                              key={section}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full font-medium"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Visual Priority */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Visual Priority Order</h4>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                        {contract.visualPriority.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Grouping Rules */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Grouping Rules</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {contract.groupingRules.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Spacing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Spacing</h4>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Section Spacing:</span> {contract.spacing.sectionSpacing}
                          </div>
                          <div>
                            <span className="font-medium">Card Density:</span> {contract.spacing.cardDensity}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Grid Strategy</h4>
                        <div className="space-y-1 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">System:</span> {contract.gridStrategy.system}
                          </div>
                          <div>
                            <span className="font-medium">Max Cards/Row:</span> {contract.gridStrategy.maxCardsPerRow}
                          </div>
                          <div>
                            <span className="font-medium">Content Width:</span> {contract.gridStrategy.contentWidth}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Emphasis Rules */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Emphasize</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {contract.emphasisRules.emphasize.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">De-emphasize</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {contract.emphasisRules.deEmphasize.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Intentional Omissions */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Intentional Omissions</h4>
                      {contract.intentionalOmissions.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          No omissions. All components from VRA contracts are included.
                        </p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {contract.intentionalOmissions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Composition Notes */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Composition Notes</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {contract.compositionNotes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {VCA_CONTRACTS.length} screens defined • {totalPrimarySections + totalSecondarySections} total sections
        </div>
      </div>

      {/* 4. APPROVAL CONTROLS */}
      {!isLocked && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Do these composition rules correctly define the structure and priority of all screens?
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Once approved, composition rules are locked and cannot be changed without restarting visual planning. The
            next agent (VCRA) will use these composition contracts to generate real screen mockups. If any composition
            rules are incorrect or missing, reject to revise.
          </p>

          <ApprovalButton
            onApprove={handleApprove}
            onReject={handleReject}
            approveText="Approve & Lock Composition Contracts"
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
              <h3 className="font-semibold text-green-900">Visual Composition Contracts Approved</h3>
              <p className="text-sm text-green-800 mt-1">
                All composition contracts have been approved and locked with hash:{' '}
                <code className="font-mono">{hash}</code>. The next agent (VCRA) will use these composition rules to
                generate actual screen mockups with real visual designs.
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
              <span className="text-3xl">📸</span>
              <div>
                <h3 className="font-semibold text-blue-900">Next: VCRA (Visual Code Rendering Authority)</h3>
                <p className="text-sm text-blue-800 mt-1">
                  Will generate actual screen mockups using composition contracts
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
