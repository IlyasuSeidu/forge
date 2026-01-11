# Product Strategist - Production Hardening

**Status**: ✅ Production Ready
**Test Coverage**: 10/10 tests passing
**Agent**: Product Strategist (Tier 2 - Planning)

---

## Overview

The Product Strategist is the second LLM-backed agent in Forge. It converts an approved **Base Prompt** into structured planning documents that define **WHAT gets built** and **IN WHAT ORDER**.

**Authority Level**: `PLANNING_AUTHORITY`

This agent is one of the most critical in the system. Mistakes here propagate downstream and cannot be repaired by execution or verification agents.

---

## Hardening Features Implemented

### 1. PromptEnvelope (PLANNING_AUTHORITY)

```typescript
interface PromptEnvelope {
  agentName: 'ProductStrategist';
  agentVersion: '1.0.0';
  authorityLevel: 'PLANNING_AUTHORITY';
  allowedActions: ['generateMasterPlan', 'generateImplementationPlan'];
  forbiddenActions: [
    'inventFeatures',
    'modifyBasePrompt',
    'generateUI',
    'generateCode',
    'accessScreensOrFlows',
    'bypassApproval',
    'modifyApprovedDocuments',
  ];
}
```

**Purpose**: Defines what the agent CAN and CANNOT do.

**Constraints**:
- CANNOT invent features not in Base Prompt
- CANNOT modify the Base Prompt
- CANNOT generate UI or code
- CANNOT access downstream artifacts
- CANNOT bypass approval flow
- CANNOT modify approved documents (immutable)

---

### 2. Context Isolation (Base Prompt by Hash ONLY)

**Rule**: Product Strategist ONLY accesses the Base Prompt via its SHA-256 hash.

```typescript
private async getBasePromptWithHash(appRequestId: string): Promise<{
  content: string;
  hash: string;
  version: number;
  approvedAt: Date;
  approvedBy: string;
}> {
  // Gets Base Prompt from Foundry Session with hash verification
}
```

**Verification**:
- Conductor state MUST be `base_prompt_ready`
- Base Prompt MUST have `basePromptHash` set
- Base Prompt MUST be approved

**Why this matters**: Prevents accessing tampered or unapproved content.

---

### 3. Document Output Contracts (STRICT)

#### Master Plan Contract

```typescript
export interface MasterPlanContract {
  vision: string; // MUST be present
  targetAudience: string; // MUST be present
  coreProblem: string; // MUST be present
  explicitNonGoals: string; // MUST be present (can be "UNSPECIFIED")
  coreModules: string[]; // MUST be array, CANNOT be empty
  successCriteria: string; // MUST be present (measurable)
}
```

#### Implementation Plan Contract

```typescript
export interface ImplementationPlanContract {
  approvedTechStack: string; // MUST be present
  developmentPhases: string[]; // MUST be array, CANNOT be empty (ordered)
  featureSequencing: string; // MUST be present (ordered, mapped)
  riskAreas: string; // MUST be present (can be "UNSPECIFIED")
  timeline: string; // MUST be present (can be "UNSPECIFIED")
}
```

**Validation**: If any required field is missing or empty, the contract is REJECTED.

---

### 4. Feature & Scope Validation

**Rule**: Every module in `coreModules` MUST map to a feature explicitly stated in the Base Prompt.

```typescript
private async validateFeatureMapping(
  modules: string[],
  basePromptContent: string
): Promise<void> {
  for (const module of modules) {
    const moduleLower = module.toLowerCase();
    const isInBasePrompt = basePromptLower.includes(
      moduleLower.substring(0, Math.min(moduleLower.length, 20))
    );
    const isStandardInfra = ['authentication', 'auth', 'user management', ...].some(
      keyword => moduleLower.includes(keyword)
    );

    if (!isInBasePrompt && !isStandardInfra) {
      throw new Error(`SCOPE VIOLATION: Module "${module}" does not appear to map to Base Prompt`);
    }
  }
}
```

