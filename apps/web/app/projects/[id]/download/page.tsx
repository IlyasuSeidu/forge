/**
 * Download Source Code (Placeholder)
 *
 * Will export the complete project workspace as a ZIP file.
 */

'use client';

import { use } from 'react';
import Link from 'next/link';

export default function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">📦</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Download Source Code</h1>
            <p className="text-sm text-gray-600 mt-2">
              Export the complete project workspace as a ZIP file with all source code, configuration, and build
              artifacts.
            </p>
          </div>
        </div>
      </div>

      {/* Download Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">What&apos;s Included</h2>

        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <div className="font-semibold text-green-900 mb-1">Complete Source Export</div>
                <p className="text-sm text-green-900">
                  The ZIP file contains everything you need to run, modify, and deploy your application independently.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2 text-sm">Source Code</div>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  All application files
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Component library
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Route definitions
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  API endpoints
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2 text-sm">Configuration</div>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  package.json
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  TypeScript config
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Build configuration
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Environment templates
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2 text-sm">Build Artifacts</div>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Execution logs
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Verification results
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Build outputs
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Test reports
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-semibold text-gray-900 mb-2 text-sm">Documentation</div>
              <ul className="space-y-1 text-xs text-gray-600">
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  README.md
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Setup instructions
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Architecture docs
                </li>
                <li className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  Completion certificate
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Export Workspace</h2>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-900">
            Source export is not yet wired to backend. This feature will be available after backend integration.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            disabled
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Download ZIP
          </button>

          <Link
            href={`/projects/${projectId}/completion-auditor`}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            ← Back to Completion Auditor
          </Link>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">After Download</h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
              1
            </div>
            <div>
              <div className="font-semibold text-gray-900">Extract ZIP</div>
              <div className="text-gray-600">Unzip the downloaded file to your local machine</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
              2
            </div>
            <div>
              <div className="font-semibold text-gray-900">Install Dependencies</div>
              <div className="text-gray-600">
                Run <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">npm install</code> or{' '}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">yarn install</code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
              3
            </div>
            <div>
              <div className="font-semibold text-gray-900">Run Development Server</div>
              <div className="text-gray-600">
                Start with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">npm run dev</code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs">
              4
            </div>
            <div>
              <div className="font-semibold text-gray-900">Deploy</div>
              <div className="text-gray-600">Deploy to Vercel, Netlify, or your preferred hosting platform</div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Technical Details</h2>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>ZIP export includes all verified and approved artifacts</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>Export is immutable snapshot at completion time</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>All hash checksums included for verification</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5" />
            <div>No sensitive credentials or secrets included</div>
          </div>
        </div>
      </div>
    </div>
  );
}
