/**
 * PREVIEW RUNTIME - TYPE DEFINITIONS
 *
 * Deterministic execution chamber for running Forge-assembled applications.
 *
 * Philosophy: Run → Observe → Destroy
 * Intelligence Level: ZERO
 * Autonomy: NONE
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

// ============================================================================
// CORE SESSION CONTRACT
// ============================================================================

/**
 * Preview Runtime Session Contract
 *
 * IMMUTABLE after termination (status = FAILED or TERMINATED).
 * HASH-LOCKED for audit trail integration.
 */
export interface PreviewRuntimeSession {
  sessionId: string;              // UUID
  appRequestId: string;           // Links to AppRequest
  framework: 'nextjs';            // Framework type (only nextjs in v1.0)
  frameworkVersion: string;       // e.g., "14.2.0"
  manifestHash: string;           // Reference to Framework Assembly manifest
  workspaceHash: string;          // SHA-256 of workspace directory contents

  // Execution metadata
  status: SessionStatus;
  containerId: string | null;     // Docker container ID
  port: number | null;            // Mapped port (e.g., 12345)
  previewUrl: string | null;      // http://localhost:{port}

  // Lifecycle timestamps (milliseconds since epoch)
  startedAt: number;              // When STARTING began
  runningAt: number | null;       // When RUNNING began (null if never reached)
  terminatedAt: number | null;    // When TERMINATED/FAILED

  // Failure metadata (null if successful)
  failureStage: FailureStage | null;
  failureOutput: string | null;   // Raw stderr/stdout (NO interpretation)

  // Hash chain integration
  sessionHash: string;            // SHA-256 (excludes timestamps, sessionId)
}

export type SessionStatus =
  | 'READY'        // Preconditions validated, ready to start
  | 'STARTING'     // Container launching, npm install running
  | 'BUILDING'     // npm run build executing
  | 'RUNNING'      // npm run start successful, preview URL live
  | 'FAILED'       // Non-zero exit, timeout, or crash
  | 'TERMINATED';  // Graceful shutdown or TTL expiry

export type FailureStage =
  | 'install'      // npm install failed
  | 'build'        // npm run build failed
  | 'start'        // npm run start failed
  | 'timeout'      // Command exceeded time limit
  | 'crash';       // Container crashed unexpectedly

// ============================================================================
// RUNTIME EXECUTION METADATA
// ============================================================================

/**
 * Raw command execution outputs (no interpretation)
 */
export interface RuntimeExecutionMetadata {
  // Install phase
  installCommand: string;         // "npm install --ignore-scripts"
  installExitCode: number | null;
  installStdout: string;
  installStderr: string;
  installDurationMs: number | null;

  // Build phase
  buildCommand: string;           // "npm run build"
  buildExitCode: number | null;
  buildStdout: string;
  buildStderr: string;
  buildDurationMs: number | null;

  // Start phase
  startCommand: string;           // "npm run start"
  startExitCode: number | null;
  startStdout: string;            // First 10,000 lines only
  startStderr: string;            // First 10,000 lines only
  startDurationMs: number | null;
}

// ============================================================================
// VALIDATION & CONFIGURATION
// ============================================================================

/**
 * Precondition validation result
 */
export interface PreviewPreconditionCheck {
  valid: boolean;
  errors: string[];               // List of violations (if any)
}

/**
 * Docker container runtime configuration
 */
export interface ContainerConfig {
  image: 'node:18.19.0-alpine';
  readOnlyMount: true;
  volumeMounts: {
    source: string;                // Workspace directory (absolute path)
    target: '/app';
    readOnly: true;
  };
  resourceLimits: {
    cpus: 1;                       // Max 1 CPU core
    memory: '512m';                // Max 512 MB RAM
    pids: 100;                     // Max 100 processes
  };
  networkMode: 'bridge';           // Isolated network
  portMapping: {
    container: 3000;
    host: number;                  // Dynamic allocation
  };
  autoRemove: true;                // Delete container on exit
  timeout: 1800000;                // 30 minutes (milliseconds)
}

// ============================================================================
// COMMAND EXECUTION
// ============================================================================

/**
 * Result of a single command execution
 */
export interface CommandResult {
  command: string;
  exitCode: number | null;        // null if timed out
  stdout: string;                 // First 10,000 lines only
  stderr: string;                 // First 10,000 lines only
  durationMs: number;
  timedOut: boolean;
}

/**
 * Command timeout configuration
 */
export interface CommandTimeouts {
  install: 120000;                // 2 minutes
  build: 300000;                  // 5 minutes
  start: 60000;                   // 1 minute (to confirm startup)
}

// ============================================================================
// STATE MACHINE
// ============================================================================

/**
 * Allowed state transitions
 */
export const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  READY: ['STARTING', 'FAILED'],
  STARTING: ['BUILDING', 'FAILED'],
  BUILDING: ['RUNNING', 'FAILED'],
  RUNNING: ['TERMINATED', 'FAILED'],
  FAILED: [],                     // Terminal state
  TERMINATED: [],                 // Terminal state
};

