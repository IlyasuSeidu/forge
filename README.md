# Forge

**Production-grade system for turning natural-language ideas into fully built applications**

🔗 **Repository**: [https://github.com/IlyasuSeidu/forge](https://github.com/IlyasuSeidu/forge)

Forge is a backend-first platform designed to orchestrate autonomous AI agents that transform user ideas into working software. It is built to be production-ready from day one, with a focus on clarity, correctness, and extensibility.

## Status

**Early Development - Database & Execution Engine**

Currently implemented:
- ✅ Core backend API server (Fastify + TypeScript)
- ✅ Domain models (Project, Task, Execution, ExecutionEvent, Artifact, Approval)
- ✅ **Database persistence (SQLite + Prisma)**
- ✅ RESTful API endpoints
- ✅ **Execution state machine (idle → pending_approval → running → paused → completed/failed)**
- ✅ **Human-in-the-Loop (HITL) approval controls**
- ✅ **Sequential task processing with event logging**
- ✅ **Pause/resume execution control**
- ✅ **Crash recovery with automatic state restoration**
- ✅ **Idempotent task processing**
- ✅ **Concurrent execution prevention**
- ✅ **Agent abstraction layer** (clean boundary for task execution)
- ✅ **Pluggable agent system** (DefaultAgent for simulation)
- ✅ **Workspace isolation** (per-project isolated directories)
- ✅ **Artifact tracking** (database + filesystem)
- ✅ **Path validation** (prevents directory traversal attacks)
- ✅ **Web UI with approval interface** (React + Vite + Tailwind CSS)
- ✅ Structured logging (Pino)
- ✅ Centralized error handling

Not yet implemented:
- ❌ AI agent integration (architecture ready, not yet connected)
- ❌ Authentication & authorization
- ❌ Real code generation

## Architecture

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Package Manager**: npm (with workspaces)
- **Framework**: Fastify
- **Database**: SQLite (development) + Prisma ORM
- **Logging**: Pino

**Frontend:**
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router 6

### Why Fastify?

Fastify was chosen over Express for several reasons:

1. **Better TypeScript Support**: First-class TypeScript integration with strong typing throughout
2. **Performance**: Significantly faster than Express with lower overhead
3. **Modern Architecture**: Built with async/await from the ground up
4. **Built-in Validation**: Schema-based validation reduces boilerplate
5. **Plugin System**: Clean, modular architecture for extensibility
6. **Active Development**: Modern, well-maintained project with strong community

These characteristics align with Forge's requirements for a production-grade, long-lived service.

## Project Structure

```
forge/
├── apps/
│   ├── server/          # Backend API (current focus)
│   │   ├── src/
│   │   │   ├── models/      # Domain models and types
│   │   │   ├── routes/      # HTTP route handlers
│   │   │   ├── services/    # Business logic layer
│   │   │   ├── utils/       # Utilities (logging, errors)
│   │   │   ├── server.ts    # Server configuration
│   │   │   └── index.ts     # Application entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/             # Web UI (placeholder)
├── packages/
│   └── shared/          # Shared types and utilities (placeholder)
├── workspaces/          # Generated application projects (placeholder)
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Domain Models

### Project

Represents a user's application being built by Forge.

```typescript
{
  id: string;              // UUID
  name: string;            // 1-255 characters
  description: string;     // Max 5000 characters
  createdAt: Date;
  updatedAt: Date;
}
```

### Task

Represents a single unit of work within a project.

```typescript
{
  id: string;              // UUID
  projectId: string;       // Foreign key to Project
  title: string;           // 1-255 characters
  description: string;     // Max 10000 characters
  status: TaskStatus;      // pending | in_progress | completed | failed | blocked
  createdAt: Date;
  updatedAt: Date;
}
```

### Execution

Represents a single run of the autonomous agent system.

```typescript
{
  id: string;              // UUID
  projectId: string;       // Foreign key to Project
  status: ExecutionStatus; // idle | pending_approval | running | paused | completed | failed
  startedAt: Date | null;
  finishedAt: Date | null;
}
```

### Approval

Represents a human approval checkpoint before critical actions.

```typescript
{
  id: string;              // UUID
  projectId: string;       // Foreign key to Project
  executionId: string;     // Foreign key to Execution
  taskId: string | null;   // Foreign key to Task (optional, for task-level approvals)
  type: ApprovalType;      // execution_start | task_completion
  status: ApprovalStatus;  // pending | approved | rejected
  reason: string | null;   // Optional rejection/approval reason
  createdAt: Date;
  resolvedAt: Date | null; // When approval was approved/rejected
}
```

### Artifact

Represents a file or directory created by agents in the workspace.

```typescript
{
  id: string;              // UUID
  projectId: string;       // Foreign key to Project
  executionId: string | null;  // Execution that created it
  taskId: string | null;   // Task that created it
  path: string;            // Relative path within workspace
  type: 'file' | 'directory';
  createdAt: Date;
}
```

## API Reference

All API endpoints are prefixed with `/api` except for health checks.

### Health Check

**GET /health**

Returns server health status.

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5
}
```

### Projects

**POST /api/projects**

Create a new project.

Request:
```json
{
  "name": "My Todo App",
  "description": "A simple todo application with user authentication"
}
```

Response (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Todo App",
  "description": "A simple todo application with user authentication",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**GET /api/projects**

List all projects (sorted by creation date, newest first).

Response:
```json
{
  "projects": [
    { /* project object */ }
  ]
}
```

**GET /api/projects/:id**

Get a specific project.

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My Todo App",
  "description": "A simple todo application with user authentication",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Tasks

**POST /api/projects/:id/tasks**

Create a new task for a project.

Request:
```json
{
  "title": "Set up database schema",
  "description": "Create PostgreSQL schema for users and todos tables"
}
```

Response (201):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Set up database schema",
  "description": "Create PostgreSQL schema for users and todos tables",
  "status": "pending",
  "createdAt": "2024-01-15T10:31:00.000Z",
  "updatedAt": "2024-01-15T10:31:00.000Z"
}
```

**GET /api/projects/:id/tasks**

List all tasks for a project (sorted by creation date).

Response:
```json
{
  "tasks": [
    { /* task object */ }
  ]
}
```

### Executions

**POST /api/projects/:id/executions**

Start a new execution for a project.

**Current Behavior (with HITL approvals)**:
- Creates a new execution with "pending_approval" status
- Creates an approval request of type "execution_start"
- Emits "approval_requested" event
- Execution does NOT start until approved
- Prevents concurrent executions for the same project (returns 422 if already active)
- Once approved, transitions to running and processes all project tasks sequentially
- If rejected, marks execution as "failed" with appropriate event
- Supports pause/resume for long-running executions
- Automatically recovers from crashes (marks running executions as paused on startup)

**⚠️ Note**: AI orchestration is simulated with delays. Real AI agent integration is not yet implemented.

Response (201):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending_approval",
  "startedAt": null,
  "finishedAt": null
}
```

**GET /api/projects/:id/executions/:executionId**

Get a specific execution.

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "startedAt": "2024-01-15T10:32:00.000Z",
  "finishedAt": "2024-01-15T10:32:02.000Z"
}
```

**GET /api/projects/:id/executions/:executionId/events**

Get all events for an execution (ordered by creation time).

Response:
```json
{
  "events": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "executionId": "770e8400-e29b-41d4-a716-446655440002",
      "type": "execution_started",
      "message": "Execution has started",
      "createdAt": "2024-01-15T10:32:00.000Z"
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "executionId": "770e8400-e29b-41d4-a716-446655440002",
      "type": "task_started",
      "message": "Started task: Set up database schema",
      "createdAt": "2024-01-15T10:32:00.100Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440005",
      "executionId": "770e8400-e29b-41d4-a716-446655440002",
      "type": "task_completed",
      "message": "Completed task: Set up database schema",
      "createdAt": "2024-01-15T10:32:00.600Z"
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440006",
      "executionId": "770e8400-e29b-41d4-a716-446655440002",
      "type": "execution_completed",
      "message": "All tasks have been completed successfully",
      "createdAt": "2024-01-15T10:32:01.200Z"
    }
  ]
}
```

**POST /api/projects/:id/executions/:executionId/pause**

Pause a running execution.

**Behavior**:
- Only allowed if execution status is "running"
- Stops processing after current task completes
- Marks execution as "paused"
- Emits "execution_paused" event
- Returns 422 if execution is not running

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "paused",
  "startedAt": "2024-01-15T10:32:00.000Z",
  "finishedAt": null
}
```

