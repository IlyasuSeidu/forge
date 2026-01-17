/**
 * VCRA (Visual Code Rendering Authority) Page (Agent 9)
 *
 * Converts approved visual contracts into runnable UI code and screenshot previews.
 * Produces ONE artifact: Visual Code Rendering Contracts (code + screenshots per screen).
 *
 * USER FEELING: "This is my app. I can SEE it. The text is real. This is safe."
 */

'use client';

import { useState } from 'react';
import { ApprovalButton } from '@/components/agents/ApprovalButton';
import { useAgentState } from '@/lib/context/AgentStateContext';
import { useApproval } from '@/lib/hooks/useApproval';
import { HashBadge } from '@/components/agents/HashBadge';

// Mock data - will be replaced with real API calls
const MOCK_VRA_HASH = 'f9a5b6d3e1c7f8a2';
const MOCK_DVNL_HASH = 'g1b7c4e2f8a3d9e5';
const MOCK_VCA_HASH = 'h2c8d5f3a9b4e6f2';
const MOCK_SCREEN_INDEX_HASH = 'd7e3f9a1b8c4d2e6';

interface VCRAContract {
  screenName: string;
  layoutType: 'desktop';
  framework: 'react-tailwind';
  viewport: { width: number; height: number };
  renderMode: 'playwright-screenshot';
  codePreview: string;
  codeSizeBytes: number;
  screenshotUrl: string;
  contractHash?: string;
}

