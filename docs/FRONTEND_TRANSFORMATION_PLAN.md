# Forge Frontend Transformation Plan

**Date**: 2026-01-14
**Current State**: Basic project/task/execution dashboard
**Target State**: Agent-centric journey UI with 17 visible agents

---

## Current Frontend Analysis

### Technology Stack ✅
- **Framework**: Vite + React 18
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **State**: React hooks (no external state management)

### Existing Pages
1. `/` - Project List
2. `/projects/:projectId` - Project Detail (tasks, executions, approvals)
3. `/projects/:projectId/build-app` - Build App form
4. `/projects/:projectId/executions/:executionId` - Execution Detail

### Existing Components
- `Header.tsx` - Global header
- `StatusBadge.tsx` - Status indicators
- `Loading.tsx` - Loading states
- `ErrorMessage.tsx` - Error displays
- `VerificationPanel.tsx` - Verification results

### What's Good ✅
- Clean Tailwind styling
- TypeScript strict mode
- API client abstraction
- Proper error handling
- Loading states

### What's Missing ❌
- **No agent visibility** - Users don't see the 17-agent pipeline
- **No agent-specific UI** - All agents hidden behind "Build an App"
- **No progress timeline** - Can't track where you are in the journey
- **No hash-chain visibility** - Immutability not shown
- **No artifact explorer** - Can't access plans, code, logs
- **Too technical** - Talks about "executions" not "agents"

---

## Transformation Strategy

### Phase 1: Foundation (This PR)
**Goal**: Add Agent Timeline + Foundry Architect UI

**Changes**:
1. Create `AgentTimeline` component (sidebar)
2. Add agent routes to `App.tsx`
3. Create `AgentLayout` wrapper (timeline + content)
4. Build Foundry Architect page
5. Create reusable agent components

**Files to Create**:
- `src/components/agents/AgentTimeline.tsx`
- `src/components/agents/AgentCard.tsx`
- `src/components/agents/ApprovalButton.tsx`
- `src/components/agents/HashBadge.tsx`
- `src/components/agents/StatusIndicator.tsx`
- `src/components/agents/LockIcon.tsx`
- `src/layouts/AgentLayout.tsx`
- `src/pages/agents/FoundryArchitect.tsx`
- `src/pages/agents/types.ts`

**Files to Modify**:
- `src/App.tsx` - Add agent routes
- `src/types.ts` - Add agent types
- `src/api.ts` - Add agent API calls

**Result**: Users can navigate to `/projects/:projectId/agents/foundry-architect` and see the first agent

---

### Phase 2-18: One Agent Per PR
**Goal**: Build all 17 agents incrementally

**Agent Order** (matches backend tiers):
1. ✅ Foundry Architect (Phase 1)
2. Synthetic Founder
3. Product Strategist
4. Screen Cartographer
5. Journey Orchestrator
6. Visual Rendering Authority (VRA)
7. Deterministic Visual Normalizer (DVNL)
8. Visual Composition Authority (VCA)
9. Visual Code Rendering Authority (VCRA)
10. Build Prompt Engineer
11. Execution Planner
12. Forge Implementer
13. Verification Executor
14. Verification Report Generator
15. Repair Plan Generator
16. Repair Agent
17. Completion Auditor

**Each Agent PR Includes**:
- New page: `src/pages/agents/[AgentName].tsx`
- Agent-specific components (if needed)
- API integration
- Update `AgentTimeline` to show agent
- Update routing in `App.tsx`
- Screenshots in PR description

---

### Phase 19: Post-Assembly Infrastructure
**Goal**: Add Preview Runtime + Artifacts Explorer

**New Pages**:
- `/projects/:projectId/artifacts` - Artifacts Explorer
- `/projects/:projectId/preview` - Preview Runtime UI

---

## Design System

### Agent States (Color-Coded)
```typescript
type AgentStatus =
  | 'pending'           // Gray - Not started
  | 'in_progress'       // Blue - Agent working
  | 'awaiting_approval' // Amber - User action required
  | 'approved'          // Green - Hash-locked
  | 'failed';           // Red - User must intervene
```

### Agent Icons (Emoji for Now, SVG Later)
```typescript
const AGENT_ICONS = {
  'foundry-architect': '🏗️',
  'synthetic-founder': '🤖',
  'product-strategist': '📋',
  'screen-cartographer': '🗺️',
  'journey-orchestrator': '🎭',
  'vra': '👁️',
  'dvnl': '🎨',
  'vca': '📐',
  'vcra': '💻',
  'build-prompt': '📝',
  'execution-plan': '📊',
  'implementation': '⚙️',
  'verification-executor': '🔍',
  'verification-report': '📄',
  'repair-plan': '🔧',
  'repair': '🛠️',
  'completion': '✅',
};
```

### Typography
- Agent names: `text-sm font-medium`
- Section titles: `text-lg font-semibold`
- Body text: `text-sm text-gray-700`
- Hashes: `font-mono text-xs text-green-800`