**POST /api/projects/:id/executions/:executionId/resume**

Resume a paused execution.

**Behavior**:
- Only allowed if execution status is "paused"
- Resumes processing from next incomplete task
- Skips already-completed tasks (idempotent)
- Marks execution as "running"
- Emits "execution_resumed" event
- Returns 422 if execution is not paused

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "paused",
  "startedAt": "2024-01-15T10:32:00.000Z",
  "finishedAt": null
}
```

Note: The response shows "paused" status because the execution hasn't transitioned to "running" yet (happens asynchronously).

### Artifacts

**GET /api/projects/:id/artifacts**

List all artifacts for a project.

Query Parameters:
- `executionId` (optional) - Filter by execution ID
- `taskId` (optional) - Filter by task ID

Response:
```json
[
  {
    "id": "cc0e8400-e29b-41d4-a716-446655440007",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "executionId": "770e8400-e29b-41d4-a716-446655440002",
    "taskId": "660e8400-e29b-41d4-a716-446655440001",
    "path": "task-660e8400/output.json",
    "type": "file",
    "createdAt": "2024-01-15T10:32:00.500Z"
  }
]
```

**GET /api/projects/:id/executions/:executionId/artifacts**

List all artifacts created during a specific execution.

Query Parameters:
- `taskId` (optional) - Filter by task ID

Response: Same format as above

### Approvals

**GET /api/projects/:id/approvals**

List all approvals for a project.

Response:
```json
{
  "approvals": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440008",
      "projectId": "550e8400-e29b-41d4-a716-446655440000",
      "executionId": "770e8400-e29b-41d4-a716-446655440002",
      "taskId": null,
      "type": "execution_start",
      "status": "pending",
      "reason": null,
      "createdAt": "2024-01-15T10:32:00.000Z",
      "resolvedAt": null
    }
  ]
}
```

**POST /api/approvals/:approvalId/approve**

Approve an approval and trigger the associated action.

Request (optional):
```json
{
  "reason": "Looks good, approved for deployment"
}
```

**Behavior**:
- Marks approval as "approved"
- Sets resolvedAt timestamp
- If approval type is "execution_start", starts the execution
- Emits "approval_approved" event
- Idempotent: can be called multiple times, returns same result
- Returns 422 if approval is already rejected

Response:
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440008",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "executionId": "770e8400-e29b-41d4-a716-446655440002",
  "taskId": null,
  "type": "execution_start",
  "status": "approved",
  "reason": "Looks good, approved for deployment",
  "createdAt": "2024-01-15T10:32:00.000Z",
  "resolvedAt": "2024-01-15T10:33:00.000Z"
}
```

