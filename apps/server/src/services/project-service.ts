import crypto from 'node:crypto';
import type { Project, CreateProjectInput } from '../models/index.js';
import { prisma } from '../lib/prisma.js';

/**
 * ProjectService manages project state using Prisma
 */
export class ProjectService {
  /**
   * Creates a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        description: input.description.trim(),
      },
    });

    return project;
  }

  /**
   * Retrieves all projects
   */
  async getAllProjects(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  /**
   * Retrieves a project by ID
   */
  async getProjectById(id: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    return project;
  }

  /**
   * Checks if a project exists
   */
  async projectExists(id: string): Promise<boolean> {
    const count = await prisma.project.count({
      where: { id },
    });

    return count > 0;
  }
}
