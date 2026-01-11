# Completion Auditor - Decision Authority Agent

## Overview

The **Completion Auditor** is a Tier 5 Decision Authority Agent that serves as **the final arbiter of build progress** after each verification cycle.

This agent does NOT:
- Execute code
- Modify files
- Generate plans
- Repair failures
- Bypass verification

This agent ONLY:
- Reads verification results
- Classifies errors
- Makes decisions based on strict rules
- Records decisions
- Emits events

**This is the judge, not the builder.**

## Why This Agent Exists

### Without Completion Auditor

```
Verification completes → ???
                         ↓
           Who decides what happens next?
           Is the decision explicit?
           Is it auditable?
           Is it deterministic?
```

**Problems**:
- Decisions are implicit and fragile
- No audit trail
- Non-deterministic behavior
- Hard to debug failures

### With Completion Auditor

```
Verification completes
        ↓
Completion Auditor
        ↓
EXPLICIT DECISION (one of 5 options)
        ↓
Recorded in database
        ↓
Event emitted
        ↓
System proceeds with confidence
```

**Benefits**:
- Every decision is explicit
- Complete audit trail
- Deterministic (same input → same decision)
- Easy to debug and trace

## The 5 Decision Rules

Completion Auditor applies exactly 5 rules in order. The first matching rule wins.

### RULE 1: Verification Passed + Next Unit Exists → Proceed

```typescript
if (verification.status === 'passed' && hasPendingUnits) {
  return { type: 'proceed_to_next_unit' };
}
```

**Meaning**: Current unit verified successfully, continue to next unit in sequence.

**Example**:
```
Unit 0: ✅ Verified
Unit 1: ⏳ Pending
Unit 2: ⏳ Pending

Decision: Proceed to Unit 1
```

### RULE 2: Verification Passed + No More Units → Completed

```typescript
if (verification.status === 'passed' && !hasPendingUnits) {
  return { type: 'mark_completed' };
}
```

**Meaning**: All units verified successfully, build is complete.

**Example**:
```
Unit 0: ✅ Verified
Unit 1: ✅ Verified
Unit 2: ✅ Verified (last unit)

Decision: Mark build as COMPLETED
```

### RULE 3: Verification Failed + Repairable Error + Budget Available → Retry

```typescript
if (
  verification.status === 'failed' &&
  errorClassification === 'repairable' &&
  repairAttempts < MAX_REPAIR_ATTEMPTS
) {
  return { type: 'retry_with_repair' };
}
```

**Meaning**: Verification failed with a fixable error, and we haven't exhausted retry budget.

**Example**:
```
Verification: ❌ Failed
Error: "Missing DOM ID: login-button"
Classification: Repairable
Attempts: 1 / 3

Decision: Retry with repair
```

### RULE 4: Verification Failed + Repair Exhausted → Escalate

```typescript
if (
  verification.status === 'failed' &&
  repairAttempts >= MAX_REPAIR_ATTEMPTS
) {
  return {
    type: 'escalate_to_human',
    reason: 'Maximum automated repair attempts reached'
  };
}
```

**Meaning**: We've tried to fix this 3 times and it's still failing. Human intervention needed.

**Example**:
```
Verification: ❌ Failed
Error: "Missing file: src/utils.ts"
Attempts: 3 / 3 (MAX)

Decision: Escalate to human
```

### RULE 5: Verification Failed + Non-Repairable Error → Failed

```typescript
if (
  verification.status === 'failed' &&
  errorClassification === 'non_repairable'
) {
  return {
    type: 'mark_failed',
    reason: 'Non-repairable verification failure: ...'
  };
}
```

**Meaning**: This error cannot be automatically fixed. Build failed.

**Example**:
```
Verification: ❌ Failed
Error: "Security violation: attempted to access /etc/passwd"
Classification: Non-repairable

Decision: Mark build as FAILED
```

## Error Classification

Completion Auditor must classify all verification errors into one of two categories:

### Repairable Errors

These can be fixed automatically:

- Missing DOM IDs
- JavaScript runtime errors
- Missing files
- Incorrect imports
- Simple logic errors
- Path issues
- Undefined variables
- Compilation errors

**Pattern matching**:
```typescript
/missing\s+dom\s+id/i
/runtime\s+error/i
/missing\s+file/i
/incorrect\s+import/i
/logic\s+error/i
/path\s+issue/i
```

### Non-Repairable Errors

These require human intervention:

- Security violations
- RuleSet violations
- Architectural conflicts
- Data loss risks
- Unauthorized dependency changes
- Mutations outside execution contract
- Forbidden file modifications

**Pattern matching**:
```typescript
/security\s+violation/i
/ruleset\s+violation/i
/architectural\s+conflict/i
/data\s+loss/i
/unauthorized\s+dependency/i
/mutation\s+outside\s+contract/i
```

**Default**: If no pattern matches, assume **repairable** (conservative approach).

## Audit Flow

```
┌─────────────────────────────────────────────┐
│  1. Validate Preconditions                 │
│     - Conductor in verifying/building      │
│     - Verification record exists           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  2. Get Latest Verification                │
│     - Read verification status             │
│     - Read errors (if failed)              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  3. Get Current Execution Unit             │
│     - Find completed/in_progress unit      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  4. Apply Decision Rules (RULE 1-5)        │
│     - Match first applicable rule          │
│     - Classify errors if needed            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  5. Record Decision in Database            │
│     - Create CompletionDecision record     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  6. Emit Event (exactly ONE)               │
│     - completion_audit_passed              │
│     - completion_audit_retry               │
│     - completion_audit_escalated           │
│     - completion_audit_completed           │
│     - completion_audit_failed              │
└─────────────────────────────────────────────┘
                    ↓
              Return Decision
```