**POST /api/approvals/:approvalId/reject**

Reject an approval and prevent the associated action.

Request (optional):
```json
{
  "reason": "Too risky, needs more review"
}
```

**Behavior**:
- Marks approval as "rejected"
- Sets resolvedAt timestamp
- If approval type is "execution_start", marks execution as "failed"
- Emits "approval_rejected" event
- Idempotent: can be called multiple times, returns same result
- Returns 422 if approval is already approved

Response:
```json
{
  "id": "dd0e8400-e29b-41d4-a716-446655440008",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "executionId": "770e8400-e29b-41d4-a716-446655440002",
  "taskId": null,
  "type": "execution_start",
  "status": "rejected",
  "reason": "Too risky, needs more review",
  "createdAt": "2024-01-15T10:32:00.000Z",
  "resolvedAt": "2024-01-15T10:33:00.000Z"
}
```

### Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Project with id 'invalid-id' not found",
    "code": "NOT_FOUND",
    "statusCode": 404
  }
}
```

Common status codes:
- `400` - Validation error (malformed input)
- `404` - Resource not found
- `422` - Business rule violation
- `500` - Internal server error

## Running Locally

### Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

### Installation

```bash
# Install dependencies
npm install

# Run Prisma migrations
npm run db:migrate

# Type check
npm run typecheck
```

### Development

**Backend Server:**
```bash
# Start backend server with hot reload
npm run dev

