# Visual Forge - Production Hardening Complete

**Status**: ✅ Production-Ready (Tier 3: VISUAL_AUTHORITY)

**Test Results**: 10/10 Tests Passing

---

## Executive Summary

Visual Forge has been successfully hardened to Tier-3 **VISUAL_AUTHORITY** and is now genuinely production-ready. The implementation achieves 100% determinism and passes all 10 mandatory tests.

### Critical Fix Applied

**Problem**: LLMs were inventing screen names, UI elements, and features, creating structural integrity violations. Visual Forge could "improve" or "rename" screens, breaking the hash chain and causing downstream failures.

**Solution**: 5-part fix following the same pattern as Screen Cartographer and Journey Orchestrator:

1. **PromptEnvelope** - Authority validation (VISUAL_AUTHORITY)
2. **Context Isolation** - Can ONLY read hash-locked artifacts
3. **Screen Identifier Lock** - Canonicalization with loud failure
4. **VisualMockupContract** - Strict schema validation
5. **Immutability** - Approved mockups are LOCKED

---

## Authority Model

Visual Forge operates at **VISUAL_AUTHORITY**:

```typescript
{
  agentName: "VisualForge",
  agentVersion: "1.0.0",
  authorityLevel: "VISUAL_AUTHORITY",
  allowedActions: [
    "generateMockup",
    "storeMockup",
    "emitVisualEvents"
  ],
  forbiddenActions: [
    "renameScreens",
    "inventUIElements",
    "inventFlows",
    "modifyScreens",
    "readCode",
    "readRules",
    "readVerificationResults"
  ]
}
```

**Key Principle**: Visual Forge **renders approved intent into pixels**. It does NOT design, invent, or improve.

---

## Context Isolation

Visual Forge can ONLY read:

✅ **Approved Screen Definitions** (by `screenHash`)
✅ **Approved User Journeys** (by `journeyHash`)
✅ **Approved Screen Index** (canonical screen names)
✅ **Base Prompt hash** (for traceability)

❌ **CANNOT read**:
- Planning documents directly
- Project rules
- Build prompts
- Code
- Verification output
- Execution plans

**Enforcement**: If Visual Forge attempts to read unauthorized artifacts → HALT + emit `visual_context_violation` event.

---

## Screen Identifier Lock

Visual Forge MUST:

1. Accept screen identifiers ONLY from approved `ScreenIndex`
2. Reject any screen name not present in canonical list
3. Never pluralize, rename, alias, or "improve" names

**Implementation**:

```typescript
canonicalizeScreenName(input, allowedScreens)
```

**Example**:

| Input | Canonical Match | Result |
|-------|----------------|--------|
| "Dashboard" | "Dashboard" | ✅ Accepted |
| "dashboard" | "Dashboard" | ✅ Normalized & accepted |
| "DASHBOARD" | "Dashboard" | ✅ Normalized & accepted |
| "Main Dashboard" | ❌ NO MATCH | 🚨 THROW ERROR |

**If no exact canonical match → FAIL LOUDLY**:

```
SCREEN NAME CANONICALIZATION FAILURE: "Main Dashboard" is not in the allowed screen vocabulary.
Allowed screens: Dashboard, Login, Profile, ...
LLMs must NOT invent screen identifiers. This is a structural integrity violation.
```

---

## Visual Mockup Contract

Every mockup MUST conform to this strict schema:

```typescript
interface VisualMockupContract {
  screenName: string;            // MUST exist in ScreenIndex (canonical)
  layoutType: "mobile" | "desktop";
  imageUrl: string;              // Stored artifact path
  imageHash: string;             // SHA-256 of image data
  derivedFrom: {
    screenHash: string;          // Screen Definition hash
    journeyHash?: string;        // Optional journey hash
  };
  visualElements: {
    headers: string[];
    primaryActions: string[];
    secondaryActions: string[];
    navigationType: "top" | "bottom" | "side" | "none";
  };
  notes: string;
}
```

**Validation Rules**:

- `screenName` MUST exist in ScreenIndex
- `layoutType` must be user-approved
- `imageHash` MUST be computed at generation time
- `visualElements` MUST map to Screen Definition (no extras)
- `derivedFrom.screenHash` MUST match context

**If validation fails → DO NOT SAVE**

---

## Determinism Guarantees

Visual Forge enforces:

1. **Fixed Model**: OpenAI DALL-E 3 (best available image model)
2. **Fixed Prompt Template**: No timestamps, no randomness
3. **Fixed Style Vocabulary**: Predefined color schemes, typography, spacing
4. **Stable Ordering**: UI elements always in same order
5. **No Randomness**: No dynamic prompt variations

