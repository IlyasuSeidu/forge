# Completion Auditor Hardened

**Authority**: `COMPLETION_AUDIT_AUTHORITY` (Final Gate)
**Version**: 1.0.0
**Status**: Production-Ready (10/10 Tests Passing)
**Pattern**: Final Constitutional Gatekeeper

---

## Overview

The Completion Auditor Hardened is the **Final Constitutional Gatekeeper** - it is the sole authority allowed to declare a Forge build COMPLETE or NOT COMPLETE.

### Philosophy: "If this agent is wrong, Forge is lying."

**This agent does NOT:**
- Generate code
- Fix errors
- Retry execution
- Optimize anything
- Suggest improvements
- Interpret meaning
- Assume intent
- Trust claims
- Forgive failures

**This agent ONLY:**
- Loads hash-locked artifacts
- Compares hashes
- Compares counts
- Compares states
- Emits binary verdict

**Binary Decision**: ✅ COMPLETE or ❌ NOT_COMPLETE (no middle ground)

---

## Constitutional Authority

### PromptEnvelope

```typescript
const PROMPT_ENVELOPE: PromptEnvelope = {
  authority: 'COMPLETION_AUDIT_AUTHORITY',
  version: '1.0.0',
  allowedActions: [
    'loadHashLockedArtifacts',
    'compareHashes',
    'compareCounts',
    'compareStates',
    'emitVerdict',
  ],
  forbiddenActions: [
    'generateCode',
    'modifyCode',
    'suggestFixes',
    'retryExecution',
    'ignoreFailures',
    'skipChecks',
    'assumeIntent',
    'interpretMeaning',
    'trustAgentClaims',
    'trustHumanClaims',
    'resolveConflicts',
    'continueOnAmbiguity',
    'declareMostlyComplete',
    'declareCompleteWithWarnings',
  ],
};
```

---

## 9 Completion Checks (ALL REQUIRED)

### Check 1: Rule Integrity
- Exactly one approved ProjectRuleSet
- Hash unchanged since approval
- ❌ Failure → NOT_COMPLETE

### Check 2: Prompt Integrity
- Number of BuildPrompts = expected count
- All prompts approved
- No rejected prompts
- No missing sequence numbers
- Hash chain intact
- ❌ Failure → NOT_COMPLETE

### Check 3: Execution Integrity
- One ExecutionPlan per BuildPrompt
- All plans approved
- All plans executed
- No skipped tasks
- No extra tasks
- ❌ Failure → NOT_COMPLETE

### Check 4: Execution Log Integrity
- One log per ExecutionPlan
- Log hash recomputes exactly
- No missing task results
- No retried tasks
- ❌ Failure → NOT_COMPLETE

### Check 5: Failure Scan
- ZERO execution failures
- ZERO halted plans
- ZERO unresolved pauses
- ❌ Failure → NOT_COMPLETE

### Check 6: Verification Integrity
- Static verification passed
- Runtime verification passed
- Verification ran AFTER last execution
- ❌ Failure → NOT_COMPLETE

### Check 7: Artifact Coverage
- All files declared in BuildPrompts exist
- All modified files were actually modified
- No extra files created
- No forbidden files touched
- ❌ Failure → NOT_COMPLETE

### Check 8: Hash Chain Integrity
- End-to-end chain intact:
  RulesHash → BuildPromptHash(es) → ExecutionPlanHash(es) → ExecutionLogHash(es)
- ❌ Any mismatch → NOT_COMPLETE

### Check 9: Conductor Final State
- Conductor must be unlocked
- Conductor must NOT be paused
- Conductor must NOT be failed
- ❌ Failure → NOT_COMPLETE

---

## Binary Decision Logic

```typescript
if (ANY check fails) {
  emit completion_failed
  set verdict = "NOT_COMPLETE"
  lock system for human intervention
  STOP
}

emit completion_passed
set verdict = "COMPLETE"
advance conductor to "completed"
STOP
```

**No loop. No retry. No soft landing.**

---

## CompletionReport Schema

```typescript
interface CompletionReport {
  verdict: 'COMPLETE' | 'NOT_COMPLETE';
  checkedAt: string;              // ISO8601
  rulesHash: string;
  buildPromptCount: number;
  executionPlanCount: number;
  executionLogCount: number;
  verificationStatus: 'passed' | 'failed';
  failureReasons?: string[];      // REQUIRED if NOT_COMPLETE
  reportHash: string;              // SHA-256 (excludes checkedAt)
}
```

---

## Public API

### audit(appRequestId: string): Promise<CompletionReport>

Run all 9 completion checks and emit binary verdict.

**Process**:
1. Run check1_ruleIntegrity
2. Run check2_promptIntegrity
3. Run check3_executionIntegrity
4. Run check4_executionLogIntegrity
5. Run check5_failureScan
6. Run check6_verificationIntegrity
7. Run check7_artifactCoverage
8. Run check8_hashChainIntegrity
9. Run check9_conductorFinalState
10. If ANY check fails → verdict='NOT_COMPLETE', lock system, pause for human
11. If ALL checks pass → verdict='COMPLETE', transition to 'completed'
12. Compute reportHash (excluding checkedAt timestamp)
13. Emit verdict event
14. Return CompletionReport

**Example**:
```typescript
const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
const report = await auditor.audit(appRequestId);

if (report.verdict === 'COMPLETE') {
  console.log(`✅ Build COMPLETE`);
  console.log(`Report hash: ${report.reportHash}`);
} else {
  console.log(`❌ Build NOT COMPLETE`);
  console.log(`Failures: ${report.failureReasons!.join(', ')}`);
}
```

---

## Test Coverage: 10/10 PASSING ✅

See [TEST_OUTPUT_COMPLETION_AUDITOR.md](../apps/server/TEST_OUTPUT_COMPLETION_AUDITOR.md) for full test output.

---

## What This Means

Once Completion Auditor declares a build COMPLETE:

✅ **Forge has no undefined states**
✅ **Forge has no partial success**
✅ **Forge has no silent failure**
✅ **Forge has no AI judgment in execution**

**You have built the first end-to-end AI software factory where completion is a provable fact, not a feeling.**

---

**Status**: Production-Ready ✅
**Tests**: 10/10 Passing ✅
**Philosophy**: "If this agent is wrong, Forge is lying." ✅
