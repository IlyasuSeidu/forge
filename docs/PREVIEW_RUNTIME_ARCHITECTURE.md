# PREVIEW RUNTIME ARCHITECTURE

**Version**: 1.0.0
**Date**: 2026-01-14
**Type**: Mechanical Execution Chamber (NOT an Agent)
**Philosophy**: Run → Observe → Destroy

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Mental Model](#mental-model)
3. [Pipeline Position](#pipeline-position)
4. [Preview Runtime Contract](#preview-runtime-contract)
5. [Execution Environment](#execution-environment)
6. [Runtime Commands](#runtime-commands)
7. [Lifecycle State Machine](#lifecycle-state-machine)
8. [Security & Isolation](#security--isolation)
9. [Human Interaction Model](#human-interaction-model)
10. [Forge UX Integration](#forge-ux-integration)
11. [Failure Semantics](#failure-semantics)
12. [Determinism & Auditability](#determinism--auditability)
13. [Forbidden Behaviors](#forbidden-behaviors)
14. [Test Plan](#test-plan)
15. [Future Extensions](#future-extensions)

---

## OVERVIEW

The Preview Runtime is a **mechanical execution chamber** that enables non-developers to see and interact with Forge-built applications in a browser without local installation.

**What It Is**:
- Deterministic container orchestrator
- Zero-intelligence runtime executor
- Ephemeral session manager
- Fail-loud observer

**What It Is NOT**:
- ❌ An agent
- ❌ An LLM consumer
- ❌ A deployment system
- ❌ A code modifier
- ❌ A helpful assistant

---

## MENTAL MODEL

```
┌─────────────────────────────────────────────────────────┐
│ THE PREVIEW RUNTIME IS A PETRI DISH                     │
│                                                          │
│ 1. Place assembled app inside (read-only)               │
│ 2. Add nutrients (npm install)                          │
│ 3. Observe growth (npm run build && npm run start)      │
│ 4. Allow observation through glass (preview URL)        │
│ 5. Destroy after time limit (forced teardown)           │
│                                                          │
│ If organism dies → Report death (no resurrection)       │
│ If organism mutates → IMPOSSIBLE (read-only mount)      │
│ If time expires → DESTROY (no mercy)                    │
└─────────────────────────────────────────────────────────┘
```

**Core Principle**: "This is a test tube, not a surgeon."

---

## PIPELINE POSITION

The Preview Runtime runs **AFTER** the complete manufacturing pipeline:

```
Base Prompt (Tier 1)
  ↓
Planning & Structure (Tier 2)
  ↓
Visual Intelligence (Tier 3)
  ↓
Manufacturing (Tier 4)
  ↓
Verification & Repair (Tier 5)
  ↓
Completion Auditor → COMPLETE ✅
  ↓
Framework Assembly Layer → Next.js Pack ✅
  ↓ manifestHash locked
  ↓ workspaceDir ready
  ↓ All hashes verified
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIEW RUNTIME ← YOU ARE HERE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↓
User observes running app in browser
  ↓
Session terminates (TTL or manual)
```

**Critical Requirement**: Preview MUST NOT run unless:
1. Completion Auditor verdict = `COMPLETE`
2. Framework Assembly Layer manifest exists
3. `manifestHash` is not null
4. Workspace directory exists

If ANY condition fails → HALT with error.

---

## PREVIEW RUNTIME CONTRACT

### TypeScript Interfaces

```typescript
/**
 * Preview Runtime Session Contract
 *
 * IMMUTABLE after termination.
 * HASH-LOCKED for audit trail.
 */
interface PreviewRuntimeSession {
  sessionId: string;              // UUID
  appRequestId: string;           // Links to AppRequest
  framework: 'nextjs';            // Framework type (only nextjs in v1.0)
  frameworkVersion: string;       // e.g., "14.2.0"
  manifestHash: string;           // Reference to Framework Assembly manifest
  workspaceHash: string;          // SHA-256 of workspace directory contents

  // Execution metadata
  status: SessionStatus;
  containerId: string | null;     // Docker container ID
  port: number | null;            // Mapped port (e.g., 3000)
  previewUrl: string | null;      // http://localhost:{port}

  // Lifecycle timestamps (milliseconds since epoch)
  startedAt: number;              // When STARTING began
  runningAt: number | null;       // When RUNNING began
  terminatedAt: number | null;    // When TERMINATED/FAILED

  // Failure metadata (null if successful)
  failureStage: 'install' | 'build' | 'start' | 'timeout' | 'crash' | null;
  failureOutput: string | null;   // Raw stderr/stdout (NO interpretation)

  // Hash chain
  sessionHash: string;            // SHA-256 (excludes timestamps, sessionId)
}

type SessionStatus =
  | 'READY'        // Preconditions validated, ready to start
  | 'STARTING'     // Container launching, npm install running
  | 'BUILDING'     // npm run build executing
  | 'RUNNING'      // npm run start successful, preview URL live
  | 'FAILED'       // Non-zero exit, timeout, or crash
  | 'TERMINATED';  // Graceful shutdown or TTL expiry

/**
 * Runtime execution metadata (raw outputs, no interpretation)
 */
interface RuntimeExecutionMetadata {
  installCommand: string;         // "npm install --ignore-scripts"
  installExitCode: number | null;
  installStdout: string;
  installStderr: string;
  installDurationMs: number | null;

  buildCommand: string;           // "npm run build"
  buildExitCode: number | null;
  buildStdout: string;
  buildStderr: string;
  buildDurationMs: number | null;

  startCommand: string;           // "npm run start"
  startExitCode: number | null;
  startStdout: string;            // First 100 lines only
  startStderr: string;            // First 100 lines only
  startDurationMs: number | null;
}

/**
 * Precondition validation result
 */
interface PreviewPreconditionCheck {
  valid: boolean;
  errors: string[];               // List of violations (if any)
}
```

---

## EXECUTION ENVIRONMENT

### Choice: Docker (v1.0)

**Justification**:
- ✅ Mature, widely available
- ✅ Strong isolation guarantees
- ✅ Read-only mount support
- ✅ CPU/memory limits
- ✅ Port mapping
- ✅ Forced teardown
- ✅ No host modification

**Alternative Considered**: Firecracker
- More secure (microVM isolation)
- Faster startup (~125ms)
- But: More complex, overkill for preview use case
- Decision: Defer to future if needed

### Docker Container Specification

```dockerfile
# Base image (pinned version for determinism)
FROM node:18.19.0-alpine

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Working directory
WORKDIR /app

# Read-only mount point for assembled app
# Mounted at runtime via: -v {workspaceDir}:/app:ro

# Runtime configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Healthcheck (optional)
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s \
  CMD node -e "require('http').get('http://localhost:3000', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# User switch
USER nextjs

# Expose port
EXPOSE 3000

# No CMD - commands executed by Preview Runtime
```

### Container Runtime Configuration

```typescript
interface ContainerConfig {
  image: 'node:18.19.0-alpine';
  readOnlyMount: true;
  volumeMounts: {
    source: string;        // Workspace directory (absolute path)
    target: '/app';
    readOnly: true;
  };
  resourceLimits: {
    cpus: 1;               // Max 1 CPU core
    memory: '512m';        // Max 512 MB RAM
    pids: 100;             // Max 100 processes
  };
  networkMode: 'bridge';   // Isolated network
  portMapping: {
    container: 3000;
    host: number;          // Dynamic allocation
  };
  autoRemove: true;        // Delete container on exit
  timeout: 1800000;        // 30 minutes (milliseconds)
}
```

---

## RUNTIME COMMANDS

### Allowed Commands (ONLY)

The Preview Runtime may execute EXACTLY these commands, in order:

```bash
# Command 1: Install dependencies
npm install --ignore-scripts --omit=dev --loglevel=error

# Command 2: Build application
npm run build

# Command 3: Start application
npm run start
```

### Command Execution Rules

**Rule 1: No Retries**
- Each command runs ONCE
- Non-zero exit → FAIL session immediately
- No "helpful" retries

**Rule 2: No Auto-Fix**
- Missing dependency → FAIL (don't install it)
- Build error → FAIL (don't fix code)
- Port conflict → FAIL (don't try another port)

**Rule 3: Timeout Enforcement**
- Install: 120 seconds max
- Build: 300 seconds max
- Start: 60 seconds max (to confirm process started)
- Timeout → FAIL session

**Rule 4: Output Capture**
- stdout and stderr captured verbatim
- First 10,000 lines only (prevent memory exhaustion)
- NO interpretation, NO summarization

**Rule 5: Exit Code Semantics**
- Exit 0 → Command succeeded
- Exit non-zero → Command failed → FAIL session
- Signal (SIGKILL, SIGTERM) → FAIL session

### Command Implementation

```typescript
class RuntimeCommandExecutor {
  /**
   * Execute a single command with strict timeout and output capture.
   * NO RETRIES. NO AUTO-FIX. FAIL-LOUD.
   */
  async executeCommand(
    containerId: string,
    command: string,
    timeoutMs: number
  ): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      const result = await execWithTimeout(containerId, command, timeoutMs);

      return {
        command,
        exitCode: result.exitCode,
        stdout: result.stdout.slice(0, 10000), // First 10k lines
        stderr: result.stderr.slice(0, 10000),
        durationMs: Date.now() - startTime,
        timedOut: false,
      };
    } catch (err: any) {
      if (err.code === 'TIMEOUT') {
        return {
          command,
          exitCode: null,
          stdout: err.partialStdout || '',
          stderr: err.partialStderr || '',
          durationMs: timeoutMs,
          timedOut: true,
        };
      }

      throw err;
    }
  }

  /**
   * Validate command exit code.
   * Non-zero → throw immediately (fail session).
   */
  validateExitCode(result: CommandResult): void {
    if (result.timedOut) {
      throw new Error(
        `TIMEOUT: Command "${result.command}" exceeded ${result.durationMs}ms`
      );
    }

    if (result.exitCode !== 0) {
      throw new Error(
        `COMMAND FAILED: "${result.command}" exited with code ${result.exitCode}\n` +
        `STDERR: ${result.stderr}`
      );
    }
  }
}
```

---

## LIFECYCLE STATE MACHINE

### State Diagram (ASCII)

```
                    ┌──────────────┐
                    │    READY     │
                    │              │
                    │ Preconditions│
                    │   validated  │
                    └──────┬───────┘
                           │
                           │ start()
                           │
                    ┌──────▼───────┐
                    │  STARTING    │──────────┐
                    │              │          │
                    │ - Launch     │          │ Timeout
                    │   container  │          │ Install fails
                    │ - npm install│          │ Container crash
                    └──────┬───────┘          │
                           │                  │
                           │ Install OK       │
                           │                  │
                    ┌──────▼───────┐          │
                    │  BUILDING    │──────────┤
                    │              │          │
                    │ npm run build│          │ Build fails
                    │              │          │ Timeout
                    └──────┬───────┘          │
                           │                  │
                           │ Build OK         │
                           │                  │
                    ┌──────▼───────┐          │
                    │   RUNNING    │──────────┤
                    │              │          │
                    │ Preview live │          │ Start fails
                    │ URL available│          │ Crash
                    └──────┬───────┘          │ TTL expires
                           │                  │
                           │ terminate()      │
                           │ or TTL           │
                           │                  │
                    ┌──────▼───────┐    ┌─────▼──────┐
                    │ TERMINATED   │    │   FAILED   │
                    │              │    │            │
                    │ Clean exit   │    │ Error exit │
                    └──────────────┘    └────────────┘
                           │                  │
                           └──────────┬───────┘
                                      │
                                      │ (FINAL STATES)
                                      │ No transitions out
                                      │ Session immutable
                                      ▼
```

### Transition Rules

```typescript
const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  READY: ['STARTING', 'FAILED'],              // Can start or fail validation
  STARTING: ['BUILDING', 'FAILED'],           // Install succeeds or fails
  BUILDING: ['RUNNING', 'FAILED'],            // Build succeeds or fails
  RUNNING: ['TERMINATED', 'FAILED'],          // Clean exit or crash
  FAILED: [],                                 // Terminal state
  TERMINATED: [],                             // Terminal state
};

class PreviewStateMachine {
  transition(current: SessionStatus, next: SessionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current];

    if (!allowed.includes(next)) {
      throw new Error(
        `ILLEGAL TRANSITION: ${current} → ${next}\n` +
        `Allowed transitions from ${current}: ${allowed.join(', ')}`
      );
    }

    // Log transition for audit
    this.logger.info({
      event: 'preview.state_transition',
      from: current,
      to: next,
      sessionId: this.sessionId,
    });
  }

  assertNotTerminal(status: SessionStatus): void {
    if (status === 'FAILED' || status === 'TERMINATED') {
      throw new Error(
        `Cannot perform operation: session is ${status} (terminal state)`
      );
    }
  }
}
```

### Immutability After Termination

Once a session reaches `FAILED` or `TERMINATED`:
- ✅ Session record is frozen
- ✅ `sessionHash` computed and locked
- ✅ Container destroyed (if exists)
- ❌ No retries allowed
- ❌ No resume allowed
- ❌ No modification allowed

---

## SECURITY & ISOLATION

### Resource Limits (Enforced by Docker)

```typescript
const RESOURCE_LIMITS = {
  cpus: 1,                    // Max 1 CPU core
  memory: '512m',             // Max 512 MB RAM
  memorySwap: '512m',         // No swap (enforce hard limit)
  pids: 100,                  // Max 100 processes (prevent fork bombs)
  ulimits: {
    nofile: { soft: 1024, hard: 1024 },  // Max open files
  },
};
```

### Filesystem Isolation

```typescript
const FILESYSTEM_ISOLATION = {
  workspaceMount: {
    source: workspaceDir,     // Assembled Next.js app
    target: '/app',
    readOnly: true,           // CRITICAL: No code modification
  },
  tmpfsMount: {
    target: '/tmp',
    size: '100m',             // Max 100 MB temp space
  },
  // No other mounts - fully isolated
};
```

### Network Isolation

```typescript
const NETWORK_CONFIG = {
  mode: 'bridge',             // Isolated network
  portBindings: {
    '3000/tcp': [{ HostPort: String(allocatedPort) }],
  },
  publishAllPorts: false,     // Only expose port 3000
  dns: [],                    // No DNS servers (prevent external lookups)
};
```

**Critical**: No network egress by default. The app can:
- ✅ Serve HTTP on port 3000 (mapped to host)
- ❌ Make outbound HTTP requests
- ❌ Connect to databases
- ❌ Call external APIs

**Rationale**: Preview is for visual inspection only, not functional testing.

### Session Time-To-Live (TTL)

```typescript
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

class SessionTTLEnforcer {
  private timeoutHandle: NodeJS.Timeout | null = null;

  startTTL(sessionId: string): void {
    this.timeoutHandle = setTimeout(() => {
      this.logger.warn({
        event: 'preview.ttl_expired',
        sessionId,
        ttl: SESSION_TTL_MS,
      });

      this.forceTerminate(sessionId, 'TTL_EXPIRED');
    }, SESSION_TTL_MS);
  }

  cancelTTL(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  async forceTerminate(sessionId: string, reason: string): Promise<void> {
    // Forcefully kill container (SIGKILL)
    await this.docker.kill(containerId, 'SIGKILL');

    // Update session status
    await this.updateSession(sessionId, {
      status: 'TERMINATED',
      terminatedAt: Date.now(),
      failureStage: 'timeout',
      failureOutput: `Session terminated: ${reason}`,
    });
  }
}
```

### Port Allocation (Avoid Conflicts)

```typescript
class PortAllocator {
  private allocatedPorts = new Set<number>();
  private readonly MIN_PORT = 10000;
  private readonly MAX_PORT = 20000;

  allocate(): number {
    for (let port = this.MIN_PORT; port <= this.MAX_PORT; port++) {
      if (!this.allocatedPorts.has(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error('No available ports in range 10000-20000');
  }

  release(port: number): void {
    this.allocatedPorts.delete(port);
  }
}
```

---

## HUMAN INTERACTION MODEL

### User Journey

```
1. User clicks "Preview App" button
   ↓
2. Frontend validates: Is Completion = COMPLETE?
   ↓ YES
3. Frontend shows loading modal:
   "Starting preview... (this may take 1-2 minutes)"
   ↓
4. Backend creates session, launches container
   ↓
5. Frontend polls session status (every 2 seconds)
   ↓
6a. SUCCESS: Display preview URL
    "Your app is running! Click to view: http://localhost:12345"
    ↓
    User clicks link → Opens in new tab
    ↓
    User interacts with app (read-only mode)
    ↓
    User clicks "Stop Preview" or TTL expires
    ↓
    Container destroyed, session TERMINATED

6b. FAILURE: Display raw error
    "Preview failed during: BUILD

     Error output:
     ──────────────────────────────────────
     npm ERR! code ELIFECYCLE
     npm ERR! errno 1
     npm ERR! forge-generated-app@0.1.0 build: `next build`
     npm ERR! Exit status 1
     ──────────────────────────────────────

     [Close]"
```

### UI States

```typescript
type PreviewUIState =
  | 'DISABLED'      // Completion != COMPLETE, button grayed out
  | 'READY'         // Button enabled, "Preview App"
  | 'LOADING'       // Modal shown, "Starting preview..."
  | 'RUNNING'       // Modal shows URL, "Preview is live!"
  | 'FAILED'        // Modal shows raw error output
  | 'TERMINATED';   // Session ended, button returns to READY

interface PreviewUIProps {
  state: PreviewUIState;
  previewUrl: string | null;
  failureStage: string | null;
  failureOutput: string | null;
}
```

### Failure Display (NO INTERPRETATION)

**Critical Rule**: Show ONLY raw command output. No explanations.

```typescript
// ❌ FORBIDDEN (interpretation)
"It looks like there's a type error in your code. Try fixing line 42."

// ✅ CORRECT (raw output only)
"Preview failed during: BUILD

Error output:
──────────────────────────────────────
Type error: Property 'foo' does not exist on type 'Bar'.
  at src/components/Widget.tsx:42:10
──────────────────────────────────────

[Close]"
```

**No Suggestions. No Help. Facts Only.**

---

## FORGE UX INTEGRATION

### When "Preview" Becomes Enabled

The Preview button is enabled if and only if:

```typescript
function isPreviewEnabled(appRequest: AppRequest): boolean {
  // Check 1: Completion Auditor ran
  const completion = await prisma.completionReport.findUnique({
    where: { appRequestId: appRequest.id },
  });

  if (!completion) return false;

  // Check 2: Verdict = COMPLETE
  if (completion.verdict !== 'COMPLETE') return false;

  // Check 3: Framework Assembly manifest exists
  const manifest = await prisma.frameworkAssemblyManifest.findUnique({
    where: { appRequestId: appRequest.id },
  });

  if (!manifest || !manifest.manifestHash) return false;

  // Check 4: Workspace directory exists
  const workspaceDir = path.join('/tmp/forge-workspaces', appRequest.id, 'nextjs-app');
  if (!fs.existsSync(workspaceDir)) return false;

  return true;
}
```

### Conductor State Validation

```typescript
// Preview is allowed ONLY in these conductor states:
const ALLOWED_CONDUCTOR_STATES = [
  'completed',        // Normal completion
  'failed',           // Completion Auditor found issues (still can preview partial app)
];

function validateConductorState(state: string): void {
  if (!ALLOWED_CONDUCTOR_STATES.includes(state)) {
    throw new Error(
      `Preview not allowed in conductor state: ${state}\n` +
      `Allowed states: ${ALLOWED_CONDUCTOR_STATES.join(', ')}`
    );
  }
}
```

### Preview Status Display

```typescript
interface PreviewStatusDisplay {
  status: SessionStatus;
  message: string;
  color: 'gray' | 'blue' | 'green' | 'red';
  showUrl: boolean;
  showError: boolean;
}

function getStatusDisplay(session: PreviewRuntimeSession): PreviewStatusDisplay {
  switch (session.status) {
    case 'READY':
      return {
        status: 'READY',
        message: 'Ready to preview',
        color: 'gray',
        showUrl: false,
        showError: false,
      };

    case 'STARTING':
    case 'BUILDING':
      return {
        status: session.status,
        message: `${session.status}... (this may take 1-2 minutes)`,
        color: 'blue',
        showUrl: false,
        showError: false,
      };

    case 'RUNNING':
      return {
        status: 'RUNNING',
        message: 'Preview is live!',
        color: 'green',
        showUrl: true,
        showError: false,
      };

    case 'FAILED':
      return {
        status: 'FAILED',
        message: `Preview failed during: ${session.failureStage?.toUpperCase()}`,
        color: 'red',
        showUrl: false,
        showError: true,
      };

    case 'TERMINATED':
      return {
        status: 'TERMINATED',
        message: 'Preview session ended',
        color: 'gray',
        showUrl: false,
        showError: false,
      };
  }
}
```

### Teardown Triggers

Preview sessions can be terminated by:

1. **Manual user action**: User clicks "Stop Preview"
2. **TTL expiry**: 30 minutes elapsed
3. **Container crash**: Process exited unexpectedly
4. **System shutdown**: Forge server stopping

```typescript
class PreviewTeardownManager {
  async teardown(sessionId: string, reason: TeardownReason): Promise<void> {
    const session = await this.getSession(sessionId);

    // Cancel TTL timer
    this.ttlEnforcer.cancelTTL();

    // Kill container (if running)
    if (session.containerId) {
      await this.docker.kill(session.containerId, 'SIGTERM');

      // Wait up to 5 seconds for graceful shutdown
      await this.waitForContainerExit(session.containerId, 5000);

      // Force kill if still running
      if (await this.isContainerRunning(session.containerId)) {
        await this.docker.kill(session.containerId, 'SIGKILL');
      }
    }

    // Release port
    if (session.port) {
      this.portAllocator.release(session.port);
    }

    // Update session status
    await this.updateSession(sessionId, {
      status: 'TERMINATED',
      terminatedAt: Date.now(),
    });

    // Compute final hash
    const sessionHash = this.computeSessionHash(session);
    await this.updateSession(sessionId, { sessionHash });

    // Emit audit event
    this.logger.info({
      event: 'preview.terminated',
      sessionId,
      reason,
      durationMs: Date.now() - session.startedAt,
    });
  }
}

type TeardownReason =
  | 'MANUAL'        // User clicked "Stop Preview"
  | 'TTL_EXPIRED'   // 30 minutes elapsed
  | 'CRASH'         // Container exited unexpectedly
  | 'SYSTEM_SHUTDOWN'; // Forge server stopping
```

---

## FAILURE SEMANTICS

### Critical Rule: Preview Runtime NEVER Escalates to Repair

**Philosophy**: Preview failures are informational, not actionable.

If preview fails:
- ✅ Record failure with raw output
- ✅ Show user the raw error
- ✅ Mark session as FAILED (terminal)
- ❌ Do NOT invoke Repair Plan Generator
- ❌ Do NOT offer auto-fix
- ❌ Do NOT retry automatically

**Rationale**: The app already passed Completion Auditor. Preview failures indicate environment issues (missing deps, build config), not code correctness issues.

### Failure Scenarios

#### 1. Build Failure

```typescript
// Example: TypeScript compilation error

failureStage: 'build'
failureOutput: `
Type error: Property 'foo' does not exist on type 'Bar'.

  40 |   const widget = new Bar();
> 41 |   console.log(widget.foo);
     |                      ^^^
  42 |   return widget;

npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! Exit status 1
`

// User sees this VERBATIM. No interpretation.
```

#### 2. Runtime Crash

```typescript
// Example: Unhandled exception during startup

failureStage: 'start'
failureOutput: `
Error: Cannot find module './missing-file'
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1039:15)
    at Function.Module._load (node:internal/modules/cjs/loader:885:27)
    at Module.require (node:internal/modules/cjs/loader:1105:19)

npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! Exit status 1
`
```

#### 3. Timeout

```typescript
failureStage: 'build'
failureOutput: `
TIMEOUT: Command "npm run build" exceeded 300000ms

Partial output:
  Building...
  Compiled successfully (152 modules)
  [Execution killed after timeout]
`
```

#### 4. Port Conflict

```typescript
// This should never happen (port allocator prevents it)
// But if it does:

failureStage: 'start'
failureOutput: `
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1740:16)
`
```

#### 5. Invalid Manifest

```typescript
// Precondition check failure (before container launch)

errors: [
  'Framework Assembly manifest not found',
  'appRequestId: abc-123',
  'Expected manifest at: /db/frameworkAssemblyManifest/abc-123',
]

// Session never reaches STARTING - fails at READY
```

### Failure Handling Implementation

```typescript
class PreviewFailureHandler {
  async handleFailure(
    sessionId: string,
    stage: FailureStage,
    error: Error
  ): Promise<void> {
    // Capture raw error output
    const failureOutput = this.captureErrorOutput(error);

    // Update session (terminal state)
    await this.updateSession(sessionId, {
      status: 'FAILED',
      failureStage: stage,
      failureOutput,
      terminatedAt: Date.now(),
    });

    // Teardown container (if exists)
    await this.teardownManager.teardown(sessionId, 'CRASH');

    // Compute final hash
    const sessionHash = this.computeSessionHash(session);
    await this.updateSession(sessionId, { sessionHash });

    // Emit audit event
    this.logger.error({
      event: 'preview.failed',
      sessionId,
      stage,
      error: failureOutput.slice(0, 500), // First 500 chars in logs
    });

    // NO RETRY
    // NO REPAIR ESCALATION
    // NO AUTO-FIX
  }

  captureErrorOutput(error: Error): string {
    // Return ONLY raw output - NO interpretation
    if (error instanceof CommandFailureError) {
      return `Command: ${error.command}\n` +
             `Exit code: ${error.exitCode}\n\n` +
             `STDOUT:\n${error.stdout}\n\n` +
             `STDERR:\n${error.stderr}`;
    }

    return error.stack || error.message;
  }
}
```

---

## DETERMINISM & AUDITABILITY

### What Is Hashed

The `sessionHash` includes:

```typescript
interface SessionHashInput {
  appRequestId: string;
  framework: string;
  frameworkVersion: string;
  manifestHash: string;       // References Framework Assembly manifest
  workspaceHash: string;       // SHA-256 of workspace directory
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

function computeSessionHash(session: PreviewRuntimeSession): string {
  const input: SessionHashInput = {
    appRequestId: session.appRequestId,
    framework: session.framework,
    frameworkVersion: session.frameworkVersion,
    manifestHash: session.manifestHash,
    workspaceHash: session.workspaceHash,
    status: session.status,
    failureStage: session.failureStage,
    failureOutput: session.failureOutput,
  };

  // Stable serialization (sorted keys)
  const serialized = JSON.stringify(input, Object.keys(input).sort());

  return createHash('sha256').update(serialized).digest('hex');
}
```

### When Hashes Are Computed

```typescript
// Hash computation timeline:

// 1. workspaceHash - Computed BEFORE session creation
const workspaceHash = await computeDirectoryHash(workspaceDir);

// 2. sessionHash - Computed AFTER session termination
const sessionHash = computeSessionHash(session);

// 3. Both hashes locked in database
await prisma.previewRuntimeSession.update({
  where: { id: sessionId },
  data: { sessionHash },
});
```

### Hash Chain Integration

```typescript
// The Preview Runtime extends the Forge hash chain:

Base Prompt
  ↓ basePromptHash
Planning Docs
  ↓ planningDocsHash
Screen Index
  ↓ screensHash
User Journeys
  ↓ journeysHash
Visual Contracts
  ↓ visualContractsHash
Build Prompts
  ↓ buildPromptHash
Execution Plans
  ↓ executionPlanHash
Execution Logs
  ↓ executionLogHash
Verification Results
  ↓ verificationHash
Completion Report
  ↓ completionHash
Framework Assembly Manifest
  ↓ manifestHash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preview Runtime Session
  ↓ sessionHash (references manifestHash)
```

### Audit Trail

All Preview Runtime events are logged with structured data:

```typescript
interface PreviewAuditEvent {
  event: PreviewEventType;
  sessionId: string;
  appRequestId: string;
  timestamp: number;
  metadata: Record<string, any>;
}

type PreviewEventType =
  | 'preview.session_created'
  | 'preview.state_transition'
  | 'preview.command_executed'
  | 'preview.container_launched'
  | 'preview.container_terminated'
  | 'preview.ttl_expired'
  | 'preview.failed'
  | 'preview.terminated';

// Example audit log:
{
  event: 'preview.command_executed',
  sessionId: 'session-abc-123',
  appRequestId: 'app-xyz-456',
  timestamp: 1705234567890,
  metadata: {
    command: 'npm run build',
    exitCode: 0,
    durationMs: 45231,
    stdoutLines: 127,
    stderrLines: 0,
  }
}
```

---

## FORBIDDEN BEHAVIORS

The Preview Runtime **MUST NEVER**:

### 1. Modify Code

```typescript
// ❌ FORBIDDEN
await fs.writeFile(path.join(workspaceDir, 'src/fix.ts'), fixedCode);

// ✅ ENFORCED
// Read-only mount prevents all writes
```

### 2. Install Extra Dependencies

```typescript
// ❌ FORBIDDEN
await exec('npm install lodash');

// ✅ ENFORCED
// Only runs: npm install --ignore-scripts (uses existing package.json)
```

### 3. Edit Configs

```typescript
// ❌ FORBIDDEN
const nextConfig = JSON.parse(await fs.readFile('next.config.js'));
nextConfig.reactStrictMode = false;
await fs.writeFile('next.config.js', JSON.stringify(nextConfig));

// ✅ ENFORCED
// Read-only mount prevents all writes
```

### 4. Guess Ports

```typescript
// ❌ FORBIDDEN
if (portInUse(3000)) {
  tryPort(3001); // "Helpful" retry
}

// ✅ ENFORCED
// Port allocator prevents conflicts upfront
// If port conflict → FAIL (should never happen)
```

### 5. "Help" the User

```typescript
// ❌ FORBIDDEN (interpretation)
if (error.includes('ENOENT')) {
  return 'It looks like a file is missing. Try regenerating the app.';
}

// ✅ ENFORCED
// Return ONLY raw error output, NO interpretation
```

### 6. Retry on Failure

```typescript
// ❌ FORBIDDEN
if (buildFailed) {
  await retry(() => exec('npm run build'), { attempts: 3 });
}

// ✅ ENFORCED
// Each command runs ONCE
// Non-zero exit → FAIL session immediately
```

### 7. Bypass Preconditions

```typescript
// ❌ FORBIDDEN
if (!completionReport) {
  // Just start anyway, maybe it'll work
  await startPreview();
}

// ✅ ENFORCED
// Precondition validation throws before container launch
```

### 8. Escalate to Repair

```typescript
// ❌ FORBIDDEN
if (session.status === 'FAILED') {
  await repairPlanGenerator.start(appRequestId);
}

// ✅ ENFORCED
// Preview failures are terminal (no escalation)
```

### 9. Extend TTL

```typescript
// ❌ FORBIDDEN
if (userIsActive) {
  extendTTL(30 * 60 * 1000); // "Helpful" extension
}

// ✅ ENFORCED
// TTL is fixed at session creation (no extensions)
```

### 10. Interpret Logs

```typescript
// ❌ FORBIDDEN
const analysis = await llm.analyze(buildOutput);
return `Build failed because: ${analysis.reason}`;

// ✅ ENFORCED
// No LLM usage, no interpretation, raw output only
```

---

## TEST PLAN

### Test Suite (10+ Required Tests)

#### Test 1: Cannot Run Without Completion = COMPLETE

```typescript
test('prevents preview when completion status is not COMPLETE', async () => {
  const appRequest = await createTestAppRequest();

  // Create completion report with NOT_COMPLETE verdict
  await prisma.completionReport.create({
    data: {
      appRequestId: appRequest.id,
      verdict: 'NOT_COMPLETE',
      // ...
    },
  });

  // Attempt to start preview
  await expect(
    previewRuntime.start(appRequest.id)
  ).rejects.toThrow('Precondition failed: Completion verdict is NOT_COMPLETE');
});
```

#### Test 2: Deterministic Session Hash

```typescript
test('produces identical sessionHash for same terminal state', () => {
  const session1: PreviewRuntimeSession = {
    sessionId: 'uuid-1',           // Different UUIDs
    appRequestId: 'app-123',
    framework: 'nextjs',
    frameworkVersion: '14.2.0',
    manifestHash: 'hash-abc',
    workspaceHash: 'hash-def',
    status: 'TERMINATED',
    containerId: 'container-1',    // Different container IDs
    port: 12345,                   // Different ports
    previewUrl: 'http://localhost:12345',
    startedAt: 1000,               // Different timestamps
    runningAt: 2000,
    terminatedAt: 3000,
    failureStage: null,
    failureOutput: null,
    sessionHash: '',               // To be computed
  };

  const session2: PreviewRuntimeSession = {
    ...session1,
    sessionId: 'uuid-2',           // Different
    containerId: 'container-2',    // Different
    port: 54321,                   // Different
    previewUrl: 'http://localhost:54321',
    startedAt: 5000,               // Different
    runningAt: 6000,               // Different
    terminatedAt: 7000,            // Different
  };

  const hash1 = computeSessionHash(session1);
  const hash2 = computeSessionHash(session2);

  expect(hash1).toBe(hash2); // Hashes MUST be identical
});
```

#### Test 3: Timeout Enforcement

```typescript
test('enforces build timeout and fails session', async () => {
  const session = await previewRuntime.start(appRequestId);

  // Mock slow build (exceeds 300s timeout)
  jest.spyOn(executor, 'executeCommand').mockImplementation(async () => {
    await sleep(310000); // 310 seconds
  });

  await waitForSessionTerminal(session.sessionId);

  const finalSession = await getSession(session.sessionId);
  expect(finalSession.status).toBe('FAILED');
  expect(finalSession.failureStage).toBe('build');
  expect(finalSession.failureOutput).toContain('TIMEOUT');
});
```

#### Test 4: Isolation Enforcement (Read-Only Mount)

```typescript
test('prevents code modification via read-only mount', async () => {
  const session = await previewRuntime.start(appRequestId);

  // Attempt to write file inside container
  const result = await exec(
    session.containerId,
    'echo "malicious" > /app/src/hack.ts'
  );

  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('Read-only file system');

  // Verify file doesn't exist
  const fileExists = fs.existsSync(
    path.join(workspaceDir, 'src/hack.ts')
  );
  expect(fileExists).toBe(false);
});
```

#### Test 5: No Code Mutation

```typescript
test('workspace directory is unchanged after session', async () => {
  // Compute hash BEFORE session
  const hashBefore = await computeDirectoryHash(workspaceDir);

  // Run preview session
  const session = await previewRuntime.start(appRequestId);
  await waitForSessionTerminal(session.sessionId);

  // Compute hash AFTER session
  const hashAfter = await computeDirectoryHash(workspaceDir);

  expect(hashAfter).toBe(hashBefore); // MUST be identical
});
```

#### Test 6: Proper Teardown

```typescript
test('destroys container and releases port on teardown', async () => {
  const session = await previewRuntime.start(appRequestId);
  await waitForSessionRunning(session.sessionId);

  const { containerId, port } = await getSession(session.sessionId);

  // Teardown
  await previewRuntime.teardown(session.sessionId, 'MANUAL');

  // Verify container destroyed
  const containerExists = await docker.containerExists(containerId);
  expect(containerExists).toBe(false);

  // Verify port released
  const portAllocated = portAllocator.isAllocated(port);
  expect(portAllocated).toBe(false);
});
```

#### Test 7: Failure Propagation (No Silent Fixes)

```typescript
test('fails session immediately on build error (no retry)', async () => {
  // Inject build error (missing dependency)
  await fs.writeFile(
    path.join(workspaceDir, 'src/broken.ts'),
    'import { nonexistent } from "missing-package";'
  );

  const session = await previewRuntime.start(appRequestId);
  await waitForSessionTerminal(session.sessionId);

  const finalSession = await getSession(session.sessionId);

  expect(finalSession.status).toBe('FAILED');
  expect(finalSession.failureStage).toBe('build');
  expect(finalSession.failureOutput).toContain('Cannot find module');

  // Verify NO retry attempted
  const commandLogs = await getCommandLogs(session.sessionId);
  const buildCommands = commandLogs.filter(c => c.command === 'npm run build');
  expect(buildCommands.length).toBe(1); // Ran ONCE
});
```

#### Test 8: No Retries on Timeout

```typescript
test('does not retry command after timeout', async () => {
  jest.spyOn(executor, 'executeCommand').mockImplementation(async () => {
    await sleep(400000); // Exceeds build timeout
  });

  const session = await previewRuntime.start(appRequestId);
  await waitForSessionTerminal(session.sessionId);

  const commandLogs = await getCommandLogs(session.sessionId);
  const buildCommands = commandLogs.filter(c => c.command === 'npm run build');

  expect(buildCommands.length).toBe(1); // Attempted ONCE, then failed
});
```

#### Test 9: No Network Access

```typescript
test('blocks outbound network requests from container', async () => {
  // Add code that tries to fetch external resource
  await fs.writeFile(
    path.join(workspaceDir, 'src/fetcher.ts'),
    `
    fetch('https://example.com/data').then(r => r.json());
    `
  );

  const session = await previewRuntime.start(appRequestId);
  await waitForSessionRunning(session.sessionId);

  // Attempt outbound request from container
  const result = await exec(
    session.containerId,
    'curl https://example.com'
  );

  expect(result.exitCode).not.toBe(0);
  expect(result.stderr).toContain('Could not resolve host');
});
```

#### Test 10: Concurrent Session Isolation

```typescript
test('multiple sessions run in isolated containers', async () => {
  const app1 = await createTestAppRequest();
  const app2 = await createTestAppRequest();

  // Start two sessions concurrently
  const [session1, session2] = await Promise.all([
    previewRuntime.start(app1.id),
    previewRuntime.start(app2.id),
  ]);

  await Promise.all([
    waitForSessionRunning(session1.sessionId),
    waitForSessionRunning(session2.sessionId),
  ]);

  // Verify different containers
  expect(session1.containerId).not.toBe(session2.containerId);

  // Verify different ports
  expect(session1.port).not.toBe(session2.port);

  // Verify both URLs accessible
  const response1 = await fetch(session1.previewUrl!);
  const response2 = await fetch(session2.previewUrl!);

  expect(response1.status).toBe(200);
  expect(response2.status).toBe(200);

  // Teardown
  await Promise.all([
    previewRuntime.teardown(session1.sessionId, 'MANUAL'),
    previewRuntime.teardown(session2.sessionId, 'MANUAL'),
  ]);
});
```

#### Test 11: TTL Enforcement

```typescript
test('forcefully terminates session after TTL expires', async () => {
  // Mock fast TTL (5 seconds for test)
  jest.spyOn(previewRuntime, 'SESSION_TTL_MS', 'get').mockReturnValue(5000);

  const session = await previewRuntime.start(appRequestId);
  await waitForSessionRunning(session.sessionId);

  // Wait for TTL + buffer
  await sleep(6000);

  const finalSession = await getSession(session.sessionId);
  expect(finalSession.status).toBe('TERMINATED');
  expect(finalSession.failureStage).toBe('timeout');

  // Verify container destroyed
  const containerExists = await docker.containerExists(finalSession.containerId);
  expect(containerExists).toBe(false);
});
```

#### Test 12: Precondition Validation (Missing Manifest)

```typescript
test('fails precondition check when manifest is missing', async () => {
  const appRequest = await createTestAppRequest();

  // DO NOT create Framework Assembly manifest

  await expect(
    previewRuntime.start(appRequest.id)
  ).rejects.toThrow('Framework Assembly manifest not found');

  // Verify no session created
  const sessions = await prisma.previewRuntimeSession.findMany({
    where: { appRequestId: appRequest.id },
  });
  expect(sessions.length).toBe(0);
});
```

---

## FUTURE EXTENSIONS

### Possible Enhancements (NOT in v1.0)

#### 1. Multi-Framework Support

```typescript
// Currently: only Next.js
framework: 'nextjs';

// Future: support other frameworks
framework: 'nextjs' | 'remix' | 'vue' | 'svelte';

// Each framework would have its own:
// - Docker image
// - Build/start commands
// - Port configuration
```

#### 2. Deployment Integration

```typescript
// v1.0: Preview only (ephemeral)
// v2.0: Add "Deploy" button (after successful preview)

interface DeploymentTarget {
  platform: 'vercel' | 'netlify' | 'fly.io' | 'aws';
  config: Record<string, any>;
}

// Flow: Preview → Success → Deploy
```

#### 3. Firecracker Migration

```typescript
// v1.0: Docker (good enough)
// v2.0+: Firecracker (faster, more secure)

// Benefits:
// - MicroVM isolation (stronger than containers)
// - ~125ms boot time (vs ~1s for Docker)
// - Lower memory overhead
```

#### 4. Live Reload

```typescript
// v1.0: Static preview (read-only)
// v2.0+: Live editing with hot reload

// Flow:
// 1. User edits code in browser
// 2. Changes synced to temporary workspace
// 3. Hot reload updates preview
// 4. User clicks "Save Changes" → triggers new build
```

#### 5. Screenshot Capture

```typescript
// Automatically capture screenshots of preview
interface PreviewScreenshot {
  sessionId: string;
  url: string;
  screenshotUrl: string;  // Stored in S3/R2
  viewport: { width: number; height: number };
  capturedAt: number;
}

// Use Playwright to capture screenshots
// Store alongside session for documentation
```

#### 6. Performance Metrics

```typescript
// Capture performance metrics from preview
interface PreviewMetrics {
  sessionId: string;
  firstContentfulPaint: number;  // ms
  largestContentfulPaint: number; // ms
  totalBlockingTime: number;     // ms
  cumulativeLayoutShift: number;
  bundleSize: number;            // bytes
}

// Use Lighthouse API to measure
// Display to user: "Your app scores 95/100 on performance"
```

#### 7. Multi-Page Testing

```typescript
// v1.0: Preview shows root page only
// v2.0+: Crawl all routes and preview each

interface PreviewRoute {
  path: string;
  previewUrl: string;
  screenshotUrl: string;
  status: 'working' | 'broken';
}

// Automatically test all routes discovered by Framework Assembly
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Core Runtime (v1.0)

- [ ] PreviewRuntimeSession model (Prisma schema)
- [ ] RuntimeExecutionMetadata model
- [ ] Docker integration (container lifecycle)
- [ ] PortAllocator (conflict prevention)
- [ ] CommandExecutor (strict timeout, no retry)
- [ ] StateMachine (transition validation)
- [ ] TTLEnforcer (forced teardown)
- [ ] TeardownManager (cleanup)
- [ ] FailureHandler (raw output only)
- [ ] Hash computation (sessionHash, workspaceHash)
- [ ] Precondition validation
- [ ] Audit event logging

### Phase 2: API Endpoints

- [ ] `POST /api/preview/start` - Start session
- [ ] `GET /api/preview/status/:sessionId` - Poll status
- [ ] `POST /api/preview/teardown/:sessionId` - Manual teardown
- [ ] `GET /api/preview/sessions/:appRequestId` - List sessions

### Phase 3: UI Integration

- [ ] Preview button (conditional enable)
- [ ] Loading modal (status polling)
- [ ] Preview URL display (with "Open in New Tab")
- [ ] Error modal (raw output display)
- [ ] Stop button (manual teardown)

### Phase 4: Testing

- [ ] All 12 tests passing
- [ ] Integration test (end-to-end)
- [ ] Docker cleanup verification
- [ ] Concurrent session test
- [ ] TTL enforcement test

### Phase 5: Documentation

- [ ] This architecture document
- [ ] API documentation
- [ ] UX flow diagrams
- [ ] Troubleshooting guide

---

## SUCCESS CRITERIA

At the end of implementation, a non-developer should be able to:

1. **Click "Preview App"** (enabled only when Completion = COMPLETE)
2. **See loading state** ("Starting preview... this may take 1-2 minutes")
3. **Receive preview URL** ("Your app is running! Click to view: http://localhost:12345")
4. **Open in new tab** (browser opens preview URL)
5. **Interact with app** (read-only, no modifications)
6. **Close preview** (manual "Stop" or automatic TTL)

And Forge should remain:

- ✅ **Deterministic** (same input → same sessionHash)
- ✅ **Safe** (read-only mount, no code mutation)
- ✅ **Auditable** (complete event trail, hash chain integration)
- ✅ **Boring** (no intelligence, no helping, no interpretation)

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-14
**Status**: Architecture Complete - Ready for Implementation

---

## FINAL PHILOSOPHY

> "The Preview Runtime is a petri dish, not a surgeon.
> It places the assembled app in a controlled environment and observes what happens.
> If the organism thrives → User sees it running.
> If the organism dies → User sees the death certificate (raw error output).
> The Preview Runtime does not diagnose. It does not treat. It does not revive.
> It observes. It reports. It destroys."

**Golden Rule**: RUN → OBSERVE → DESTROY

No intelligence. No autonomy. No helping.

Just mechanical execution.

---

**End of Architecture Document**
