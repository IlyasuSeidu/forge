# Forge

**Production-grade system for turning natural-language ideas into fully built applications**

🔗 **Repository**: [https://github.com/IlyasuSeidu/forge](https://github.com/IlyasuSeidu/forge)

Forge is a backend-first platform designed to orchestrate autonomous AI agents that transform user ideas into working software. It is built to be production-ready from day one, with a focus on clarity, correctness, and extensibility.

## Status

**Early Development - Database & Execution Engine**

Currently implemented:
- ✅ Core backend API server (Fastify + TypeScript)
- ✅ Domain models (Project, Task, Execution, ExecutionEvent)
- ✅ **Database persistence (SQLite + Prisma)**
- ✅ RESTful API endpoints
- ✅ **Execution state machine (idle → running → completed/failed)**
- ✅ **Sequential task processing with event logging**
- ✅ **Concurrent execution prevention**
- ✅ Structured logging (Pino)
- ✅ Centralized error handling

Not yet implemented:
- ❌ AI agent integration (currently simulated with delays)
- ❌ Authentication & authorization
- ❌ Web UI
- ❌ Real code generation

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Package Manager**: npm (with workspaces)
- **Framework**: Fastify
- **Database**: SQLite (development) + Prisma ORM
- **Logging**: Pino

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
  status: ExecutionStatus; // idle | running | completed | failed
  startedAt: Date | null;
  finishedAt: Date | null;
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

**Current Behavior**:
- Creates a new execution with "idle" status
- Starts background processing immediately
- Processes all project tasks sequentially
- Transitions through states: idle → running → completed/failed
- Logs events at each stage (execution_started, task_started, task_completed, execution_completed)
- Prevents concurrent executions for the same project (returns 422 if already running)

**⚠️ Note**: AI orchestration is simulated with delays. Real AI agent integration is not yet implemented.

Response (201):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "startedAt": "2024-01-15T10:32:00.000Z",
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

```bash
# Start development server with hot reload
npm run dev

# Server will be available at http://localhost:3000
```

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
```

## Design Decisions

### Database Persistence

All state is persisted to SQLite using Prisma ORM:

- **Production-Ready**: State survives server restarts
- **Type Safety**: Prisma provides fully typed database access
- **Migrations**: Schema changes are tracked and versioned
- **Development First**: SQLite requires no setup, will migrate to PostgreSQL for production
- **Performance**: Indexed queries on frequently accessed fields (projectId, status, createdAt)

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

Planned implementations (in rough order):

1. **AI Agent Integration**
   - Replace simulated task processing with real AI orchestration
   - Integrate with Claude API or similar
   - Implement code generation capabilities
   - Workspace management (git operations, file I/O)

2. **Database Migration to PostgreSQL**
   - Migrate from SQLite to PostgreSQL for production
   - Connection pooling
   - Transaction support for complex operations

3. **Authentication & Authorization**
   - User accounts
   - API keys or JWT tokens
   - Permission model (project ownership, collaboration)

4. **Web UI**
   - React or similar modern framework
   - Real-time updates (WebSocket or SSE)
   - Project dashboard
   - Execution monitoring with live event streaming

5. **Observability**
   - Metrics (execution duration, success rate, task completion times)
   - Tracing (OpenTelemetry)
   - Enhanced health checks and readiness probes
   - Performance monitoring

6. **Production Hardening**
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