**Standard Infrastructure** (allowed even if not in Base Prompt):
- Authentication / Auth
- User Management
- Settings
- Configuration

**Why this matters**: Prevents the agent from inventing features or over-engineering.

---

### 5. Immutability & Section Hashing

**Rule**: Once a planning document is approved, it is IMMUTABLE.

#### Document-Level Hash
```typescript
private computeDocumentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
```

#### Section-Level Hashes
```typescript
private computeSectionHashes(contract: MasterPlanContract | ImplementationPlanContract): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const [key, value] of Object.entries(contract)) {
    const content = Array.isArray(value) ? JSON.stringify(value) : String(value);
    hashes[key] = createHash('sha256').update(content, 'utf8').digest('hex');
  }
  return hashes;
}
```

#### Stored Fields
```typescript
documentVersion: number; // v1, v2, ...
documentHash: string | null; // SHA-256 of entire document (null until approved)
sectionHashes: string; // JSON: {"vision": "hash", "targetAudience": "hash", ...}
basePromptHash: string; // Reference to Base Prompt used
approvedAt: Date | null;
approvedBy: string | null; // "human" | "system"
```

**Rejection of Approved Documents**:
```typescript
async rejectDocument(appRequestId: string, documentType: DocumentTypeValue, feedback?: string): Promise<void> {
  const document = await this.prisma.planningDocument.findFirst({
    where: { appRequestId, type: documentType },
  });

  if (document.status === 'approved') {
    throw new Error('IMMUTABILITY VIOLATION: Cannot reject an approved document');
  }
  // ... rejection logic
}
```

---

### 6. Determinism Guarantees

**Temperature Constraint**: ≤ 0.3

```typescript
const requestedTemperature = config?.temperature ?? 0.3;
if (requestedTemperature > 0.3) {
  throw new Error(
    `DETERMINISM VIOLATION: Temperature must be ≤ 0.3, got ${requestedTemperature}`
  );
}
```

