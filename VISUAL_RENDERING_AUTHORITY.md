# Visual Rendering Authority (VRA)
## Tier 3.5: Deterministic Visual Expansion Layer

---

## Purpose

The **Visual Rendering Authority** is a production-hardened agent that converts approved Screen Definitions into explicit, reviewable **VisualExpansionContracts** so that Visual Forge can **render pixels instead of guessing structure**.

### The Problem It Solves

**Before VRA:**
- Visual Forge received vague screen descriptions like "Analytics cards with key metrics"
- Visual Forge had to guess: How many cards? What labels? What data?
- Results were under-specified and inconsistent
- ChatGPT produced better images because it **expanded visual intent** internally

**After VRA:**
- VRA explicitly expands "Analytics cards" into:
  - Total Revenue: $54,320
  - New Users: 1,248
  - Orders: 320
  - Customer Satisfaction: 92%
- Visual Forge receives **concrete, unambiguous specifications**
- Image quality matches or exceeds ChatGPT
- All expansions are **human-approved** and **hash-locked**

---

## Architecture Position

```
Screen Definition (approved)
        ↓
Visual Rendering Authority (expand)
        ↓
Visual Expansion Contract (approve)
        ↓
Visual Forge (render pixels)
```

**Key Separation:**
- **VRA:** Expands intent (text → structure)
- **Visual Forge:** Renders pixels (structure → image)

This separation ensures:
- Auditability (humans review expansions before rendering)
- Determinism (same expansion = same structure)
- Traceability (hash chain from Base Prompt to pixels)

---

## Authority Level

**RENDERING_AUTHORITY**

Lower than:
- `STRUCTURAL_AUTHORITY` (Journey Orchestrator)
- `BEHAVIORAL_AUTHORITY` (Future)

Higher than:
- Raw image generation
- Prompt-only expansion

---

## Prompt Envelope

```typescript
{
  agentName: 'VisualRenderingAuthority',
  agentVersion: '1.0.0',
  authorityLevel: 'RENDERING_AUTHORITY',
  allowedActions: ['expand_screen_structure'],
  forbiddenActions: [
    'design_ui',
    'generate_images',
    'invent_features',
    'rename_screens',
    'infer_logic',
    'access_rules',
    'access_code',
    'add_navigation_destinations',
    'add_flows',
    'add_modals',
    'modify_business_logic'
  ]
}
```

**Critical:** VRA is **NOT** a designer. It does **NOT** create. It **EXPANDS** existing intent using closed vocabularies.

---

## Closed Vocabularies (Non-Negotiable)

VRA may **ONLY** use these predefined values:

### Layout Types
- `desktop`
- `mobile`

### Section Types
- `navigation`
- `metric_cards`
- `data_visualization`
- `lists`
- `forms`
- `content`
- `links`
- `hero`
- `footer`

### Chart Types
- `bar`
- `line`
- `bar_line_combo`
- `pie`
- `donut`
- `area`

### List Types
- `Tasks`
- `Recent Activity`
- `Notifications`
- `Messages`

### Navigation Elements
- `logo`
- `nav_items`
- `notifications`
- `user_avatar`
- `primary_action`
- `search`
- `settings`

**Enforcement:** If Claude outputs ANY value outside these vocabularies → **FAIL LOUDLY** → Pause Conductor → Require human intervention.

---

## Visual Expansion Contract (Schema)

```typescript
{
  "screen": "Dashboard",
  "layoutType": "desktop",
  "sections": [
    {
      "id": "header",
      "type": "navigation",
      "elements": ["logo", "nav_items", "notifications", "user_avatar"]
    },
    {
      "id": "metrics",
      "type": "metric_cards",
      "cards": [
        { "label": "Total Revenue", "example": "$54,320" },
        { "label": "New Users", "example": "1,248" },
        { "label": "Orders", "example": "320" }
      ]
    },
    {
      "id": "charts",
      "type": "data_visualization",
      "charts": [
        { "chartType": "bar_line_combo", "title": "Monthly Performance" },
        { "chartType": "pie", "title": "Traffic Sources" }
      ]
    },
    {
      "id": "footer",
      "type": "links",
      "elements": ["privacy_policy", "terms", "help"]
    }
  ]
}
```