# Server will be available at http://localhost:3000
```

**Web UI:**
```bash
# In a separate terminal, start the web UI
cd apps/web
npm install
npm run dev

# Web UI will be available at http://localhost:5173
# API requests are automatically proxied to http://localhost:3001
```

The Web UI provides a read-only dashboard for monitoring projects, executions, and artifacts.

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `NODE_ENV` - Environment (development | production)
- `LOG_LEVEL` - Log level (debug | info | warn | error)

## Testing the API

Using curl:

```bash
# Health check
curl http://localhost:3000/health

# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "description": "A test application"
  }'

# List projects
curl http://localhost:3000/api/projects

# Create a task (replace PROJECT_ID)
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First task",
    "description": "Do something"
  }'

# Start execution (replace PROJECT_ID)
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/executions

# Get execution status (replace PROJECT_ID and EXECUTION_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID

# Get execution events (replace PROJECT_ID and EXECUTION_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID/events

# Pause execution (replace PROJECT_ID and EXECUTION_ID)
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID/pause

# Resume execution (replace PROJECT_ID and EXECUTION_ID)
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID/resume

# List all artifacts for a project (replace PROJECT_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/artifacts

# List artifacts for a specific execution (replace PROJECT_ID and EXECUTION_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID/artifacts

# Filter artifacts by task (replace PROJECT_ID and TASK_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/artifacts?taskId=TASK_ID

# List approvals for a project (replace PROJECT_ID)
curl http://localhost:3000/api/projects/PROJECT_ID/approvals

# Approve an approval (replace APPROVAL_ID)
curl -X POST http://localhost:3000/api/approvals/APPROVAL_ID/approve \
  -H "Content-Type: application/json" \
  -d '{"reason": "Approved for execution"}'

# Reject an approval (replace APPROVAL_ID)
curl -X POST http://localhost:3000/api/approvals/APPROVAL_ID/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "Needs more review"}'
```

## Design Decisions

### Database Persistence

All state is persisted to SQLite using Prisma ORM:

- **Production-Ready**: State survives server restarts
- **Type Safety**: Prisma provides fully typed database access
- **Migrations**: Schema changes are tracked and versioned
- **Development First**: SQLite requires no setup, will migrate to PostgreSQL for production
- **Performance**: Indexed queries on frequently accessed fields (projectId, status, createdAt)

### Execution Resilience

Forge provides robust execution control and crash recovery:

**Pause/Resume**:
- Executions can be paused mid-run and resumed later
- Pause occurs after current task completes (graceful)
- Resume picks up from next incomplete task
- All state transitions emit events for observability

**Crash Recovery**:
- On server startup, detects executions that were running when server crashed
- Automatically marks crashed executions as "paused"
- Emits "execution_recovered" events for audit trail
- Recovered executions can be resumed normally

**Idempotent Task Processing**:
- Tasks track their execution state (executionId, startedAt, finishedAt)
- Already-completed tasks are skipped on resume
- Safe to retry or resume without duplicating work
- Guarantees at-most-once task completion

**Execution Lifecycle**:
```
pending_approval → (approved) → idle → running → completed
        ↓                         ↓       ↓          ↓
    (rejected)                    └─────pause ──────┘
        ↓                                 ↓
      failed                            resume → running
                                          ↓
                                    (server crash)
                                          ↓
                                    execution_recovered
                                          ↓
                                        paused
