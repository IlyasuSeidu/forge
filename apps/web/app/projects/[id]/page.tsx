/**
 * Project Home Page
 *
 * Command center for non-developers.
 * Shows progress, next actions, trust indicators, and quick access.
 */

'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  computeProjectStage,
  computeProjectStatus,
  getFirstIncompleteAgent,
  getPrimaryCTA,
  getNextStepMessage,
  getStageLabel,
  isPreviewAvailable,
  isDownloadAvailable,
  isVerificationReportAvailable,
  isCompletionCertificateAvailable,
} from '@/lib/projectState';
import { AgentState } from '@/lib/agents';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

// Mock data - will be replaced with API calls
function getProjectData(projectId: string) {
  return {
    id: projectId,
    name: 'Fitness Habit Tracker',
    purpose: 'Help users build sustainable fitness habits through daily tracking and progress visualization',
    createdAt: '2026-01-14T14:00:00Z',
  };
}

function getAgentStates(projectId: string): AgentState[] {
  // Mock: 16 agents approved, completion auditor awaiting
  return [
    { id: 'foundry-architect', status: 'approved', hash: 'fa8c7d2e9b1a4f6e', approvedAt: '2026-01-14T14:30:00Z' },
    { id: 'synthetic-founder', status: 'approved', hash: 'b9d4e1f7c3a8d2e5', approvedAt: '2026-01-14T14:35:00Z' },
    { id: 'product-strategist', status: 'approved', hash: 'c4f8a2d9e7b1f3a6', approvedAt: '2026-01-14T14:40:00Z' },
    { id: 'screen-cartographer', status: 'approved', hash: 'd7e3f9a1b8c4d2e6', approvedAt: '2026-01-14T14:45:00Z' },
    { id: 'journey-orchestrator', status: 'approved', hash: 'e8f4b3c2d9a5e7f1', approvedAt: '2026-01-14T14:50:00Z' },
    { id: 'vra', status: 'approved', hash: 'f9a5b6d3e1c7f8a2', approvedAt: '2026-01-14T14:55:00Z' },
    { id: 'dvnl', status: 'approved', hash: 'g1b7c4e2f8a3d9e5', approvedAt: '2026-01-14T15:00:00Z' },
    { id: 'vca', status: 'approved', hash: 'h2c8d5f3a9b4e6f2', approvedAt: '2026-01-14T15:05:00Z' },
    { id: 'vcra', status: 'approved', hash: 'i3d9e6f4b1a5c7d3', approvedAt: '2026-01-14T15:10:00Z' },
    { id: 'build-prompt', status: 'approved', hash: 'j1k2l3m4n5o6p7q8', approvedAt: '2026-01-14T15:15:00Z' },
    { id: 'execution-planner', status: 'approved', hash: 'k1l2m3n4o5p6q7r8', approvedAt: '2026-01-14T15:20:00Z' },
    { id: 'forge-implementer', status: 'approved', hash: 'l1m2n3o4p5q6r7s8', approvedAt: '2026-01-14T15:25:00Z' },
    { id: 'verification-executor', status: 'approved', hash: 'm1n2o3p4q5r6s7t8', approvedAt: '2026-01-14T15:30:00Z' },
    {
      id: 'verification-report-generator',
      status: 'approved',
      hash: 'n1o2p3q4r5s6t7u8',
      approvedAt: '2026-01-14T15:35:00Z',
    },
    { id: 'repair-plan-generator', status: 'approved', hash: 'o1p2q3r4s5t6u7v8', approvedAt: '2026-01-14T15:40:00Z' },
    { id: 'repair', status: 'approved', hash: 'p1q2r3s4t5u6v7w8', approvedAt: '2026-01-14T15:45:00Z' },
    { id: 'completion', status: 'awaiting_approval' },
  ];
}

