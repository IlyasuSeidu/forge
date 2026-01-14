# Forge Frontend Architecture

**Version**: 1.0.0
**Date**: 2026-01-14
**Philosophy**: This is a home, not a dashboard.

---

## 🏠 Design Philosophy

### Core Principles

1. **Forge never decides — it shows**
   - UI never says "Forge chose…"
   - Always shows "Here is what will happen"

2. **Progress is visual, not verbal**
   - Timelines, states, locks, approvals
   - Not paragraphs

3. **Every irreversible step requires the user**
   - Code changes, money, finalizations → explicit approval

4. **No agent is hidden**
   - Visible purpose, inputs, outputs, limits

5. **Incremental build only**
   - One agent at a time
   - Never refactor wholesale
   - Nothing breaks

---

## 🏗️ Technology Stack

**Framework**: Next.js 14 (App Router)
- Server Components for data (default)
- Client Components only for interaction
- No AI logic in frontend

**Styling**: Tailwind CSS
- Consistent design system
- No custom CSS unless necessary

**UI Primitives**: Radix UI
- Accessible components
- Unstyled primitives

**Type Safety**: TypeScript Strict Mode
- API contracts with Zod validation
- No `any` types

**State Management**: None (for now)
- Server Components handle data
- URL state for navigation
- React Server Actions for mutations

---

## 📁 Directory Structure

```
apps/web/                           # Next.js frontend
├── app/
│   ├── layout.tsx                 # Global layout (header, fonts)
│   ├── page.tsx                   # Landing page
│   ├── projects/
│   │   ├── page.tsx               # Project list
│   │   └── [id]/
│   │       ├── layout.tsx         # Project header + Agent Timeline
│   │       ├── page.tsx           # Redirect to first incomplete agent
│   │       ├── foundry-architect/
│   │       │   └── page.tsx       # Agent 1 UI
│   │       ├── synthetic-founder/
│   │       │   └── page.tsx       # Agent 2 UI
│   │       ├── product-strategist/
│   │       │   └── page.tsx       # Agent 3 UI
│   │       ├── screen-cartographer/
│   │       │   └── page.tsx       # Agent 4 UI
│   │       ├── journey-orchestrator/
│   │       │   └── page.tsx       # Agent 5 UI
│   │       ├── visual-intelligence/
│   │       │   ├── vra/
│   │       │   │   └── page.tsx   # Agent 6 UI
│   │       │   ├── dvnl/
│   │       │   │   └── page.tsx   # Agent 7 UI
│   │       │   ├── vca/
│   │       │   │   └── page.tsx   # Agent 8 UI
│   │       │   └── vcra/
│   │       │       └── page.tsx   # Agent 9 UI
│   │       ├── build-prompt/
│   │       │   └── page.tsx       # Agent 10 UI
│   │       ├── execution-plan/
│   │       │   └── page.tsx       # Agent 11 UI
│   │       ├── implementation/
│   │       │   └── page.tsx       # Agent 12 UI
│   │       ├── verification/
│   │       │   ├── executor/
│   │       │   │   └── page.tsx   # Agent 13 UI
│   │       │   ├── report/
│   │       │   │   └── page.tsx   # Agent 14 UI
│   │       │   ├── repair-plan/
│   │       │   │   └── page.tsx   # Agent 15 UI
│   │       │   └── repair/
│   │       │       └── page.tsx   # Agent 16 UI
│   │       ├── completion/
│   │       │   └── page.tsx       # Agent 17 UI
│   │       ├── artifacts/
│   │       │   └── page.tsx       # Artifacts Explorer
│   │       └── preview/
│   │           └── page.tsx       # Preview Runtime
│   └── api/
│       └── [...routes]            # Proxy to backend
├── components/
│   ├── global/
│   │   ├── Header.tsx
│   │   ├── ProjectSwitcher.tsx
│   │   └── UserMenu.tsx
│   ├── agents/
│   │   ├── AgentTimeline.tsx      # PRIMARY navigation
│   │   ├── AgentCard.tsx
│   │   ├── ApprovalButton.tsx
│   │   ├── HashBadge.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── LockIcon.tsx
│   ├── foundry-architect/
│   │   ├── QuestionList.tsx
│   │   ├── AnswerForm.tsx
│   │   └── LockAnswersButton.tsx
│   └── [agent-name]/
│       └── [...components]        # One folder per agent
├── lib/
│   ├── api.ts                     # API client (fetch wrapper)
│   ├── types.ts                   # Shared TypeScript types
│   └── utils.ts                   # Utility functions
└── public/
    └── agent-icons/               # SVG icons for each agent
```

---

## 🧭 Core UI Regions

