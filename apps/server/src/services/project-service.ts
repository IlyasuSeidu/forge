import crypto from 'node:crypto';
import type { Project, CreateProjectInput } from '../models/index.js';

/**
 * ProjectService manages project state
 * Currently in-memory; will be replaced with database persistence
 */
export class ProjectService {
  private projects: Map<string, Project> = new Map();

  /**
   * Creates a new project
   */
  createProject(input: CreateProjectInput): Project {
    const now = new Date();
    const project: Project = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(project.id, project);
    return project;
  }

  /**
   * Retrieves all projects
   */
  getAllProjects(): Project[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Retrieves a project by ID
   */
  getProjectById(id: string): Project | null {
    return this.projects.get(id) ?? null;
  }

  /**
   * Checks if a project exists
   */
  projectExists(id: string): boolean {
    return this.projects.has(id);
  }
}
