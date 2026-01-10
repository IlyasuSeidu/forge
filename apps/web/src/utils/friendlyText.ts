/**
 * Friendly language mapping for non-developers
 * Replaces technical jargon with human-friendly terms
 */

// App Request status to friendly text
export function friendlyAppRequestStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Planning your app...',
    planned: 'Waiting for your approval',
    building: 'Building your app...',
    completed: 'Your app is ready! ✓',
    failed: 'Something went wrong',
  };
  return statusMap[status] || status;
}

// Execution status to friendly text
export function friendlyExecutionStatus(status: string): string {
  const statusMap: Record<string, string> = {
    idle: 'Ready to start',
    pending_approval: 'Waiting for approval',
    running: 'Working...',
    paused: 'Paused',
    completed: 'Complete ✓',
    failed: 'Failed',
  };
  return statusMap[status] || status;
}

// Task status to friendly text
export function friendlyTaskStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Waiting',
    in_progress: 'In progress...',
    completed: 'Done ✓',
    failed: 'Failed',
    blocked: 'Blocked',
  };
  return statusMap[status] || status;
}

// Approval type to friendly text
export function friendlyApprovalType(type: string): string {
  const typeMap: Record<string, string> = {
    execution_start: 'Ready to Start Building',
    task_completion: 'Task Needs Review',
  };
  return typeMap[type] || type;
}

// Time estimates
export function getEstimatedTime(phase: 'planning' | 'building'): string {
  if (phase === 'planning') {
    return 'Planning usually takes 1-2 minutes';
  }
  return 'Building may take several minutes';
}

// Example prompts for empty states
export const examplePrompts = [
  {
    title: 'Task Manager',
    prompt: 'Build a personal task manager with add, edit, and delete features',
  },
  {
    title: 'Bakery Website',
    prompt: 'Build a simple website for my bakery with menu and contact info',
  },
  {
    title: 'Notes API',
    prompt: 'Build a REST API for notes with create, read, update, and delete endpoints',
  },
];

// Progress phases
export const buildPhases = [
  { id: 'idea', label: 'Idea', icon: '💡' },
  { id: 'plan', label: 'Plan', icon: '📋' },
  { id: 'approve', label: 'Approve', icon: '✅' },
  { id: 'build', label: 'Build', icon: '🔨' },
  { id: 'ready', label: 'Ready', icon: '🎉' },
];

// Get current phase from app request status
export function getCurrentPhase(status: string): string {
  const phaseMap: Record<string, string> = {
    pending: 'plan',
    planned: 'approve',
    building: 'build',
    completed: 'ready',
    failed: 'ready',
  };
  return phaseMap[status] || 'idea';
}

// Next steps based on artifacts
export function getNextSteps(artifacts: Array<{ path: string; type: string }>): string[] {
  const steps: string[] = [];

  // Check for common file patterns
  const hasHTML = artifacts.some(a => a.path.endsWith('.html'));
  const hasPackageJson = artifacts.some(a => a.path === 'package.json');
  const hasPython = artifacts.some(a => a.path.endsWith('.py'));
  const hasREADME = artifacts.some(a => a.path.toLowerCase() === 'readme.md');

  if (hasHTML) {
    steps.push('Open index.html in your web browser to see your app');
  }

  if (hasPackageJson) {
    steps.push('Run "npm install" then "npm start" in your terminal');
  }

  if (hasPython) {
    steps.push('Run "python app.py" (or the main .py file) in your terminal');
  }

  if (hasREADME) {
    steps.push('Check README.md for specific instructions');
  }

  // Generic steps if nothing specific detected
  if (steps.length === 0) {
    steps.push('Download the files and follow any included README instructions');
    steps.push('Upload to a hosting service like Netlify or Vercel for static sites');
  }

  return steps;
}

// Soft warnings for complex prompts
export function getSoftWarnings(prompt: string): string[] {
  const warnings: string[] = [];

  if (prompt.length > 500) {
    warnings.push('Large apps may take longer or require multiple steps.');
  }

  const complexKeywords = ['database', 'authentication', 'auth', 'login', 'payments', 'email'];
  const hasComplex = complexKeywords.some(kw => prompt.toLowerCase().includes(kw));

  if (hasComplex) {
    warnings.push('This app involves complex features. Forge may ask for more approvals.');
  }

  return warnings;
}
