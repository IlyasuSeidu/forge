import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import type { Project } from '../types';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';

export function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProjects();
        if (mounted) {
          setProjects(data.projects);
        }
      } catch (err) {
        if (mounted) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load projects');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <Loading message="Loading projects..." />;
  }

  if (error) {
    return <ErrorMessage message={error} title="Failed to Load Projects" />;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
        <p className="mt-1 text-sm text-gray-500">
          No projects have been created yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and monitor your AI-powered projects
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="block bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {project.name}
            </h2>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>
            <div className="flex items-center text-xs text-gray-500">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
