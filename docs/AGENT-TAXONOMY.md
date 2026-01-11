# Forge Agent Taxonomy

**Purpose**: Clean, production-grade agent classification with clear mandates and zero overlap.

**Status**: SPECIFICATION ONLY - Agents not yet implemented

---

## Design Philosophy

> "This is not 'agent soup'. This is an assembly line."

**Core Principles**:
- Every agent has a **single job**
- Nothing is thrown away (all outputs stored in database)
- Verification is frozen (Phase 10 guarantees)
- Execution is stepwise and auditable
- The Conductor enforces discipline

---

## TIER 1 — STRATEGY & INTENT AGENTS (THINKING)

These agents **never write production code**. They clarify, question, and establish truth.

### 1. Foundry Architect
**Role**: Product co-founder / technical PM
**LLM**: GPT-5 (reasoning-heavy, conversational)
**Responsibility**:
- Interrogate the app idea
- Clarify ambiguity
- Produce a Base Prompt that becomes the canonical source of truth

**Key Rule**: This agent asks questions. It does NOT assume.

**Stored Outputs**:
- `base_prompt.md`
- `product_assumptions.json`

---

### 2. Synthetic Founder (NEW — very important)
**Role**: The "ideal founder" proxy
**LLM**: GPT-5 (planning + consistency)
**Responsibility**:
- Answer Foundry Architect's questions
- Produce reasonable, opinionated defaults
- Present answers to user for approval/adjustment

**Why This Matters**: Removes cognitive load from the user while maintaining momentum.

**Stored Outputs**:
- `founder_answers.json`
- Approval history

---

## TIER 2 — PLANNING & STRUCTURE AGENTS (THINKING → STRUCTURE)

### 3. Product Strategist
**Role**: Senior product planner
**LLM**: GPT-5
**Outputs** (separate, sequential):
- `master_plan.md`
- `implementation_plan.md`

**Key Rule**: No implementation details. Only intent and sequencing.

---

### 4. Screen Cartographer
**Role**: UX/system mapper
**LLM**: GPT-5
**Responsibility**:
- Enumerate screens
- Confirm with user
- Describe screens one at a time

**Key Rule**: No components, no code.

**Stored Outputs**:
- `screens/index.json`
- `screens/{screen_name}.md`

---

### 5. Journey Orchestrator
**Role**: Role & behavior authority
**LLM**: GPT-5
**Responsibility**:
- Define user roles
- Map journeys
- Enforce permissions

**Stored Outputs**:
- `roles.json`
- `journeys/{role}.md`

---

## TIER 3 — VISUAL & CONSTRAINT AGENTS (DESIGN & RULES)

### 6. Visual Forge
**Role**: Senior UI designer
**LLM**: GPT-5 + OpenAI's best image generation model
**Responsibility**:
- Generate high-fidelity UI images
- Mobile or desktop
- One screen at a time

**Stored Outputs**:
- `mockups/{screen}.png`
- Prompt metadata

---

### 7. Constraint Compiler
**Role**: Lawmaker for all coding agents
**LLM**: GPT-5
**Responsibility**:
- Generate non-negotiable development rules
- Lock architecture, naming, discipline
- This agent's output is **sacred**

**Stored Outputs**:
- `rules.md`

---

## TIER 4 — PROMPT & EXECUTION AGENTS (DOING)

### 8. Build Prompt Engineer
**Role**: Translator between planning and code
**LLM**: GPT-5
**Responsibility**:
- Convert (Screen description + Mockup + Rules + Roles) → code-ready build prompts

**Stored Outputs**:
- `build_prompts/{feature}.md`

---

### 9. Forge Implementer
**Role**: Code execution engine
**LLM**: Claude (Sonnet / Opus depending on task)
**Responsibility**:
- Implement one prompt at a time
- No planning
- No creativity beyond instructions
- Subject to Phase 10 verification

**Key Rule**: Claude Agent — execution only, no thinking.

---

### 10. Completion Auditor (NEW)
**Role**: Confirms task completion
**LLM**: GPT-5 (verification + reasoning)
**Responsibility**:
- Inspect: Code, Logs, Verification results
- Decide: ✅ Done | ❌ Needs fixes
- Only then allow next task

---

## TIER 5 — MASTER & COORDINATION AGENTS (CONTROL)

### 11. Forge Conductor (MASTER AGENT) ✅ IMPLEMENTED
**Role**: Orchestrator / CEO
**LLM**: None - this is a deterministic state machine
**Status**: **Skeleton implemented** - see [FORGE-CONDUCTOR-IMPLEMENTATION.md](./FORGE-CONDUCTOR-IMPLEMENTATION.md)

**Responsibilities**:
- Decide which agent runs next
- Decide what input they receive
- Enforce order, dependencies, human approvals
- Prevent parallel chaos, scope creep, skipped steps

**Key Rule**: The Conductor never writes content. It only coordinates.

**Current State**: Database model + service implemented, not yet connected to agents.

---

### 12. Context Librarian (OPTIONAL BUT POWERFUL)
**Role**: Memory curator
**LLM**: Small GPT-5 variant or rules-based
**Responsibility**:
- Index all agent outputs
- Surface relevant documents to other agents
- Prevent context overload

---

## Agent Execution Flow