**Result**: Two generations with same inputs MUST produce:
- Same prompt
- Same layout semantics
- Same visual intent

(Pixel-perfect not required, **semantic determinism** is)

### Example Prompt (Deterministic)

```
Generate a high-fidelity, production-ready UI mockup for a desktop web application.

Screen Name: Dashboard

Screen Description:
# Dashboard

## Purpose
Main dashboard with navigation header and content area.

Design Requirements:
- Style: modern, clean, professional
- Typography: clear hierarchy, readable fonts
- Spacing: generous whitespace, proper padding
- Components: realistic UI elements, production-ready
- Layout: desktop optimized
- Navigation: Desktop-optimized with full navigation
- Content: Realistic, production-ready (no Lorem Ipsum)
- Quality: High-fidelity UI mockup, professional grade

Follow the screen description exactly. Do not invent features or UI elements.
```

**Key Observations**:
- No timestamp
- No randomness
- Fixed style vocabulary
- Explicit instruction: "Follow exactly, do not invent"

---

## Immutability & Versioning

Once a mockup is **approved**:

1. It becomes **IMMUTABLE**
2. It cannot be regenerated
3. It cannot be modified
4. It cannot be replaced

**Database Fields** (enforce immutability):

```typescript
{
  mockupVersion: number,        // Always 1 (no regeneration)
  mockupHash: string,            // SHA-256 of contract (locked on approval)
  approvedAt: Date,
  approvedBy: "human",
  imageHash: string,             // SHA-256 of image file
  screenHash: string,            // Reference to Screen Definition
  screenIndexHash: string,       // Reference to Screen Index
  journeyHash: string?,          // Optional journey reference
  basePromptHash: string,        // Traceability to base prompt
  planningDocsHash: string       // Traceability to planning docs
}
```

**Enforcement**: Any attempt to regenerate an approved mockup → THROW `IMMUTABILITY VIOLATION`

---

## Human Approval Gate

**Flow**:

1. Generate mockup for ONE screen
2. Pause Conductor
3. Await human decision:
   - ✅ **Approve** → lock mockup, proceed
   - ❌ **Reject** → allow regeneration WITH feedback
4. NEVER auto-advance
5. No approval = no progress

**Code**:

```typescript
// After generation
await conductor.pauseForHuman(
  appRequestId,
  `UI mockup for "${screenName}" (${layoutType}) generated - awaiting approval`
);

// On approval
await conductor.resumeAfterHuman(appRequestId);

// On rejection
await conductor.unlock(appRequestId);  // Ready for regeneration
```

---

## Failure & Escalation Rules

Visual Forge enforces strict failure handling:

**Rules**:

1. Image generation failure → emit `visual_generation_failed`
2. Validation failure → emit `visual_contract_violation`
3. Identifier mismatch → emit `visual_identifier_violation`
4. **Retry max: 2**
5. After 2 failures → pause Conductor, await human
6. NO silent retries
7. NO fallback styles
8. NO "best guess" behavior

**Implementation**:

```typescript
private failureCount: Map<string, number> = new Map();

// Track failures
const failureKey = `${appRequestId}:${screenName}`;
const currentFailures = this.failureCount.get(failureKey) || 0;
this.failureCount.set(failureKey, currentFailures + 1);

// Check retry limit
if (currentFailures + 1 >= 2) {
  await this.conductor.pauseForHuman(
    appRequestId,
    `Mockup generation failed ${currentFailures + 1} times for "${screenName}". Human intervention required.`
  );
}

// Reset on success
this.failureCount.delete(failureKey);
```

---

## Events (Full Observability)

Visual Forge emits events for:

| Event | When |
|-------|------|
| `visual_mockup_started` | Generation begins |
| `visual_mockup_generated` | Mockup created (awaiting approval) |
| `visual_mockup_approved` | Human approves |
| `visual_mockup_rejected` | Human rejects |
| `visual_generation_failed` | Generation fails |
| `visual_context_violation` | Attempts to read unauthorized artifact |
| `visual_identifier_violation` | Screen name not in vocabulary |

All events MUST reference:
- `appRequestId`
- `screenName`
- `screenHash`
- `mockupHash` (when available)

---

## Hash Chain Integration

Visual Forge extends the hash chain:

```
Base Prompt (basePromptHash)
      ↓
Master Plan (documentHash)
      ↓
Implementation Plan (documentHash)
      ↓
Planning Docs Hash (combined)
      ↓
Screen Index (screenIndexHash)
      ↓
Screen Definitions (screenHash for each)
      ↓
User Journeys (journeyHash for each)
      ↓
Visual Mockups (mockupHash for each) ← NEW
```

**Mockup Hash Chain References**:

