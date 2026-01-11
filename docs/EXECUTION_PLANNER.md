# Execution Planner - Micro-Execution Decomposer

## Overview

The **Execution Planner** is a Tier 4 Execution Preparation agent that sits between Build Prompt Engineer and Forge Implementer. Its sole purpose is to deterministically decompose large build prompts into ordered, minimal, independently executable units ("Micro-Executions").

This agent does **NOT** write code, modify files, or install dependencies. It is a pure planning agent that makes execution safe, verifiable, and deterministic.

## Why Decomposition Exists

Traditional AI code generation fails when given large, complex tasks because:

1. **Context Overload**: Too much to process in one shot
2. **Failure Scope**: When something fails, it's hard to isolate the issue
3. **Verification Difficulty**: Large changes are harder to verify
4. **Rollback Complexity**: Hard to undo partial failures
5. **Non-Determinism**: Same prompt produces different results

**Execution Planner solves this** by:

- Breaking large prompts into smallest safe units
- Each unit is independently executable and verifiable
- Failures are isolated to specific units
- Rollback is trivial (just one unit)
- Deterministic decomposition (same input → same plan)

## The Manufacturing Analogy

Think of a car assembly line:

**Without Execution Planner** (Bad):
- Give worker entire car blueprint
- Hope they assemble it correctly
- If something fails, restart everything

**With Execution Planner** (Good):
- Break assembly into stations
- Each station does ONE thing (install engine, attach doors, etc.)
- Quality check after each station
- If station fails, fix that station only

This is how real manufacturing works. Forge uses the same principle.

## Decomposition Decision Criteria

Execution Planner analyzes each build prompt and decides whether to decompose based on:

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| **File Modification Count** | > 5 files | Too many changes in one shot |
| **Mixed Dependencies + Files** | Has both | Install deps first, then modify files |
| **Mixed Create + Modify** | Has both | Separate creation from modification |
| **Frontend + Backend** | Touches both | Isolate frontend from backend |
| **High Risk Operations** | Auth, routing, providers | Extra caution needed |
| **Full Rewrites** | Any | Isolate each rewrite |

### Decision Rule

Decompose if **ANY** of the above criteria are met.

Small, simple prompts (≤ 5 files, no dependencies) execute as a single unit.

## Execution Unit Structure

Each Execution Unit is a complete execution contract with:

```typescript
interface ExecutionUnit {
  id: string;
  sequenceIndex: number;
  title: string;
  description: string;

  // Execution contract (same structure as Build Prompt)
  allowedCreateFiles: string[];
  allowedModifyFiles: string[];
  forbiddenFiles: string[];
  fullRewriteFiles: string[];
  dependencyChanges: DependencyManifest;
  modificationIntent: ModificationIntent;

  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
```

### Key Properties

- **Independent**: Can be executed without other units
- **Minimal**: Smallest safe change
- **Ordered**: Sequential execution (0, 1, 2, ...)
- **Verifiable**: Each unit can be verified independently
- **Rollback-able**: Can undo just this unit

## Decomposition Logic

### Rule 1: Dependencies First

If a build prompt has dependencies AND file operations:

**Unit 0**: Install Dependencies
- allowedCreateFiles: []
- allowedModifyFiles: []
- dependencyChanges: {all dependencies}

**Unit 1+**: File Operations
- allowedCreateFiles: [files]
- dependencyChanges: {}

**Why**: Dependencies must exist before code that imports them.

### Rule 2: Batch File Creations

If creating many files, batch them into groups of 3:

**Unit 1**: Create Files (3)
- Create file1.ts, file2.ts, file3.ts

**Unit 2**: Create Files (3)
- Create file4.ts, file5.ts, file6.ts

**Why**: Smaller units = easier verification, easier rollback.

### Rule 3: Isolate Full Rewrites

Each full rewrite gets its own unit:

**Unit N**: Rewrite File
- fullRewriteFiles: [single-file.ts]

**Why**: Rewrites are risky. If it fails, only that file is affected.

### Rule 4: Separate Modifications

Batch modifications into groups of 3:

**Unit M**: Modify Files (3)
- allowedModifyFiles: [file1.ts, file2.ts, file3.ts]

**Why**: Patches are safer in small batches.

## Example Decomposition

### Input: Large Build Prompt

```
Title: Add Authentication System
Files to CREATE:
  - src/auth/auth-service.ts
  - src/auth/jwt-utils.ts
  - src/auth/password-hash.ts
  - src/middleware/auth-middleware.ts
  - src/api/auth/login.ts
  - src/api/auth/register.ts
  - src/components/LoginForm.tsx

Files to MODIFY:
  - src/index.ts
  - src/types.ts

Dependencies:
  - jsonwebtoken@^9.0.0
  - bcrypt@^5.1.0
```

### Output: Execution Plan (5 Units)

**Unit 0: Install Dependencies**
```
Dependencies: jsonwebtoken@^9.0.0, bcrypt@^5.1.0
Files: (none)
```

**Unit 1: Create Files (3)**
```
Files: auth-service.ts, jwt-utils.ts, password-hash.ts
Dependencies: (none)
```

**Unit 2: Create Files (3)**
```
Files: auth-middleware.ts, login.ts, register.ts
Dependencies: (none)
```

**Unit 3: Create Files (1)**
```
Files: LoginForm.tsx
Dependencies: (none)
```

**Unit 4: Modify Files (2)**
```
Files: index.ts, types.ts
Dependencies: (none)
```

### Execution Flow

1. Forge Implementer executes Unit 0 → installs deps
2. Verification checks deps installed → ✅
3. Forge Implementer executes Unit 1 → creates 3 files
4. Verification checks files created → ✅
5. (Repeat for Units 2-4)

If any unit fails → stop immediately, rollback that unit only.

