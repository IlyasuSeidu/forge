# Repair Plan Generator (Human-in-the-Loop)

**Tier**: 5.5 (Post-Verification, Pre-Repair)
**Authority**: REPAIR_PLANNING_AUTHORITY
**Intelligence Level**: LIMITED (analysis only)
**Autonomy**: NONE
**Execution Power**: NONE
**Status**: ✅ Implemented (January 13, 2026)
**Test Coverage**: 10/10 passing

---

## Purpose

The Repair Plan Generator is a **decision-support agent** that assists humans in responding to verification failures. This agent exists to reduce cognitive load, not responsibility.

**This agent does NOT**:
- ❌ Execute repairs
- ❌ Modify code
- ❌ Approve anything
- ❌ Fix anything
- ❌ Choose the "best" option
- ❌ Generate code
- ❌ Rank options beyond risk labels

**This agent ONLY**:
- ✅ Reads FAILED VerificationResult
- ✅ Explains why verification failed
- ✅ Proposes minimal repair candidates
- ✅ Emits Draft Repair Plan (unapproved)
- ✅ Pauses for human decision

> **CRITICAL**: If this agent executes code, Forge is compromised.

---

## Constitutional Position

| Property | Value |
|----------|-------|
| Tier | 5.5 |
| Authority | REPAIR_PLANNING_AUTHORITY |
| Intelligence | LIMITED (analysis only) |
| Autonomy | NONE |
| Execution Power | NONE |
| Default State | DISABLED |

**Executes AFTER**: Verification Executor (when verification FAILS)
**BEFORE**: Repair Agent (human must approve first)
**FEEDS**: Humans (not machines)

---

## Hard Preconditions (ALL REQUIRED)

The Repair Plan Generator **MUST HALT** unless:

1. ✅ A VerificationResult exists
2. ✅ `overallStatus === 'FAILED'`
3. ✅ VerificationResult is hash-locked
4. ✅ No CompletionDecision exists
5. ✅ Conductor state is `verification_failed`

If any condition fails → **THROW + HALT**

---

## Forbidden Actions (ABSOLUTE)

The Repair Plan Generator **MUST NEVER**:

- ❌ Modify code
- ❌ Execute commands
- ❌ Change verification criteria
- ❌ Add dependencies
- ❌ Invent new fixes
- ❌ Suggest architectural changes
- ❌ Suggest refactors
- ❌ Approve plans
- ❌ Trigger Repair Agent
- ❌ Retry verification
- ❌ Choose the best option
- ❌ Rank options beyond risk labels
- ❌ Generate code
- ❌ Guess root causes without evidence

This agent **analyzes and proposes only**.

---

## Allowed Actions (LIMITED)

The agent may **ONLY**:

1. ✅ Read FAILED VerificationResult
2. ✅ Read hash-approved BuildPrompt
3. ✅ Read hash-approved ExecutionPlan
4. ✅ Explain why verification failed
5. ✅ Propose minimal repair candidates
6. ✅ Emit a Draft Repair Plan
7. ✅ Pause for human decision

---

## Core Output: Draft Repair Plan (UNAPPROVED)

The Repair Plan Generator produces a **DraftRepairPlan**.

⚠️ **This plan is NOT executable**
⚠️ **This plan has NO authority**
⚠️ **It becomes valid ONLY after human approval**

### DraftRepairPlan Contract

```typescript
interface DraftRepairPlan {
  draftPlanId: string;
  sourceVerificationHash: string;

  // Failure Analysis
  failureSummary: {
    failedStep: string;
    expected: string;
    actual: string;
    evidence: string; // excerpt from verification output
  };

  // Repair Candidates (multiple options for human choice)
  candidateRepairs: CandidateRepair[];

  // Constraints
  constraints: {
    noNewFiles: true;
    noNewDependencies: true;
    noScopeExpansion: true;
  };

  // Human Decision Required
  requiresHumanSelection: true;

  // Metadata
  generatedAt: string; // ISO8601 (excluded from hash)
  draftPlanHash: string; // SHA-256
}

interface CandidateRepair {
  optionId: number;
  description: string; // What is wrong (not HOW to code it)
  filesImpacted: string[]; // Files that would need changes
  intent: string; // WHAT needs to happen (not implementation)
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  justification: string; // Why this option addresses the failure
}
```

