# Frontend-Backend Wiring Status

**Last Updated**: 2026-01-17
**Status**: Phase 4 Complete (Approval Wiring) - Data Fetching Partially Complete

This document tracks what frontend-backend integrations are complete vs. what still needs backend API development.

---

## ✅ FULLY WIRED (Phase 1-4 Complete)

### Core Infrastructure
- ✅ **Project CRUD** - Create, read, list projects (`/api/projects`)
- ✅ **App Request CRUD** - Create, read, list app requests (`/api/projects/:id/app-requests`)
- ✅ **Approval System** - Approve/reject agent outputs (`/api/approvals/:id/approve|reject`)
- ✅ **Health Check** - Backend health monitoring (`/api/health`)
- ✅ **Preview Runtime** - Start/stop/status preview sessions (`/api/preview/*`)
- ✅ **Export** - Download project workspace as ZIP (`/api/projects/:id/export.zip`)

### UI Components
- ✅ **Agent Timeline** - Shows all 17 agents with status indicators
- ✅ **Project Home** - Command center with progress, CTAs, quick actions
- ✅ **Approval Flow** - All 16 agent pages wire to approval API
- ✅ **Error Handling** - Network errors, validation failures displayed inline
- ✅ **Loading States** - Button disable, spinners during API calls

---

## ⚠️ PARTIALLY WIRED (Mock Data Used)

### Agent Pages - Displaying Static Mock Data

All agent pages show **hardcoded mock artifacts** because backend endpoints for fetching agent-specific data don't exist yet.

**What Works**:
- ✅ Approve/reject buttons call real API
- ✅ Pages load and render correctly
- ✅ Proper TypeScript types

**What's Missing**:
- ❌ Fetching real agent artifacts from database
- ❌ Loading state of agent execution
- ❌ Polling for agent progress

---

## ❌ MISSING BACKEND ENDPOINTS

These endpoints need to be created on the backend before frontend can fetch real data:

### Agent 1: Foundry Architect
```
GET /api/projects/:id/foundry-sessions/latest
GET /api/projects/:id/foundry-sessions/:sessionId
```
**Database Model**: `FoundrySession` ✅ exists
**Frontend Needs**: Fetch 8 foundational answers

---

### Agent 2: Synthetic Founder
```
GET /api/projects/:id/app-requests/:appRequestId/synthetic-answers
```
**Database Model**: `SyntheticAnswer` ✅ exists
**Frontend Needs**: Fetch AI-proposed answers and base prompt

---

### Agent 3: Product Strategist
```
GET /api/projects/:id/app-requests/:appRequestId/plans
GET /api/projects/:id/app-requests/:appRequestId/plans/:planId
```
**Database Model**: Likely in `AppRequest` or separate `ProductPlan` model
**Frontend Needs**: Fetch master plan and implementation plan

---

### Agent 4: Screen Cartographer
```
GET /api/projects/:id/app-requests/:appRequestId/screens
GET /api/projects/:id/app-requests/:appRequestId/screens/:screenId
```
**Database Models**: `ScreenIndex`, `ScreenDefinition` ✅ exist
**Frontend Needs**: Fetch list of screens with descriptions

---

### Agent 5: Journey Orchestrator
```
GET /api/projects/:id/app-requests/:appRequestId/journeys
GET /api/projects/:id/app-requests/:appRequestId/journeys/:journeyId
```
**Database Model**: Likely in related tables
**Frontend Needs**: Fetch user journeys and behavioral flows

---

### Agents 6-9: Visual Intelligence (VRA, DVNL, VCA, VCRA)
```
GET /api/projects/:id/app-requests/:appRequestId/visual-contracts
GET /api/projects/:id/app-requests/:appRequestId/mockups
GET /api/projects/:id/app-requests/:appRequestId/mockups/:screenId
```
**Database Models**: `ScreenMockup` ✅ exists
**Frontend Needs**: Fetch visual contracts, mockups, rendered screens

---

### Agent 10: Build Prompt Engineer
```
GET /api/projects/:id/app-requests/:appRequestId/build-prompts
GET /api/projects/:id/app-requests/:appRequestId/build-prompts/:promptId
```
**Database Model**: `BuildPrompt` ✅ exists
**Frontend Needs**: Fetch build prompt contracts with scope/constraints

---

### Agent 11: Execution Planner
```
GET /api/projects/:id/app-requests/:appRequestId/execution-plans
GET /api/projects/:id/app-requests/:appRequestId/execution-plans/:planId
```
**Database Models**: `ExecutionPlan`, `ExecutionUnit` ✅ exist
**Frontend Needs**: Fetch execution plans with task breakdowns

---

