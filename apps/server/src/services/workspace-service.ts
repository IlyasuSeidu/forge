import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { Artifact } from '@prisma/client';

/**
 * Security error thrown when path validation fails
 */
export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathValidationError';
  }
}

/**
 * WorkspaceService provides isolated, secure file operations for project workspaces
 * Each project gets its own isolated directory where agents can create artifacts
 */
export class WorkspaceService {
  private logger: FastifyBaseLogger;
  private projectId: string;
  private workspaceRoot: string;

  /**
   * Creates a workspace service for a specific project
   * @param logger - Fastify logger instance
   * @param projectId - The project ID this workspace serves
   * @param baseWorkspacePath - Base path for all workspaces (default: /tmp/forge-workspaces)
   */
  constructor(
    logger: FastifyBaseLogger,
    projectId: string,
    baseWorkspacePath = '/tmp/forge-workspaces'
  ) {
    this.logger = logger.child({ service: 'WorkspaceService', projectId });
    this.projectId = projectId;
    this.workspaceRoot = path.join(baseWorkspacePath, projectId);
  }

  /**
   * Initializes the workspace directory
   * Creates the workspace root if it doesn't exist
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      this.logger.info(
        { workspaceRoot: this.workspaceRoot },
        'Workspace initialized'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { workspaceRoot: this.workspaceRoot, error: errorMessage },
        'Failed to initialize workspace'
      );
      throw error;
    }
  }

  /**
   * Validates and resolves a relative path within the workspace
   * Prevents directory traversal attacks
   * @param relativePath - The relative path to validate
   * @returns The absolute path within the workspace
   * @throws PathValidationError if path is invalid or attempts traversal
   */
  private validateAndResolvePath(relativePath: string): string {
    // Reject absolute paths
    if (path.isAbsolute(relativePath)) {
      throw new PathValidationError(
        `Absolute paths are not allowed: ${relativePath}`
      );
    }

    // Reject empty paths
    if (!relativePath || relativePath.trim().length === 0) {
      throw new PathValidationError('Path cannot be empty');
    }

    // Resolve the path relative to workspace root
    const absolutePath = path.resolve(this.workspaceRoot, relativePath);

    // Ensure the resolved path is still within workspace root
    // This prevents directory traversal attacks like "../../../etc/passwd"
    if (!absolutePath.startsWith(this.workspaceRoot + path.sep)) {
      throw new PathValidationError(
        `Path traversal detected: ${relativePath} resolves outside workspace`
      );
    }

    return absolutePath;
  }

  /**
   * Creates a directory in the workspace
   * @param relativePath - Relative path to the directory
   * @param executionId - Optional execution ID that created this directory
   * @param taskId - Optional task ID that created this directory
   * @returns The created artifact record
   */
  async createDirectory(
    relativePath: string,
    executionId?: string,
    taskId?: string
  ): Promise<Artifact> {
    const absolutePath = this.validateAndResolvePath(relativePath);

    try {
      await fs.mkdir(absolutePath, { recursive: true });

      this.logger.info(
        { relativePath, absolutePath, executionId, taskId },
        'Directory created'
      );

      // Record artifact in database
      const artifact = await prisma.artifact.create({
        data: {
          id: crypto.randomUUID(),
          projectId: this.projectId,
          executionId,
          taskId,
          path: relativePath,
          type: 'directory',
        },
      });

      return artifact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { relativePath, error: errorMessage },
        'Failed to create directory'
      );
      throw error;
    }
  }

  /**
   * Writes a file to the workspace
   * @param relativePath - Relative path to the file
   * @param content - File content as string or Buffer
   * @param executionId - Optional execution ID that created this file
   * @param taskId - Optional task ID that created this file
   * @returns The created artifact record
   */
  async writeFile(
    relativePath: string,
    content: string | Buffer,
    executionId?: string,
    taskId?: string
  ): Promise<Artifact> {
    const absolutePath = this.validateAndResolvePath(relativePath);

    try {
      // Ensure parent directory exists
      const parentDir = path.dirname(absolutePath);
      await fs.mkdir(parentDir, { recursive: true });

      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');

      this.logger.info(
        {
          relativePath,
          absolutePath,
          size: Buffer.isBuffer(content) ? content.length : content.length,
          executionId,
          taskId,
        },
        'File written'
      );

      // Record artifact in database
      const artifact = await prisma.artifact.create({
        data: {
          id: crypto.randomUUID(),
          projectId: this.projectId,
          executionId,
          taskId,
          path: relativePath,
          type: 'file',
        },
      });

      return artifact;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { relativePath, error: errorMessage },
        'Failed to write file'
      );
      throw error;
    }
  }

  /**
   * Reads a file from the workspace
   * @param relativePath - Relative path to the file
   * @returns The file content as a string
   */
  async readFile(relativePath: string): Promise<string> {
    const absolutePath = this.validateAndResolvePath(relativePath);

    try {
      const content = await fs.readFile(absolutePath, 'utf-8');

      this.logger.debug(
        { relativePath, absolutePath, size: content.length },
        'File read'
      );

      return content;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { relativePath, error: errorMessage },
        'Failed to read file'
      );
      throw error;
    }
  }

  /**
   * Lists all artifacts for this project
   * @param executionId - Optional filter by execution ID
   * @param taskId - Optional filter by task ID
   * @returns Array of artifact records
   */
  async listArtifacts(
    executionId?: string,
    taskId?: string
  ): Promise<Artifact[]> {
    const where: {
      projectId: string;
      executionId?: string;
      taskId?: string;
    } = {
      projectId: this.projectId,
    };

    if (executionId) {
      where.executionId = executionId;
    }

    if (taskId) {
      where.taskId = taskId;
    }

    const artifacts = await prisma.artifact.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return artifacts;
  }

  /**
   * Gets the absolute workspace root path
   * Useful for agents that need to know their working directory
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Cleans up the workspace by deleting all files
   * WARNING: This is destructive and cannot be undone
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.workspaceRoot, { recursive: true, force: true });
      this.logger.info({ workspaceRoot: this.workspaceRoot }, 'Workspace cleaned up');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { workspaceRoot: this.workspaceRoot, error: errorMessage },
        'Failed to cleanup workspace'
      );
      throw error;
    }
  }
}