// ============================================================================
// TEARDOWN & LIFECYCLE
// ============================================================================

/**
 * Reason for session teardown
 */
export type TeardownReason =
  | 'MANUAL'                      // User clicked "Stop Preview"
  | 'TTL_EXPIRED'                 // 30 minutes elapsed
  | 'CRASH'                       // Container exited unexpectedly
  | 'SYSTEM_SHUTDOWN';            // Forge server stopping

// ============================================================================
// AUDIT EVENTS
// ============================================================================

/**
 * Preview Runtime audit event types
 */
export type PreviewEventType =
  | 'preview.session_created'
  | 'preview.state_transition'
  | 'preview.command_executed'
  | 'preview.container_launched'
  | 'preview.container_terminated'
  | 'preview.ttl_expired'
  | 'preview.failed'
  | 'preview.terminated';

/**
 * Structured audit event
 */
export interface PreviewAuditEvent {
  event: PreviewEventType;
  sessionId: string;
  appRequestId: string;
  timestamp: number;              // Milliseconds since epoch
  metadata: Record<string, any>;
}

// ============================================================================
// UI INTEGRATION
// ============================================================================

/**
 * Preview UI state (frontend)
 */
export type PreviewUIState =
  | 'DISABLED'                    // Completion != COMPLETE, button grayed out
  | 'READY'                       // Button enabled, "Preview App"
  | 'LOADING'                     // Modal shown, "Starting preview..."
  | 'RUNNING'                     // Modal shows URL, "Preview is live!"
  | 'FAILED'                      // Modal shows raw error output
  | 'TERMINATED';                 // Session ended, button returns to READY

/**
 * Preview UI component props
 */
export interface PreviewUIProps {
  state: PreviewUIState;
  previewUrl: string | null;
  failureStage: string | null;
  failureOutput: string | null;
}

/**
 * Preview status display configuration
 */
export interface PreviewStatusDisplay {
  status: SessionStatus;
  message: string;
  color: 'gray' | 'blue' | 'green' | 'red';
  showUrl: boolean;
  showError: boolean;
}

// ============================================================================
// HASH COMPUTATION
// ============================================================================

/**
 * Input for sessionHash computation
 * (excludes non-deterministic fields)
 */
export interface SessionHashInput {
  appRequestId: string;
  framework: string;
  frameworkVersion: string;
  manifestHash: string;
  workspaceHash: string;
  status: SessionStatus;
  failureStage: string | null;
  failureOutput: string | null;

  // EXCLUDED (non-deterministic):
  // - sessionId (UUID)
  // - containerId (Docker-generated)
  // - port (dynamically allocated)
  // - previewUrl (includes port)
  // - startedAt, runningAt, terminatedAt (timestamps)
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Preview Runtime configuration constants
 */
export const PREVIEW_CONSTANTS = {
  // Session TTL
  SESSION_TTL_MS: 30 * 60 * 1000, // 30 minutes

  // Port allocation range
  PORT_RANGE: {
    MIN: 10000,
    MAX: 20000,
  },

  // Docker image
  DOCKER_IMAGE: 'node:18.19.0-alpine',

  // Resource limits
  RESOURCE_LIMITS: {
    CPUS: 1,
    MEMORY: '512m',
    PIDS: 100,
  },

  // Command timeouts (milliseconds)
  TIMEOUTS: {
    INSTALL: 120000,              // 2 minutes
    BUILD: 300000,                // 5 minutes
    START: 60000,                 // 1 minute
  },

  // Output limits
  MAX_OUTPUT_LINES: 10000,
} as const;

// ============================================================================
// CONDUCTOR INTEGRATION
// ============================================================================

/**
 * Conductor states that allow preview
 */
export const ALLOWED_CONDUCTOR_STATES = [
  'completed',                    // Normal completion
  'failed',                       // Completion Auditor found issues (can still preview)
] as const;

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Command failure error
 */
export class CommandFailureError extends Error {
  constructor(
    public command: string,
    public exitCode: number,
    public stdout: string,
    public stderr: string
  ) {
    super(`Command failed: ${command} (exit code ${exitCode})`);
    this.name = 'CommandFailureError';
  }
}

/**
 * Precondition validation error
 */
export class PreconditionValidationError extends Error {
  constructor(
    public errors: string[]
  ) {
    super(`Precondition validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    this.name = 'PreconditionValidationError';
  }
}

/**
 * Illegal state transition error
 */
export class IllegalTransitionError extends Error {
  constructor(
    public from: SessionStatus,
    public to: SessionStatus,
    public allowed: SessionStatus[]
  ) {
    super(
      `Illegal transition: ${from} → ${to}\n` +
      `Allowed transitions from ${from}: ${allowed.join(', ')}`
    );
    this.name = 'IllegalTransitionError';
  }
}
