# How VCRA Output is Reused by ForgeImplementer

## 🔄 **Complete Flow from VCRA to ForgeImplementer**

### **Phase 1: Visual Pipeline (Tier 3)**

#### 1. **VCRA Generates HTML/Tailwind Code**
```typescript
// Visual Code Rendering Authority generates prototype UI code
const vcraContract = await vcra.generateUICode(
  appRequestId,
  screenName,
  'desktop',
  'html-tailwind'
);
```

**Stored in Database:**
- Table: `VisualCodeRenderingContract`
- Fields:
  - `generatedCode`: Complete HTML/Tailwind markup
  - `codeHash`: SHA-256 hash for integrity
  - `contractHash`: Full contract hash (immutable)

#### 2. **Playwright Renders HTML to PNG Screenshot**
```typescript
// ScreenshotRenderer uses Playwright headless browser
const screenshotResult = await screenshotRenderer.renderHTMLScreenshot(
  vcraContract.generatedCode,
  { viewport: { width: 1920, height: 1080 } }
);
```

**Output:**
- PNG screenshot saved to disk: `/mockups/landing-page-desktop.png`
- Perfect pixel-perfect rendering (no AI blur)
- Exact layout fidelity

#### 3. **ScreenMockup Record Created**
```typescript
// ScreenMockup links the PNG image with metadata
await prisma.screenMockup.create({
  data: {
    screenName: 'Landing Page',
    imagePath: '/mockups/landing-page-desktop.png',
    mockupHash: '...',  // SHA-256 of mockup contract
    imageHash: '...',   // SHA-256 of PNG file
    status: 'approved',
    // Hash chain references:
    screenHash: '...',
    screenIndexHash: '...',
    basePromptHash: '...',
  }
});
```

---

### **Phase 2: Build Planning (Tier 4 - BuildPromptEngineer)**

#### 4. **BuildPromptEngineer Loads Approved Mockups**
```typescript
// Line 288-296 in build-prompt-engineer-hardened.ts
const mockups = await this.prisma.screenMockup.findMany({
  where: {
    appRequestId,
    status: 'approved',
    mockupHash: { not: null },
  },
});

// Include mockups in isolated context
const context = {
  mockups: mockups.map((m) => ({
    screenName: m.screenName,
    imagePath: m.imagePath,
    mockupHash: m.mockupHash!,
  })),
  // ... other context
};
```

#### 5. **BuildPrompts Reference Mockups**
```typescript
// Line 679 in build-prompt-engineer-hardened.ts
// Build prompts instruct ForgeImplementer to match mockups
{
  task: 'Create UI screen component',
  instruction: 'Create UI screen component with styles matching approved mockup',
  mustMatchVisuals: ['Landing Page', 'Dashboard', ...],
}
```

**Key Point:** BuildPrompts don't include the HTML code itself - they reference the PNG mockup path

---

### **Phase 3: Implementation (Tier 4 - ForgeImplementer)**

#### 6. **ForgeImplementer Receives Build Prompts**
```typescript
// ForgeImplementer executes the plan
const execLog = await forgeImplementer.execute(executionPlanId);
```

