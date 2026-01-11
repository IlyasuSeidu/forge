# Forge Implementer - The Execution Agent

## Overview

The **Forge Implementer** is a Tier 5 Execution Agent and **THE ONLY AGENT** in the entire Forge system that is allowed to:

- Write code
- Modify files
- Install dependencies

This is not an AI "coder". This is a **manufacturing robot**.

## Why "Dumb" is Smart

### The Problem with "Smart" AI Coders

Traditional AI code generation tools try to be intelligent:
- They plan AND execute
- They invent solutions
- They make architectural decisions
- They add "helpful" features
- They interpret requirements creatively

**This causes**:
- Unpredictable output
- Scope creep
- Violations of constraints
- Non-deterministic results
- Quality degradation

### The Forge Approach: Intentional Constraint

Forge Implementer is **deliberately constrained** to be a pure execution engine:

```
❌ NO planning
❌ NO decision-making
❌ NO inventing
❌ NO interpreting
❌ NO "improvements"

✅ ONLY execute approved contracts
✅ ONLY write specified files
✅ ONLY install declared dependencies
✅ ONLY follow explicit instructions
```

**Why**: Manufacturing robots don't improvise. They follow blueprints. Same principle here.

## The Manufacturing Analogy

### Bad Approach (Traditional AI)
```
"Build a car"
        ↓
AI invents its own design
AI chooses materials
AI decides architecture
AI adds "helpful" features
        ↓
Unpredictable result
```

### Forge Approach (Manufacturing)
```
Execution Contract (Blueprint)
        ↓
Forge Implementer (Robot Arm)
        ↓
Execute EXACTLY as specified
        ↓
Verify IMMEDIATELY
        ↓
Predictable, high-quality result
```

## Execution Contract: The Iron Law

Every execution is governed by an **Execution Contract** (ExecutionUnit):

```typescript
{
  allowedCreateFiles: ['src/auth/service.ts'],  // MAY create these
  allowedModifyFiles: ['src/index.ts'],         // MAY modify these
  forbiddenFiles: ['prisma/schema.prisma'],     // MUST NOT touch
  fullRewriteFiles: ['src/config.ts'],          // MUST completely rewrite
  dependencyChanges: {...},                      // MAY install these
  modificationIntent: {...}                      // WHY each change
}
```

### Contract Enforcement

Forge Implementer **CANNOT**:
- Create files not in `allowedCreateFiles`
- Modify files not in `allowedModifyFiles`
- Touch files in `forbiddenFiles`
- Partially modify files in `fullRewriteFiles`
- Install dependencies not in `dependencyChanges`
- Deviate from `modificationIntent`

**Any violation = IMMEDIATE HALT**

This is not a guideline. This is an **unbreakable constraint**.

## Preconditions: 5 Hard Gates

Before executing ANY unit, Forge Implementer validates:

### Gate 1: Conductor State
```typescript
if (conductorState.currentStatus !== 'building') {
  throw Error('Cannot execute: wrong state');
}
```

**Why**: Execution only happens in `building` state. No exceptions.

### Gate 2: Conductor Lock
```typescript
if (!conductorState.locked) {
  throw Error('Cannot execute: conductor not locked');
}
```

**Why**: Prevents concurrent modification. One agent at a time.

### Gate 3: Approved Plan
```typescript
if (plan.status !== 'approved') {
  throw Error('Cannot execute: plan not approved');
}
```

**Why**: No execution without human approval. Period.

### Gate 4: Exactly One Pending Unit
```typescript
if (pendingUnits.length !== 1) {
  throw Error('Must have exactly ONE pending unit');
}
```

**Why**: Execute one unit at a time. No batch execution.

### Gate 5: Approved Ruleset
```typescript
if (!ruleset || ruleset.status !== 'approved') {
  throw Error('No approved ruleset');
}
```

**Why**: Rules must exist and be approved before code execution.

**ALL 5 GATES MUST PASS**. If any fail → execution blocked.

## Execution Pipeline: 6 Steps

```
┌─────────────────────────────────────────────┐
│  STEP 1: Mark Unit In Progress             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  STEP 2: Install Dependencies (if any)     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  STEP 3: Execute File Operations           │
│  (Rewrites → Creates → Modifications)      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  STEP 4: Post-Execution Validation         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  STEP 5: Mark Unit Complete                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  STEP 6: Trigger Verification              │
└─────────────────────────────────────────────┘
```

### Step 1: Mark In Progress

```typescript
await prisma.executionUnit.update({
  where: { id: unit.id },
  data: { status: 'in_progress' }
});
```

**Purpose**: Prevent concurrent execution of same unit.

### Step 2: Install Dependencies

```typescript
if (hasDependencies) {
  await updatePackageJson(dependencies);
  await runPackageManager(); // npm install / yarn / pnpm
  emit('dependencies_installed');
}
```