function getRecentActivity() {
  return [
    { event: 'Agent Approved', details: 'Repair Agent', timestamp: '2 minutes ago' },
    { event: 'Agent Approved', details: 'Repair Plan Generator', timestamp: '5 minutes ago' },
    { event: 'Agent Approved', details: 'Verification Report Generator', timestamp: '8 minutes ago' },
    { event: 'Agent Approved', details: 'Verification Executor', timestamp: '12 minutes ago' },
    { event: 'Agent Approved', details: 'Forge Implementer', timestamp: '15 minutes ago' },
  ];
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id: projectId } = use(params);
  const project = getProjectData(projectId);
  const agentStates = getAgentStates(projectId);
  const recentActivity = getRecentActivity();

  const approvedCount = agentStates.filter((s) => s.status === 'approved').length;
  const totalAgents = agentStates.length;
  const stage = computeProjectStage(approvedCount);
  const status = computeProjectStatus(agentStates);
  const firstIncompleteAgent = getFirstIncompleteAgent(agentStates);
  const primaryCTA = getPrimaryCTA(status, firstIncompleteAgent, projectId);
  const nextStepMessage = getNextStepMessage(status, firstIncompleteAgent);

  const latestHash = agentStates.filter((s) => s.hash).pop()?.hash;

  return (
    <div className="space-y-8 pb-8">
      {/* ================================================================ */}
      {/* A. HERO HEADER */}
      {/* ================================================================ */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <p className="text-gray-700 mb-4">{project.purpose}</p>
            <div className="flex items-center gap-3">
              <StatusBadge status={status} />
              <span className="text-sm text-gray-600">•</span>
              <span className="text-sm text-gray-600">{getStageLabel(stage)}</span>
            </div>
          </div>
          <div className="text-5xl">🔨</div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* B. PROGRESS + NEXT STEP CARD */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Progress</h2>
            <p className="text-sm text-gray-600">
              {approvedCount} of {totalAgents} agents approved
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{Math.round((approvedCount / totalAgents) * 100)}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(approvedCount / totalAgents) * 100}%` }}
          />
        </div>

        {/* Next Step */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm font-semibold text-blue-900 mb-1">What happens next</div>
          <p className="text-sm text-blue-800">{nextStepMessage}</p>
        </div>

        {/* Primary CTA */}
        <Link
          href={primaryCTA.href}
          className={`block w-full text-center px-6 py-4 rounded-lg font-semibold text-lg ${
            primaryCTA.enabled
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {primaryCTA.label} →
        </Link>
      </div>

      {/* ================================================================ */}
      {/* C. SAFETY + TRUST PANEL */}
      {/* ================================================================ */}
      <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">🔒</div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-green-900 mb-2">You Are In Control</h2>
            <div className="space-y-2 text-sm text-green-900">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                <div>You are in control. Forge cannot approve anything for you.</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                <div>All approved artifacts are hash-locked and immutable.</div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-1.5" />
                <div>No silent retries. Failures halt immediately.</div>
              </div>
            </div>
          </div>
        </div>

        {latestHash && (
          <div className="flex items-center gap-2 pt-4 border-t border-green-200">
            <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="text-xs text-green-800">Latest hash:</span>
            <code className="text-xs font-mono text-green-900 bg-green-100 px-2 py-0.5 rounded">{latestHash}</code>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* D. QUICK ACTIONS GRID */}
      {/* ================================================================ */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Timeline */}
          <Link
            href={`/projects/${projectId}/${firstIncompleteAgent?.id || 'foundry-architect'}`}
            className="bg-white border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="font-semibold text-gray-900 mb-1">Timeline</div>
            <div className="text-xs text-gray-600">View all agents</div>
          </Link>

          {/* Preview App */}
          {isPreviewAvailable(agentStates) ? (
            <Link
              href={`/projects/${projectId}/preview`}
              className="bg-white border-2 border-blue-500 rounded-lg p-6 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">👁️</div>
              <div className="font-semibold text-gray-900 mb-1">Preview App</div>
              <div className="text-xs text-blue-700">Run preview session</div>
            </Link>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 opacity-50 cursor-not-allowed">
              <div className="text-3xl mb-2">👁️</div>
              <div className="font-semibold text-gray-600 mb-1">Preview App</div>
              <div className="text-xs text-gray-500">Complete project first</div>
            </div>
          )}

          {/* Download Source */}
          {isDownloadAvailable(agentStates) ? (
            <Link
              href={`/projects/${projectId}/download`}
              className="bg-white border-2 border-green-500 rounded-lg p-6 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">📦</div>
              <div className="font-semibold text-gray-900 mb-1">Download Source</div>
              <div className="text-xs text-green-700">Export full workspace</div>
            </Link>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 opacity-50 cursor-not-allowed">
              <div className="text-3xl mb-2">📦</div>
              <div className="font-semibold text-gray-600 mb-1">Download Source</div>
              <div className="text-xs text-gray-500">Complete project first</div>
            </div>
          )}

          {/* Verification Report */}
          {isVerificationReportAvailable(agentStates) ? (
            <Link
              href={`/projects/${projectId}/verification-report-generator`}
              className="bg-white border-2 border-purple-500 rounded-lg p-6 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="font-semibold text-gray-900 mb-1">Verification Report</div>
              <div className="text-xs text-purple-700">View quality evidence</div>
            </Link>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 opacity-50 cursor-not-allowed">
              <div className="text-3xl mb-2">📄</div>
              <div className="font-semibold text-gray-600 mb-1">Verification Report</div>
              <div className="text-xs text-gray-500">Run verification first</div>
            </div>
          )}

          {/* Completion Certificate */}
          {isCompletionCertificateAvailable(agentStates) ? (
            <Link
              href={`/projects/${projectId}/completion-auditor`}
              className="bg-white border-2 border-yellow-500 rounded-lg p-6 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-gray-900 mb-1">Completion Certificate</div>
              <div className="text-xs text-yellow-700">View final verdict</div>
            </Link>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 opacity-50 cursor-not-allowed">
              <div className="text-3xl mb-2">✅</div>
              <div className="font-semibold text-gray-600 mb-1">Completion Certificate</div>
              <div className="text-xs text-gray-500">Complete all steps first</div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* E. RECENT ACTIVITY */}
      {/* ================================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">{activity.event}</div>
                <div className="text-xs text-gray-600">{activity.details}</div>
              </div>
              <div className="text-xs text-gray-500">{activity.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: 'in_progress' | 'awaiting_approval' | 'complete' | 'failed' }) {
  const config = {
    in_progress: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'In Progress',
    },
    awaiting_approval: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'Awaiting Approval',
    },
    complete: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Complete',
    },
    failed: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Failed',
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${config.bg} ${config.text} text-sm font-semibold`}>
      <span className="w-2 h-2 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
