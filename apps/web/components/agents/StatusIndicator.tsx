/**
 * Status Indicator Component
 *
 * Visual indicator for agent status with pulsing animation for active states.
 */

import { AgentStatus, STATUS_COLORS, getStatusLabel } from '@/lib/agents';

interface StatusIndicatorProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIndicator({ status, size = 'sm' }: StatusIndicatorProps) {
  const colors = STATUS_COLORS[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses[size]}`}
    >
      <StatusDot status={status} />
      {getStatusLabel(status)}
    </span>
  );
}

function StatusDot({ status }: { status: AgentStatus }) {
  const dotColor = STATUS_COLORS[status].dot;
  const shouldPulse = status === 'in_progress' || status === 'awaiting_approval';

  return (
    <span
      className={`w-2 h-2 rounded-full ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`}
    />
  );
}