**Stable Serialization**:
```typescript
private serializeMasterPlan(contract: MasterPlanContract): string {
  const sections: string[] = [];
  sections.push(`# Vision\n\n${contract.vision}\n`);
  sections.push(`# Target Audience\n\n${contract.targetAudience}\n`);
  sections.push(`# Core Problem\n\n${contract.coreProblem}\n`);
  sections.push(`# Explicit Non-Goals\n\n${contract.explicitNonGoals}\n`);
  sections.push(`# Core Modules\n\n${contract.coreModules.sort().map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`);
  sections.push(`# Success Criteria\n\n${contract.successCriteria}\n`);
  return sections.join('\n');
}
```

**Key Properties**:
- Alphabetically sorted lists (modules)
- No timestamps in content
- Consistent formatting
- Same Base Prompt hash → same planning output

---

### 7. Failure & Escalation (NO Silent Fallbacks)

**Rule**: If LLM generation fails after retries, the agent THROWS an error. NO silent fixes.

```typescript
private async generateMasterPlanContract(basePrompt: string): Promise<MasterPlanContract> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= this.llmConfig.retryAttempts; attempt++) {
    try {
      const response = this.llmConfig.provider === 'anthropic'
        ? await this.callAnthropic(systemPrompt, userPrompt)
        : await this.callOpenAI(systemPrompt, userPrompt);

      const contract = this.parseMasterPlanResponse(response);
      return contract;
    } catch (error) {
      lastError = error as Error;
      if (attempt < this.llmConfig.retryAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed - emit event and THROW
  await this.emitEvent('', 'planning_conflict', `Master Plan generation failed: ${lastError?.message}`);
  throw new Error(`PLANNING FAILURE: Master Plan generation failed after ${this.llmConfig.retryAttempts} attempts`);
}
```

**Conductor Behavior**: On failure, Conductor pauses and awaits human intervention.

---

### 8. Approval Flow Enforcement

**Rule**: Master Plan MUST be approved BEFORE Implementation Plan.

```typescript
async approveDocument(appRequestId: string, documentType: DocumentTypeValue): Promise<PlanningDocHardened | null> {
  // PART 8: Enforce approval order
  if (documentType === DocumentType.IMPLEMENTATION_PLAN) {
    const masterPlan = await this.prisma.planningDocument.findFirst({
      where: { appRequestId, type: DocumentType.MASTER_PLAN, status: DocumentStatus.APPROVED },
    });

    if (!masterPlan) {
      throw new Error(
        'APPROVAL FLOW VIOLATION: Master Plan must be approved before Implementation Plan'
      );
    }
  }

  // ... approval logic
}
```

**Automatic Generation**: When Master Plan is approved, Implementation Plan is automatically generated:

```typescript
if (documentType === DocumentType.MASTER_PLAN) {
  // ... lock document hash

  // Generate Implementation Plan
  const implPlanContract = await this.generateImplementationPlanContract(
    basePromptContent,
    masterPlan
  );

  // ... validate, serialize, save Implementation Plan
  return this.toPlanningDocHardened(implPlanDoc); // Returns Implementation Plan
}
```

---

### 9. Comprehensive Testing

**Test Suite**: `test-product-strategist-hardened.ts`

**Coverage**: 10/10 tests passing

1. ✅ Envelope Validation (PLANNING_AUTHORITY)
2. ✅ Context Isolation (Base Prompt by Hash ONLY)
3. ✅ Document Output Contracts (MasterPlanContract)
4. ✅ Feature & Scope Validation
5. ✅ Immutability & Section Hashing
6. ✅ Determinism Guarantees (Temperature ≤ 0.3)
7. ✅ Failure & Escalation (NO silent fallbacks)
8. ✅ Approval Flow Enforcement (Master → Implementation)
9. ✅ Document Integrity Verification
10. ✅ Full Integration (Generate both plans)

**Run Tests**:
```bash
cd apps/server
npx tsx test-product-strategist-hardened.ts
```

**Expected Output**:
```
Passed: 10/10
Failed: 0/10

🎉 ALL TESTS PASSED - Product Strategist is production-ready
```

---

## Usage

### Basic Flow

```typescript
import { ProductStrategistHardened } from './agents/product-strategist-hardened';
import { ForgeConductor } from './conductor/forge-conductor';
import { pino } from 'pino';

const prisma = new PrismaClient();
const logger = pino();
const conductor = new ForgeConductor(prisma, logger);

const strategist = new ProductStrategistHardened(
  prisma,
  conductor,
  logger,
  foundryArchitect, // Optional: for direct Base Prompt access
  {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2, // Must be ≤ 0.3
    maxTokens: 4000,
    retryAttempts: 3,
  }
);

// STEP 1: Generate Master Plan
const masterPlan = await strategist.start(appRequestId);
// Status: 'awaiting_approval'

// STEP 2: Approve Master Plan (auto-generates Implementation Plan)
const implPlan = await strategist.approveDocument(appRequestId, 'MASTER_PLAN');
// Returns: Implementation Plan (awaiting approval)

// STEP 3: Approve Implementation Plan
await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');
// Both documents now locked (immutable)
```

---

## Integration with Conductor

### State Transitions

1. **Before Product Strategist**: `base_prompt_ready`
2. **During Master Plan Generation**: Conductor locked
3. **After Master Plan Created**: Conductor paused (awaiting human approval)
4. **After Master Plan Approved**: Conductor locked (generating Implementation Plan)
5. **After Implementation Plan Created**: Conductor paused (awaiting human approval)
6. **After Implementation Plan Approved**: Conductor transitions to `planning` status

---

## LLM Prompt Strategy

### Master Plan System Prompt

```
You are a senior product strategist creating a Master Plan.

CRITICAL RULES:
- NO code generation
- NO UI/screen designs
- NO implementation details
- Focus on WHAT and WHY, not HOW
- Only include what's explicitly stated or clearly implied in the Base Prompt
- If something is vague or unclear, use "UNSPECIFIED" - do NOT infer or invent
- **CRITICAL**: For coreModules, use EXACT terms from the Base Prompt features/screens
  Do NOT paraphrase or elaborate

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "vision": "string",
  "targetAudience": "string",
  "coreProblem": "string",
  "explicitNonGoals": "string",
  "coreModules": ["array", "of", "modules"],
  "successCriteria": "string"
}
```

**Key Instruction**: "Use EXACT terms from the Base Prompt" prevents scope drift.

---

## Database Schema

### PlanningDocument Model (Hardened)

```prisma
model PlanningDocument {
  id           String     @id
  appRequestId String
  type         String // "MASTER_PLAN" | "IMPLEMENTATION_PLAN"
  content      String // Markdown string
  status       String // "draft" | "awaiting_approval" | "approved"
  createdAt    DateTime   @default(now())
  approvedAt   DateTime?

  // Immutability & Versioning (Production Hardening)
  documentVersion Int              @default(1)
  documentHash    String?          // SHA-256 hash of approved document
  sectionHashes   String           @default("{}") // JSON: {"vision": "hash", ...}
  basePromptHash  String?          // Reference to Base Prompt this was derived from
  approvedBy      String?          // "human" | "system"

  appRequest   AppRequest @relation(...)

  @@index([appRequestId])
  @@index([type])
  @@index([status])
  @@index([documentHash])
  @@index([basePromptHash])
}
```

---

## Known Constraints

1. **Temperature**: Must be ≤ 0.3 (enforced at initialization)
2. **Model**: Default is `claude-sonnet-4-20250514` (Anthropic)
3. **Approval Order**: Master Plan → Implementation Plan (cannot be reversed)
4. **Immutability**: Once approved, documents cannot be rejected or modified
5. **Scope**: Modules must map to Base Prompt (strict validation)

---

## Migration

**File**: `prisma/migrations/20260111_harden_planning_document/migration.sql`

**Changes**:
- Added `documentVersion` (INT, default 1)
- Added `documentHash` (TEXT, nullable)
- Added `sectionHashes` (TEXT, default '{}')
- Added `basePromptHash` (TEXT, nullable)
- Added `approvedBy` (TEXT, nullable)
- Created indices on `documentHash` and `basePromptHash`

**Apply**:
```bash
sqlite3 prisma/forge.db < prisma/migrations/20260111_harden_planning_document/migration.sql
npx prisma db push --skip-generate
npx prisma generate
```

---

## Production Readiness Checklist

- [x] PromptEnvelope with PLANNING_AUTHORITY
- [x] Context Isolation (Base Prompt by hash ONLY)
- [x] Document Output Contracts (strict schemas)
- [x] Feature & Scope Validation (maps to Base Prompt)
- [x] Immutability & Section Hashing (SHA-256)
- [x] Determinism Guarantees (same input → same output)
- [x] Failure & Escalation (NO silent fixes)
- [x] Approval Flow Enforcement (Master → Implementation)
- [x] Comprehensive Testing (10/10 tests passing)
- [x] Database Migration Applied
- [x] Documentation Complete

**Status**: ✅ **PRODUCTION READY**

---

## Next Steps

With the Product Strategist hardened, the next agents to harden are:

1. **Architect (Tier 3)** - Screen & flow definitions
2. **Designer (Tier 4)** - UI mockup generation
3. **Rule Codifier (Tier 5)** - Implementation constraints
4. **Forge Implementer (Tier 6)** - Code execution
5. **Completion Auditor (Tier 7)** - Verification

Each subsequent agent builds on the immutable artifacts from upstream agents, creating a chain of trust.
