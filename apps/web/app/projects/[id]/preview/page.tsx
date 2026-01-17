/**
 * Preview Runtime (Placeholder)
 *
 * Will start a temporary isolated preview session
 * for the completed project.
 */

'use client';

import { use } from 'react';
import Link from 'next/link';

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">👁️</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Preview Runtime</h1>
            <p className="text-sm text-gray-600 mt-2">
              Start a temporary isolated session to preview your completed application.
            </p>
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">How Preview Works</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-blue-900 mb-1">Preview Runtime Session</div>
                <p className="text-sm text-blue-900">
                  Preview runtime will create a temporary isolated environment where your application runs. You can
                  interact with it, test features, and observe behavior.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                1
              </div>
              <div>
                <div className="font-semibold text-gray-900">Run</div>
                <div className="text-gray-600">Start isolated preview session with your built application</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                2
              </div>
              <div>
                <div className="font-semibold text-gray-900">Observe</div>
                <div className="text-gray-600">Interact with the app, test features, explore functionality</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-semibold text-xs">
                3
              </div>
              <div>
                <div className="font-semibold text-gray-900">Destroy</div>
                <div className="text-gray-600">Session ends automatically after timeout or manual stop</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Start Preview</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-900">
            Preview runtime is not yet wired to backend. This feature will be available after backend integration.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            disabled
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Start Preview Session
          </button>

          <Link
            href={`/projects/${projectId}/completion-auditor`}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← Back to Completion Auditor
          </Link>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Technical Details</h2>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Preview sessions are isolated and temporary</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>No changes made during preview affect source code</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Sessions auto-expire after 30 minutes of inactivity</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Full terminal output and logs available during session</div>
          </div>
        </div>
      </div>
    </div>
  );
}
