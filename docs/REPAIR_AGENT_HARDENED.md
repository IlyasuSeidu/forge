# Repair Agent Hardened (Tier 5.75)

**Constitutional Role**: Bounded Repair Executor
**Authority**: `REPAIR_EXECUTION_AUTHORITY`
**Intelligence**: ZERO (mechanical execution only)
**Autonomy**: ZERO (no decisions)
**Execution Power**: BOUNDED (only approved RepairPlan actions)
**Status**: ✅ **PRODUCTION HARDENED** (January 14, 2026)

---

## Philosophy

> **"The Repair Agent is a torque wrench, not a mechanic."**

The Repair Agent Hardened is intentionally neutered to be **LESS powerful** than Forge Implementer. It is a purely bounded executor that:

- Executes ONLY human-approved RepairPlan actions
- Makes NO decisions
- Makes NO interpretations
- Makes NO suggestions
- Halts immediately on ANY deviation

This agent is the final safety-critical piece in Phase 10's human-in-the-loop self-repair system.

---

## Critical Safety Invariant

**Even if a malicious, buggy, or over-eager LLM were plugged in, the system would still be safe because:**

1. All inputs are hash-locked and human-approved
2. All operations are explicitly bounded
3. Any deviation triggers immediate halt
4. No retry or recovery logic exists

---

## Constitutional Position

```typescript
{
  authority: 'REPAIR_EXECUTION_AUTHORITY',
  tier: 5.75,
  intelligenceLevel: 'ZERO',    // Mechanical execution only
  autonomy: 'NONE',              // No decisions
  executionPower: 'BOUNDED',     // Only approved actions
  defaultState: 'DISABLED'
}
```

### Allowed Actions (8)

The Repair Agent may ONLY:

1. `readApprovedRepairPlan` - Read human-approved RepairPlan
2. `readFailedVerificationResult` - Read FAILED VerificationResult
3. `readHashApprovedBuildPrompt` - Read approved BuildPrompt
4. `readHashApprovedExecutionPlan` - Read approved ExecutionPlan
5. `readHashApprovedProjectRuleSet` - Read approved ProjectRuleSet
6. `validateAllHashes` - Validate all input hashes
7. `executeRepairAction` - Execute exactly one approved action
8. `emitExecutionLog` - Emit hash-locked execution log

### Forbidden Actions (21)

The Repair Agent must NEVER:

- `generateCode` - No code generation
- `suggestFixes` - No suggestions
- `expandScope` - No scope expansion
- `retryOnFailure` - No retry
- `modifyUnapprovedFiles` - Only allowed files
- `addNewFiles` - No new files
- `addDependencies` - No dependency changes
- `interpretIntent` - No interpretation
- `rewriteEntireFiles` - Only exact changes
- `fixRelatedIssues` - Only specified fixes
- `touchFormatting` - No formatting changes
- `decideIfGoodEnough` - No quality decisions
- `retryVerification` - Verification is separate
- `rollbackOnFailure` - No rollback
- `continueAfterError` - Halt on error
- `modifyOutsideLineRange` - Stay in bounds
- `chooseAlternativeActions` - No alternatives
- `optimizeCode` - No optimization
- `refactor` - No refactoring
- `addComments` - No comments
- `addLogging` - No logging

---

## Input Contract (MANDATORY)

The Repair Agent may ONLY accept these inputs, and ALL must be:

- **Present**
- **Approved** (by human)
- **Hash-locked**

### Required Inputs

1. **ApprovedRepairPlan**
   - `repairPlanId`: Unique identifier
   - `repairPlanHash`: SHA-256 hash
   - `sourceVerificationHash`: Hash of FAILED VerificationResult
   - `actions`: Array of RepairAction
   - `allowedFiles`: Whitelist of files
   - `constraints`: Hard constraints
   - `approvedBy`: MUST be `'human'`
   - `approvedAt`: ISO timestamp

2. **FAILED VerificationResult**
   - `overallStatus`: MUST be `'FAILED'`
   - `resultHash`: SHA-256 hash

3. **Approved BuildPrompt**
   - `status`: `'approved'`
   - `contractHash`: SHA-256 hash

4. **Approved ExecutionPlan**
   - `status`: `'approved'`
   - `contractHash`: SHA-256 hash

