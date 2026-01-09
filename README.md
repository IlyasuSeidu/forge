# Forge

**Production-grade system for turning natural-language ideas into fully built applications**

🔗 **Repository**: [https://github.com/IlyasuSeidu/forge](https://github.com/IlyasuSeidu/forge)

Forge is a backend-first platform designed to orchestrate autonomous AI agents that transform user ideas into working software. It is built to be production-ready from day one, with a focus on clarity, correctness, and extensibility.

## Status

**Early Development - Backend Foundation**

Currently implemented:
- ✅ Core backend API server
- ✅ Domain models (Project, Task, Execution)
- ✅ In-memory state management
- ✅ RESTful API endpoints
- ✅ Structured logging
- ✅ Centralized error handling

Not yet implemented:
- ❌ Database persistence
- ❌ AI agent integration
- ❌ Authentication & authorization
- ❌ Web UI
- ❌ Real execution orchestration

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Framework**: Fastify
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

**⚠️ Current Behavior (Stub Mode)**:
- Immediately marks execution as "running"
- After 2 seconds, automatically marks as "completed"
- No actual AI orchestration occurs yet

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
- pnpm 8 or higher

### Installation

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck
```

### Development

```bash
# Start development server with hot reload
pnpm dev

# Server will be available at http://localhost:3000
```

### Production Build

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
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
```

## Design Decisions

### In-Memory State

Currently, all state is stored in-memory within the service classes. This is intentional:

- **Simplicity**: No database setup required for initial development
- **Clarity**: Easy to understand and modify business logic
- **Temporary**: Will be replaced with proper database persistence (PostgreSQL or similar)

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

1. **Database Integration**
   - PostgreSQL with proper migrations
   - Connection pooling
   - Transaction support

2. **Authentication & Authorization**
   - User accounts
   - API keys or JWT tokens
   - Permission model

3. **Real Execution Engine**
   - Task queue for background processing
   - AI agent integration
   - Workspace management (git operations, file I/O)
   - Progress tracking and streaming

4. **Web UI**
   - React or similar modern framework
   - Real-time updates (WebSocket or SSE)
   - Project dashboard
   - Execution monitoring

5. **Observability**
   - Metrics (execution duration, success rate, etc.)
   - Tracing (OpenTelemetry)
   - Health checks and readiness probes

6. **Production Hardening**
   - Rate limiting
   - Request validation middleware
   - CORS configuration
   - Security headers
   - Graceful degradation

## Contributing

This is an early-stage project focused on building a solid foundation. Contributions should prioritize:

- **Correctness** over speed
- **Clarity** over cleverness
- **Extensibility** over premature optimization
- **Production readiness** over prototyping

## License

MIT
