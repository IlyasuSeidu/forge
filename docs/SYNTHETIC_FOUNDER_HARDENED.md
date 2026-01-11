# Synthetic Founder - PRODUCTION HARDENED

## Overview

The **Synthetic Founder (Hardened)** is the production-grade version of the AI-powered intent gathering assistant. It is the **FIRST LLM-backed agent** in the Forge system and must be tightly constrained to prevent drift, hallucination, and scope creep.

This is NOT an autonomous decision-maker. This is an **advisory subordinate**.

## Why Hardening Matters

### Before Hardening

```
Synthetic Founder = Free-form LLM
- No output schema
- No scope control
- Temperature too high (non-deterministic)
- Silent fallbacks on error
- Human edits not tracked
- No retry safety
- Hallucinations tolerated
```

**Result**: Unreliable suggestions, scope creep, non-deterministic outputs

### After Hardening

```
Synthetic Founder = Constrained Advisory Agent
- Strict SyntheticAnswerContract schema
- Scope violation detection (enterprise, over-engineering)
- Temperature ≤ 0.3 (determinism)
- NO silent fallbacks (fails loudly)
- Human dominance tracking (escalates after 3 adjustments)
- Hash-based deduplication (retry safety)
- Explicit confidence levels
```

**Result**: Reliable, constrained, deterministic, subordinate to human

## The 8 Hardening Features

### 1. PromptEnvelope (SUBORDINATE Authority)

Unlike Foundry Architect (CANONICAL authority), Synthetic Founder has **SUBORDINATE_ADVISORY** authority:

```typescript
interface PromptEnvelope {
  agentName: 'SyntheticFounder';
  agentVersion: '1.0.0';
  authorityLevel: 'SUBORDINATE_ADVISORY';
  allowedActions: ['proposeAnswer', 'deferToHuman'];
  forbiddenActions: [
    'approveBasePrompt',
    'modifyFoundrySession',
    'accessDownstreamArtifacts',
    'inventUnaskedContext'
  ];
}
```

**Enforcement**: Validated on initialization. Violation → THROW

**Why**: Synthetic Founder NEVER makes final decisions. Human ALWAYS has final say.

### 2. Context Isolation (Purity)

Synthetic Founder may ONLY access:
- ✅ Current question from Foundry Architect
- ✅ Approved previous answers
- ✅ Base Prompt (if approved)

It must NEVER read:
- ❌ Planning documents
- ❌ Screens
- ❌ Rules
- ❌ Code
- ❌ Verification results

**Enforcement**: Runtime validation in `validateContextAccess()`

**Why**: Prevents contamination, ensures answers are based ONLY on user intent, not downstream artifacts

### 3. SyntheticAnswerContract Schema

Every proposed answer MUST conform to this strict schema:

```typescript
interface SyntheticAnswerContract {
  proposedAnswer: string;      // MUST be present, 1-500 chars
  confidence: 'low' | 'medium' | 'high'; // MUST be present
  reasoning: string;            // MUST be present (WHY this answer)
  assumptions: string[];        // MUST be array (can be empty)
  suggestedAlternatives: string[]; // MUST be array (can be empty)
}
```

**Validation**: Schema validated BEFORE saving. If validation fails → DO NOT SAVE

**Output Example**:
```json
{
  "proposedAnswer": "TaskFlow Pro",
  "confidence": "high",
  "reasoning": "Professional sounding name for a productivity app",
  "assumptions": ["User wants a serious, business-oriented name"],
  "suggestedAlternatives": ["WorkSpace", "TaskMaster", "FlowDesk"]
}
```

**Why**: Structured output ensures transparency, explainability, and prevents vague suggestions

### 4. Bias & Scope Control

Detects and **REJECTS** scope creep, enterprise features, over-engineering:

**Enterprise Keywords (FORBIDDEN)**:
- enterprise, sso, ldap, active directory, saml, oauth2
- microservices, kubernetes, load balancer, cdn
- multi-region, multi-tenant, white-label

**Over-Engineering Keywords (FORBIDDEN)**:
- machine learning, ai-powered, blockchain
- real-time analytics, advanced analytics
- predictive, recommendation engine

**Enforcement**:
```typescript
// Scans proposedAnswer and reasoning for violations
if (scopeViolationDetected) {
  throw new Error('SCOPE VIOLATION: Synthetic Founder suggested features beyond reasonable scope');
}
```

**Why**: Prevents AI from inventing unnecessary complexity. Keeps MVP scope realistic.

### 5. Human Dominance Enforcement

Tracks approval/adjustment statistics to ensure human control:

```typescript
interface DominanceStats {
  totalProposed: number;
  totalApproved: number;
  totalAdjusted: number;
  consecutiveAdjustments: number;
}
```

**Escalation Rule**:
- If human adjusts ≥3 consecutive answers → PAUSE conductor
- Require human review of AI suggestion quality
- Reset counter after approval

**Why**: If human keeps adjusting AI suggestions, AI is not providing value. Escalate for review.