// Generate placeholder screenshot as data URI (simple gradient representing UI)
const generatePlaceholderScreenshot = (screenName: string, color: string): string => {
  // Simple SVG placeholder that looks like a UI screenshot
  const svg = `
    <svg width="1440" height="900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${screenName}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.3" />
        </linearGradient>
      </defs>
      <rect width="1440" height="900" fill="url(#grad-${screenName})"/>
      <rect x="20" y="20" width="1400" height="80" fill="white" opacity="0.9" rx="8"/>
      <rect x="40" y="40" width="200" height="40" fill="${color}" opacity="0.7" rx="4"/>
      <rect x="20" y="120" width="1400" height="760" fill="white" opacity="0.95" rx="8"/>
      <text x="720" y="500" font-family="Arial" font-size="32" fill="#666" text-anchor="middle">${screenName}</text>
      <text x="720" y="540" font-family="Arial" font-size="16" fill="#999" text-anchor="middle">Preview Rendering</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const VCRA_CONTRACTS: VCRAContract[] = [
  {
    screenName: 'Login Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function LoginScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-4">🏋️</div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to track your fitness journey
          </p>
        </div>

        {/* Form Container */}
        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <a href="#" className="text-sm text-blue-600 hover:text-blue-500">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-semibold"
          >
            Log In
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="#" className="text-blue-600 hover:text-blue-500">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 1847,
    screenshotUrl: generatePlaceholderScreenshot('Login Screen', '#3B82F6'),
  },
  {
    screenName: 'Sign Up Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function SignUpScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-4">🏋️</div>
          <h2 className="text-3xl font-bold text-gray-900">Get Started</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to begin tracking
          </p>
        </div>

        {/* Form Container */}
        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-semibold"
          >
            Sign Up
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a href="#" className="text-blue-600 hover:text-blue-500">
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 2134,
    screenshotUrl: generatePlaceholderScreenshot('Sign Up Screen', '#3B82F6'),
  },
  {
    screenName: 'Forgot Password Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function ForgotPasswordScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a reset link
          </p>
        </div>

        {/* Form Container */}
        <form className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              placeholder="user@example.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-semibold"
          >
            Send Reset Link
          </button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          Remember your password?{' '}
          <a href="#" className="text-blue-600 hover:text-blue-500">
            Back to login
          </a>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 1432,
    screenshotUrl: generatePlaceholderScreenshot('Forgot Password Screen', '#3B82F6'),
  },
  {
    screenName: 'Dashboard',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function Dashboard() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Header */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-2">Current Streak</div>
            <div className="text-4xl font-bold text-blue-600">12 days</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-2">Last Workout</div>
            <div className="text-4xl font-bold text-green-600">Today</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-2">Total Workouts</div>
            <div className="text-4xl font-bold text-purple-600">47</div>
          </div>
        </div>

        {/* Quick Entry Section */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Log Today's Workout
          </h2>
          <button className="w-full py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg">
            + Quick Entry
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-semibold">Upper Body</div>
                <div className="text-sm text-gray-600">45 minutes</div>
              </div>
              <div className="text-sm text-gray-500">Today, 8:00 AM</div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <div className="font-semibold">Cardio</div>
                <div className="text-sm text-gray-600">30 minutes</div>
              </div>
              <div className="text-sm text-gray-500">Yesterday, 7:00 AM</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="grid grid-cols-2 gap-4">
          <a href="#" className="p-4 bg-white rounded-lg shadow hover:shadow-md">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-semibold">Streak Calendar</div>
          </a>
          <a href="#" className="p-4 bg-white rounded-lg shadow hover:shadow-md">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-semibold">Progress Charts</div>
          </a>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 2487,
    screenshotUrl: generatePlaceholderScreenshot('Dashboard', '#10B981'),
  },
  {
    screenName: 'Log Workout Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function LogWorkoutScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Log Workout
        </h1>

        {/* Form Container */}
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exercise Type
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option>Upper Body</option>
              <option>Lower Body</option>
              <option>Cardio</option>
              <option>Full Body</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              placeholder="How did it go?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Action Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              className="flex-1 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-md font-semibold"
            >
              Save Workout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 1634,
    screenshotUrl: generatePlaceholderScreenshot('Log Workout Screen', '#8B5CF6'),
  },
  {
    screenName: 'Workout History Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function WorkoutHistoryScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Workout History
        </h1>

        {/* Filters Section */}
        <div className="flex gap-4 mb-6">
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
          <select className="px-4 py-2 border border-gray-300 rounded-md">
            <option>All Types</option>
            <option>Upper Body</option>
            <option>Lower Body</option>
            <option>Cardio</option>
          </select>
        </div>

        {/* Workout List */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    Upper Body Strength
                  </h3>
                  <p className="text-gray-600 mt-1">45 minutes</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Felt strong today. Increased weights on bench press.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  Jan {20 - i}, 2026
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-6 text-center">
          <button className="px-6 py-2 border border-gray-300 rounded-md text-gray-700">
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 1789,
    screenshotUrl: generatePlaceholderScreenshot('Workout History Screen', '#F59E0B'),
  },
  {
    screenName: 'Streak Calendar Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function StreakCalendarScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Streak Calendar
        </h1>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-2">Current Streak</div>
            <div className="text-4xl font-bold text-blue-600">12 days</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-2">Longest Streak</div>
            <div className="text-4xl font-bold text-purple-600">28 days</div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white p-8 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-6">January 2026</h2>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 p-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <div
                key={i}
                className={\`aspect-square p-2 rounded text-center text-sm \${
                  i < 20 ? 'bg-green-100 text-green-800' : 'bg-gray-50 text-gray-400'
                }\`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span className="text-gray-600">Workout completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
            <span className="text-gray-600">No workout</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 2056,
    screenshotUrl: generatePlaceholderScreenshot('Streak Calendar Screen', '#10B981'),
  },
  {
    screenName: 'Progress Charts Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function ProgressChartsScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Progress Charts
        </h1>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-600 mb-1">Total Workouts</div>
            <div className="text-2xl font-bold text-blue-600">47</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-600 mb-1">Avg Duration</div>
            <div className="text-2xl font-bold text-green-600">38m</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-600 mb-1">Weekly Trend</div>
            <div className="text-2xl font-bold text-purple-600">+12%</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-xs text-gray-600 mb-1">Consistency</div>
            <div className="text-2xl font-bold text-orange-600">85%</div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Workout Trend</h2>
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option>Last 30 days</option>
              </select>
            </div>
            <div className="h-64 flex items-end justify-around gap-2">
              {[40, 65, 50, 80, 70, 90, 85].map((height, i) => (
                <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: \`\${height}%\` }} />
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Exercise Breakdown</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Upper Body</span>
                  <span>35%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Cardio</span>
                  <span>30%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '30%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Lower Body</span>
                  <span>25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 3124,
    screenshotUrl: generatePlaceholderScreenshot('Progress Charts Screen', '#8B5CF6'),
  },
  {
    screenName: 'Settings Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function SettingsScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

        {/* Settings List */}
        <div className="bg-white rounded-lg shadow divide-y">
          {/* Notification Settings */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Notification Settings
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Daily Reminders</span>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-700">Streak Alerts</span>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </label>
            </div>
          </div>

          {/* Reminder Time */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Reminder Time</h3>
            <input
              type="time"
              defaultValue="08:00"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Account Settings */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Account Settings
            </h3>
            <div className="space-y-2">
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Change Email
              </button>
              <br />
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Change Password
              </button>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Privacy Settings
            </h3>
            <label className="flex items-center justify-between">
              <span className="text-gray-700">Profile Visibility</span>
              <input type="checkbox" className="w-4 h-4" />
            </label>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-6">
          <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 2147,
    screenshotUrl: generatePlaceholderScreenshot('Settings Screen', '#6B7280'),
  },
  {
    screenName: 'Profile Screen',
    layoutType: 'desktop',
    framework: 'react-tailwind',
    viewport: { width: 1440, height: 1024 },
    renderMode: 'playwright-screenshot',
    codePreview: `export default function ProfileScreen() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

        {/* Profile Info */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              JD
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">John Doe</h2>
              <p className="text-gray-600">john.doe@example.com</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-blue-600">47</div>
            <div className="text-sm text-gray-600 mt-1">Total Workouts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-green-600">12</div>
            <div className="text-sm text-gray-600 mt-1">Current Streak</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-purple-600">28</div>
            <div className="text-sm text-gray-600 mt-1">Longest Streak</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <div className="text-2xl font-bold text-orange-600">3mo</div>
            <div className="text-sm text-gray-600 mt-1">Member Since</div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white p-6 rounded-lg shadow space-y-3">
          <button className="w-full py-2 text-left text-blue-600 hover:text-blue-700">
            Edit Profile
          </button>
          <hr />
          <button className="w-full py-2 text-left text-red-600 hover:text-red-700">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}`,
    codeSizeBytes: 1943,
    screenshotUrl: generatePlaceholderScreenshot('Profile Screen', '#3B82F6'),
  },
];

// Calculate summary stats
const totalCodeSize = VCRA_CONTRACTS.reduce((sum, c) => sum + c.codeSizeBytes, 0);
const avgCodeSize = Math.round(totalCodeSize / VCRA_CONTRACTS.length);

export default function VCRAPage() {
  // Get agent state from context
  const { currentState } = useAgentState('vcra');

  // Get approval functions
  const { approve, reject, isApproving, isRejecting, error } = useApproval(currentState?.approvalId);

  // Local UI state

  const [isLocked, setIsLocked] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<{ [key: number]: boolean }>({});

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

  const toggleCodeExpansion = (index: number) => {
    setExpandedCode((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div>
      {/* 1. CONTEXT HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">📸</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visual Code Rendering Authority</h1>
            <p className="text-gray-600 mt-1">Converts visual contracts into runnable UI code and screenshots</p>
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
                This agent generates runnable UI code and screenshot previews for each screen using approved VRA, DVNL,
                and VCA contracts. These previews are generated in a controlled renderer (Playwright). This output is a
                UI preview artifact. It is not application logic. All previews are read-only until approval.
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
              <span className="text-xl">👁️</span>
              <span className="text-sm font-medium text-gray-700">VRA</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_VRA_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Expansion Contracts</span>
          </div>

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

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
              <span className="text-xl">🎯</span>
              <span className="text-sm font-medium text-gray-700">VCA</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <HashBadge hash={MOCK_VCA_HASH} size="sm" />
            <span className="text-sm text-gray-600">Visual Composition Contracts</span>
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
        </div>
        <p className="text-sm text-gray-600 mt-4">
          This agent reads all approved visual contracts. Every screenshot and code snippet is deterministically
          generated from these contracts. It cannot access any other data.
        </p>
      </div>

      {/* 3. GENERATED ARTIFACT (Read-Only) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Artifact: Visual Code Rendering Contracts</h2>
          <span className="text-xs text-gray-500 font-mono">Read-Only</span>
        </div>

        {/* Summary Stats */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-900">{VCRA_CONTRACTS.length}</div>
              <div className="text-xs text-green-700 mt-1">Screens</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{VCRA_CONTRACTS.length}</div>
              <div className="text-xs text-green-700 mt-1">Screenshots Generated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{(avgCodeSize / 1000).toFixed(1)}KB</div>
              <div className="text-xs text-green-700 mt-1">Avg Code Size</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{(totalCodeSize / 1000).toFixed(1)}KB</div>
              <div className="text-xs text-green-700 mt-1">Total Code Size</div>
            </div>
          </div>
        </div>

        {/* Safety Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-sm text-blue-800">
            <strong>Safety Guarantee:</strong> These previews are generated in a controlled renderer. No external network access. No database connections. UI preview only.
          </div>
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {VCRA_CONTRACTS.map((contract, index) => (
            <div key={contract.screenName} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Accordion Header */}
              <button
                onClick={() => setExpandedScreen(expandedScreen === index ? -1 : index)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{contract.screenName}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Preview Ready
                  </span>
                  <span className="text-xs text-gray-500">
                    {(contract.codeSizeBytes / 1000).toFixed(1)}KB • {contract.framework}
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
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Screenshot Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Screenshot Preview</h4>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          Read-Only
                        </span>
                      </div>
                      <button
                        onClick={() => setLightboxImage(contract.screenshotUrl)}
                        className="w-full border-2 border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors group"
                      >
                        <img
                          src={contract.screenshotUrl}
                          alt={`${contract.screenName} preview`}
                          className="w-full h-auto"
                        />
                        <div className="bg-gray-50 px-3 py-2 text-sm text-gray-600 group-hover:text-blue-600">
                          Click to view full size
                        </div>
                      </button>
                      <div className="mt-2 text-xs text-gray-500">
                        {contract.viewport.width}×{contract.viewport.height}px • {contract.renderMode}
                      </div>
                    </div>

                    {/* Code Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Code Preview</h4>
                        <span className="text-xs text-gray-500">{contract.codeSizeBytes} bytes</span>
                      </div>
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 px-3 py-2 text-xs text-gray-400 flex items-center justify-between">
                          <span>{contract.framework}</span>
                          <button
                            onClick={() => toggleCodeExpansion(index)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {expandedCode[index] ? 'Collapse' : 'Expand'}
                          </button>
                        </div>
                        <pre className={`p-4 text-xs text-gray-100 font-mono overflow-x-auto ${expandedCode[index] ? '' : 'max-h-80 overflow-y-auto'}`}>
                          {contract.codePreview}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Contract Metadata */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Contract Metadata</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Layout Type:</span>{' '}
                        <span className="font-medium text-gray-900">{contract.layoutType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Framework:</span>{' '}
                        <span className="font-medium text-gray-900">{contract.framework}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Viewport:</span>{' '}
                        <span className="font-medium text-gray-900">
                          {contract.viewport.width}×{contract.viewport.height}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Render Mode:</span>{' '}
                        <span className="font-medium text-gray-900">{contract.renderMode}</span>
                      </div>
                    </div>
                    {isLocked && contract.contractHash && (
                      <div className="mt-4">
                        <HashBadge hash={contract.contractHash} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {VCRA_CONTRACTS.length} screens rendered • {(totalCodeSize / 1000).toFixed(1)}KB total code
        </div>
      </div>

      {/* 4. APPROVAL CONTROLS */}
      {!isLocked && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Do these previews accurately represent your application screens?
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Once approved, previews are locked and cannot be regenerated without restarting visual planning. The next
            agent (Build Prompt Engineer) will use these previews to generate implementation instructions. If any
            previews are incorrect or missing, reject to regenerate.
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
            approveText="Approve & Lock Preview Contracts"
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
              <h3 className="font-semibold text-green-900">Visual Code Rendering Contracts Approved</h3>
              <p className="text-sm text-green-800 mt-1">
                All rendering contracts have been approved and locked with hash: <code className="font-mono">{hash}</code>.
                The next agent (Build Prompt Engineer) will use these previews to generate build instructions for
                implementation.
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
              <span className="text-3xl">📝</span>
              <div>
                <h3 className="font-semibold text-blue-900">Next: Build Prompt Engineer</h3>
                <p className="text-sm text-blue-800 mt-1">Will generate implementation instructions from previews</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-full">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-700">Your Turn</span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-8"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Full size preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
            Press ESC or click outside to close
          </div>
        </div>
      )}

      {/* ESC key handler */}
      {lightboxImage && (
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxImage(null);
          }}
          tabIndex={0}
          className="fixed inset-0 pointer-events-none"
        />
      )}
    </div>
  );
}