---

## Intelligence Boundaries (CRITICAL)

### The agent CAN:
- ✅ Explain failures using evidence only
- ✅ Map failures → affected files
- ✅ Suggest multiple bounded options (if applicable)

### The agent MUST NOT:
- ❌ Choose the best option
- ❌ Rank options beyond risk labels
- ❌ Generate code
- ❌ Guess root causes without evidence

> **Philosophy**: This agent illuminates. The human decides.

---

## Human Workflow (MANDATORY)

1. Repair Plan Generator emits `DraftRepairPlan`
2. System pauses with reason: `repair_plan_review`
3. Human:
   - Selects ONE option **OR**
   - Rejects all options **OR**
   - Manually edits into a final RepairPlan
4. Human approval creates a `RepairPlan` (hash-locked)
5. **ONLY THEN** may the Hardened Repair Agent run

---

## Relationship to Repair Agent

| Component | Authority |
|-----------|-----------|
| Repair Plan Generator | Suggests |
| Human | Decides |
| Repair Agent | Executes blindly |

**The Repair Agent MUST**:
- ❌ Reject `DraftRepairPlan`
- ✅ Accept ONLY approved `RepairPlan`

---

## Context Isolation

### Repair Plan Generator may read:
- ✅ VerificationResult (FAILED)
- ✅ BuildPrompt (hash-approved)
- ✅ ExecutionPlan (hash-approved)

### It may NOT read:
- ❌ Planning docs
- ❌ Screens
- ❌ Journeys
- ❌ Visual contracts
- ❌ Rules
- ❌ Previous repairs

---

## Execution Flow

```
┌─────────────────────────────────────────┐
│ FAILED VerificationResult               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 1: Validate Preconditions          │
│  - VerificationResult exists?            │
│  - Status === FAILED?                    │
│  - Hash-locked?                          │
│  - No CompletionDecision exists?         │
│  - Conductor state === verification_failed?│
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 2: Read Failure Evidence           │
│  - VerificationResult (FAILED)           │
│  - BuildPrompt (hash-approved)           │
│  - ExecutionPlan (hash-approved)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 3: Explain Failure                 │
│  - Parse failed step from result         │
│  - Extract evidence (stderr/stdout)      │
│  - Create failure summary                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 4: Propose Repair Candidates       │
│  - Analyze failure patterns              │
│  - Extract files in scope from BuildPrompt│
│  - Generate 1-3 bounded options          │
│  - Assign risk levels                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 5: Emit DraftRepairPlan            │
│  - Compute deterministic hash            │
│  - Persist draft plan                    │
│  - Mark as requiresHumanSelection: true  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ STEP 6: Pause for Human Decision        │
│  - Conductor pauses                      │
│  - Human reviews options                 │
│  - Human selects ONE option              │
│  - Human approval creates RepairPlan     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ Approved RepairPlan                      │
│ (Ready for Repair Agent)                 │
└─────────────────────────────────────────┘
```

---

## Test Requirements (10/10 PASSING)

| Test # | Description | Status |
|--------|-------------|--------|
| 1 | Cannot run without FAILED VerificationResult | ✅ PASS |
| 2 | Cannot produce executable actions | ✅ PASS |
| 3 | Cannot generate code snippets | ✅ PASS |
| 4 | Candidate repairs reference evidence | ✅ PASS |
| 5 | Candidate repairs bounded to existing files | ✅ PASS |
| 6 | No dependency suggestions allowed | ✅ PASS |
| 7 | Human selection required | ✅ PASS |
| 8 | Draft plan is NOT executable | ✅ PASS |
| 9 | Hash determinism of draft output | ✅ PASS |
| 10 | Approved RepairPlan required for execution | ✅ PASS |

