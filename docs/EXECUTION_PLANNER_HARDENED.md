# Execution Planner Hardened

**Authority**: `EXECUTION_PLANNING_AUTHORITY` (Tier 4.25)
**Version**: 1.0.0
**Status**: Production-Ready (10/10 Tests Passing)
**Pattern**: Constitutional Authority (follows Build Prompt Engineer Hardened)

---

## Overview

The Execution Planner Hardened is a **Factory Line Controller** - it converts approved BuildPromptContracts into deterministic, hash-locked ExecutionPlanContracts. It operates with zero intelligence, zero optimization, and zero implementation logic.

### Philosophy: "If it ever thinks, the factory burns down"

The Execution Planner is not intelligent. It is a factory controller that:
- **NEVER** writes code
- **NEVER** modifies code
- **NEVER** combines tasks
- **NEVER** reorders tasks
- **NEVER** optimizes task flow
- **NEVER** invents tasks

It **ONLY**:
- Converts BuildPrompt scopes into sequential tasks
- Validates task dependencies
- Computes deterministic hashes
- Emits audit events
- Pauses for human approval

---

## Constitutional Authority

### PromptEnvelope

```typescript
const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'EXECUTION_PLANNING_AUTHORITY',
  version: '1.0.0',
  allowedActions: [
    'generateExecutionPlan',
    'validatePlanContract',
    'trackTaskDependencies',
    'emitEvents',
    'pauseForApproval',
  ],
  forbiddenActions: [
    'writeCode',
    'modifyCode',
    'generatePrompts',
    'combineSteps',
    'reorderSteps',
    'optimizeTaskFlow',
    'skipTasks',
    'inventTasks',
    'retryFailedTasks',
    'inferMissingContext',
    'referenceNonHashApproved',
  ],
  requiredContext: [
    'buildPromptHash',      // Must have approved BuildPrompt
    'projectRuleSetHash',   // Must have tech stack info
  ],
};
```

### Action Validation

Every method validates its actions:

```typescript
private validateAction(action: string): void {
  if (PROMPT_ENVELOPE.forbiddenActions.includes(action)) {
    throw new Error(
      `CONSTITUTIONAL VIOLATION: Action '${action}' is FORBIDDEN by EXECUTION_PLANNING_AUTHORITY`
    );
  }

  if (!PROMPT_ENVELOPE.allowedActions.includes(action)) {
    throw new Error(
      `CONSTITUTIONAL VIOLATION: Action '${action}' is NOT ALLOWED by EXECUTION_PLANNING_AUTHORITY`
    );
  }
}
```

---

## ExecutionPlanContract Schema

The immutable contract that defines the execution plan:

```typescript
interface ExecutionPlanContract {
  planId: string;                    // UUID (excluded from hash)
  buildPromptHash: string;           // Reference to approved BuildPrompt
  sequenceNumber: number;            // 0-based (currently always 0 - 1:1 with BuildPrompt)
  tasks: ExecutionTask[];            // Deterministically ordered tasks
  constraints: {
    noParallelExecution: true;       // Tasks MUST run sequentially
    mustFollowSequence: true;        // Task order MUST be respected
    mustRespectFileOwnership: true;  // Tasks MUST only reference BuildPrompt scope
  };
  contractHash: string;              // SHA-256 hash of contract (excluding planId)
}
```

### ExecutionTask Schema

Each task is a discrete unit of work:

```typescript
interface ExecutionTask {
  taskId: string;                    // "task-0", "task-1", etc. (deterministic)
  type: 'CREATE_FILE' | 'MODIFY_FILE' | 'ADD_DEPENDENCY';
  target: string;                    // File path or dependency name
  description: string;               // WHAT to do, never HOW
  dependsOn: string[];               // taskIds (topologically sorted)
  verification: string[];            // Machine-checkable criteria
}
```

### Task Types

1. **ADD_DEPENDENCY**: Install package dependencies
   - Always task-0 (if dependencies exist)
   - Target: `package.json`
   - Description: `"Install N dependencies: dep1, dep2, ..."`

2. **CREATE_FILE**: Create a new file
   - Alphabetically sorted within file creates
   - Target: file path (e.g., `"src/index.ts"`)
   - Description: `"Create file: {path}"`

3. **MODIFY_FILE**: Modify an existing file
   - Alphabetically sorted within file modifies
   - Target: file path (e.g., `"package.json"`)
   - Description: `"Modify file: {path}"`

---

## Context Isolation

The Execution Planner enforces strict context isolation:

### Required Hash-Locked Artifacts