5. **Approved ProjectRuleSet**
   - `status`: `'approved'`
   - `rulesHash`: SHA-256 hash

### If ANY input is missing, not approved, or missing a hash:

⛔ **HALT IMMEDIATELY**

---

## RepairAction Contract

Each action in the RepairPlan specifies EXACTLY what to modify:

```typescript
interface RepairAction {
  actionId: string;              // Unique identifier
  targetFile: string;            // Relative path from workspace
  operation: 'replace_content' | 'replace_lines' | 'append';
  allowedLineRange?: [number, number];  // For line-based operations
  oldContent?: string;           // For content-based operations
  newContent: string;            // What to write
  description: string;           // Human-facing only (NOT used by agent)
}
```

### Operation Types

1. **`replace_content`**
   - Replaces exact `oldContent` with `newContent`
   - Fails if `oldContent` not found

2. **`replace_lines`**
   - Replaces lines in `allowedLineRange`
   - Fails if range out of bounds

3. **`append`**
   - Appends `newContent` to end of file

---

## Hard Rules (NON-NEGOTIABLE)

❌ **NO new files**
❌ **NO dependency changes**
❌ **NO file outside RepairPlan.actions**
❌ **NO edits outside allowed line ranges**
❌ **NO interpretation of "intent"**

If the RepairPlan says:
- File: `src/calculator.ts`
- Operation: `replace_content`
- Old: `return "hello"`
- New: `return "world"`

The agent MUST:
- Find EXACTLY `return "hello"`
- Replace with EXACTLY `return "world"`
- Touch NOTHING else

---

## Execution Behavior

### Step-by-step execution (NO parallelism):

1. **Validate ALL preconditions**
   - RepairPlan has human approval
   - RepairPlan has hash
   - VerificationResult exists and is FAILED
   - BuildPrompt exists, approved, and hash-locked
   - ExecutionPlan exists, approved, and hash-locked
   - ProjectRuleSet exists, approved, and hash-locked
   - Conductor is not locked

2. **Lock Conductor**
   - Prevent concurrent modifications

3. **For EACH RepairAction (in order)**:
   - Verify file exists (unless explicitly allowed)
   - Verify file is in `allowedFiles` list
   - Verify operation is valid
   - Verify line range (if applicable)
   - Apply change EXACTLY as specified
   - Record action and file

4. **Unlock Conductor**
   - Always unlock, even on failure

5. **Build execution log**
   - Hash-locked, immutable

6. **Emit event**
   - `repair_execution_completed` OR `repair_execution_failed`

7. **STOP**
   - No retry
   - No verification
   - No further action

---

## Failure Rules (NON-NEGOTIABLE)

On ANY violation:

- File missing
- File not in allowed list
- Line range out of bounds
- Old content not found
- Unexpected diff
- Execution error

The agent MUST:

1. **STOP IMMEDIATELY**
2. **LOCK CONDUCTOR**
3. **SET STATUS = 'FAILED'**
4. **RECORD FAILURE REASON**
5. **EMIT FAILURE EVENT**
6. **REQUIRE HUMAN INTERVENTION**

❌ **No retry**
❌ **No rollback**
❌ **No continuation**

Failure is informational, not recoverable.

---

## Outputs

### 1. RepairExecutionLog (IMMUTABLE)

```typescript
interface RepairExecutionLog {
  executionId: string;           // Unique ID
  repairPlanHash: string;        // Hash of RepairPlan
  actionsExecuted: string[];     // Action IDs executed
  filesTouched: string[];        // Files modified
  status: 'SUCCESS' | 'FAILED';
  failureReason?: string;
  executedAt: string;            // ISO timestamp
  executionHash: string;         // SHA-256 (excludes executedAt)
}
```

**Hash Computation**:
- Includes: `executionId`, `repairPlanHash`, `actionsExecuted`, `filesTouched`, `status`, `failureReason`
- Excludes: `executedAt` (for determinism)

### 2. Events

- `repair_execution_started` - When execution begins
- `repair_action_applied` - For each action
- `repair_execution_completed` - On success
- `repair_execution_failed` - On failure

---

## Integration Points

### With Verification Executor

- **Repair Agent does NOT verify**
- Only executes
- **Verification MUST be re-run after** repair