**Purpose**: Ensure dependencies exist before code that uses them.

**Order**: Dependencies ALWAYS installed before file operations.

### Step 3: Execute File Operations

**Order is critical**:

1. **Full Rewrites** (complete file replacement)
2. **Creates** (new files)
3. **Modifications** (patches to existing files)

```typescript
// 1. Full Rewrites
for (const file of fullRewriteFiles) {
  const content = await generateFileContent(file, intent);
  await fs.writeFile(file, content); // Complete replacement
  emit('file_rewritten', file);
}

// 2. Creates
for (const file of allowedCreateFiles) {
  const content = await generateFileContent(file, intent);
  await fs.writeFile(file, content);
  emit('file_created', file);
}

// 3. Modifications
for (const file of allowedModifyFiles) {
  const existingContent = await fs.readFile(file);
  const patchedContent = await patchFileContent(file, existingContent, intent);
  await fs.writeFile(file, patchedContent);
  emit('file_modified', file);
}
```

**Why this order**:
- Rewrites first (clear slate)
- Creates next (new files can't conflict)
- Modifications last (patch existing files)

### Step 4: Post-Execution Validation

```typescript
// Verify all created files exist
for (const file of allowedCreateFiles) {
  if (!await fs.exists(file)) {
    throw Error(`Failed to create ${file}`);
  }
}

// Verify all modified files were changed
for (const file of allowedModifyFiles) {
  if (!await fs.exists(file)) {
    throw Error(`File ${file} does not exist to modify`);
  }
}

// Verify forbidden files untouched
for (const file of forbiddenFiles) {
  if (await wasModified(file)) {
    throw Error(`Forbidden file ${file} was modified`);
  }
}
```

**Purpose**: Catch execution failures immediately.

### Step 5: Mark Complete

```typescript
await prisma.executionUnit.update({
  where: { id: unit.id },
  data: {
    status: 'completed',
    completedAt: new Date()
  }
});
```

**Purpose**: Record successful execution.

### Step 6: Trigger Verification

```typescript
await emitEvent('verification_triggered');
```

**Purpose**: Hand off to Verification Agent for quality checks.

**Critical**: Verification happens AFTER EVERY UNIT. No batch verification.

## Event Emission: Complete Audit Trail

Forge Implementer emits events at **EVERY** significant point:

```typescript
execution_unit_started        // Unit execution begins
dependencies_installing       // Package manager running
dependencies_installed        // Packages installed
file_write_started           // About to write file
file_write_completed         // File written successfully
file_rewrite_started         // About to rewrite file
file_rewrite_completed       // Rewrite successful
file_modification_started    // About to patch file
file_modification_completed  // Patch successful
execution_unit_completed     // Unit finished
verification_triggered       // Verification requested
execution_unit_failed        // Unit failed (with reason)
```

**Purpose**: Complete transparency. Every action is logged and traceable.

## Failure Handling: Immediate Halt

```typescript
try {
  await executeUnit(unit);
} catch (error) {
  await prisma.executionUnit.update({
    where: { id: unit.id },
    data: { status: 'failed' }
  });

  await emitEvent('execution_unit_failed', error.message);

  throw error; // HALT IMMEDIATELY
}
```

**Behavior on failure**:
1. Mark unit as `failed`
2. Emit failure event with reason
3. Throw error (halt execution)
4. **DO NOT** continue to next unit
5. **DO NOT** attempt recovery
6. Await human intervention

**Why**: Fail fast, fail loud. No silent failures.

## How This Differs from Other AI Builders

| Feature | Traditional AI Builders | Forge Implementer |
|---------|------------------------|-------------------|
| **Planning** | AI plans during execution | Planning done BEFORE (by Execution Planner) |
| **Creativity** | AI invents solutions | ONLY follows contracts |
| **Scope** | Can expand scope | Locked to contract |
| **Verification** | Optional, after completion | Mandatory, after EVERY unit |
| **Execution** | Batch (all at once) | Sequential (one unit at a time) |
| **Failure Mode** | Continue despite errors | Halt immediately |
| **Determinism** | Non-deterministic | Deterministic (same contract → same actions) |
| **Transparency** | Black box | Complete audit trail |

### Why This Matters

**Traditional Approach**:
```
Prompt: "Add authentication"
        ↓
AI decides: JWT? OAuth? Sessions?
AI invents: File structure, patterns, error handling
AI adds: Logging, validation, "best practices"
        ↓
Result: Unpredictable, non-deterministic, hard to verify
```

**Forge Approach**:
```
Execution Contract: "Create src/auth/service.ts with JWT utils"
        ↓
Forge Implementer: Creates EXACTLY that file
        ↓
Verification: Checks file exists, compiles, meets contract
        ↓
Result: Predictable, deterministic, verifiable
```

## Why Verification After Every Unit Matters

### The Problem with Batch Verification

**Bad**: Execute 10 units, then verify all
```
Unit 1 → Unit 2 → Unit 3 → ... → Unit 10 → Verify
                                             ↓
                                    Find error in Unit 3
                                             ↓
                            Must rollback Units 4-10
                            Must fix Unit 3
                            Must re-execute Units 3-10
```

**Cost**: High. Large rollback, wasted work, hard to debug.

### Forge Approach: Verify Each Unit

**Good**: Execute one unit, verify immediately
```
Unit 1 → Verify → ✅
Unit 2 → Verify → ✅
Unit 3 → Verify → ❌ (error found)
                   ↓
         Halt immediately
         Fix Unit 3
         Retry ONLY Unit 3
```

**Cost**: Low. Small rollback, minimal waste, easy to debug.

### Benefits

1. **Fast Feedback**: Know immediately if something failed
2. **Small Rollbacks**: Only undo one unit, not many
3. **Easy Debugging**: Isolated failure, clear cause
4. **Confidence**: Each step verified before next
5. **Manufacturing-Grade**: Same as real assembly lines

## API Reference

### `executeNextUnit(appRequestId: string): Promise<void>`

Executes the next pending execution unit.

**Preconditions**:
- Conductor state = `building`
- Conductor is locked
- Execution plan exists and is approved
- Exactly ONE pending unit exists
- Project ruleset exists and is approved

**Process**:
1. Validates all preconditions
2. Marks unit as `in_progress`
3. Installs dependencies (if any)
4. Executes file operations (rewrite → create → modify)
5. Validates post-execution
6. Marks unit as `completed`
7. Triggers verification

**Side Effects**:
- Updates ExecutionUnit status
- Creates/modifies files on filesystem
- Updates package.json (if dependencies)
- Runs package manager (if dependencies)
- Emits execution events

**Returns**: `Promise<void>`

**Throws**:
- If preconditions fail
- If execution fails
- If validation fails

## Production vs Stub Implementation

### Current Implementation (Stub)

The current implementation uses **stub functions** for content generation:

```typescript
async generateFileContent(filePath, intent, operation) {
  // STUB: Production would use LLM with strict constraints
  return `// Generated file: ${filePath}\n// Intent: ${intent.intent}\n// Operation: ${operation}\n\nexport const stub = true;\n`;
}

