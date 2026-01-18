# Agent 1 (Foundry Architect) - Full E2E Wiring Analysis

## STEP 0 COMPLETE ✅

## Current Architecture Understanding

### 1. Frontend Structure

#### Foundry Architect Page (`apps/web/app/projects/[id]/foundry-architect/page.tsx`)
**Status**: Client component with local state, partially wired

**Current Flow**:
- Displays 8 immutable questions
- Uses `useAgentState('foundry-architect')` to get agent state from context
- Uses `useApproval(currentState?.approvalId)` for approval actions
- Stores answers in local useState (⚠️ NOT persisted to backend!)
- Shows hash badge if `currentState?.hash` exists
- Approval triggers `approve()` from useApproval hook

**CRITICAL ISSUES**:
1. ❌ **Answers are ONLY in local state** - not saved to database
2. ❌ **No API call to create/update FoundrySession**
3. ❌ **No API call to submit answers**
4. ❌ **approvalId is never populated** (undefined in layout.tsx:38)
5. ❌ **Hash comes from agent state context, not real DB**

#### Project Layout (`apps/web/app/projects/[id]/layout.tsx`)
**Status**: Server component, fetches from real API

**Current Flow**:
- Calls `getProjectState(projectId)` from unified API
- Maps backend `agentStates` to frontend `AgentState` format
- Provides agent states via `AgentStateProvider`
- Derives project status from conductor/appRequest

**CRITICAL ISSUES**:
1. ❌ Line 38: `approvalId: agent.status === 'awaiting_approval' ? undefined : undefined` (always undefined!)
2. ✅ Correctly calls real backend API
3. ✅ Falls back gracefully if API fails

#### Agent State Context (`apps/web/lib/context/AgentStateContext.tsx`)
**Status**: Simple context provider

**What it does**:
- Provides `agentStates` array to all pages
- Provides `getAgentState(agentId)` helper
- Provides `projectId`

**Issues**: None - this is fine, just a simple context

### 2. Backend Structure

#### Database Models (Prisma)

**ConductorState** - Master orchestration state
```prisma
model ConductorState {
  id            String     @id
  appRequestId  String     @unique
  currentStatus String     // e.g., "idea", "base_prompt_ready"
  locked        Boolean    @default(false)
  awaitingHuman Boolean    @default(false)
  lastAgent     String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}
```

**FoundrySession** - Agent 1 artifact
```prisma
model FoundrySession {
  id                String     @id
  appRequestId      String     @unique
  status            String     // "asking" | "awaiting_approval" | "approved"
  currentStep       Int        @default(0)
  answers           String     // JSON string containing answers
  draftPrompt       String?

  // Hash-locking fields
  basePromptVersion Int        @default(1)
  basePromptHash    String?    // SHA-256 hash of approved content
  approvedAt        DateTime?
  approvedBy        String?    // "human" | "synthetic_founder"

  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt
}
```

**Approval** - Generic approval system
```prisma
model Approval {
  id           String     @id
  projectId    String
  executionId  String?
  appRequestId String?
  taskId       String?
  type         String     // Type of approval (e.g., "foundry_answers")
  status       String     @default("pending") // "pending" | "approved" | "rejected"
  reason       String?
  createdAt    DateTime   @default(now())
  resolvedAt   DateTime?
}
```

#### Server Setup (`apps/server/src/server.ts`)
**Status**: Conductor created but DISCARDED!

```typescript
// Line 77-80: Conductor is created but not used!
void new ForgeConductor(
  executionService.getPrismaClient(),
  fastify.log
);
```

**CRITICAL ISSUE**:
- ❌ Conductor instance is discarded with `void`
- ❌ NOT passed to any routes
- ❌ Cannot enforce state machine

#### Forge Conductor (`apps/server/src/conductor/forge-conductor.ts`)
**Status**: Implemented but isolated

**State Machine**:
```typescript
ALLOWED_TRANSITIONS = {
  idea: ['base_prompt_ready'],  // Foundry Architect completes
  base_prompt_ready: ['planning'], // Product Strategist starts
  // ...
}

STATUS_TO_NEXT_AGENT = {
  idea: 'FoundryArchitect',
  base_prompt_ready: 'ProductStrategist',
  // ...
}
```

**Key Methods**:
- `initialize(appRequestId)` - Create conductor state at 'idea'
- `lock(appRequestId)` - Prevent parallel execution
- `unlock(appRequestId)` - Allow next agent
- `pauseForHuman(appRequestId, reason)` - Set awaitingHuman=true
- `resumeAfterHuman(appRequestId)` - Clear awaitingHuman
- `transition(appRequestId, nextStatus, agentName)` - Validate and transition
- `getStateSnapshot(appRequestId)` - Get current state

#### Foundry Routes (`apps/server/src/routes/foundry.ts`)
**Status**: Only has GET endpoint, NO write endpoints!