**Test Command**:
```bash
DATABASE_URL="file:./prisma/dev.db" npx tsx apps/server/test-repair-plan-generator.ts
```

---

## Philosophy (NON-NEGOTIABLE)

> "The system may explain failure.
> Only a human may authorize correction."

This agent exists to **reduce cognitive load, not responsibility**.

---

## Final Safety Clause

If the Repair Plan Generator ever:
- Approves a plan
- Executes a fix
- Narrows to a single option
- Generates code

Then **Forge's constitutional guarantees are broken**.

---

## What This Completes

With this agent, Forge now has:

1. **Detection** (Verification Executor)
2. **Explanation** (Repair Plan Generator) ⭐ **NEW**
3. **Authorization** (Human) ⭐ **NEW**
4. **Correction** (Hardened Repair Agent) - Coming soon
5. **Re-Verification** (Verification Executor again)
6. **Judgment** (Completion Auditor)

**This is the only safe closed loop.**

---

## Public API

### `generate(appRequestId: string): Promise<string>`

**Purpose**: Generate a draft repair plan for a failed verification.

**Preconditions**:
- VerificationResult exists with `overallStatus === 'FAILED'`
- VerificationResult is hash-locked
- No CompletionDecision exists
- Conductor state is `verification_failed`

**Returns**: `draftPlanId` (UUID)

**Throws**:
- `PRECONDITION VIOLATION` if any precondition fails
- `CONTEXT ISOLATION VIOLATION` if required context is missing
- `ACTION VIOLATION` if forbidden action is attempted

**Example**:
```typescript
const generator = new RepairPlanGenerator(prisma, conductor, logger);
const draftPlanId = await generator.generate(appRequestId);

// System pauses for human decision
// Human reviews DraftRepairPlan
// Human selects one option
// Human approval creates approved RepairPlan
```

---

## Implementation Notes

### Hash Determinism
- Excludes `generatedAt` (timestamp) from hash computation
- Same failure → same DraftRepairPlan → same `draftPlanHash`

### Candidate Repair Generation
The agent analyzes failure evidence to propose options:

1. **Syntax Errors**: If stderr contains "SyntaxError" or "error"
   - Option: "Fix syntax or type errors in generated files"
   - Risk: LOW

2. **Missing Modules**: If stderr contains "Cannot find module" or "not found"
   - Option: "Fix import paths or module references"
   - Risk: MEDIUM

3. **Generic**: Fallback if no specific pattern detected
   - Option: "Fix implementation errors causing verification failure"
   - Risk: MEDIUM

All options are bounded to files from BuildPrompt scope (no new files, no new dependencies).

---

## Integration with Phase 10

The Repair Plan Generator completes the Phase 10 closed loop:

```
Rules → BuildPrompt → ExecutionPlan → ForgeImplementer
  ↓
VerificationExecutor (FAILED)
  ↓
RepairPlanGenerator → DraftRepairPlan
  ↓
[HUMAN APPROVAL GATE] ⭐
  ↓
RepairPlan (approved)
  ↓
RepairAgent (bounded correction)
  ↓
VerificationExecutor (re-verify)
  ↓
CompletionAuditor (final verdict)
```

**Human approval is the constitutional safety valve.**

---

## Production Readiness

- ✅ 10/10 constitutional tests passing
- ✅ PromptEnvelope validation
- ✅ Context isolation enforced
- ✅ Hash determinism verified
- ✅ No execution power
- ✅ No autonomy
- ✅ Human decision required
- ✅ Immutable audit trail

**Status**: Ready for production use

---

*Last Updated: January 13, 2026*
*Agent Count: 16 (15 + Repair Plan Generator)*
*Phase 10 Status: Constitutional loop complete*