## Integration with Forge Workflow

```
Build Prompt Engineer
        ↓
   (Generates Build Prompt)
        ↓
  Execution Planner  ← NEW LAYER
        ↓
   (Decomposes into Units)
        ↓
  Human Approval Gate
        ↓
  Forge Implementer (executes Unit 0)
        ↓
  Verification (verifies Unit 0)
        ↓
  Forge Implementer (executes Unit 1)
        ↓
  Verification (verifies Unit 1)
        ↓
  (Repeat until all units complete)
```

### Conductor State Flow

```
build_prompts_ready
        ↓
Execution Planner.start()
        ↓
[Human Approves Plan]
        ↓
Execution Planner.approvePlan()
        ↓
Forge Implementer executes units
        ↓
executing → completed
```

**Conductor remains locked** during execution of all units.

## Human Approval Gate

When Execution Planner generates a plan:

1. Conductor pauses for human approval
2. Human sees list of execution units:
   ```
   Execution Plan (5 units):
   0. Install Dependencies
   1. Create Files (3)
   2. Create Files (3)
   3. Create Files (1)
   4. Modify Files (2)
   ```
3. Human approves or rejects

**Approval**: Allows execution to begin
**Rejection**: Halts execution, requires investigation

No auto-approval. No silent continuation.

## Preservation Guarantee (Critical)

Execution Planner **MUST NOT**:

❌ Add files not in original Build Prompt
❌ Remove files from original Build Prompt
❌ Add dependencies
❌ Change modification intent
❌ Change project rules
❌ Invent new features

It **MAY ONLY**:

✅ Partition existing files into smaller batches
✅ Order units logically
✅ Isolate dependencies into their own unit

**Same Input → Same Plan** (deterministic).

## Failure Handling

### Execution Unit Fails

```
Unit 2 fails during execution
        ↓
Mark Unit 2 as 'failed'
        ↓
Emit execution_unit_failed event
        ↓
Halt progression
        ↓
Await human intervention
```

Human can:
- Fix the issue manually
- Retry Unit 2
- Reject the entire plan

**Already completed units are preserved**.

### Validation Failure

If Execution Planner detects:
- Conflicting file ownership
- Cannot safely decompose
- Rules conflict

Then:
```
Throw error
        ↓
Emit execution_plan_failed event
        ↓
Halt progression
        ↓
Unlock Conductor
        ↓
Await human intervention
```

## Benefits

### For Forge Implementer

- **Reduced Complexity**: Each task is small and focused
- **Clear Success Criteria**: Each unit has explicit contract
- **No Overload**: Never given too much to process
- **Deterministic**: Same unit always produces same result

### For Verification Agent

- **Precise Validation**: Check one small unit at a time
- **Isolated Failures**: Know exactly what went wrong
- **Faster Feedback**: Don't wait for entire build to complete

### For Human Operators

- **Transparency**: See exactly what will be executed
- **Control**: Approve or reject before execution
- **Debuggability**: Trace failures to specific units
- **Confidence**: Small, safe steps instead of big leaps

### For The System

- **Rollback Safety**: Undo one unit, not entire build
- **Audit Trail**: Complete log of what was executed when
- **Determinism**: Same plan every time
- **Manufacturing-Grade**: Professional, predictable execution

## API Reference

### `start(buildPromptId: string): Promise<ExecutionPlan>`

Analyzes a build prompt and generates an execution plan.

**Preconditions**:
- Conductor must be in `build_prompts_ready` state
- BuildPrompt must exist and be approved

**Returns**: ExecutionPlan with ordered units

**Side Effects**:
- Locks Conductor
- Pauses for human approval
- Unlocks Conductor
- Emits `execution_plan_created` event

### `approvePlan(planId: string): Promise<void>`

Approves the execution plan, allowing execution to begin.

**Side Effects**:
- Marks plan as `approved`
- Resumes Conductor
- Emits `execution_plan_approved` event

### `rejectPlan(planId: string, reason: string): Promise<void>`

Rejects the execution plan, halting execution.

**Side Effects**:
- Marks plan as `rejected`
- Emits `execution_plan_rejected` event

### `getCurrentUnit(appRequestId: string): Promise<ExecutionUnit | null>`

Gets the next pending execution unit.

**Returns**: Next unit to execute, or null if all complete

### `completeCurrentUnit(unitId: string): Promise<void>`

Marks a unit as completed after successful execution.

**Side Effects**:
- Updates unit status to `completed`
- Emits `execution_unit_completed` event

### `getPlanStatus(appRequestId: string): Promise<ExecutionPlanSummary>`

Gets current execution progress summary.

**Returns**:
```typescript
{
  totalUnits: number;
  completedUnits: number;
  currentUnit: ExecutionUnit | null;
  remainingUnits: number;
}
```

## Testing

All tests pass (7/7):

✅ Cannot start unless Conductor = build_prompts_ready
✅ Large prompt decomposes into multiple units
✅ Small prompt produces single unit
✅ Dependency install isolated into own unit
✅ Execution units ordered deterministically
✅ Approving plan allows execution
✅ Rejecting plan halts execution

See: `apps/server/test-execution-planner.ts`

## Related Documentation

- [Build Prompt Engineer](../apps/server/src/agents/build-prompt-engineer.ts) - Generates build prompts
- [Build Prompt Execution Contract](./BUILD_PROMPT_EXECUTION_CONTRACT.md) - Contract structure
- [Forge Implementer](./FORGE_IMPLEMENTER.md) - Executes units (Tier 5)
- [Verification Agent](./VERIFICATION_AGENT.md) - Verifies each unit

---

**Key Principle**: Execution Planner is a manufacturing planner, not a code executor. It plans the assembly line. Forge Implementer works the assembly line.