```

**Guarantees**:
- Only one execution per project can be active (running, paused, or pending approval)
- No execution can start without explicit human approval
- No execution is silently lost on server crash
- All state transitions are logged as events
- Task processing is sequential and deterministic
- Approval decisions are immutable (cannot approve a rejected approval, or vice versa)

### Agent Abstraction

Forge separates **execution orchestration** from **task execution** through a clean agent abstraction layer.

**Why This Matters**:
- Execution engine is pure orchestration (state management, events, resume/pause)
- Agents are pluggable workers that execute individual tasks
- This architecture allows swapping AI models without touching the execution engine
- Enables testing without AI, human-in-the-loop, or hybrid approaches

**Agent Interface**:
```typescript
interface Agent {
  name: string;
  canHandle(task: Task): boolean;
  execute(task: Task, context: AgentContext): Promise<AgentResult>;
}
```

**Agent Context**:
Every agent receives full context about the execution:
- Project details
- Current execution state
- Task to execute
- All previous execution events (for history/context)
- Workspace path (for file operations)

**Agent Selection**:
- AgentRegistry maintains available agents
- For each task, registry selects first agent where `canHandle()` returns true
- Falls back to DefaultAgent if no specialized agent matches
- New agents can be registered without modifying ExecutionRunner

**Current Agents**:
- **DefaultAgent**: Simulates task execution with delays (placeholder until AI integration)
- **TestFailingAgent**: For testing failure scenarios (development only)

**Event Flow**:
```
agent_selected → agent_execution_started → agent_execution_completed/failed
```

**Critical Design Decision**:
By abstracting agents, Forge avoids the common pitfall of tightly coupling orchestration to a specific AI provider. The execution engine has **zero knowledge** of how tasks are executed—it only knows to select an agent and handle the result.

This means:
- AI integration becomes a simple agent implementation
- Can switch from Claude to OpenAI by swapping agents
- Can run multiple specialized agents for different task types
- Human-in-the-loop is just another agent type
- Testing doesn't require AI calls

### Human-in-the-Loop (HITL) Approvals

Forge implements explicit approval checkpoints before AI agents can perform potentially risky actions. This is a **safety layer** designed to prevent autonomous agents from executing without human oversight.

**Why This Matters**:
Before adding real AI capabilities, Forge enforces a control mechanism that:
- Prevents executions from starting without explicit approval
- Provides clear audit trail of who approved what
- Allows rejecting potentially dangerous operations
- Ensures humans remain in control of autonomous systems

**Approval Types**:
Currently supported:
- **execution_start**: Required before any execution begins (currently enabled)
- **task_completion**: Optional approval before marking tasks complete (config flag, not yet implemented)

**Approval Flow**:
```
User requests execution
        ↓
Execution created (status: pending_approval)
        ↓
Approval request created (status: pending)
        ↓
approval_requested event emitted
        ↓
    [Human Decision]
        ↓
   /         \
Approve     Reject
   ↓           ↓
execution    execution
runs         fails
```

**Safety Guarantees**:
- ✅ **No execution without approval**: Executions cannot transition to "running" while pending approval
- ✅ **Idempotent operations**: Approve/reject can be called multiple times safely
- ✅ **Immutable decisions**: Once approved, cannot be rejected (and vice versa)
- ✅ **Audit trail**: All approval actions are logged as execution events
- ✅ **Server-side enforcement**: Frontend UI cannot bypass approval requirements

**API Design**:
Approvals are intentionally simple and explicit:
- `GET /projects/:id/approvals` - List all approvals for a project
- `POST /approvals/:id/approve` - Approve and trigger action
- `POST /approvals/:id/reject` - Reject and prevent action

**Execution Lifecycle with Approvals**:
```
POST /executions → pending_approval
        ↓
POST /approvals/:id/approve → idle → running → completed
        ↓
