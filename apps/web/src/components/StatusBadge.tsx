import { friendlyExecutionStatus, friendlyTaskStatus } from '../utils/friendlyText';

interface StatusBadgeProps {
  status: string;
  type?: 'execution' | 'task';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-600';
      case 'blocked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    // Use friendly language based on type
    if (type === 'execution') {
      return friendlyExecutionStatus(status);
    }
    if (type === 'task') {
      return friendlyTaskStatus(status);
    }

    // Fallback for no type specified
    if (status === 'in_progress') return 'In Progress';
    if (status === 'pending_approval') return 'Pending Approval';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}
    >
      {getStatusLabel()}
    </span>
  );
}