1. **BuildPrompt**: status='approved' AND contractHash != null
2. **ProjectRuleSet**: status='approved' AND rulesHash != null

### Context Loading

```typescript
private async loadIsolatedContext(buildPromptId: string): Promise<IsolatedContext> {
  this.validateAction('generateExecutionPlan');

  // Load approved BuildPrompt
  const buildPrompt = await this.prisma.buildPrompt.findUnique({
    where: { id: buildPromptId },
  });

  if (!buildPrompt || buildPrompt.status !== 'approved' || !buildPrompt.contractHash) {
    throw new Error(
      `CONTEXT ISOLATION VIOLATION: BuildPrompt ${buildPromptId} is not approved or hash-locked`
    );
  }

  // Load approved ProjectRuleSet
  const projectRules = await this.prisma.projectRuleSet.findUnique({
    where: { appRequestId: buildPrompt.appRequestId },
  });

  if (!projectRules || projectRules.status !== 'approved' || !projectRules.rulesHash) {
    throw new Error(
      `CONTEXT ISOLATION VIOLATION: No approved ProjectRuleSet found`
    );
  }

  // Parse BuildPromptContract
  const contract: BuildPromptContract = JSON.parse(buildPrompt.contractJson!);

  return {
    appRequestId: buildPrompt.appRequestId,
    buildPrompt: {
      id: buildPrompt.id,
      contractHash: buildPrompt.contractHash,
      scope: contract.scope,
      dependencies: contract.dependencies,
    },
    projectRules: {
      rulesHash: projectRules.rulesHash,
      techStack: this.extractTechStack(projectRules.content),
    },
  };
}
```

---

## Deterministic Task Generation

### Task Sequencing Rules

Tasks are generated in **strict deterministic order**:

1. **Dependencies** (if any) → Always task-0
2. **File Creates** → Alphabetically sorted
3. **File Modifies** → Alphabetically sorted

**NO OPTIMIZATION. NO THINKING. NO REORDERING.**

### Generation Algorithm

```typescript
private generateTasks(context: IsolatedContext): ExecutionTask[] {
  const tasks: ExecutionTask[] = [];
  let taskIndex = 0;

  // Task 0: Dependencies (if any)
  if (context.buildPrompt.dependencies.add.length > 0) {
    tasks.push({
      taskId: `task-${taskIndex++}`,
      type: 'ADD_DEPENDENCY',
      target: 'package.json',
      description: `Install ${context.buildPrompt.dependencies.add.length} dependencies: ${context.buildPrompt.dependencies.add.join(', ')}`,
      dependsOn: [],
      verification: [
        'package.json must be valid JSON',
        'All dependencies must be listed in package.json',
        'No dependency version conflicts',
        'npm install or yarn install must succeed',
      ],
    });
  }

  // Tasks 1+: File creates (alphabetically sorted)
  const sortedCreates = [...context.buildPrompt.scope.filesToCreate].sort();
  for (const file of sortedCreates) {
    tasks.push({
      taskId: `task-${taskIndex++}`,
      type: 'CREATE_FILE',
      target: file,
      description: `Create file: ${file}`,
      dependsOn: [],
      verification: [
        `File ${file} must exist`,
        `File ${file} must compile without errors`,
        `File ${file} must not have TypeScript errors`,
        `File ${file} must not have linting errors`,
      ],
    });
  }

  // Tasks N+: File modifies (alphabetically sorted)
  const sortedModifies = [...context.buildPrompt.scope.filesToModify].sort();
  for (const file of sortedModifies) {
    tasks.push({
      taskId: `task-${taskIndex++}`,
      type: 'MODIFY_FILE',
      target: file,
      description: `Modify file: ${file}`,
      dependsOn: [],
      verification: [
        `File ${file} must exist`,
        `File ${file} must compile without errors`,
        `Modifications must preserve existing functionality`,
      ],
    });
  }

  return tasks;
}
```

### Determinism Guarantee

**Same BuildPrompt → Same ExecutionPlan → Same Hash**

The hash computation excludes non-deterministic elements:

```typescript
private computeContractHash(contract: Omit<ExecutionPlanContract, 'contractHash'>): string {
  // Stable serialization - EXCLUDE planId (it's a UUID)
  const serialized = JSON.stringify(
    contract,
    [
      'buildPromptHash',  // Include this (deterministic)
      'sequenceNumber',
      'tasks',
      'taskId',
      'type',
      'target',
      'description',
      'dependsOn',
      'verification',
      'constraints',
      'noParallelExecution',
      'mustFollowSequence',
      'mustRespectFileOwnership',
    ].sort()
  );

  return createHash('sha256').update(serialized).digest('hex');
}
```