async patchFileContent(filePath, existingContent, intent) {
  // STUB: Production would use LLM to generate precise patches
  return existingContent + `\n\n// Patched: ${intent.intent}\n`;
}
```

**Why**: Allows testing execution pipeline without LLM.

### Production Implementation (Future)

Production would use **LLM-based content generation** with strict constraints:

```typescript
async generateFileContent(filePath, intent, operation) {
  const response = await llm.generate({
    system: "You are a code generator. Generate ONLY the requested file. Follow the intent EXACTLY.",
    prompt: `Generate ${filePath}\n\nIntent: ${intent.intent}\nConstraints: ${intent.constraints.join(', ')}`,
    temperature: 0.1, // Low temperature for determinism
    maxTokens: 4000
  });

  return response.content;
}
```

**Key differences**:
- LLM generates actual implementation code
- Still constrained by execution contract
- Still verified after execution
- Still deterministic (low temperature, clear intent)

**The pipeline remains the same**. Only content generation changes.

## Testing

All tests pass (10/10):

✅ Cannot run unless Conductor = building
✅ Executes ONLY one unit
✅ Dependencies installed ONLY when declared
✅ File creation blocked outside contract
✅ File modification blocked outside contract
✅ Full rewrite enforced correctly
✅ Verification triggered after unit
✅ Failure halts execution
✅ No second unit runs automatically
✅ Deterministic behavior

See: [apps/server/test-forge-implementer.ts](../apps/server/test-forge-implementer.ts)

## Related Documentation

- [Execution Planner](./EXECUTION_PLANNER.md) - Decomposes build prompts into units (Tier 4)
- [Build Prompt Engineer](../apps/server/src/agents/build-prompt-engineer.ts) - Creates execution contracts (Tier 3)
- [Verification Agent](./VERIFICATION_AGENT.md) - Verifies each unit after execution (Tier 6)
- [Build Prompt Execution Contract](./BUILD_PROMPT_EXECUTION_CONTRACT.md) - Contract structure

---

**Key Principle**: Forge Implementer is a factory robot, not a creative coder. It executes blueprints with precision, not interpretation. This is how manufacturing-grade quality is achieved.

**The Iron Law**: Execute ONLY what is approved. Verify AFTER every unit. Halt IMMEDIATELY on failure. No exceptions.