### Agent 12: Forge Implementer
```
GET /api/projects/:id/app-requests/:appRequestId/executions
GET /api/projects/:id/executions/:executionId/logs
GET /api/projects/:id/executions/:executionId/artifacts
```
**Database Models**: `Execution`, `Artifact` ✅ exist
**API Status**: `GET /api/projects/:id/artifacts` ✅ exists (partial)
**Frontend Needs**: Fetch execution logs, file diffs, task results

---

### Agents 13-14: Verification
```
GET /api/projects/:id/app-requests/:appRequestId/verification (✅ exists!)
GET /api/projects/:id/app-requests/:appRequestId/verification-reports
```
**Database Models**: `Verification`, `VerificationResult`, `VerificationReport` ✅ exist
**API Status**: Verification GET ✅ exists, reports missing
**Frontend Needs**: Fetch test results, lint reports, build status

---

### Agents 15-16: Repair
```
GET /api/projects/:id/app-requests/:appRequestId/repair-plans
GET /api/projects/:id/app-requests/:appRequestId/repair-executions
```
**Database Models**: `RepairPlan`, `RepairExecutionLog` ✅ exist
**Frontend Needs**: Fetch repair options, execution logs

---

### Agent 17: Completion Auditor
```
GET /api/projects/:id/app-requests/:appRequestId/completion-report
```
**Database Models**: `CompletionDecision`, `CompletionReport` ✅ exist
**Frontend Needs**: Fetch final audit verdict, hash chain, failed checks

---

## 🔧 RECOMMENDED NEXT STEPS

### Phase 5: Agent Data API Endpoints (Backend Work Required)

Create REST endpoints for each agent to expose their artifacts:

**Priority 1 (Core Flow)**:
1. Foundry Architect - GET sessions/answers
2. Synthetic Founder - GET base prompt
3. Build Prompt Engineer - GET build prompts
4. Execution Planner - GET execution plans
5. Completion Auditor - GET completion report

**Priority 2 (Visual Flow)**:
6. Screen Cartographer - GET screens
7. VCRA - GET mockups
8. Verification - GET reports (partial exists)

**Priority 3 (Supporting)**:
9. Product Strategist - GET plans
10. Journey Orchestrator - GET journeys
11. Repair agents - GET repair plans/logs

### Phase 6: Real-Time Agent Execution Status

Add WebSocket or polling endpoints to show:
- Agent currently running
- Progress percentage
- Estimated time remaining
- Live logs/output

### Phase 7: Agent Triggering

Add POST endpoints to manually trigger agents:
```
POST /api/projects/:id/agents/foundry-architect/start
POST /api/projects/:id/agents/synthetic-founder/start
... (for each agent)
```

---

## 📊 CURRENT ARCHITECTURE

```
┌─────────────────────────────────────┐
│ FRONTEND (Next.js)                  │
│                                     │
│ ✅ Agent Timeline                   │
│ ✅ Approval Buttons                 │
│ ⚠️  Mock Artifact Display           │
│ ❌ Real Data Fetching (no endpoints)│
└────────────┬────────────────────────┘
             │
             │ HTTP/REST
             │
┌────────────▼────────────────────────┐
│ BACKEND API (Fastify)               │
│                                     │
│ ✅ /api/approvals/* (approve/reject)│
│ ✅ /api/projects/* (CRUD)           │
│ ✅ /api/app-requests/* (basic CRUD) │
│ ❌ /api/.../agent-artifacts (missing)│
└────────────┬────────────────────────┘
             │
             │ Prisma ORM
             │
┌────────────▼────────────────────────┐
│ DATABASE (SQLite/PostgreSQL)        │
│                                     │
│ ✅ FoundrySession                   │
│ ✅ SyntheticAnswer                  │
│ ✅ ScreenDefinition                 │
│ ✅ BuildPrompt                      │
│ ✅ ExecutionPlan                    │
│ ✅ VerificationResult               │
│ ✅ CompletionReport                 │
│ (All models exist, just no GET APIs)│
└─────────────────────────────────────┘
```

---

## 🎯 SUMMARY

**Phase 1-4 Status**: ✅ COMPLETE
- Timeline navigation working
- Approval flow functional end-to-end
- Error handling robust
- TypeScript strict mode passing

**Current Limitation**:
Frontend cannot fetch agent artifacts because **backend GET endpoints don't exist yet**.

**Solution Required**:
Backend team needs to create REST endpoints for each agent's data models.

**Temporary Workaround**:
Frontend uses mock data with clear `// TODO: Replace with real API call` markers.

---

**Next Phase**: Create agent artifact GET endpoints on backend, then wire frontend to fetch real data.
