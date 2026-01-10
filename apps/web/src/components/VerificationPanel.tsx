import { useState } from 'react';
import type { Verification, ExecutionEvent } from '../types';
import { friendlyVerificationStatus, friendlyRepairStatus } from '../utils/friendlyText';

interface VerificationPanelProps {
  verification: Verification | null;
  events: ExecutionEvent[];
  onDownloadAnyway?: () => void;
  onRestartBuild?: () => void;
  onAcknowledge?: () => void;
}

export function VerificationPanel({
  verification,
  events,
  onDownloadAnyway,
  onRestartBuild,
  onAcknowledge,
}: VerificationPanelProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!verification) {
    return null;
  }

  const { status, errors, attempt } = verification;
  const isFailed = status === 'failed';
  const isPassed = status === 'passed';

  // Check if this was self-healed
  const wasSelfHealed = events.some(e => e.type === 'verification_passed_after_repair');

  // Get repair events
  const repairEvents = events.filter(e => e.type.includes('repair'));
  const hadRepairAttempts = attempt > 1 || repairEvents.length > 0;

  // Determine panel color scheme
  const bgClass = isPassed
    ? (wasSelfHealed ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200')
    : 'bg-orange-50 border-orange-200';

  const textClass = isPassed
    ? (wasSelfHealed ? 'text-purple-900' : 'text-green-900')
    : 'text-orange-900';

  const iconClass = isPassed
    ? (wasSelfHealed ? 'text-purple-500' : 'text-green-500')
    : 'text-orange-500';

  // Summarize errors (non-technical, first 3 only)
  const summarizedErrors = errors && errors.length > 0
    ? errors.slice(0, 3).map(error => {
        // Try to make errors more user-friendly
        if (error.includes('Element ID') && error.includes('referenced in JS but not found')) {
          return 'A button or element referenced in code doesn\'t exist in the page';
        }
        if (error.includes('script') && error.includes('not found')) {
          return 'A required script file is missing';
        }
        if (error.includes('CSS') || error.includes('stylesheet')) {
          return 'A style file couldn\'t be loaded';
        }
        // Default: show the error but try to simplify
        return error.replace(/\[.*?\]/g, '').trim();
      })
    : [];

  const hasMoreErrors = errors && errors.length > 3;

  return (
    <div className={`border rounded-lg p-6 mb-6 ${bgClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`text-2xl ${iconClass}`}>
            {isPassed ? (wasSelfHealed ? '✨' : '✓') : '⚠️'}
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${textClass}`}>
              {friendlyVerificationStatus(status)}
            </h3>
            {hadRepairAttempts && (
              <p className={`text-sm mt-1 ${textClass.replace('900', '700')}`}>
                {wasSelfHealed
                  ? `Forge automatically fixed ${attempt - 1} issue${attempt - 1 > 1 ? 's' : ''} for you`
                  : `Forge tried ${attempt} time${attempt > 1 ? 's' : ''} to fix automatically`}
              </p>
            )}
          </div>
        </div>

        {/* Self-Healed Badge */}
        {wasSelfHealed && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4z" />
              <path d="M11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4z" />
              <path d="M16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
            Self-Healed
          </div>
        )}
      </div>

      {/* Success Message */}
      {isPassed && (
        <div className={`${textClass.replace('900', '800')}`}>
          <p className="mb-2">
            {wasSelfHealed
              ? 'Your app had some issues, but Forge fixed them automatically and verified everything works correctly.'
              : 'Your app has been verified and is ready to use!'}
          </p>
          {wasSelfHealed && repairEvents.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium hover:underline">
                What was fixed?
              </summary>
              <ul className="mt-2 space-y-1 text-sm list-disc list-inside ml-2">
                {repairEvents.map((event, i) => (
                  <li key={i}>{friendlyRepairStatus(event.type)}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Failure Message and Actions */}
      {isFailed && (
        <>
          <div className={`mb-4 ${textClass.replace('900', '800')}`}>
            <p className="mb-3">
              Forge tried to fix this automatically but couldn't finish. Here's what went wrong:
            </p>

            {/* User-friendly error summary */}
            {summarizedErrors.length > 0 && (
              <div className="bg-white border border-orange-200 rounded p-3 mb-3">
                <p className="text-sm font-medium text-orange-900 mb-2">Issues found:</p>
                <ul className="space-y-1 text-sm text-orange-900 list-disc list-inside">
                  {summarizedErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {hasMoreErrors && (
                    <li className="text-orange-700">
                      ...and {errors!.length - 3} more issue{errors!.length - 3 > 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Technical details (collapsed by default) */}
            <details className="mb-3" open={showTechnicalDetails}>
              <summary
                className="cursor-pointer text-sm font-medium hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTechnicalDetails(!showTechnicalDetails);
                }}
              >
                View technical details
              </summary>
              {showTechnicalDetails && errors && errors.length > 0 && (
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 font-mono text-xs text-gray-800 overflow-x-auto">
                  {errors.map((error, i) => (
                    <div key={i} className="mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </details>

            <p className="text-sm text-orange-700">
              <strong>What this means:</strong> The app has bugs that would cause errors when you try to use it.
              These are typically missing elements or broken file references that we caught before you downloaded it.
            </p>
          </div>

          {/* Human Decision Actions */}
          <div className="border-t border-orange-200 pt-4">
            <p className={`text-sm font-medium mb-3 ${textClass}`}>
              What would you like to do?
            </p>
            <div className="flex flex-wrap gap-3">
              {onRestartBuild && (
                <button
                  onClick={onRestartBuild}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  Start Over & Rebuild
                </button>
              )}
              {onDownloadAnyway && (
                <button
                  onClick={onDownloadAnyway}
                  className="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 font-medium"
                >
                  Download Anyway
                </button>
              )}
              {onAcknowledge && (
                <button
                  onClick={onAcknowledge}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