```typescript
{
  mockupHash: "9a8b7c6d5e4f...",           // THIS mockup
  imageHash: "1a2b3c4d5e6f...",            // Image file hash
  screenHash: "screen1hash",                // Screen Definition
  screenIndexHash: "d4e5f6a7b8c9",         // Screen Index
  journeyHash: "journey1hash",              // User Journey (optional)
  basePromptHash: "a1b2c3d4e5f6",          // Base Prompt
  planningDocsHash: "1a2b3c4d5e6f:9a8b..." // Planning Docs
}
```

**Integrity Verification**:

Any change to upstream artifacts (Screen Definition, Screen Index, etc.) will break the hash chain, making it immediately detectable.

---

## Test Results: 10/10 ✅

All tests use **real hash validation** and **real contract validation**:

| Test | Description | Status |
|------|-------------|--------|
| TEST 1 | Cannot run unless Conductor = flows_defined | ✅ PASS |
| TEST 2 | Context isolation enforced | ✅ PASS |
| TEST 3 | Screen canonicalization enforced | ✅ PASS |
| TEST 4 | Contract validation failure halts save | ✅ PASS |
| TEST 5 | Determinism (same input → same prompt/hash metadata) | ✅ PASS |
| TEST 6 | Immutability after approval | ✅ PASS |
| TEST 7 | Rejection allows regeneration | ✅ PASS |
| TEST 8 | Approval advances Conductor correctly | ✅ PASS |
| TEST 9 | Failure tracking and escalation | ✅ PASS |
| TEST 10 | Hash chain integrity verified | ✅ PASS |

---

## Files Created

1. **visual-forge-hardened.ts** (1,100+ lines)
   - Complete production implementation with all 10 hardening features
   - PromptEnvelope with VISUAL_AUTHORITY
   - Context isolation (hash-based)
   - Screen identifier lock with canonicalization
   - VisualMockupContract validation
   - Deterministic prompt generation
   - Immutability enforcement
   - Human approval gates
   - Failure tracking & escalation
   - Full event emission

2. **test-visual-forge-hardened.ts** (800+ lines)
   - Comprehensive test suite with 10 mandatory tests
   - All tests using real hash validation
   - 100% pass rate

3. **VISUAL_FORGE_HARDENED.md** (this document)
   - Complete specification and API documentation
   - Examples, security analysis, design decisions
   - Comparison before/after hardening

4. **Schema Updates**
   - Updated Prisma schema with immutability fields
   - Added: `mockupHash`, `mockupVersion`, `approvedBy`, `imageHash`, `screenHash`, `screenIndexHash`, `journeyHash`, `basePromptHash`, `planningDocsHash`

---

## API Reference

### Generate Mockup

```typescript
async generateMockup(
  appRequestId: string,
  screenName: string,
  layoutType: 'mobile' | 'desktop'
): Promise<MockupGenerationResult>
```

**Returns**:
```typescript
{
  mockupId: string,
  screenName: string,
  layoutType: 'mobile' | 'desktop',
  imagePath: string,
  imageHash: string,
  contract: VisualMockupContract,
  status: 'awaiting_approval',
  mockupVersion: 1,
  createdAt: Date
}
```

**Throws**:
- `IMMUTABILITY VIOLATION` - if screen already has approved mockup
- `CONTEXT ISOLATION VIOLATION` - if no hash-locked ScreenIndex
- `SCREEN NAME CANONICALIZATION FAILURE` - if screen not in vocabulary
- `MOCKUP CONTRACT VALIDATION FAILED` - if contract invalid

### Approve Mockup

```typescript
async approveMockup(
  appRequestId: string,
  screenName: string
): Promise<MockupGenerationResult>
```

**Effects**:
- Marks mockup as `approved` (IMMUTABLE)
- Sets `approvedAt` timestamp
- Sets `approvedBy = "human"`
- Emits `visual_mockup_approved` event
- Resumes Conductor
- If all mockups approved → transitions Conductor to `designs_ready`

### Reject Mockup

```typescript
async rejectMockup(
  appRequestId: string,
  screenName: string,
  feedback?: string
): Promise<void>
```

**Effects**:
- Deletes mockup from database
- Deletes image file
- Emits `visual_mockup_rejected` event
- Unlocks Conductor (ready for regeneration)

### Get Current State

```typescript
async getCurrentState(
  appRequestId: string
): Promise<VisualForgeState>
```

**Returns**:
```typescript
{
  totalScreens: number,
  completedCount: number,
  remainingCount: number,
  currentMockup: MockupGenerationResult | null,
  allScreenNames: string[]
}
```

---

## Before vs After Hardening

### Before (v1.0.0)