### 6. Determinism & Retry Safety

**Determinism Constraints**:
- Temperature ≤ 0.3 (ENFORCED at initialization)
- Low temperature → more consistent outputs
- Same input context → similar outputs

**Retry Safety (Deduplication)**:
```typescript
// Compute request hash
const requestHash = SHA256(questionId + questionText + contextHash);

// Check if we've already answered this exact question
const existingAnswer = await findByRequestHash(requestHash);
if (existingAnswer) {
  return existingAnswer; // NO duplicate LLM calls
}
```

**Why**:
- Determinism → Reproducibility → Auditability
- Deduplication → Prevents retry loops where same question gets different answers

### 7. Failure & Escalation

**ZERO TOLERANCE for silent fallbacks**:

```typescript
try {
  contract = await this.callLLM(question, optional, context);
} catch (error) {
  // Emit failure event
  await this.emitEvent('synthetic_founder_failure', { appRequestId, question, error });

  // Pause conductor for human intervention
  await this.conductor.pauseForHuman(
    appRequestId,
    `Synthetic Founder LLM call failed: ${error.message}`
  );

  // NO silent fallback - throw error
  throw new Error(`SYNTHETIC FOUNDER FAILURE: LLM call failed`);
}
```

**NO** "Not sure" fallback on error. **NO** silent degradation.

**Why**: Manufacturing systems must fail loudly. Silent failures accumulate technical debt.

### 8. LLM Integration (Hardened)

**Configuration**:
```typescript
{
  model: 'gpt-4o',              // GPT-4.1/4o recommended
  temperature: 0.2,             // ≤ 0.3 ENFORCED
  maxTokens: 800,
  retryAttempts: 3,             // Exponential backoff
}
```

**Prompt Architecture (Two-Layer)**:

**Layer 1: Immutable System Prompt**
```
You are a competent startup founder answering product strategy questions.

CRITICAL RULES:
- Be concise (1-3 sentences maximum)
- NO enterprise features (SSO, LDAP, microservices, etc.)
- NO over-engineering (ML, blockchain, advanced analytics, etc.)
- Focus on core value proposition

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "proposedAnswer": "string (1-500 chars)",
  "confidence": "low" | "medium" | "high",
  "reasoning": "string (why this answer)",
  "assumptions": ["array", "of", "strings"],
  "suggestedAlternatives": ["array", "of", "alternative", "answers"]
}
```

**Layer 2: Dynamic User Prompt**
```
Question: [current question]

Context so far:
- product_name: TaskFlow Pro
- one_sentence_concept: A productivity app for managing tasks and workflows
...
```

**Output Validation Pipeline**:
1. Parse JSON response
2. Validate schema conformance
3. Validate scope (no enterprise/over-engineering)
4. Validate contract fields
5. Save to database

**Why**: Two-layer prompts ensure immutable constraints + dynamic context. Validation pipeline catches hallucinations.

## API Reference

### `proposeAnswer(appRequestId: string): Promise<ProposedAnswer>`

Propose an answer to the current Foundry question.

**Preconditions**:
- Foundry session in `asking` status
- Envelope validated
- Human dominance check passed

**Side Effects**:
- Calls LLM with deterministic settings
- Validates contract schema
- Detects scope violations
- Computes request hash for deduplication
- Saves proposed answer to database
- Updates dominance stats

**Returns**: ProposedAnswer with full contract

### `approveProposedAnswer(answerId: string): Promise<void>`

Approve the proposed answer (human accepts AI suggestion).

**Actions**:
- Mark status = `approved`
- Set finalAnswer = proposedAnswer
- Update dominance stats (approved++, reset consecutive adjustments)
- Submit answer to Foundry Architect

### `adjustProposedAnswer(answerId: string, revisedText: string): Promise<void>`

Adjust the proposed answer with human revision (human overrides AI).