---

## Contract Validation

All contracts are validated before hash-locking:

### Validation Rules

1. **Sequential Task IDs**: task-0, task-1, task-2, ... (no gaps)
2. **No Self-Dependencies**: Tasks cannot depend on themselves
3. **Valid Dependency References**: All `dependsOn` taskIds must exist
4. **No Cycles**: Dependency graph must be acyclic (topological sort)
5. **Verification Criteria**: All tasks must have verification rules

### Validation Implementation

```typescript
private validateExecutionContract(contract: Omit<ExecutionPlanContract, 'contractHash'>): void {
  this.validateAction('validatePlanContract');

  // Check task IDs are sequential
  const expectedIds = contract.tasks.map((_, i) => `task-${i}`);
  const actualIds = contract.tasks.map(t => t.taskId);
  if (!this.arraysEqual(expectedIds, actualIds)) {
    throw new Error(`VALIDATION FAILED: Task IDs are not sequential`);
  }

  // Check no task depends on itself
  for (const task of contract.tasks) {
    if (task.dependsOn.includes(task.taskId)) {
      throw new Error(`VALIDATION FAILED: Task ${task.taskId} depends on itself`);
    }
  }

  // Check all dependsOn references exist
  const taskIds = new Set(actualIds);
  for (const task of contract.tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) {
        throw new Error(
          `VALIDATION FAILED: Task ${task.taskId} depends on non-existent task ${dep}`
        );
      }
    }
  }

  // Check dependency graph has no cycles
  if (this.detectCycle(contract.tasks)) {
    throw new Error(`VALIDATION FAILED: Task dependency graph has a cycle`);
  }

  // Check all tasks have verification criteria
  for (const task of contract.tasks) {
    if (task.verification.length === 0) {
      throw new Error(`VALIDATION FAILED: Task ${task.taskId} has no verification criteria`);
    }
  }
}
```

### Cycle Detection

Uses **Kahn's Algorithm** for topological sort:

```typescript
private detectCycle(tasks: ExecutionTask[]): boolean {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Build graph
  for (const task of tasks) {
    inDegree.set(task.taskId, 0);
    adjList.set(task.taskId, []);
  }

  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      adjList.get(dep)!.push(task.taskId);
      inDegree.set(task.taskId, (inDegree.get(task.taskId) || 0) + 1);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [taskId, degree] of inDegree) {
    if (degree === 0) queue.push(taskId);
  }

  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;

    for (const neighbor of adjList.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return processed !== tasks.length;
}
```

---

## Public API

### start(buildPromptId: string): Promise<string>

Generate a new execution plan from an approved BuildPrompt.

**Preconditions**:
- BuildPrompt must be approved (status='approved')
- BuildPrompt must be hash-locked (contractHash != null)
- ProjectRuleSet must be approved and hash-locked
- Conductor state must be 'build_prompts_ready'

**Process**:
1. Validate conductor state
2. Lock conductor
3. Load isolated context (hash-locked artifacts only)
4. Generate tasks (deterministic ordering)
5. Validate contract (all validation rules)
6. Compute hash (deterministic, excludes planId)
7. Save to database (status='awaiting_approval')
8. Emit audit event
9. Pause for human approval
10. Unlock conductor

**Returns**: planId (UUID)

**Example**:
```typescript
const planner = new ExecutionPlannerHardened(prisma, conductor, logger);
const planId = await planner.start(buildPromptId);
// Plan is now awaiting human approval
```

---

### approve(planId: string, approver: string): Promise<void>

Approve an execution plan.

**Preconditions**:
- Plan must exist
- Plan status must be 'awaiting_approval'

**Process**:
1. Load plan from database
2. Update status to 'approved'
3. Set approvedBy and approvedAt
4. Emit audit event
5. Transition conductor to 'building' state
6. Resume after human approval

**Example**:
```typescript
await planner.approve(planId, 'human');
// Plan is now approved and conductor transitions to 'building'
```

---

### reject(planId: string, reason: string): Promise<void>

Reject an execution plan.

**Preconditions**:
- Plan must exist
- Plan status must be 'awaiting_approval'

**Process**:
1. Load plan from database
2. Update status to 'rejected'
3. Store rejection reason
4. Emit audit event
5. **HALTS** (no auto-regeneration)

**Example**:
```typescript
await planner.reject(planId, 'Tasks are not in correct order');
// Plan is rejected - human must decide next steps
```

