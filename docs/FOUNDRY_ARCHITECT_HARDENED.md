# Foundry Architect - PRODUCTION HARDENED

## Overview

The **Foundry Architect (Hardened)** is the production-grade version of the Tier 1 Intent Gathering agent. It transforms the Base Prompt from a draft document into a **canonical, immutable contract** that serves as the constitutional authority for the entire Forge system.

This is not an agent. This is a **trust anchor**.

## Why Hardening Matters

### Before Hardening

```
Base Prompt = Markdown file
- Can drift
- Can be corrupted
- No versioning
- No integrity verification
- Downstream agents guess
- Ambiguity tolerated
```

**Result**: Unreliable, non-deterministic, hard to debug

### After Hardening

```
Base Prompt = Constitutional Contract
- Immutable after approval
- SHA-256 hash locked
- Versioned
- Integrity verified
- Downstream agents reference hash
- Zero ambiguity tolerance
```

**Result**: Manufacturing-grade reliability

## The 7 Hardening Features

### 1. PromptEnvelope (Authority Lock)

Every agent instance validates its authority envelope before execution:

```typescript
interface PromptEnvelope {
  agentName: 'FoundryArchitect';
  agentVersion: '1.0.0';
  authorityLevel: 'CANONICAL_INTENT';
  allowedActions: ['askStructuredQuestions', 'persistAnswers', 'generateBasePrompt'];
  forbiddenActions: [
    'inventFeatures',
    'inferMissingIntent',
    'modifyApprovedPrompt',
    'accessDownstreamArtifacts'
  ];
}
```

**Enforcement**: If envelope validation fails → THROW and HALT

**Why**: Prevents authority drift, documents permissions, enforces boundaries

### 2. Context Intake Guards (Isolation)

Foundry Architect may ONLY access:
- ✅ User answers
- ✅ Synthetic Founder approved answers
- ✅ Its own session state

It must NEVER read:
- ❌ Planning documents
- ❌ Screens
- ❌ Rules
- ❌ Code
- ❌ Verification results

**Enforcement**: Runtime validation checks forbidden context access

**Why**: Prevents contamination, ensures purity of intent gathering

### 3. BasePromptContract Schema

Strict schema with 8 REQUIRED sections:

```typescript
interface BasePromptContract {
  productIdentity: string;           // MUST be present
  oneSentenceConcept: string;        // MUST be present
  targetAudienceAndProblem: string;  // MUST be present
  explicitNonGoals: string;          // MUST be present (can be "UNSPECIFIED")
  coreFeatures: string[];            // MUST be array, CANNOT be empty
  requiredScreens: string[];         // MUST be array, CANNOT be empty
  constraintsAndAssumptions: string; // MUST be present (can be "UNSPECIFIED")
  successCriteria: string;           // MUST be present (can be "UNSPECIFIED")
}
```

**Validation**: Schema validated BEFORE saving. If validation fails → DO NOT SAVE

**Output Format**:
```markdown
# Product Identity

## One-Sentence Concept
[content]

## Target Audience & Core Problem
[content]

## Explicit Non-Goals
[content or "UNSPECIFIED"]

## Core Features
1. Feature 1
2. Feature 2
...

## Required Screens
1. Screen 1
2. Screen 2
...

## Constraints & Assumptions
[content or "UNSPECIFIED"]

## Success Criteria
[content or "UNSPECIFIED"]
```

**Rules**:
- NO free prose outside sections
- NO nested ambiguity
- Every feature must be explicit
- Lists are sorted alphabetically (for determinism)

### 4. Immutability & Versioning

Once approved, the Base Prompt becomes IMMUTABLE:

```typescript
{
  basePromptVersion: 1,              // Version number
  basePromptHash: "0276a150...",     // SHA-256 hash
  approvedAt: "2026-01-11T...",      // Approval timestamp
  approvedBy: "human"                // Who approved
}
```

**Hash Computation**:
```typescript
const hash = createHash('sha256')
  .update(content, 'utf8')
  .digest('hex');
```

**Immutability Rules**:
- Hash is computed on approval
- Hash NEVER changes for approved content
- Downstream agents MUST reference hash, not content
- Any change requires NEW version with explicit approval

**Verification**:
```typescript
// Downstream agents verify integrity
const verified = await architect.verifyBasePromptIntegrity(
  appRequestId,
  expectedHash
);

if (!verified) {
  throw new Error('INTEGRITY VIOLATION: Hash mismatch');
}
```

### 5. Determinism Guarantees

Same answers → Same output (byte-for-byte):

**Determinism Rules**:
- NO timestamps in content
- NO random ordering
- Stable formatting
- Alphabetical sorting of lists
- Consistent whitespace

**Proof**:
```typescript
// Run same process twice
const hash1 = generateAndHash(answers);
const hash2 = generateAndHash(answers);

assert(hash1 === hash2); // MUST be true
```

**Why**: Manufacturing systems must be predictable. Same input → Same output.

### 6. Failure & Escalation

ZERO tolerance for ambiguity:

**Failure Conditions**:
- Missing required answer
- Empty required field
- Malformed contract
- Schema validation failure