**Output Rules:**
- Strict JSON only (no prose, no markdown)
- Must validate against schema
- Must use closed vocabularies
- Must be deterministic (same input → same output)

---

## Allowed vs Forbidden Actions

### ✅ Allowed (Safe)
- Expand "analytics cards" into specific card examples
- Expand "charts" into specific chart types
- Apply standard SaaS layout patterns
- Provide representative example data (clearly marked as visual placeholders)
- Structure hierarchy logically (header → metrics → charts → footer)

### ❌ Forbidden (Will Fail)
- Add new features not in Screen Definition
- Add new navigation destinations
- Invent flows, modals, or dialogs
- Rename anything
- Infer business logic
- Add adjectives or design opinions
- Read code, rules, or verification results

---

## Hash Chain Integrity

Every Visual Expansion Contract maintains full traceability:

```
Base Prompt (hash)
    ↓
Master Plan (hash)
    ↓
Implementation Plan (hash)
    ↓
Planning Docs Hash (combined)
    ↓
Screen Index (hash)
    ↓
Screen Definition (hash)
    ↓
Visual Expansion Contract (hash)
    ↓
Visual Mockup (hash)
```

**Immutability:**
- Once approved, contracts are **hash-locked**
- Tampering detection via SHA-256 verification
- `verifyIntegrity()` method ensures no modifications

---

## Workflow

### 1. Expansion Phase

```typescript
const contractId = await vra.expandScreen(
  appRequestId,
  'Dashboard',
  'desktop'
);
```

**What happens:**
1. Validate Prompt Envelope
2. Lock Conductor
3. Load isolated context (hash-based, approved artifacts only)
4. Call Claude API with strict system prompt
5. Validate output against closed vocabularies
6. Compute contract hash
7. Save as `awaiting_approval`
8. Pause Conductor for human review
9. Unlock Conductor

### 2. Approval Phase

```typescript
await vra.approve(contractId, 'human');
```

**What happens:**
1. Verify status is `awaiting_approval`
2. Mark as `approved`
3. Lock with `approvedBy` and `approvedAt`
4. Contract becomes **immutable**

### 3. Rejection Phase

```typescript
await vra.reject(contractId, 'Needs more detail');
```

**What happens:**
1. Mark as `rejected`
2. Allow regeneration (max 2 retries)
3. If 2 retries exhausted → escalate to human

---

## Context Isolation (CRITICAL)

VRA may **ONLY** read approved, hash-locked artifacts:

| Artifact | Required | Hash Field |
|----------|----------|------------|
| Base Prompt | ✅ | `basePromptHash` |
| Master Plan | ✅ | `documentHash` |
| Implementation Plan | ✅ | `documentHash` |
| Screen Index | ✅ | `screenIndexHash` |
| Screen Definition | ✅ | `screenHash` |
| User Journeys | Optional | `journeyHash` |

**Forbidden Inputs:**
- Mockups (circular dependency)
- Ruleset (unauthorized access)
- Build Prompts (out of scope)
- Code (out of scope)
- Verification results (unauthorized)

If any forbidden artifact is accessed → **THROW** → **HALT**.

---

## Determinism Guarantees

VRA ensures **same inputs → same outputs**:

1. **Temperature ≤ 0.2** (Claude API)
2. **Stable ordering** (sections always top-down)
3. **No synonyms** (only closed vocabulary)
4. **No randomness** (no timestamps, no UUIDs in prompts)
5. **Consistent hashing** (sorted JSON keys before SHA-256)

**Test Coverage:**
- Test 6 verifies hash consistency
- Test 9 verifies hash chain integrity

---

## Failure Modes (No Silent Failures)

VRA **FAILS LOUDLY** if:

| Condition | Action |
|-----------|--------|
| Screen name not in Screen Index | THROW + HALT |
| Unknown vocabulary value | THROW + EMIT `visual_expansion_violation` + PAUSE |
| Section contradicts Screen Definition | THROW + HALT |
| Missing required section | THROW + HALT |
| Hash mismatch | THROW + EMIT `integrity_violation` + ESCALATE |
| Contract validation failure | THROW + PAUSE |
| Max retries exceeded (2) | ESCALATE TO HUMAN |