---

### generateNext(buildPromptId: string): Promise<string>

Generate next execution plan for a BuildPrompt.

**Currently**: 1:1 relationship (one ExecutionPlan per BuildPrompt)
**Future**: Support for multiple plans per BuildPrompt

**Example**:
```typescript
// Future use - not yet implemented
const nextPlanId = await planner.generateNext(buildPromptId);
```

---

## Hash-Locking Mechanism

### Database Schema

```prisma
model ExecutionPlan {
  id            String   @id
  appRequestId  String
  buildPromptId String
  status        String   // "awaiting_approval" | "approved" | "rejected"
  createdAt     DateTime @default(now())
  approvedAt    DateTime?

  // Production Hardening (2026-01-13)
  contractHash    String? // SHA-256 hash of ExecutionPlanContract
  contractJson    String? // Full contract for immutability
  approvedBy      String? // "human" or username
  buildPromptHash String? // Reference to approved BuildPrompt (hash-chain)

  appRequest    AppRequest      @relation(fields: [appRequestId], references: [id], onDelete: Cascade)
  units         ExecutionUnit[]

  @@index([appRequestId])
  @@index([buildPromptId])
  @@index([status])
  @@index([contractHash])
}
```

### Hash Chain Integrity

ExecutionPlan → BuildPrompt → ProjectRuleSet

Each layer references the hash of the previous layer, creating an immutable chain of trust:

```
ProjectRuleSet.rulesHash
    ↓
BuildPrompt.rulesHash (references ProjectRuleSet)
BuildPrompt.contractHash
    ↓
ExecutionPlan.buildPromptHash (references BuildPrompt)
ExecutionPlan.contractHash
```

---

## Test Coverage

**Status**: 10/10 Tests Passing ✅

### Test Suite

1. **test1_cannotStartWithoutApprovedBuildPrompt**
   - Verifies BuildPrompt must be approved
   - Expected error: `CONTEXT ISOLATION VIOLATION`

2. **test2_cannotReferenceNonHashApproved**
   - Verifies BuildPrompt must have contractHash
   - Expected error: `CONTEXT ISOLATION VIOLATION`

3. **test3_deterministicTaskGeneration**
   - Generate plan twice with same BuildPrompt
   - Verify contractHash is identical
   - Validates determinism guarantee

4. **test4_taskReorderingPrevented**
   - Verify tasks are in deterministic order
   - Sequence: Dependencies → Creates (alphabetical) → Modifies (alphabetical)
   - Verify task IDs are sequential

5. **test5_taskMergingPrevented**
   - Verify each file operation gets its own task
   - Verify no tasks are combined
   - Check task count matches expected

6. **test6_parallelExecutionDisallowed**
   - Verify `contract.constraints.noParallelExecution === true`
   - Verify all tasks have deterministic sequence
   - Check all constraint flags are set correctly

7. **test7_fileOwnershipRespected**
   - Verify tasks only reference files from BuildPrompt scope
   - Verify no files outside scope are referenced
   - Check all task targets are within allowed scope

8. **test8_dependencyDuplicationBlocked**
   - Generate multiple plans
   - Verify same dependency doesn't appear in multiple tasks
   - Verify single ADD_DEPENDENCY task

9. **test9_hashImmutabilityAfterApproval**
   - Generate plan → approve → verify hash doesn't change
   - Verify status changes to 'approved'
   - Verify approvedBy and approvedAt are set

10. **test10_fullAuditTrailEmission**
    - Verify events emitted for: plan generation, approval
    - Check ExecutionEvent table for all events
    - Verify event types and messages

### Running Tests

```bash
DATABASE_URL="file:/Users/user/forge/prisma/dev.db" npx tsx apps/server/test-execution-planner-hardened.ts
```

**Expected Output**: `10/10 tests passed`

---

## Usage Example

### Full Lifecycle

```typescript
import { PrismaClient } from '@prisma/client';
import { ExecutionPlannerHardened } from './agents/execution-planner-hardened.js';
import { ForgeConductor } from './conductor/forge-conductor.js';
import pino from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });
const conductor = new ForgeConductor(prisma, logger);

async function executeLifecycle(buildPromptId: string) {
  // 1. Create planner
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  // 2. Generate execution plan
  const planId = await planner.start(buildPromptId);
  console.log(`Execution plan generated: ${planId}`);

  // 3. Load plan for review
  const plan = await prisma.executionPlan.findUnique({
    where: { id: planId },
  });
  const contract = JSON.parse(plan!.contractJson!);
  console.log(`Tasks: ${contract.tasks.length}`);
  console.log(`Hash: ${contract.contractHash}`);

  // 4. Human reviews and approves
  await planner.approve(planId, 'human');
  console.log('Execution plan approved');

  // 5. Conductor transitions to 'building' state
  // ForgeImplementer can now execute the plan
}
```