**Current Endpoints**:
- `GET /app-requests/:appRequestId/foundry-session` - Returns session if exists

**CRITICAL ISSUES**:
- ❌ **NO POST endpoint to start session**
- ❌ **NO POST endpoint to submit answers**
- ❌ **NO POST endpoint to approve**
- ❌ **NO POST endpoint to reject**
- ❌ **Does NOT accept conductor parameter**
- ❌ **Cannot enforce orchestration**

#### Project Service (`apps/server/src/services/project-service.ts`)
**Status**: `getProjectState()` implemented correctly

**What it does**:
- Queries FoundrySession, SyntheticAnswer, PlanningDocs, etc.
- Derives agent status from artifact existence + hash presence
- Returns unified state for all 17 agents

**Agent Status Logic**:
```typescript
const getAgentStatus = (artifactExists, artifactHash, approvalType) => {
  if (!artifactExists) return 'pending';
  if (artifactHash) return 'approved'; // Hash-locked = approved

  // Check approvals table
  if (approvalType) {
    if (pending approval) return 'awaiting_approval';
    if (approved approval) return 'approved';
    if (rejected approval) return 'failed';
  }

  return 'pending';
};
```

**For Foundry Architect**:
```typescript
{
  agentId: 'foundry-architect',
  status: getAgentStatus(!!foundrySession, foundrySession?.basePromptHash),
  artifactHash: foundrySession?.basePromptHash,
  inputHashes: [],
  updatedAt: foundrySession?.createdAt?.toISOString(),
}
```

**CRITICAL ISSUES**:
- ❌ No approvalType parameter passed for foundry-architect
- ❌ Cannot detect 'awaiting_approval' status properly

### 3. Current Data Flow (BROKEN)

```
User fills answers → Local state only → Never saved
User clicks approve → useApproval(undefined) → Fails silently
                                ↓
                          approvalId is undefined!
```

**What SHOULD happen**:
```
1. User lands on page → GET /projects/:id/state → Get real DB state
2. User fills answers → Autosave → POST /foundry-session/answer
3. Answers complete → Backend creates Approval record
4. Frontend polls → approvalId now available
5. User approves → POST /approvals/:id/approve
6. Backend:
   - Compute SHA-256 hash of answers
   - Update FoundrySession.basePromptHash
   - Update FoundrySession.status = 'approved'
   - Conductor.transition(appRequestId, 'base_prompt_ready')
   - Unlock conductor
7. Frontend refreshes → Agent 1 shows 'approved' with hash
8. Agent 2 (Synthetic Founder) becomes clickable
```

### 4. Mock Data Sources

**apps/web/app/page.tsx**:
```typescript
// Line 12: Hardcoded demo project
id: 'demo-project-1',
```

**This is the ONLY mock data reference found!**

All other data comes from real backend API (`getProjectState`).

## GAPS IDENTIFIED

### Frontend Gaps
1. ❌ No API calls to save Foundry answers
2. ❌ No API calls to create FoundrySession
3. ❌ No autosave logic
4. ❌ approvalId never populated from backend
5. ❌ Hash badge shows from context, not real DB hash

### Backend Gaps
1. ❌ Conductor instance discarded (not wired to routes)
2. ❌ Foundry routes missing ALL write endpoints:
   - POST /foundry-session/start
   - POST /foundry-session/answer
   - POST /foundry-session/approve
   - POST /foundry-session/reject
3. ❌ No conductor state enforcement
4. ❌ No hash computation for answers
5. ❌ No approval record creation
6. ❌ ProjectService doesn't pass approvalType for foundry-architect

### Integration Gaps
1. ❌ No real-time updates when state changes
2. ❌ No error handling for conductor violations
3. ❌ No "Agent 2 gated until Agent 1 approved" enforcement

## SUCCESS CRITERIA FOR STEP 1

### Phase 1: Backend Foundation
1. ✅ Wire conductor to foundry routes
2. ✅ Add POST /foundry-session/start endpoint
3. ✅ Add POST /foundry-session/answer endpoint
4. ✅ Add POST /foundry-session/approve endpoint
5. ✅ Conductor validates state before allowing operations
6. ✅ Approval record created when session ready
7. ✅ Hash computed and locked on approval
8. ✅ Conductor transitions 'idea' → 'base_prompt_ready'

### Phase 2: Frontend Integration
9. ✅ Call backend API to start session on page load
10. ✅ Autosave answers to backend
11. ✅ Poll for approval ID
12. ✅ Show real hash from backend
13. ✅ Display conductor state violations

### Phase 3: Agent 2 Gating
14. ✅ Agent 2 only clickable when Agent 1 approved
15. ✅ Display reason if gated ("Waiting for Agent 1")

## NEXT STEP

Ready to proceed to **STEP 1: Backend Foundation - Wire Conductor to Foundry Routes**

Do you want me to continue with STEP 1?