**No retries beyond 2 attempts.**

---

## Conductor Integration

### Required State
- VRA runs ONLY when `ConductorState.currentStatus = 'flows_defined'`
- Must have approved User Journeys

### Lock/Unlock Protocol
1. `await conductor.lock(appRequestId, 'VisualRenderingAuthority')`
2. Perform expansion
3. `await conductor.unlock(appRequestId)`

### Pause for Approval
- After contract generation → `conductor.pause(appRequestId, reason)`
- Conductor sets `awaitingHuman = true`
- Prevents downstream agents from proceeding

### Advance State
- After **ALL** screens expanded and approved → `designs_ready`

---

## API Reference

### `expandScreen(appRequestId, screenName, layoutType)`
Expands a single screen into a VisualExpansionContract.

**Parameters:**
- `appRequestId` (string): App request ID
- `screenName` (string): Screen name (must exist in Screen Index)
- `layoutType` ('desktop' | 'mobile'): Layout type

**Returns:** `contractId` (string)

**Throws:**
- `CONTEXT ISOLATION VIOLATION` if required artifacts missing
- `VOCABULARY VIOLATION` if Claude outputs invalid values

---

### `approve(contractId, approvedBy)`
Approves a visual expansion contract.

**Parameters:**
- `contractId` (string): Contract ID
- `approvedBy` (string): Who approved (e.g., "human")

**Returns:** `void`

**Throws:**
- If status is not `awaiting_approval`
- If already approved (immutability protection)

---

### `reject(contractId, reason)`
Rejects a visual expansion contract.

**Parameters:**
- `contractId` (string): Contract ID
- `reason` (string): Reason for rejection

**Returns:** `void`

---

### `getCurrentContract(appRequestId, screenName, layoutType)`
Retrieves the current approved contract for a screen.

**Parameters:**
- `appRequestId` (string)
- `screenName` (string)
- `layoutType` ('desktop' | 'mobile')

**Returns:** `{ id, contractData, contractHash }` or `null`

---

### `verifyIntegrity(contractId)`
Verifies hash chain integrity of a contract.

**Parameters:**
- `contractId` (string)

**Returns:** `boolean` (true if valid)

**Side Effects:**
- Logs error if hash mismatch detected

---

## Database Model

```prisma
model VisualExpansionContract {
  id                     String    @id
  appRequestId           String
  screenName             String
  layoutType             String
  contractJson           String    // JSON

  // Immutability & Hash Chain
  contractHash           String
  contractVersion        Int       @default(1)
  approvedBy             String?
  approvedAt             DateTime?

  // Traceability
  basePromptHash         String
  planningDocsHash       String
  screenIndexHash        String
  screenDefinitionHash   String
  journeyHash            String    @default("")

  // Status
  status                 String    // "draft" | "awaiting_approval" | "approved" | "rejected"
  createdAt              DateTime  @default(now())

  appRequest             AppRequest @relation(...)

  @@index([appRequestId])
  @@index([contractHash])
  @@index([screenName])
  @@index([status])
  @@index([screenDefinitionHash])
}
```

---

## Test Suite (10/10 Required)

| Test | Coverage |
|------|----------|
| 1 | Envelope validation |
| 2 | Context isolation enforcement |
| 3 | Closed vocabulary enforcement |
| 4 | Canonical screen name enforcement |
| 5 | Contract schema validation |
| 6 | Determinism (same input → same hash) |
| 7 | Immutability after approval |
| 8 | Rejection allows regeneration |
| 9 | Hash chain integrity |
| 10 | Full Conductor integration |

**Run tests:**
```bash
npx tsx test-visual-rendering-authority.ts
```

**Expected output:**
```
✅ Passed: 10/10
🎉 ALL TESTS PASSED!
```

---

## Why This Agent Exists

### Before VRA (The Problem)

**Visual Forge prompt:**
```
Generate a mockup for Dashboard.

Key elements:
- Header with navigation
- Analytics cards
- Charts
```

**Result:** Under-specified. Image model has to guess:
- How many cards?
- What labels?
- What data?
- What chart types?