(OR) POST /approvals/:id/reject → failed
```

**Web UI Integration**:
The Web UI displays pending approvals prominently with:
- Yellow highlight for visibility
- Warning icon to indicate action required
- Clear "Approve" and "Reject" buttons
- Execution details (ID, status)
- Timestamp of approval request

**Future Expansion**:
The approval system is designed to be extensible:
- Task-level approvals (before marking tasks complete)
- Custom approval types (deployment, API access, file operations)
- Multi-stage approvals (multiple approvers required)
- Time-based auto-reject (approvals expire)
- Approval policies (who can approve what)

**Critical Design Decision**:
HITL approvals are implemented **before** AI integration, not after. This ensures that:
1. Safety controls are baked into the architecture from day one
2. AI agents inherit approval requirements by default
3. No risk of shipping autonomous AI without human oversight
4. Approval workflow is tested and proven before adding AI

### Workspace & Artifact Layer

Forge provides isolated workspace directories and artifact tracking to ensure agents can safely create, read, and manage files without security risks.

**Why This Matters**:
- Agents need to create files (code, configs, documentation)
- Without isolation, agents could access or modify system files
- Artifact tracking provides audit trail and allows retrieving generated files
- Path validation prevents directory traversal attacks

**Workspace Isolation**:
Each project gets its own isolated directory:
```
/tmp/forge-workspaces/
  └── {projectId}/
      ├── src/
      ├── config/
      └── output/
```

**Security Guarantees**:
- ✅ **Path Validation**: All file paths are validated before operations
- ✅ **Traversal Prevention**: Paths like `../../../etc/passwd` are rejected
- ✅ **Absolute Path Rejection**: Absolute paths are not allowed
- ✅ **Workspace Confinement**: All paths must resolve within the project workspace
- ✅ **Empty Path Rejection**: Empty or whitespace-only paths are rejected

**WorkspaceService API**:
```typescript
class WorkspaceService {
  // Initialize workspace directory
  async initialize(): Promise<void>

  // Create a directory (relative path)
  async createDirectory(relativePath: string, executionId?, taskId?): Promise<Artifact>

  // Write a file (relative path)
  async writeFile(relativePath: string, content: string | Buffer, executionId?, taskId?): Promise<Artifact>

  // Read a file (relative path)
  async readFile(relativePath: string): Promise<string>

  // List artifacts for this project
  async listArtifacts(executionId?, taskId?): Promise<Artifact[]>

  // Get workspace root path
  getWorkspaceRoot(): string

  // Clean up workspace (WARNING: destructive)
  async cleanup(): Promise<void>
}
```

**Agent Integration**:
Agents access workspace through methods on `AgentContext`:
```typescript
interface AgentContext {
  // ... project, execution, task, previousEvents
  workspacePath: string;
  createDirectory(relativePath: string): Promise<Artifact>;
  writeFile(relativePath: string, content: string | Buffer): Promise<Artifact>;
  readFile(relativePath: string): Promise<string>;
  listArtifacts(): Promise<Artifact[]>;
}
```

**Artifact Tracking**:
Every file and directory operation is recorded in the database:
- Associated with project, execution, and task
- Tracks relative path within workspace
- Type (file or directory)
- Creation timestamp

Artifacts can be queried via:
- `GET /api/projects/:id/artifacts` - All artifacts for a project
- `GET /api/projects/:id/executions/:executionId/artifacts` - Artifacts from specific execution
- Supports filtering by `executionId` and `taskId`

**Path Validation Examples**:
```typescript
// ✅ ALLOWED - Valid relative paths
await context.writeFile('src/index.ts', code);
await context.writeFile('config/app.json', config);
await context.createDirectory('output/reports');