**Response**:
```typescript
// Pause Forge Conductor
await conductor.pauseForHuman(appRequestId, reason);

// Emit conflict event
await emitEvent('foundry_intent_conflict', details);

// HALT execution
throw new Error('INTENT CONFLICT: ...');
```

**NO silent fixes. NO guessing.**

### 7. Downstream Integration

Downstream agents get Base Prompt with hash:

```typescript
const basePrompt = await architect.getBasePromptWithHash(appRequestId);

// Returns:
{
  content: "# Product...",
  hash: "0276a150c9cf07ff...",
  version: 1,
  approvedAt: Date,
  approvedBy: "human"
}
```

**Downstream Usage**:
```typescript
// Reference by hash, not content
const productStrategist = new ProductStrategist(basePrompt.hash);

// Verify integrity before using
const verified = await architect.verifyBasePromptIntegrity(
  appRequestId,
  basePrompt.hash
);

if (!verified) {
  throw new Error('Base Prompt has been tampered with');
}
```

## API Reference

### `start(appRequestId: string): Promise<FoundrySessionSummary>`

Start new Foundry session.

**Preconditions**:
- Conductor state = `idea`
- No existing session
- Envelope validated

**Side Effects**:
- Creates FoundrySession
- Locks conductor
- Initializes versioning fields

### `submitAnswer(appRequestId: string, answer: string): Promise<FoundrySessionSummary>`

Submit answer to current question.

**Validation**:
- Required answers cannot be empty
- Missing required answer → HALT with `foundry_intent_conflict` event

**Behavior**:
- Saves answer
- Increments step
- If last question → generates draft and validates contract
- If validation fails → DO NOT SAVE

### `approveBasePrompt(appRequestId: string, approvedBy: 'human' | 'synthetic_founder'): Promise<void>`

Approve and LOCK the Base Prompt.

**Actions**:
- Computes SHA-256 hash
- Sets `basePromptHash`
- Sets `approvedAt` timestamp
- Sets `approvedBy`
- Status → `approved`
- Transitions conductor → `base_prompt_ready`

**IMMUTABILITY**: Once approved, hash is LOCKED. Any change requires new version.

### `verifyBasePromptIntegrity(appRequestId: string, expectedHash: string): Promise<boolean>`

Verify Base Prompt has not been tampered with.

**Returns**: `true` if hash matches, `false` otherwise

**Usage**: Downstream agents MUST call this before using Base Prompt

### `getBasePromptWithHash(appRequestId: string): Promise<{content, hash, version, approvedAt, approvedBy}>`

Get Base Prompt with all immutability metadata.

**Returns**: Complete contract with hash for downstream reference

## Test Results

**ALL 10 TESTS PASSING** ✅

```
✅ Immutability after approval
✅ Hash stability (determinism)
✅ Schema rejection on malformed output
✅ Forbidden context access (isolation)
✅ Version tracking
✅ Downstream verification (tampering detected)
✅ Contract validation
✅ Envelope validation
✅ Deterministic output format
✅ Approved prompt immutability
```

## Before vs After

| Aspect | Before Hardening | After Hardening |
|--------|-----------------|-----------------|
| **Authority** | Informal | Constitutional |
| **Immutability** | Mutable | LOCKED after approval |
| **Verification** | None | SHA-256 hash |
| **Determinism** | Non-deterministic | Byte-for-byte identical |
| **Versioning** | None | Full version tracking |
| **Ambiguity** | Tolerated | HALTS on ambiguity |
| **Tampering** | Undetectable | Immediately detected |
| **Trust** | Hope-based | Evidence-based |

## Migration from Original

### Original Foundry Architect
- File: `foundry-architect.ts`
- Basic string formatting
- No hash verification
- No immutability enforcement
- No strict schema validation

### Hardened Version
- File: `foundry-architect-hardened.ts`
- Full contract validation
- SHA-256 hash verification
- Immutability enforcement
- Strict BasePromptContract schema
- Envelope validation
- Context isolation

**Both versions coexist**. Use hardened version for production.

## What This Achieves

### For Foundry Architect
✅ Constitutional authority
✅ Trust anchor status
✅ Legal contract enforcement

### For Downstream Agents
✅ Stop guessing
✅ Stop interpreting
✅ Stop drifting
✅ Reference immutable hash
✅ Verify integrity

### For Verification
✅ Meaningful verification
✅ Reliable baselines
✅ Tamper detection
✅ Audit trails

### For the System
✅ Manufacturing-grade reliability
✅ Deterministic behavior
✅ Explicit decisions
✅ Zero tolerance for ambiguity

## Philosophy

**The Base Prompt is not a document. It is a constitution.**

Like a legal contract:
- Every word matters
- Changes require explicit approval
- Signatures (hashes) verify authenticity
- Tampering is detectable
- Ambiguity is unacceptable

**Downstream agents don't interpret. They execute.**

This is how AI systems become trustworthy.

---

**Key Principle**: Forge Architect (Hardened) establishes the constitutional foundation. All downstream work references this immutable contract. Any drift or corruption is immediately detected. This is manufacturing-grade intent governance.

**The Iron Law**: Once approved, the Base Prompt is IMMUTABLE. Hash is LOCKED. Downstream agents MUST verify integrity. NO exceptions.