**What ForgeImplementer Gets:**
- ✅ **PNG mockup image path** (via build prompt context)
- ✅ **Screen name, layout type**
- ✅ **Tech stack** (React, TypeScript, Tailwind, Next.js)
- ✅ **Instruction:** "Create UI matching approved mockup"
- ❌ **NOT the VCRA HTML code** (it's NOT directly passed)

#### 7. **ForgeImplementer Generates Production Code**

**Process:**
1. Loads PNG mockup image
2. **Uses Claude Vision API** to "see" the mockup
3. Generates **production React/TypeScript code** that matches the visual
4. Applies proper component structure, state management, hooks
5. Implements proper TypeScript types
6. Adds accessibility, error handling

**Output:**
```typescript
// ForgeImplementer generates production-ready React components
// Example: components/LandingPage.tsx
export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <nav className="px-6 py-4">...</nav>
      <main className="container mx-auto px-6">
        <h1 className="text-5xl font-bold">...</h1>
      </main>
    </div>
  );
}
```

---

## 🎯 **Key Insights**

### **Why VCRA HTML is NOT Directly Reused:**

1. **VCRA generates prototype/mockup code** (simple HTML/Tailwind)
2. **ForgeImplementer generates production code** (React/TypeScript with proper architecture)

### **The PNG Screenshot is the Contract:**

- **PNG serves as the visual specification**
- VCRA's HTML is the **implementation detail that created the PNG**
- ForgeImplementer **matches the PNG visually**, not the HTML structurally

### **Benefits of This Approach:**

✅ **Separation of Concerns:**
   - VCRA focuses on rapid visual prototyping
   - ForgeImplementer focuses on production-quality code

✅ **Flexibility:**
   - Can change underlying framework without changing visual pipeline
   - ForgeImplementer can optimize component structure

✅ **Quality:**
   - ForgeImplementer applies best practices (proper typing, hooks, accessibility)
   - Not constrained by prototype code structure

✅ **Hash Chain Integrity:**
   - PNG mockup is hash-locked
   - ForgeImplementer's output is cryptographically traceable to approved mockup

---

## 📊 **Complete Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 3: VISUAL FORGE                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VRA → DVNL → VCA → VCRA                                       │
│                      │                                          │
│                      ▼                                          │
│              HTML/Tailwind Code                                 │
│              (stored in DB)                                     │
│                      │                                          │
│                      ▼                                          │
│           Playwright Rendering                                  │
│                      │                                          │
│                      ▼                                          │
│            PNG Screenshot Image                                 │
│            /mockups/screen.png                                  │
│                      │                                          │
│                      ▼                                          │
│           ScreenMockup Record                                   │
│           (mockupHash, imagePath)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ Hash-locked reference
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 4: BUILD PROMPT ENGINEER                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Loads approved mockups from DB                                 │
│  Creates BuildPrompt:                                           │
│    "Create UI matching mockup at /mockups/screen.png"          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ BuildPrompt ID
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 4: EXECUTION PLANNER                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Creates ExecutionPlan from BuildPrompt                         │
│  (task breakdown, dependencies, order)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ ExecutionPlan ID
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ TIER 4: FORGE IMPLEMENTER                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Loads PNG mockup image                                      │
│  2. Uses Claude Vision to "see" mockup                          │
│  3. Generates production React/TypeScript code                  │
│  4. Writes to disk: src/components/LandingPage.tsx              │
│  5. Creates ExecutionLog (hash-locked)                          │
│                                                                 │
│  ❌ Does NOT use VCRA's HTML code directly                      │
│  ✅ Uses PNG as visual specification                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 **Hash Chain Integrity**

Every artifact is cryptographically linked:

```
BasePrompt (hash)
  → MasterPlan (hash + basePromptHash)
    → ScreenDefinition (hash + planningDocsHash)
      → VRA Contract (hash + screenHash)
        → VCRA Contract (hash + vraHash)
          → ScreenMockup (hash + codeHash)
            → BuildPrompt (mockupsHash)
              → ExecutionLog (hash + buildPromptHash)
```

**Result:** Every line of production code is traceable back to the original Base Prompt through an unbroken hash chain.

---

## 💡 **Summary**

| Stage | Artifact | Used By | Purpose |
|-------|----------|---------|---------|
| VCRA | HTML/Tailwind code | Playwright | Generate visual mockup |
| Playwright | PNG screenshot | BuildPromptEngineer | Visual specification |
| BuildPromptEngineer | BuildPrompt referencing PNG | ForgeImplementer | Implementation instruction |
| ForgeImplementer | Production React code | Application | Final codebase |

**VCRA's HTML is NOT directly reused. The PNG mockup is the contract that ForgeImplementer implements.**