---

## Error Handling

### Constitutional Violations

```typescript
// Attempting to write code
validateAction('writeCode');
// Throws: CONSTITUTIONAL VIOLATION: Action 'writeCode' is FORBIDDEN

// Attempting to optimize tasks
validateAction('optimizeTaskFlow');
// Throws: CONSTITUTIONAL VIOLATION: Action 'optimizeTaskFlow' is FORBIDDEN
```

### Context Isolation Violations

```typescript
// BuildPrompt not approved
await planner.start(unapprovedBuildPromptId);
// Throws: CONTEXT ISOLATION VIOLATION: BuildPrompt is not approved or hash-locked

// BuildPrompt approved but no contractHash
await planner.start(nonHashLockedBuildPromptId);
// Throws: CONTEXT ISOLATION VIOLATION: BuildPrompt is not hash-locked
```

### Validation Failures

```typescript
// Cycle in dependency graph
// Throws: VALIDATION FAILED: Task dependency graph has a cycle

// Task depends on non-existent task
// Throws: VALIDATION FAILED: Task task-5 depends on non-existent task task-99

// No verification criteria
// Throws: VALIDATION FAILED: Task task-3 has no verification criteria
```

### Conductor State Violations

```typescript
// Wrong conductor state
await planner.start(buildPromptId);
// Throws: CONDUCTOR STATE VIOLATION: Expected state 'build_prompts_ready', got 'building'
```

---

## Comparison with Legacy Execution Planner

| Feature | Legacy | Hardened |
|---------|--------|----------|
| **Constitutional Authority** | No | Yes (PromptEnvelope) |
| **Context Isolation** | No | Yes (hash-locked artifacts) |
| **Deterministic Hashing** | No | Yes (SHA-256) |
| **Task Validation** | Basic | Comprehensive (5+ checks) |
| **Cycle Detection** | No | Yes (Kahn's algorithm) |
| **Audit Trail** | Partial | Complete |
| **Human Approval** | No | Yes (3-state lifecycle) |
| **Test Coverage** | None | 10/10 tests |
| **Optimization Logic** | Yes | No (factory controller) |

---

## Future Enhancements

### v1.1: Advanced Dependency Tracking

- Task-level dependencies (not just file-level)
- Cross-file dependency analysis
- Dependency ordering optimization (within constitutional constraints)

### v1.2: Multi-Plan Support

- Support for multiple ExecutionPlans per BuildPrompt
- Plan versioning and comparison
- Rollback capabilities

### v1.3: Execution Monitoring

- Real-time task execution tracking
- Progress reporting
- Automatic verification result capture

### v1.4: Parallel Execution (Optional)

- Detect truly independent tasks
- Optional parallel execution flag (with human approval)
- Still maintain deterministic ordering guarantee

---

## References

- **Build Prompt Engineer Hardened**: [/Users/user/forge/apps/server/src/agents/build-prompt-engineer-hardened.ts](../apps/server/src/agents/build-prompt-engineer-hardened.ts)
- **Forge Conductor**: [/Users/user/forge/apps/server/src/conductor/forge-conductor.ts](../apps/server/src/conductor/forge-conductor.ts)
- **Test Suite**: [/Users/user/forge/apps/server/test-execution-planner-hardened.ts](../apps/server/test-execution-planner-hardened.ts)
- **Prisma Schema**: [/Users/user/forge/prisma/schema.prisma](../prisma/schema.prisma)

---

## Changelog

### 2026-01-13 - v1.0.0 (Production Release)
- ✅ Constitutional authority pattern (PromptEnvelope)
- ✅ Context isolation (hash-locked artifacts only)
- ✅ Deterministic task generation
- ✅ Contract validation (5+ checks)
- ✅ Cycle detection (Kahn's algorithm)
- ✅ Hash-locking mechanism (SHA-256)
- ✅ Public API (start, approve, reject)
- ✅ Comprehensive test suite (10/10 passing)
- ✅ Database schema updates (contractHash, contractJson, etc.)
- ✅ Full audit trail emission

---

**Status**: Production-Ready ✅
**Tests**: 10/10 Passing ✅
**Pattern Fidelity**: Exact match with Build Prompt Engineer Hardened ✅