### With Completion Auditor

Completion Auditor reads:
- `RepairExecutionLog`
- New `VerificationResult` (after re-verification)

**Completion Auditor NEVER trusts Repair Agent alone**

---

## Explicitly Forbidden

The Repair Agent must NEVER:

1. Generate code suggestions
2. Rewrite entire files (unless explicitly in RepairPlan)
3. Fix "related" issues
4. Touch formatting beyond allowed range
5. Retry verification
6. Decide if repair is "good enough"
7. Expand scope
8. Add defensive code
9. Add error handling
10. Add comments or documentation

---

## Constitutional Tests (10/10 REQUIRED)

The Repair Agent MUST pass all 10 constitutional tests:

1. ❌ Cannot run without approved RepairPlan
2. ❌ Cannot modify files not in RepairPlan
3. ❌ Cannot modify outside allowed line ranges
4. ❌ Cannot add files
5. ❌ Cannot execute without FAILED VerificationResult
6. ✅ Deterministic execution hash
7. ❌ Halts immediately on first violation
8. ❌ Cannot retry on failure
9. ✅ Successful bounded repair
10. ✅ Execution log has hash

---

## Example Usage

```typescript
const repairPlan: ApprovedRepairPlan = {
  repairPlanId: '123e4567-e89b-12d3-a456-426614174000',
  repairPlanHash: 'abc123...', // SHA-256
  sourceVerificationHash: 'def456...', // FAILED verification
  actions: [
    {
      actionId: 'action-1',
      targetFile: 'src/calculator.ts',
      operation: 'replace_content',
      oldContent: 'return "this is a string, not a number"',
      newContent: 'return a * b',
      description: 'Fix type error in multiply function',
    },
  ],
  allowedFiles: ['src/calculator.ts'],
  constraints: {
    noNewFiles: true,
    noNewDependencies: true,
    noScopeExpansion: true,
  },
  approvedBy: 'human',
  approvedAt: '2026-01-14T12:00:00.000Z',
};

const agent = new RepairAgentHardened(prisma, conductor, logger);

const log = await agent.execute(
  appRequestId,
  repairPlan,
  '/workspace/path'
);

// log.status === 'SUCCESS'
// log.actionsExecuted === ['action-1']
// log.filesTouched === ['src/calculator.ts']
// log.executionHash === 'hash...'
```

---

## Success Criteria

This implementation PASSES ONLY IF:

> A failed verification can be repaired **only with explicit human authorization**, and the Repair Agent is **incapable of expanding or improvising**.

---

## Relationship to Other Agents

```
Human
  ↓ (reviews DraftRepairPlan)
  ↓ (selects ONE option)
  ↓ (approves RepairPlan)
  ↓
Repair Agent Hardened (Tier 5.75)
  → Executes EXACTLY approved actions
  → NO decisions
  → NO interpretation
  ↓
Verification Executor (Tier 5.0)
  → Re-verifies changes
  → PASSED or FAILED
  ↓
Completion Auditor (Tier 6)
  → Final verdict
```

---

## Constitutional Guarantees

1. **Zero Autonomy**
   - Every action requires human approval
   - No agent selects repair options

2. **Zero Silent Fixes**
   - All changes are explicit in RepairPlan
   - No "helpful" additions

3. **Zero Interpretation**
   - Agent executes EXACTLY what's specified
   - No intent inference

4. **Full Hash-Chain Integrity**
   - All inputs hash-locked
   - All outputs hash-locked
   - Tamper-evident

5. **Human Authority**
   - Human is the ONLY decision point
   - Agent is purely mechanical

---

## Final Note

Once Repair Agent Hardened is implemented:

✅ **Forge has a complete, safe, human-authorized self-repair loop**

After this, **no more safety agents are needed**. Only productization layers remain.

---

## References

- [Phase 10 Overview](./PHASE_10_OVERVIEW.md)
- [Repair Plan Generator](./REPAIR_PLAN_GENERATOR.md)
- [Verification Executor Hardened](./VERIFICATION_EXECUTOR_HARDENED.md)
- [Completion Auditor Hardened](./COMPLETION_AUDITOR_HARDENED.md)

---

**Document Version**: 1.0
**Last Updated**: January 14, 2026
**Status**: Production Hardened ✅