**Sequential Execution** (enforced by Forge Conductor):

```
1. Foundry Architect         → base_prompt.md
2. Synthetic Founder          → founder_answers.json (human approval)
3. Product Strategist         → master_plan.md, implementation_plan.md
4. Screen Cartographer        → screens/*.md
5. Journey Orchestrator       → roles.json, journeys/*.md
6. Visual Forge               → mockups/*.png
7. Constraint Compiler        → rules.md
8. Build Prompt Engineer      → build_prompts/*.md
9. Forge Implementer          → [writes code]
10. [Phase 10 Verification]   → [verifies code]
11. Completion Auditor        → [confirms done]
12. [Next feature or complete]
```

**Critical Rules**:
- ✅ One agent at a time
- ✅ Each agent must complete before next starts
- ✅ All outputs stored in database
- ✅ Human approval gates enforced
- ✅ Phase 10 verification cannot be bypassed

---

## Why This Architecture Can Do What Others Can't

**Most AI builders fail because they**:
- Use one agent to do everything
- Lose context
- Skip verification
- Generate code without governance
- Don't have a master coordinator

**Forge succeeds because**:
- Every agent has a single job
- Nothing is thrown away
- Verification is frozen (Phase 10)
- Execution is stepwise and auditable
- The Conductor enforces discipline

---

## Storage Strategy

**All agent outputs are stored in the database** to enable:

1. **Context Reuse**: Other agents can read previous outputs
2. **Audit Trail**: Full history of decisions
3. **Recovery**: Can resume from any point
4. **Debugging**: Can inspect exactly what each agent produced
5. **Compound Context**: Knowledge accumulates over time

**Example Database Structure** (to be implemented):

```
artifacts/
  {appRequestId}/
    base_prompt.md
    founder_answers.json
    master_plan.md
    implementation_plan.md
    screens/
      index.json
      home.md
      dashboard.md
    roles.json
    journeys/
      admin.md
      user.md
    mockups/
      home.png
      dashboard.png
    rules.md
    build_prompts/
      feature-1.md
      feature-2.md
```

---

## LLM Selection Strategy

**Not all tasks need the most expensive model**:

| Agent | LLM | Reason |
|-------|-----|--------|
| Foundry Architect | GPT-5 | Needs reasoning + conversation |
| Synthetic Founder | GPT-5 | Needs consistency + planning |
| Product Strategist | GPT-5 | Complex planning |
| Screen Cartographer | GPT-5 | UX reasoning |
| Journey Orchestrator | GPT-5 | Behavior modeling |
| Visual Forge | GPT-5 + Image Gen | Text → prompts + image generation |
| Constraint Compiler | GPT-5 | Rule synthesis |
| Build Prompt Engineer | GPT-5 | Translation |
| **Forge Implementer** | **Claude** | **Best at code execution** |
| Completion Auditor | GPT-5 | Verification reasoning |
| Forge Conductor | **None** | **Deterministic state machine** |
| Context Librarian | GPT-3.5 or rules | Indexing/retrieval |

**Cost Optimization**: Use the right tool for the job. Don't waste Opus on simple tasks.

---

## Human-in-the-Loop Gates

**Required Approvals**:

1. After Foundry Architect → Approve base prompt
2. After Synthetic Founder → Approve founder answers
3. After Screen Cartographer → Approve screen list
4. After Visual Forge → Approve UI mockups
5. After Constraint Compiler → Approve development rules
6. After Phase 10 Verification Failure → Human decision (download anyway, restart, etc.)

**Why Approvals Matter**:
- Prevents runaway AI agents
- Ensures user stays in control
- Catches mistakes early
- Builds trust through transparency

---

## Implementation Status

| Agent | Status |
|-------|--------|
| Forge Conductor | ✅ **Skeleton implemented** |
| Foundry Architect | ❌ Not implemented |
| Synthetic Founder | ❌ Not implemented |
| Product Strategist | ❌ Not implemented |
| Screen Cartographer | ❌ Not implemented |
| Journey Orchestrator | ❌ Not implemented |
| Visual Forge | ❌ Not implemented |
| Constraint Compiler | ❌ Not implemented |
| Build Prompt Engineer | ❌ Not implemented |
| Forge Implementer | ⚠️ Partially exists (current build flow) |
| Completion Auditor | ❌ Not implemented |
| Context Librarian | ❌ Not implemented |

**Next Step**: Implement agents one by one, starting with Tier 1 (Foundry Architect, Synthetic Founder).

---

## Questions Answered

**Q: Why so many agents?**
A: Each agent has expertise in ONE thing. Generalists produce mediocre results.

**Q: Isn't this slow?**
A: Sequential execution is FAST compared to debugging broken code from one mega-agent.

**Q: Why store everything in the database?**
A: Context compounds. Future agents benefit from past decisions. Nothing is lost.

**Q: Can we skip an agent?**
A: ❌ No. The Conductor enforces the full flow. Shortcuts = chaos.

**Q: What if an agent fails?**
A: Retry with same prompt, or pause for human intervention. The Conductor tracks retries.

**Q: Why is Forge Implementer using Claude instead of GPT?**
A: Claude excels at code generation and follows instructions precisely. Use the best tool for the job.

---

**End of Agent Taxonomy**
