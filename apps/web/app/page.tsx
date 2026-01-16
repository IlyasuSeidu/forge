/**
 * Home Page
 *
 * Shows list of projects or landing page for new users.
 */

import Link from 'next/link';

// Mock projects for now
const MOCK_PROJECTS = [
  {
    id: 'demo-project-1',
    name: 'Fitness Habit Tracker',
    description: 'Help users track their fitness goals and stay consistent',
    status: 'building' as const,
    progress: 11, // 11 agents approved (up to Execution Planner)
    totalAgents: 17,
    createdAt: '2026-01-14T10:00:00Z',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔨</span>
              <span className="text-xl font-bold text-gray-900">Forge</span>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              New Project
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
          <p className="text-gray-600 mt-2">17-agent assembly line for building software</p>
        </div>

        {/* Projects Grid */}
        {MOCK_PROJECTS.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_PROJECTS.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: typeof MOCK_PROJECTS[0] }) {
  const progressPercent = Math.round((project.progress / project.totalAgents) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>

      <p className="text-sm text-gray-600 mb-4">{project.description}</p>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">
            {project.progress} / {project.totalAgents} agents
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="text-xs text-gray-500">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: 'planning' | 'building' | 'verifying' | 'complete' }) {
  const config = {
    planning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Planning' },
    building: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Building' },
    verifying: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Verifying' },
    complete: { bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
      <svg
        className="w-16 h-16 mx-auto text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
      <p className="text-gray-600 mb-6">Create your first project to get started with Forge.</p>
      <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
        Create Project
      </button>
    </div>
  );
}