## Database Model

```prisma
model CompletionDecision {
  id              String     @id
  appRequestId    String
  executionUnitId String?
  decisionType    String     // The decision made
  reason          String?    // Why (for escalate/failed)
  createdAt       DateTime   @default(now())

  appRequest      AppRequest @relation(...)

  @@index([appRequestId])
  @@index([decisionType])
  @@index([createdAt])
}
```

**Purpose**: Complete audit trail of all decisions made during build process.

## Events

Completion Auditor emits exactly ONE event per audit:

| Decision Type | Event Emitted |
|--------------|---------------|
| `proceed_to_next_unit` | `completion_audit_passed` |
| `retry_with_repair` | `completion_audit_retry` |
| `escalate_to_human` | `completion_audit_escalated` |
| `mark_completed` | `completion_audit_completed` |
| `mark_failed` | `completion_audit_failed` |

**Event payload**:
```json
{
  "appRequestId": "...",
  "executionUnitId": "..." (or null),
  "decisionType": "proceed_to_next_unit",
  "reason": null (or string for escalate/failed)
}
```

## Conductor Integration

Completion Auditor **does NOT transition the Conductor directly**.

Instead, it returns a decision, and the calling system (likely the Conductor itself) takes action:

| Decision | Conductor Action |
|----------|------------------|
| `proceed_to_next_unit` | Remains in `building` state |
| `retry_with_repair` | Remains in `verifying` state |
| `escalate_to_human` | Calls `pauseForHuman()` |
| `mark_completed` | Transition to `completed` |
| `mark_failed` | Transition to `failed` |

**Why**: Separation of concerns. Auditor decides, Conductor acts.

## Hard Prohibitions

The Completion Auditor is **READ-ONLY**. It must NEVER:

### ❌ Execute Code
```typescript
private async executeCode(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

### ❌ Modify Files
```typescript
private async modifyFiles(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

### ❌ Skip Verification
```typescript
private async skipVerification(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

### ❌ Advance Execution Directly
```typescript
private async advanceExecutionDirectly(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

### ❌ Change Project Rules
```typescript
private async changeProjectRules(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

### ❌ Invent Decisions
```typescript
private async inventDecision(): Promise<never> {
  throw new Error('PROHIBITION VIOLATED');
}
```

**Any violation must fail HARD and immediately.**

## Determinism Guarantee

Completion Auditor is **deterministic**:

```
Same Input → Same Decision
```

**Input**:
- Verification status
- Error message (if failed)
- Repair attempt count
- Pending units count

**Output**:
- Exactly ONE decision
- Same decision every time for same input

**Why this matters**: Manufacturing-grade systems must be predictable. No randomness, no creativity, no interpretation.

## API Reference

### `audit(appRequestId: string): Promise<AuditorDecision>`

Analyzes the current state and returns exactly ONE decision.

**Preconditions**:
- Conductor state = `verifying` or `building`
- Verification record exists

**Returns**: One of 5 decision types

**Side Effects**:
- Creates CompletionDecision database record
- Emits exactly ONE event
- **Does NOT** modify Conductor state
- **Does NOT** modify execution units
- **Does NOT** modify any files

**Throws**:
- If preconditions fail
- If no verification found
- If any prohibited action attempted

## Testing

All tests pass (10/10):

✅ Verification passed + next unit → proceed
✅ Verification passed + no units → completed
✅ Verification failed + repair available → retry
✅ Verification failed + repair exhausted → escalate
✅ Verification failed + non-repairable → failed
✅ Auditor never mutates state
✅ Auditor emits exactly one event
✅ Auditor is deterministic
✅ Error classification works correctly
✅ Decision recorded in database

See: [apps/server/test-completion-auditor.ts](../apps/server/test-completion-auditor.ts)

## How This Closes the Loop

Before Completion Auditor:
```
Intent → Design → Rules → Execution → Verification → ???
```

After Completion Auditor:
```
Intent → Design → Rules → Execution → Verification → Decision → Next Action
                                                        ↑
                                                  Explicit, auditable,
                                                  deterministic
```

**This completes the manufacturing loop.**

## Comparison with Traditional AI Builders

| Aspect | Traditional AI | Forge with Completion Auditor |
|--------|---------------|-------------------------------|
| **Decisions** | Implicit, hidden in code | Explicit, recorded in DB |
| **Auditability** | None | Complete trail |
| **Determinism** | Non-deterministic | Deterministic rules |
| **Transparency** | Black box | Every decision visible |
| **Debugging** | Hard (no visibility) | Easy (trace decisions) |
| **Trust** | Faith-based | Evidence-based |

## Related Documentation

- [Forge Implementer](./FORGE_IMPLEMENTER.md) - Executes units (Tier 5)
- [Execution Planner](./EXECUTION_PLANNER.md) - Decomposes into units (Tier 4)
- [Verification Agent](./VERIFICATION_AGENT.md) - Verifies execution (Tier 6)

---

**Key Principle**: Completion Auditor is the judge, not the builder. It decides based on evidence (verification results), not creativity. This is how manufacturing-grade governance is achieved.

**The Iron Law**: Read ONLY. Decide based on RULES. Emit exactly ONE decision. Never bypass verification. Never invent behavior.