```
┌────────────────────────────────────────────────────┐
│ Global Header (Forge logo + Project Switcher)     │
├────────────────────────────────────────────────────┤
│ Project Header (name, status, safety indicators)  │
├─────────────┬──────────────────────────────────────┤
│             │                                      │
│   Agent     │   Agent Detail Panel                 │
│   Timeline  │   (Questions, Answers, Code, etc.)   │
│   (PRIMARY) │                                      │
│             │                                      │
│   17 Agents │   Artifacts at bottom (when needed)  │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

### 1. Global Header (Always Visible)
- Forge logo (home link)
- Project Switcher dropdown
- User menu (settings, logout)

### 2. Project Header (Always Visible Within Project)
- Project name
- Overall status badge (Planning / Building / Verifying / Complete)
- Safety indicators:
  - 🔒 Hash-locked artifacts count
  - ✅ Approved gates count
  - ⏳ Time since last activity

### 3. Agent Timeline (PRIMARY Navigation)
- Vertical sidebar (left side)
- 17 agents in order (Tier 1 → Tier 5 → Post-Assembly)
- Each agent shows:
  - Icon
  - Name
  - Status (Pending / In Progress / Awaiting Approval / Approved / Failed)
  - Hash badge (when approved)
- Active agent highlighted
- Click to navigate

### 4. Agent Detail Panel (Main Content Area)
- Agent-specific UI (changes per agent)
- Inputs, outputs, controls
- Approval button (when ready)

### 5. Artifacts Explorer (Bottom Panel, Collapsible)
- Plans, code, logs, hashes
- Download button
- Hash verification

---

## 🎨 Design System

### Colors (State-Based)

```typescript
const AgentStatus = {
  PENDING: 'gray',        // Not started
  IN_PROGRESS: 'blue',    // Agent working
  AWAITING_APPROVAL: 'amber', // User action required
  APPROVED: 'green',      // Locked and hash-approved
  FAILED: 'red',          // Error (user must intervene)
};
```

### Typography

**Headings**:
- Agent names: `font-semibold text-lg`
- Section titles: `font-medium text-base`
- Body text: `text-sm text-gray-700`

**Monospace** (for hashes, code):
- `font-mono text-xs`

### Icons

Each agent has a distinct icon:
- **Foundry Architect**: 🏗️ (Blueprint)
- **Synthetic Founder**: 🤖 (Robot)
- **Product Strategist**: 📋 (Clipboard)
- **Screen Cartographer**: 🗺️ (Map)
- **Journey Orchestrator**: 🎭 (Masks)
- **VRA**: 👁️ (Eye)
- **DVNL**: 🎨 (Palette)
- **VCA**: 📐 (Ruler)
- **VCRA**: 💻 (Code)
- **Build Prompt Engineer**: 📝 (Memo)
- **Execution Planner**: 📊 (Chart)
- **Forge Implementer**: ⚙️ (Gear)
- **Verification Executor**: 🔍 (Magnifying Glass)
- **Verification Report Generator**: 📄 (Document)
- **Repair Plan Generator**: 🔧 (Wrench)
- **Repair Agent**: 🛠️ (Hammer)
- **Completion Auditor**: ✅ (Checkmark)

---

## 🔌 API Integration

### Backend API Base URL
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

### API Client Pattern
```typescript
// lib/api.ts
export async function fetchProject(id: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function approveAgent(projectId: string, agentName: string) {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/agents/${agentName}/approve`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to approve');
  return res.json();
}
```

### Type Safety (Contract Validation)
```typescript
// lib/types.ts
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['planning', 'building', 'verifying', 'complete']),
  createdAt: z.string(),
});

export type Project = z.infer<typeof ProjectSchema>;
```

---

## 🧩 Component Patterns

### Agent Card (Reusable)
```tsx
interface AgentCardProps {
  name: string;
  status: 'pending' | 'in_progress' | 'awaiting_approval' | 'approved' | 'failed';
  icon: string;
  hash?: string;
  isActive?: boolean;
  onClick: () => void;
}

export function AgentCard({ name, status, icon, hash, isActive, onClick }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg w-full transition',
        isActive ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50',
        status === 'failed' && 'border-red-300'
      )}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 text-left">
        <div className="font-medium text-sm">{name}</div>
        <StatusIndicator status={status} />
      </div>
      {hash && <HashBadge hash={hash} />}
    </button>
  );
}
```

### Approval Button (Reusable)
```tsx
interface ApprovalButtonProps {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  disabled?: boolean;
}

export function ApprovalButton({ onApprove, onReject, disabled }: ApprovalButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleApprove}
        disabled={disabled || loading}
        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Approving...' : 'Approve & Lock'}
      </button>
      <button
        onClick={onReject}
        disabled={loading}
        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Reject
      </button>
    </div>
  );
}
```

### Hash Badge (Reusable)
```tsx
interface HashBadgeProps {
  hash: string;
}

export function HashBadge({ hash }: HashBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-green-100 border border-green-300 rounded">
      <span className="text-green-700 text-xs">🔒</span>
      <span className="font-mono text-xs text-green-800">
        {hash.slice(0, 8)}...
      </span>
    </div>
  );
}
```

---

## 🚀 Incremental Extension Strategy

### Rule 1: One Agent Per Pull Request
- Never build multiple agents in one PR
- Each agent gets:
  - Route (`/projects/[id]/agent-name`)
  - Page component
  - Agent-specific components
  - API integration
  - Tests (optional but recommended)

### Rule 2: Feature Flags (Optional)
```typescript
// lib/features.ts
export const FEATURE_FLAGS = {
  FOUNDRY_ARCHITECT: true,
  SYNTHETIC_FOUNDER: false, // Not ready yet
  PRODUCT_STRATEGIST: false,
  // ... rest
};

// In layout.tsx
{FEATURE_FLAGS.FOUNDRY_ARCHITECT && (
  <AgentCard name="Foundry Architect" ... />
)}
```

### Rule 3: No Shared Mutation Logic
- Each agent's approval button calls its own API endpoint
- No shared "approveAgent()" function that branches on agent type
- Example:
  ```typescript
  // ❌ BAD
  function approveAgent(agentName: string) {
    if (agentName === 'foundry-architect') { ... }
    else if (agentName === 'synthetic-founder') { ... }
  }

  // ✅ GOOD
  function approveFoundryArchitect() { ... }
  function approveSyntheticFounder() { ... }
  ```

### Rule 4: Read-Only by Default
- All agent outputs are read-only unless explicitly marked as editable
- Example: Foundry Architect answers are editable UNTIL locked
- After approval → immutable, hash-locked

### Rule 5: Incremental Testing
- Each agent's UI can be tested independently
- No integration tests until 3+ agents are complete

---

## 🧪 Testing Strategy

### Unit Tests (Component Level)
```typescript
// components/foundry-architect/QuestionList.test.tsx
import { render, screen } from '@testing-library/react';
import { QuestionList } from './QuestionList';

test('renders 8 questions', () => {
  render(<QuestionList questions={mockQuestions} />);
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
});
```

### Integration Tests (Page Level)
```typescript
// app/projects/[id]/foundry-architect/page.test.tsx
test('approval button disabled until all answers filled', () => {
  // Test approval logic
});
```

### E2E Tests (Optional, Later)
- Playwright tests for full agent flow
- Only after 5+ agents complete

---

## 📊 Performance Considerations

### Server Components by Default
- All data fetching in Server Components
- Client Components only for interactivity (buttons, forms, modals)

### Code Splitting
- Each agent's page is automatically code-split by Next.js
- Heavy components (code editors, diff viewers) use dynamic imports:
  ```typescript
  const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
    ssr: false,
    loading: () => <p>Loading editor...</p>,
  });
  ```

### Caching
- Backend API responses cached with `cache: 'no-store'` for agent data
- Static assets (icons, fonts) cached aggressively

---

## 🔐 Security

### Authentication (Future)
- NextAuth.js for user sessions
- JWT tokens for API requests

### Authorization (Future)
- Project-level access control
- User roles (Owner, Collaborator, Viewer)

### Input Validation
- All user inputs validated with Zod schemas
- No raw user input sent to backend

---

## 📦 Deployment

### Vercel (Recommended)
- Next.js optimized
- Automatic previews per PR
- Edge functions for API routes

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://forge-api.example.com
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://forge.example.com
```

---

## 🛠️ Development Workflow

### Setup
```bash
cd apps/web
npm install
npm run dev  # Starts on http://localhost:3001
```

### Build Order
1. Global Layout + Agent Timeline
2. Foundry Architect UI
3. Synthetic Founder UI
4. Product Strategist UI
5. ... (one agent at a time)

### Pull Request Template
```markdown
## Agent: [Agent Name]

**Route**: `/projects/[id]/agent-name`

**Components**:
- [ ] Page component
- [ ] Agent-specific components
- [ ] API integration
- [ ] Types and validation

**Tested**:
- [ ] Component renders correctly
- [ ] Approval flow works
- [ ] Hash display works
- [ ] Mobile responsive

**Screenshots**:
[Attach screenshots]
```

---

## 🎯 Success Metrics

After building 3 agents, we should see:
- ✅ Clear navigation between agents
- ✅ Approval flow works end-to-end
- ✅ No broken routes
- ✅ Hash badges display correctly
- ✅ Mobile responsive (basic)

After building all 17 agents:
- ✅ Non-developers can complete a full project
- ✅ Every state is understandable
- ✅ No hidden automation
- ✅ Full artifact explorer works
- ✅ Preview Runtime embedded correctly

---

## 🚧 What NOT to Build (Yet)

- Real-time updates (WebSockets)
- Collaboration features (multi-user)
- Advanced analytics (time tracking, cost tracking)
- AI chat interface (NO)
- Customizable workflows
- Plugin system

These can come later. Focus on the 17-agent assembly line first.

---

**Next Step**: Implement Global Layout + Agent Timeline + Foundry Architect UI