### Layout
```
┌────────────────────────────────────────────────────┐
│ Global Header (Forge logo + Project Switcher)     │
├────────────────────────────────────────────────────┤
│ Project Header (name, status, safety indicators)  │
├─────────────┬──────────────────────────────────────┤
│             │                                      │
│   Agent     │   Agent Detail Panel                 │
│   Timeline  │   (Current agent's UI)               │
│   (Sidebar) │                                      │
│             │                                      │
│   17 Cards  │   Content varies per agent           │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

---

## Agent Timeline Behavior

### Navigation Rules
1. **Active Agent Highlighted**: Current route determines active agent
2. **Click to Navigate**: Each agent card is clickable
3. **Status Indicators**: Show state at a glance
4. **Hash Badges**: Display when approved
5. **Locked States**: Visually distinct

### State Transitions
```
PENDING → IN_PROGRESS → AWAITING_APPROVAL → APPROVED
                ↓              ↓
             FAILED         FAILED
```

### Visual Feedback
- Pending: Grayed out, clickable
- In Progress: Blue pulse animation
- Awaiting Approval: Amber glow + badge count
- Approved: Green + lock icon + hash badge
- Failed: Red border + error icon

---

## API Contract (Backend Changes Needed)

### New Endpoints Required
```typescript
// Get all agent states for a project
GET /api/projects/:projectId/agents
Response: {
  agents: Array<{
    name: string;
    status: AgentStatus;
    hash?: string;
    approvedAt?: string;
    error?: string;
  }>;
}

// Get specific agent data
GET /api/projects/:projectId/agents/:agentName
Response: {
  name: string;
  status: AgentStatus;
  inputs: any;   // Agent-specific
  outputs: any;  // Agent-specific
  hash?: string;
}

// Approve agent
POST /api/projects/:projectId/agents/:agentName/approve
Body: { data: any } // Agent-specific approval data
Response: { success: boolean; hash: string; }

// Reject agent
POST /api/projects/:projectId/agents/:agentName/reject
Body: { reason: string; }
Response: { success: boolean; }
```

### Backward Compatibility
- Keep existing `/api/projects/:projectId` endpoints
- Keep existing `/api/executions/:executionId` endpoints
- New agent routes are additive, not breaking

---

## Phase 1 Implementation Checklist

### Step 1: Agent Timeline Component
- [ ] Create `AgentTimeline.tsx`
- [ ] Fetch agent states from API
- [ ] Render 17 agent cards
- [ ] Highlight active agent
- [ ] Handle navigation

### Step 2: Reusable Components
- [ ] `AgentCard.tsx` - Individual agent card
- [ ] `ApprovalButton.tsx` - Approve/Reject buttons
- [ ] `HashBadge.tsx` - Hash display
- [ ] `StatusIndicator.tsx` - Status badges
- [ ] `LockIcon.tsx` - Lock indicator

### Step 3: Agent Layout
- [ ] Create `AgentLayout.tsx`
- [ ] Wrap agent pages with timeline
- [ ] Add project header
- [ ] Add breadcrumbs

### Step 4: Foundry Architect Page
- [ ] Create `FoundryArchitect.tsx`
- [ ] Display 8 questions
- [ ] Editable answer fields
- [ ] Lock button (disabled until all answers filled)
- [ ] Approval flow
- [ ] Error handling

### Step 5: Routing
- [ ] Add agent routes to `App.tsx`
- [ ] Redirect `/projects/:projectId` to first incomplete agent
- [ ] Add 404 for unknown agents

### Step 6: API Integration
- [ ] Add `getAgents()` to `api.ts`
- [ ] Add `getAgentData()` to `api.ts`
- [ ] Add `approveAgent()` to `api.ts`
- [ ] Add `rejectAgent()` to `api.ts`

### Step 7: Testing
- [ ] Test navigation between agents
- [ ] Test approval flow
- [ ] Test error states
- [ ] Test mobile responsiveness
- [ ] Test with mock data (if backend not ready)

---

## Success Criteria (Phase 1)

After Phase 1, the following must be true:

✅ **Navigation**:
- Can navigate to `/projects/:projectId/agents/foundry-architect`
- Agent Timeline sidebar is visible
- Active agent is highlighted

✅ **Foundry Architect UI**:
- 8 questions are displayed
- Answer fields are editable
- "Lock Answers" button disabled until all filled
- Approval flow works (or shows mock state)

✅ **Visual Quality**:
- Matches Forge design system
- No layout shifts
- Mobile responsive (basic)
- No broken styles

✅ **Code Quality**:
- TypeScript errors: 0
- ESLint warnings: 0
- No console errors in browser
- API calls properly typed

---

## Future Enhancements (Not Phase 1)

- Real-time progress updates (WebSockets)
- Collapsible agent groups by tier
- Search/filter agents
- Agent-to-agent navigation shortcuts
- Keyboard shortcuts (j/k for up/down)
- Dark mode
- Agent status history timeline
- Export all artifacts as ZIP

---

## Migration Strategy

### Breaking Changes: None
- All existing routes still work
- Existing components untouched
- Only additive changes

### Gradual Rollout
1. Phase 1: Add agent routes alongside existing routes
2. Phase 2-18: Add agents one by one
3. Phase 19: Deprecate old "Build an App" page
4. Phase 20: Remove legacy execution detail page

### Feature Flags (Optional)
```typescript
// src/config.ts
export const FEATURES = {
  AGENT_TIMELINE: true,
  LEGACY_BUILD_APP: false, // Hide old UI
};
```

---

## Documentation Updates Needed

After Phase 1:
- [ ] Update README with new routes
- [ ] Add screenshots to docs
- [ ] Document agent API contract
- [ ] Create user guide for non-developers

---

**Next Action**: Implement Phase 1 (Agent Timeline + Foundry Architect UI)
