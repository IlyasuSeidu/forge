# Forge - Getting Started Guide

This guide will walk you through running the Forge backend server and testing its API.

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or use `PORT=3001 npm run dev` for a different port).

You should see output like:
```
INFO: Forge server listening on http://0.0.0.0:3000
```

### 3. Test the Health Endpoint

In another terminal:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 1.234
}
```

## Example: Creating a Project

### Create a Project

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Todo App",
    "description": "A simple todo application with user authentication"
  }'
```

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

### Add Tasks to the Project

Replace `PROJECT_ID` with the ID from above:

```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Set up database schema",
    "description": "Create PostgreSQL tables for users and todos"
  }'
```

Response:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Set up database schema",
  "description": "Create PostgreSQL tables for users and todos",
  "status": "pending",
  "createdAt": "2024-01-15T10:31:00.000Z",
  "updatedAt": "2024-01-15T10:31:00.000Z"
}
```

### Start an Execution

```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/executions
```

Response:
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "startedAt": "2024-01-15T10:32:00.000Z",
  "finishedAt": null
}
```

**Note**: Currently, executions are stubbed. They automatically complete after 2 seconds.

### Check Execution Status

Wait a few seconds, then:

```bash
curl http://localhost:3000/api/projects/PROJECT_ID/executions/EXECUTION_ID
```

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

## Complete Example Script

Here's a complete bash script that demonstrates the full flow:

```bash
#!/bin/bash

API_BASE="http://localhost:3000/api"

# Create a project
echo "Creating project..."
PROJECT=$(curl -s -X POST $API_BASE/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "E-commerce Platform",
    "description": "A full-featured online store with cart and checkout"
  }')

PROJECT_ID=$(echo $PROJECT | jq -r .id)
echo "Created project: $PROJECT_ID"

# Add tasks
echo -e "\nAdding tasks..."
curl -s -X POST $API_BASE/projects/$PROJECT_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Database schema",
    "description": "Set up products, users, orders tables"
  }' | jq .

curl -s -X POST $API_BASE/projects/$PROJECT_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Product catalog page",
    "description": "Display products with search and filters"
  }' | jq .

# List all tasks
echo -e "\nAll tasks:"
curl -s $API_BASE/projects/$PROJECT_ID/tasks | jq .

# Start execution
echo -e "\nStarting execution..."
EXECUTION=$(curl -s -X POST $API_BASE/projects/$PROJECT_ID/executions)
EXECUTION_ID=$(echo $EXECUTION | jq -r .id)
echo $EXECUTION | jq .

# Wait and check status
echo -e "\nWaiting 3 seconds..."
sleep 3

echo -e "\nExecution status:"
curl -s $API_BASE/projects/$PROJECT_ID/executions/$EXECUTION_ID | jq .
```

Save this as `test-forge.sh`, make it executable, and run it:

```bash
chmod +x test-forge.sh
./test-forge.sh
```

## What's Working

- ✅ Project creation and retrieval
- ✅ Task creation and retrieval
- ✅ Execution creation and status tracking
- ✅ Structured logging with request IDs
- ✅ Error handling with proper HTTP status codes
- ✅ Input validation

## What's Not Yet Implemented

- ❌ Database persistence (all data is in-memory)
- ❌ Real AI orchestration (executions are stubbed)
- ❌ Task execution and status updates
- ❌ Authentication
- ❌ Web UI

## Next Steps

See [FORGE_README.md](FORGE_README.md) for:
- Full API documentation
- Architecture details
- Development roadmap
- Contributing guidelines