// ❌ BLOCKED - Directory traversal
await context.writeFile('../../../etc/passwd', 'hack');  // PathValidationError
await context.writeFile('/etc/passwd', 'hack');          // PathValidationError
await context.writeFile('ok/../../etc/passwd', 'hack');  // PathValidationError
```

**Benefits**:
- Agents can safely create files without risking system security
- All file operations are audited in the database
- Generated artifacts can be retrieved via API
- Clean separation between different projects
- Future: Can implement quotas, retention policies, or cloud storage integration

### Web UI with Approval Interface

Forge includes a web-based dashboard for monitoring projects and executions, now with the ability to approve or reject execution requests.

**Technology Stack**:
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- React Router for navigation

**Features**:
- **Project List**: Browse all projects with names and descriptions
- **Project Detail**: View tasks, execution history, and pending approvals
- **Pending Approvals**: Prominently displayed section for approvals requiring action
- **Approve/Reject Buttons**: First mutating UI feature - approve or reject execution starts
- **Execution Detail**: Monitor execution progress with event timeline
- **Auto-Refresh**: Execution details automatically refresh every 3 seconds while running
- **Artifact Browser**: View all files and directories created by agents
- **Status Indicators**: Clear visual status badges for executions (including pending_approval), tasks, and approvals
- **Loading & Error States**: Proper handling of API errors and loading states

**What It Shows**:
- All projects created in the system
- Task lists with status (pending, in_progress, completed, failed)
- Execution history with timestamps
- Pending approvals with clear visual indicators
- Real-time event streams (approval_requested, approval_approved, execution_started, etc.)
- Artifact metadata (paths, types, creation times)

**What It Can Do** (new):
- ✅ Approve execution starts (transitions execution from pending_approval to running)
- ✅ Reject execution starts (marks execution as failed)

**What It Does NOT Do**:
- ❌ Create or edit projects
- ❌ Create or modify tasks
- ❌ Start executions directly (requires approval)
- ❌ Pause or resume executions
- ❌ Display file contents (only metadata)
- ❌ Authenticate users (no auth yet)

**Design Philosophy**:
The UI was initially read-only, but approvals are the **first mutating feature** because:
- Safety controls are required before AI integration
- Approvals are low-risk operations (can only affect pending items)
- Clear separation: monitoring is free, operations require explicit action
- This establishes patterns for future authenticated mutation features

**API Integration**:
- All API calls go through a typed client layer ([apps/web/src/api.ts](apps/web/src/api.ts))
- Development uses Vite proxy to avoid CORS issues
- Production can configure API URL via `VITE_API_URL` environment variable

### Service Layer

Business logic is isolated in service classes rather than in route handlers:

- **Testability**: Services can be unit tested independently
- **Reusability**: Same logic can be used from different routes or interfaces
- **Separation of Concerns**: HTTP concerns (request/response) separate from domain logic

### Strict TypeScript

TypeScript is configured with strict mode and additional safety checks:

- `noUncheckedIndexedAccess` - Prevents array/object access bugs
- `noUnusedLocals` & `noUnusedParameters` - Keeps code clean
- `noFallthroughCasesInSwitch` - Prevents switch statement bugs

This catches more errors at compile time and improves long-term maintainability.

### Error Handling

Custom error classes (`AppError`, `NotFoundError`, etc.) provide:

- Consistent error responses across all endpoints
- Proper HTTP status codes
- Structured error information for clients
- Safe error messages (no stack traces in production)

## What's Next

Phase 6 (HITL approvals) is complete. Next up:

1. **AI Agent Integration** (Phase 7)
   - Replace simulated task processing with real AI orchestration
   - Integrate with Claude API or similar
   - Implement code generation capabilities
   - Git operations (clone, commit, push) within workspace
   - AI agents will inherit approval requirements from HITL system

2. **Task-Level Approvals** (Phase 8)
   - Implement optional task completion approvals
   - Configuration flag to enable/disable per project
   - Allows fine-grained control over agent actions

3. **Authentication & Authorization**
   - User accounts
   - API keys or JWT tokens
   - Permission model (project ownership, collaboration)
   - Approval policies (who can approve what)

4. **Database Migration to PostgreSQL**
   - Migrate from SQLite to PostgreSQL for production
   - Connection pooling
   - Transaction support for complex operations

5. **Enhanced Web UI**
   - Real-time updates (WebSocket or SSE)
   - Project creation and editing
   - Task management
   - Execution control (start, pause, resume)
   - File content viewer for artifacts

6. **Observability**
   - Metrics (execution duration, success rate, task completion times, approval response time)
   - Tracing (OpenTelemetry)
   - Enhanced health checks and readiness probes
   - Performance monitoring

7. **Production Hardening**
   - Rate limiting
   - Request validation middleware
   - CORS configuration
   - Security headers
   - Graceful shutdown and degradation
   - Error recovery and retry mechanisms

## Contributing

This is an early-stage project focused on building a solid foundation. Contributions should prioritize:

- **Correctness** over speed
- **Clarity** over cleverness
- **Extensibility** over premature optimization
- **Production readiness** over prototyping

## License

MIT