**Actions**:
- Mark status = `adjusted`
- Set finalAnswer = revisedText (human's edit)
- Update dominance stats (adjusted++, increment consecutive adjustments)
- Submit revised answer to Foundry Architect
- If consecutiveAdjustments ≥ 3, will trigger escalation on next proposal

### `getDominanceStats(appRequestId: string): DominanceStats | null`

Get human dominance statistics for an app request.

**Returns**: Stats showing approval vs adjustment ratio

### `verifyBasePromptIntegrity(appRequestId: string, expectedHash: string): Promise<boolean>`

Verify Base Prompt has not been tampered with (inherited from Foundry Architect).

## Test Results

**ALL 10 TESTS PASSING** ✅

```
✅ TEST 1: Envelope Validation (SUBORDINATE authority)
✅ TEST 2: Context Isolation (only approved answers)
✅ TEST 3: Contract Validation (strict schema)
✅ TEST 4: Scope Control (detects enterprise features, over-engineering)
✅ TEST 5: Human Dominance Enforcement (escalates after 3 adjustments)
✅ TEST 6: Determinism & Deduplication (hash-based, retry safety)
✅ TEST 7: Failure & Escalation (NO silent fallbacks)
✅ TEST 8: Temperature Constraint (≤ 0.3 for determinism)
✅ TEST 9: Full Integration (propose → approve → submit)
✅ TEST 10: Contract Persistence (stored in database)
```

## Before vs After

| Aspect | Before Hardening | After Hardening |
|--------|------------------|-----------------|
| **Authority** | Unclear | SUBORDINATE_ADVISORY |
| **Output Schema** | Free-form text | Strict SyntheticAnswerContract |
| **Scope Control** | None | Enterprise/over-engineering detection |
| **Temperature** | 0.7 (high variance) | ≤ 0.3 (deterministic) |
| **Error Handling** | Silent fallbacks | Fail loudly, pause conductor |
| **Human Tracking** | None | Dominance stats, escalation after 3 adjustments |
| **Retry Safety** | None | Hash-based deduplication |
| **Transparency** | Opaque | Confidence + reasoning + assumptions |

## Migration from Original

### Original Synthetic Founder
- File: `synthetic-founder.ts`
- Free-form text output
- No scope control
- No dominance tracking
- Simple string responses
- Temperature 0.7

### Hardened Version
- File: `synthetic-founder-hardened.ts`
- Full SyntheticAnswerContract schema
- Scope violation detection
- Human dominance enforcement
- Structured output with confidence
- Temperature ≤ 0.3 (enforced)
- Hash-based deduplication
- Fail-fast escalation

**Both versions coexist**. Use hardened version for production.

## What This Achieves

### For Synthetic Founder
✅ Subordinate authority (never overrides human)
✅ Transparent reasoning (why + assumptions)
✅ Scope control (no enterprise/over-engineering)
✅ Deterministic outputs (temperature ≤ 0.3)

### For Human Users
✅ Always in control (human dominance)
✅ Clear reasoning (understand why AI suggests something)
✅ Visible confidence levels (trust calibration)
✅ Alternative options (not locked into one path)

### For Forge System
✅ First LLM agent with manufacturing-grade constraints
✅ No hallucinations tolerated
✅ Audit trail (full contract persistence)
✅ Fail-fast on error (no silent degradation)

### For Downstream Agents
✅ Approved answers are validated (no scope creep propagation)
✅ Confidence signals available (can weight suggestions)
✅ Reasoning transparent (can understand AI logic)

## Philosophy

**Synthetic Founder is a junior co-founder, not the CEO.**

Like a trusted junior partner:
- Proposes ideas (proposeAnswer)
- Explains reasoning (reasoning field)
- Admits uncertainty (confidence levels)
- Defers to senior partner (human dominance)
- Stays in scope (no enterprise/over-engineering)
- No silent failures (escalates on error)

**The AI assists. The human decides.**

This is how AI systems become trustworthy in production.

## LLM Cost & Latency

**Cost Estimation (GPT-4o)**:
- Input tokens: ~300-500 per question (system + user prompt)
- Output tokens: ~150-300 per response (JSON contract)
- Cost per question: ~$0.01-0.02
- Full Foundry session (8 questions): ~$0.08-0.16

**Latency**:
- P50: 1-2 seconds
- P95: 3-5 seconds
- P99: 6-10 seconds (with retries)

**Retry Strategy**:
- 3 attempts with exponential backoff
- 1s → 2s → 4s
- Total max latency: ~7s

**Why This Is Acceptable**:
- Foundry is interactive (not batch)
- Human is reviewing each answer anyway
- Transparency worth the latency
- Alternative: human answers all 8 questions manually (~10-15 min)

## Security Considerations

**Prompt Injection Defense**:
- System prompt is immutable (Layer 1)
- User context is JSON-serialized (not raw text)
- Output validation rejects malformed responses
- No code execution in LLM responses

**Data Privacy**:
- User answers stored locally (not sent to third parties)
- LLM calls logged for audit
- No PII in system prompts

**API Key Management**:
- API key from environment variable (not hardcoded)
- Failure if API key missing (no silent fallback)

## Future Enhancements

**Potential Improvements (Not Implemented Yet)**:
1. **Multi-model fallback**: Try GPT-4.1 → GPT-4o → Claude Opus 4.5
2. **Confidence calibration**: Track accuracy of confidence predictions
3. **Fine-tuning**: Custom model trained on successful Foundry sessions
4. **Caching**: Cache common questions (e.g., "What is the name?")
5. **Batch mode**: Propose all 8 answers at once (with lower confidence)

**Not Implemented Because**:
- Focus on correctness first, optimization later
- Current performance is acceptable
- Want to validate hardening approach before scaling

---

**Key Principle**: Synthetic Founder is the first LLM agent in Forge. It must be tightly constrained to prevent drift, hallucination, and scope creep. All future LLM agents should follow this hardening pattern.

**The Iron Law**: Synthetic Founder is SUBORDINATE. It proposes. Human decides. NO exceptions.