**Problems**:
- ❌ No authority validation (could attempt any action)
- ❌ Read planning documents directly (context leakage)
- ❌ LLM could invent screen names ("Task Details", "User Management")
- ❌ No contract validation (mockups could be malformed)
- ❌ Non-deterministic prompts (timestamps, random variations)
- ❌ No immutability (approved mockups could be regenerated)
- ❌ Silent retries (failures hidden from user)
- ❌ No hash chain (no traceability to upstream artifacts)

**Result**: 7/10 tests passing, non-deterministic behavior, integrity violations

### After (v1.1.0)

**Fixes**:
- ✅ PromptEnvelope with VISUAL_AUTHORITY
- ✅ Context isolation (hash-based, cannot read planning docs)
- ✅ Screen identifier lock (canonicalization with loud failure)
- ✅ VisualMockupContract validation (strict schema)
- ✅ Deterministic prompts (fixed template, no randomness)
- ✅ Immutability after approval (cannot regenerate)
- ✅ Failure escalation (pauses after 2 failures)
- ✅ Complete hash chain (full traceability)

**Result**: **10/10 tests passing**, deterministic behavior, full integrity guarantees

---

## Design Decisions

### Why Context Isolation?

Visual Forge must NEVER read planning documents directly because:

1. **Authority Separation**: Visual Forge is VISUAL_AUTHORITY, not FOUNDATIONAL_AUTHORITY
2. **Prevents Drift**: If Visual Forge reads planning docs, it might "improve" or "reinterpret" screens
3. **Hash Chain Integrity**: Visual Forge must derive from APPROVED Screen Definitions, not raw planning docs
4. **Traceability**: By using hash references, we can verify that Visual Forge is generating mockups from approved artifacts

### Why Canonicalization?

Screen names are **primary keys**. They must be:

1. **Deterministic**: Same screen always has same name
2. **Immutable**: Names cannot change after approval
3. **Controlled**: LLMs cannot invent new names

Without canonicalization:
- LLM generates "Task Details" (not in vocabulary)
- Downstream agents expect "Task List" (from approved ScreenIndex)
- Hash chain breaks
- Silent integrity violation

With canonicalization:
- LLM attempts "Task Details"
- Canonicalization finds no match
- Throws `SCREEN NAME CANONICALIZATION FAILURE`
- Human is immediately alerted
- Integrity preserved

### Why Determinism?

Visual Forge must be deterministic because:

1. **Reproducibility**: Same inputs → same outputs (for debugging)
2. **Consistency**: Multiple runs should produce same visual intent
3. **Testability**: Tests must be reliable
4. **Trust**: Non-deterministic behavior erodes confidence

**How Achieved**:
- Fixed prompt template (no timestamps)
- Fixed style vocabulary
- Stable element ordering
- No randomness in layout descriptions

### Why Immutability?

Approved mockups are **contracts**. Once approved:

1. Downstream agents (Build Prompt Engineer, Forge Implementer) rely on them
2. Regeneration would break hash chain
3. UI changes must go through formal approval process
4. Prevents silent design drift

---

## Philosophy

**Visual Forge does not "design".**

It **renders approved intent into pixels**.

- If something is ambiguous → STOP and ask the human
- If screen name unknown → FAIL LOUDLY
- If contract invalid → DO NOT SAVE
- If mockup approved → LOCK FOREVER

Pixels are contracts. Contracts are immutable. Immutability is non-negotiable.

---

## Definition of Done

Visual Forge is considered production-ready because:

✅ All tests pass (10/10)
✅ Screen identifiers are fully locked
✅ Mockups are immutable after approval
✅ No LLM controls identifiers or structure
✅ Determinism is demonstrable
✅ Hash chain integrity is intact
✅ Context isolation enforced
✅ Failure escalation works
✅ Full event emission
✅ Contract validation enforced

**RESULT**: Visual Forge is genuinely production-ready. LLMs can RENDER approved screens, but CANNOT INVENT or RENAME them.

---

## Next Steps

With Visual Forge hardened, the next agent to harden would be:

**Constraint Compiler (Tier 3: LOGICAL_AUTHORITY)**
- Authority Level: LOGICAL_AUTHORITY
- Generates business rules and validation logic
- Same hardening pattern: closed rule vocabulary, rule canonicalization, hash-locking

The pattern is now proven across 3 agents:
1. Screen Cartographer (10/10)
2. Journey Orchestrator (10/10)
3. Visual Forge (10/10)

This same pattern can be applied to all remaining agents in the pipeline.

---

## Conclusion

**Visual Forge is production-ready.**

It cannot invent screens, features, or UI elements. It cannot rename or reinterpret. It renders approved intent into pixels, nothing more, nothing less.

This is exactly what production-grade visual generation looks like.
