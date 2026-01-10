import type { Project, Task, Execution, ExecutionEvent } from '../models/index.js';
import type { Artifact } from '@prisma/client';

/**
 * Result of an agent execution
 */
export interface AgentResult {
  /** Whether the agent execution succeeded */
  success: boolean;
  /** Human-readable message describing what happened */
  message: string;
  /** Optional artifacts produced by the agent (code, files, etc.) */
  artifacts?: any;
  /** Error message if execution failed */
  error?: string;
  /** Optional metadata about the execution (model used, tokens, reasoning, etc.) */
  metadata?: Record<string, any>;
}

/**
 * Context provided to an agent during execution
 * Contains all information needed to execute a task
 */
export interface AgentContext {
  /** The project being worked on */
  readonly project: Project;
  /** The current execution */
  readonly execution: Execution;
  /** The task to be executed */
  readonly task: Task;
  /** All previous events for this execution (for context/history) */
  readonly previousEvents: ReadonlyArray<ExecutionEvent>;
  /** Path to workspace directory */
  readonly workspacePath: string;

  /**
   * Creates a directory in the workspace
   * All paths must be relative to the workspace root
   * @param relativePath - Relative path to the directory
   * @returns The created artifact record
   */
  createDirectory(relativePath: string): Promise<Artifact>;

  /**
   * Writes a file to the workspace
   * All paths must be relative to the workspace root
   * @param relativePath - Relative path to the file
   * @param content - File content as string or Buffer
   * @returns The created artifact record
   */
  writeFile(relativePath: string, content: string | Buffer): Promise<Artifact>;

  /**
   * Reads a file from the workspace
   * All paths must be relative to the workspace root
   * @param relativePath - Relative path to the file
   * @returns The file content as a string
   */
  readFile(relativePath: string): Promise<string>;

  /**
   * Lists all artifacts created for this project
   * @returns Array of artifact records
   */
  listArtifacts(): Promise<Artifact[]>;
}

/**
 * Interface that all agents must implement
 * Agents are responsible for executing individual tasks
 */
export interface Agent {
  /** Human-readable name of the agent */
  readonly name: string;

  /**
   * Determines if this agent can handle a given task
   * @param task - The task to check
   * @returns true if this agent can execute the task
   */
  canHandle(task: Task): boolean;

  /**
   * Executes a task with the given context
   * @param task - The task to execute
   * @param context - Context information for execution
   * @returns Result of the execution
   */
  execute(task: Task, context: AgentContext): Promise<AgentResult>;
}
