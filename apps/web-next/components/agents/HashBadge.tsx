/**
 * Hash Badge Component
 *
 * Displays a shortened hash with lock icon to indicate immutability.
 */

interface HashBadgeProps {
  hash: string;
  size?: 'sm' | 'md';
}

export function HashBadge({ hash, size = 'sm' }: HashBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded ${sizeClasses[size]}`}
      title={`Hash: ${hash}`}
    >
      <svg
        className={`${iconSize[size]} text-green-600`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <span className="font-mono text-green-800">{hash.slice(0, 8)}...</span>
    </div>
  );
}
