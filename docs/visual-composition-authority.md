# Visual Composition Authority (VCA)

**Tier 3.5 Agent | Constitutional Authority: VISUAL_COMPOSITION_AUTHORITY**

## Table of Contents
1. [Overview](#overview)
2. [Why VCA Exists](#why-vca-exists)
3. [Architecture](#architecture)
4. [How VCA Works](#how-vca-works)
5. [Contract Schema](#contract-schema)
6. [Integration](#integration)
7. [Testing](#testing)
8. [Examples](#examples)

---

## Overview

The **Visual Composition Authority (VCA)** is Forge's Tier 3.5 agent responsible for deciding **HOW screens are visually composed** before rendering. It sits between the Deterministic Visual Normalizer (DVNL) and Visual Forge in the visual intelligence pipeline.

### The Problem VCA Solves

Without VCA, Visual Forge receives:
- Rich content from VRA (WHAT exists)
- Strong constraints from DVNL (HOW MUCH is allowed)
- **NO composition guidance** (HOW it should be assembled)

This forces the image generation model to guess at layout, flatten visual hierarchy, and over-decorate—resulting in mockups that feel "busy" despite DVNL constraints.

### The VCA Solution

VCA explicitly composes the visual layout by:
- **Ordering sections** by visual priority (primarySections, secondarySections)
- **Grouping components** logically (related features together)
- **Establishing hierarchy** (emphasize/deEmphasize hints)
- **Deciding spacing** (tight/medium/loose)
- **Configuring grid strategy** (columns, symmetry, max per row)
- **Intentionally omitting** low-priority components within DVNL caps

Result: **ChatGPT-level visual intelligence** with enterprise-grade auditability.

---

## Why VCA Exists

### The ChatGPT Image Quality Problem

ChatGPT produces better-looking UI mockups than early Forge designs. Analysis revealed ChatGPT:
1. **Uses implicit visual reasoning loops** (not just one-shot prompts)
2. **Has a hidden visual post-processor** (composition layer)
3. **Treats the image model as a co-designer** (not just a renderer)

Forge was treating DALL-E as a pure renderer. VCA makes ChatGPT's implicit composition **explicit, deterministic, and auditable**.

### The Visual Intelligence Pipeline

```
VRA (WHAT)  →  DVNL (HOW MUCH)  →  VCA (HOW COMPOSED)  →  Visual Forge (RENDER)
```

- **VRA**: Defines content sections (navigation, metrics, charts, lists)
- **DVNL**: Constrains visual complexity (max 4 cards, 2 charts, no sparklines)
- **VCA**: Composes layout (cards first, chart below, omit secondary stats)
- **Visual Forge**: Renders final mockup with all guidance applied

---

## Architecture

### Context Isolation

VCA requires **all upstream artifacts to be approved**:
- ✅ Foundry Session (base prompt hash-locked)
- ✅ Planning Documents (MASTER_PLAN + IMPLEMENTATION_PLAN)
- ✅ Screen Index
- ✅ Screen Definition
- ✅ VRA Contract (Visual Expansion)
- ✅ DVNL Contract (Visual Normalization)

If any artifact is missing or unapproved, VCA throws `CONTEXT_ISOLATION_VIOLATION`.

### Determinism

VCA uses:
- **Claude Sonnet 4.5** (deterministic reasoning)
- **Temperature 0.2** (minimal randomness)
- **Structured JSON output** (closed vocabulary)

Same inputs → same composition contract → same mockup.

### Hash Chain Integrity

Every VCA contract traces back through the complete hash chain:

```
Base Prompt Hash
  ↓
Planning Docs Hash
  ↓
Screen Index Hash
  ↓
Screen Definition Hash
  ↓
VRA Contract Hash
  ↓
DVNL Contract Hash
  ↓
VCA Contract Hash
  ↓
Visual Forge Mockup Hash
```

Complete traceability from prompt to pixels.

---

## How VCA Works

### 1. Initialization

```typescript
const conductor = new ForgeConductor(prisma, logger);
const vca = new VisualCompositionAuthority(prisma, conductor, logger);
```

### 2. Compose Layout

```typescript
const contractId = await vca.composeLayout(
  appRequestId,
  screenName,
  layoutType // 'desktop' | 'mobile'
);
```

**What happens:**
1. Validates envelope (VISUAL_COMPOSITION_AUTHORITY)
2. Locks conductor (prevents concurrent modifications)
3. Loads isolated context (all upstream approvals required)
4. Generates composition contract via Claude API
5. Validates contract schema
6. Hashes and saves contract (status: 'awaiting_approval')
7. Pauses for human approval

### 3. Approval/Rejection

```typescript
// Approve composition
await vca.approve(contractId, 'human-reviewer');

// Or reject and regenerate
await vca.reject(contractId, 'Need tighter spacing');
```

Once approved, the contract is **immutable** (hash-locked).

### 4. Visual Forge Integration

Visual Forge automatically loads approved VCA contracts:

```typescript
// In Visual Forge
const compositionContract = await loadVisualCompositionContract(
  appRequestId,
  screenName,
  layoutType
);

if (compositionContract) {
  // Complete visual intelligence pipeline enabled
  const vcaInstructions = buildVCACompositionInstructions(compositionContract.contractData);
  // Inject into image generation prompt
}
```

---

## Contract Schema

### VisualCompositionContractData

```typescript
interface VisualCompositionContractData {
  screenName: string;
  layoutType: 'desktop' | 'mobile';

  // Section Ordering
  primarySections: string[];        // Main sections (ordered)
  secondarySections: string[];      // Less important sections (ordered)

  // Component Grouping
  componentGrouping: {
    [groupName: string]: string[];  // E.g., "Core Metrics": ["Revenue", "Users"]
  };

  // Visual Priority
  visualPriorityOrder: string[];    // High-to-low importance

  // Intentional Omissions
  intentionalOmissions: string[];   // Components to deliberately omit

  // Spacing Rules
  spacingRules: {
    sectionSpacing: 'tight' | 'medium' | 'loose';
    cardDensity: 'low' | 'medium' | 'high';
  };

  // Grid Strategy
  gridStrategy: {
    columns: number;                // E.g., 12
    maxComponentsPerRow: number;    // E.g., 4
    symmetry: 'left-weighted' | 'centered' | 'balanced';
  };

  // Hierarchy Hints
  hierarchyHints: {
    emphasize: string[];            // Components to make visually prominent
    deEmphasize: string[];          // Components to make subtle
  };

  // Rationale
  compositionRationale: string;     // Human-readable justification
}
```

### Example Contract

```json
{
  "screenName": "Dashboard",
  "layoutType": "desktop",
  "primarySections": [
    "Key Metrics",
    "Revenue Chart",
    "Recent Activity"
  ],
  "secondarySections": [
    "Footer Links"
  ],
  "componentGrouping": {
    "Core Metrics": ["Total Revenue", "New Users", "Orders"],
    "Visualizations": ["Revenue Trend Chart", "Traffic Sources Chart"]
  },
  "visualPriorityOrder": [
    "Key Metrics",
    "Revenue Trend Chart",
    "Recent Activity Table",
    "Traffic Sources Chart",
    "Footer Links"
  ],
  "intentionalOmissions": [
    "Customer Satisfaction Card"
  ],
  "spacingRules": {
    "sectionSpacing": "medium",
    "cardDensity": "medium"
  },
  "gridStrategy": {
    "columns": 12,
    "maxComponentsPerRow": 4,
    "symmetry": "balanced"
  },
  "hierarchyHints": {
    "emphasize": ["Key Metrics", "Revenue Trend Chart"],
    "deEmphasize": ["Footer Links"]
  },
  "compositionRationale": "Prioritize financial metrics and trends. Omit Customer Satisfaction to reduce visual density within DVNL caps. Use balanced layout with 4-column grid for metric cards."
}
```

---

## Integration

### Complete Visual Pipeline

```typescript
// 1. VRA - Define content
const vraContractId = await vra.expandScreen(appRequestId, screenName, layoutType);
await vra.approve(vraContractId, 'human');

// 2. DVNL - Constrain complexity
const dvnlContractId = await dvnl.normalizeVisualComplexity(appRequestId, screenName, layoutType);
await dvnl.approve(dvnlContractId, 'human');

// 3. VCA - Compose layout (NEW!)
const vcaContractId = await vca.composeLayout(appRequestId, screenName, layoutType);
await vca.approve(vcaContractId, 'human');

// 4. Visual Forge - Render mockup
await visualForge.generateMockup(appRequestId, screenName, layoutType);
// Visual Forge automatically loads and applies VRA + DVNL + VCA contracts
```

### Visual Forge Prompt Structure

With VCA enabled, Visual Forge's prompt includes:

```
Layout Structure (from VRA):
- Navigation: logo, nav items, notifications, user avatar
- Metric Cards: Revenue, Users, Orders, Satisfaction
- Charts: Revenue Trend (line), Traffic Sources (pie)

VISUAL NORMALIZATION CONSTRAINTS (from DVNL):
- Max 4 metric cards, 2 charts, 1 list
- No sparklines or heatmaps allowed
- 12-column grid, max 4 cards per row

VISUAL COMPOSITION PLAN (from VCA):
- Primary sections (in order): Key Metrics, Revenue Chart, Recent Activity
- Visual priority: Key Metrics > Revenue Chart > Recent Activity > Footer
- Component grouping: "Core Metrics" = [Revenue, Users, Orders]
- Intentionally omit: Customer Satisfaction Card
- Spacing: medium section spacing, medium card density
- Grid: 12 columns, max 4 per row, balanced symmetry
- Emphasize: Key Metrics, Revenue Chart
```

Result: **ChatGPT-level composition + enterprise auditability**.

---

## Testing

### Unit Tests

Run VCA-specific tests:

```bash
npm run test:vca
# or
tsx test-visual-composition-authority.ts
```

**Tests cover:**
1. Envelope validation
2. Context isolation (requires VRA + DVNL)
3. Section ordering validation
4. Component grouping validation
5. Visual priority ordering
6. Intentional omissions
7. Spacing and grid rules
8. No component invention/removal
9. Determinism (same input → same composition)
10. Hash chain integrity (VRA → DVNL → VCA)

### End-to-End Tests

Run complete pipeline test:

```bash
npm run test:e2e
# or
tsx test-full-pipeline-e2e.ts
```

**Tests:**
- VRA → DVNL → VCA → Visual Forge with real API calls
- Complete hash chain from prompt to mockup
- All approval gates respected

---

## Examples

### Example 1: Analytics Dashboard

**VRA Output:**
- 6 metric cards (Revenue, Users, Orders, Satisfaction, Churn, Growth)
- 3 charts (Revenue Trend, Traffic Sources, User Activity)
- 1 table (Recent Users)

**DVNL Constraints:**
- Max 4 metric cards
- Max 2 charts
- Max 1 table

**VCA Composition:**
```json
{
  "primarySections": ["Key Metrics", "Revenue Trend", "Recent Users"],
  "secondarySections": ["Footer"],
  "intentionalOmissions": ["Satisfaction Card", "Churn Card", "Growth Card", "Traffic Sources Chart", "User Activity Chart"],
  "visualPriorityOrder": ["Key Metrics", "Revenue Trend", "Recent Users"],
  "componentGrouping": {
    "Financial Metrics": ["Revenue", "Orders"],
    "User Metrics": ["Users"]
  },
  "spacingRules": {
    "sectionSpacing": "medium",
    "cardDensity": "medium"
  },
  "gridStrategy": {
    "columns": 12,
    "maxComponentsPerRow": 4,
    "symmetry": "balanced"
  },
  "hierarchyHints": {
    "emphasize": ["Revenue", "Revenue Trend"],
    "deEmphasize": []
  }
}
```

**Result:** Clean, focused dashboard with clear hierarchy. Only essential metrics shown. Revenue emphasized.

### Example 2: Mobile Todo App

**VRA Output:**
- Header with Add button
- Todo list with checkboxes
- Statistics footer
- Settings button

**DVNL Constraints:**
- Max 1 list
- No charts
- Mobile-optimized spacing

**VCA Composition:**
```json
{
  "primarySections": ["Header", "Todo List"],
  "secondarySections": ["Statistics"],
  "intentionalOmissions": [],
  "visualPriorityOrder": ["Todo List", "Header", "Statistics"],
  "componentGrouping": {
    "Main Content": ["Header", "Todo List"],
    "Auxiliary": ["Statistics"]
  },
  "spacingRules": {
    "sectionSpacing": "tight",
    "cardDensity": "high"
  },
  "gridStrategy": {
    "columns": 4,
    "maxComponentsPerRow": 1,
    "symmetry": "centered"
  },
  "hierarchyHints": {
    "emphasize": ["Todo List"],
    "deEmphasize": ["Statistics"]
  }
}
```

**Result:** Mobile-optimized layout with todo list as clear focal point. Tight spacing for mobile screen real estate.

---

## Best Practices

### 1. Always Run VCA After DVNL

VCA requires approved DVNL contracts to know density caps. Never skip DVNL.

### 2. Review Intentional Omissions

VCA may omit components to stay within DVNL caps. Review omissions to ensure nothing critical is removed.

### 3. Trust VCA's Composition Logic

VCA uses Claude Sonnet 4.5 for visual reasoning. Its composition decisions are generally better than manual guesses.

### 4. Use VCA for All Screens

Even simple screens benefit from explicit composition. Don't skip VCA.

### 5. Validate Hash Chain

Always verify complete traceability:
```
Base Prompt → Planning → Screen → VRA → DVNL → VCA → Mockup
```

---

## FAQ

**Q: Can I skip VCA and just use VRA + DVNL?**
A: You can, but mockups will lack clear hierarchy and may feel "busy." VCA is what gives ChatGPT-level composition.

**Q: Does VCA change component styling (colors, fonts)?**
A: No. VCA only decides layout/composition. Visual Forge handles all styling.

**Q: Can VCA invent new components?**
A: No. VCA only composes what VRA defined. It can omit components but never invent them.

**Q: What if VCA omits something I need?**
A: Reject the contract with feedback. VCA will regenerate with adjusted priorities.

**Q: How deterministic is VCA?**
A: With temperature 0.2, VCA produces very consistent results. Same inputs → same composition structure.

**Q: Can I manually edit VCA contracts?**
A: No. Contracts are immutable after approval. To change, reject and regenerate.

---

## Related Documentation

- [Visual Rendering Authority (VRA)](./visual-rendering-authority.md) - Content expansion
- [Deterministic Visual Normalizer (DVNL)](./deterministic-visual-normalizer.md) - Complexity constraints
- [Visual Forge](./visual-forge.md) - Mockup rendering
- [Complete Visual Pipeline](./visual-pipeline.md) - End-to-end flow

---

## Summary

VCA is the missing piece that brings Forge's mockups to ChatGPT-level quality by:
- **Explicit composition** instead of implicit guessing
- **Visual hierarchy** instead of flat layouts
- **Intentional omissions** instead of cramming everything in
- **Deterministic reasoning** with full auditability

**Without VCA:** VRA content + DVNL constraints + Visual Forge renderer = "busy" mockups
**With VCA:** VRA content + DVNL constraints + VCA composition + Visual Forge renderer = ChatGPT-level quality

VCA completes the visual intelligence pipeline. 🚀