**ChatGPT's advantage:** It internally expands to rich, hierarchical prompts with concrete examples.

---

### After VRA (The Solution)

**VRA expansion (explicit, approved):**
```json
{
  "sections": [
    {
      "type": "metric_cards",
      "cards": [
        { "label": "Total Revenue", "example": "$54,320" },
        { "label": "New Users", "example": "1,248" }
      ]
    },
    {
      "type": "data_visualization",
      "charts": [
        { "chartType": "bar_line_combo", "title": "Monthly Performance" }
      ]
    }
  ]
}
```

**Visual Forge prompt (from VRA contract):**
```
High-fidelity dashboard mockup.

Metric cards:
- Total Revenue: $54,320
- New Users: 1,248

Charts:
- Bar + line chart: Monthly Performance
- Pie chart: Traffic Sources

Modern SaaS design, production-ready quality.
```

**Result:** **Dramatically better image quality** without losing auditability.

---

## Design Philosophy

### VRA is NOT:
- ❌ A designer
- ❌ Creative
- ❌ A feature inventor
- ❌ An interpreter

### VRA IS:
- ✅ A **rendering compiler**
- ✅ A **vocabulary enforcer**
- ✅ An **expansion layer**
- ✅ A **manufacturing step**

**Core Principle:**
> LLMs may **choose** from approved representations.
> They may **never define** representations.

---

## Comparison: VRA vs Visual Forge

| Aspect | VRA | Visual Forge |
|--------|-----|--------------|
| **Input** | Screen Definition | Visual Expansion Contract |
| **Output** | JSON contract | PNG image |
| **Role** | Expands intent | Renders pixels |
| **LLM Usage** | Claude (text → structure) | GPT Image / DALL-E (structure → image) |
| **Approval Gate** | Yes (human reviews expansion) | Yes (human reviews mockup) |
| **Hash Locked** | Yes | Yes |
| **Forbidden Actions** | 10+ | 7+ |
| **Authority Level** | RENDERING_AUTHORITY | VISUAL_AUTHORITY |

**Key Difference:** VRA **thinks** (expands structure), Visual Forge **executes** (renders pixels).

---

## Evolution Path

### Phase 1 (Current)
- Manual expansion rules via closed vocabularies
- Claude API with strict prompts
- Human approval for all expansions

### Phase 2 (Future)
- Learned expansion patterns from approved contracts
- Fine-tuned vocabulary additions
- Auto-approval for high-confidence expansions

### Phase 3 (Future)
- Dynamic vocabulary extensions (still human-approved)
- Cross-screen consistency checks
- Brand-specific expansion rules

**Non-Negotiable:** Human approval always required for new patterns.

---

## Success Metrics

1. **Image Quality:** Match or exceed ChatGPT-generated mockups
2. **Determinism:** Same screen → same hash (100% reproducibility)
3. **Vocabulary Compliance:** 0% vocabulary violations
4. **Hash Integrity:** 100% verifiable traceability
5. **Approval Rate:** >90% first-pass approvals

---

## Conclusion

The **Visual Rendering Authority** is the missing layer that transforms Forge from "good enough" to **"unbeatable"**.

By making visual intent **explicit**, **auditable**, and **deterministic**, VRA achieves:
- ✅ ChatGPT-level image quality
- ✅ Enterprise-grade auditability
- ✅ Hash-chain integrity
- ✅ Zero hallucination risk

**VRA is not magic. It's manufacturing.**

---

## Quick Start

```typescript
import { VisualRenderingAuthority } from './agents/visual-rendering-authority';

const vra = new VisualRenderingAuthority(prisma, conductor, logger);

// 1. Expand screen
const contractId = await vra.expandScreen(
  appRequestId,
  'Dashboard',
  'desktop'
);

// 2. Human reviews contract

// 3. Approve
await vra.approve(contractId, 'human');

// 4. Visual Forge uses approved contract to generate mockup
```

---

**Status:** ✅ Production-Ready (Tier 3.5)
**Authority Level:** `RENDERING_AUTHORITY`
**Test Coverage:** 10/10 passing
**Hash Chain:** Verified
**Immutability:** Enforced

**This is how Forge wins.**
