# FRAMEWORK ASSEMBLY LAYER - NEXT.JS PACK

**Type**: Deterministic Manufacturing Jig (NOT an Agent)
**Version**: 1.0.0
**Date**: 2026-01-14
**Status**: Production-Ready

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Philosophy](#philosophy)
3. [Architecture](#architecture)
4. [Public API](#public-api)
5. [File Mounting Rules](#file-mounting-rules)
6. [Route Discovery](#route-discovery)
7. [Manifest Schema](#manifest-schema)
8. [Testing](#testing)
9. [Integration](#integration)
10. [Limitations](#limitations)

---

## OVERVIEW

The Framework Assembly Layer (Next.js Pack) is a **deterministic manufacturing jig** that takes Forge Implementer filesystem output and assembles it into a runnable Next.js application.

**What It Does:**
- Validates Forge Implementer output
- Creates Next.js base scaffold (app router, layout, page, config files)
- Mounts generated files to deterministic locations
- Discovers and wires routes
- Produces manifest with framework metadata
- Fails loudly on any violations

**What It Does NOT Do:**
- Think, decide, improve, or fix code
- Use LLMs at runtime
- Interpret or modify generated code
- Retry or rollback on failures
- Optimize or refactor file structure

---

## PHILOSOPHY

### This Is NOT an Agent

The Framework Assembly Layer is a **factory robot**, not an intelligent agent.

**Comparison:**

| Agents (Tier 1-5) | Framework Assembly Layer |
|-------------------|--------------------------|
| LLM-driven | Rule-based |
| Prompt envelopes | Deterministic logic |
| Context isolation | File system operations |
| Hash-locked contracts | Hash-locked manifests |
| Human approval gates | Automatic assembly |

### Core Principles

1. **Zero Intelligence**
   - No decisions, only rules
   - No interpretation, only validation
   - No fixes, only failures

2. **100% Determinism**
   - Same input → Same output
   - Same hash → Always
   - No timestamps in hashes

3. **Fail Loud, Fail Fast**
   - Missing file? → FAIL
   - Invalid JSON? → FAIL
   - Wrong structure? → FAIL

4. **No LLMs at Runtime**
   - Pure TypeScript logic
   - File system operations only
   - No API calls to Claude/GPT

---

## ARCHITECTURE

### Assembly Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ FORGE IMPLEMENTER OUTPUT                                     │
│ - appRequestId, executionLogId, executionLogHash             │
│ - workspaceDir                                               │
│ - filesCreated[], filesModified[]                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: VALIDATE INPUT                                      │
│ - Check required fields                                      │
│ - Verify workspace exists                                    │
│ - Verify all declared files exist                            │
│ → FAIL if violations                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: CREATE BASE SCAFFOLD                                │
│ - app/layout.tsx (root layout)                               │
│ - app/page.tsx (root page)                                   │
│ - package.json (dependencies)                                │
│ - next.config.js (Next.js config)                            │
│ - tsconfig.json (TypeScript config)                          │
│ - .gitignore                                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: MOUNT GENERATED FILES                               │
│ - Apply deterministic mounting rules                         │
│ - Copy files to mount locations                              │
│ - Record mount metadata (sourcePath, mountPath, fileType)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: DISCOVER ROUTES                                     │
│ - Scan app/ directory for page.tsx files                     │
│ - Scan app/ directory for route.ts files (API routes)        │
│ - Scan app/ directory for layout.tsx files                   │
│ - Build route metadata                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: GENERATE MANIFEST                                   │
│ - manifestId (UUID)                                          │
│ - executionLogHash (hash chain reference)                    │
│ - frameworkVersion, frameworkType                            │
│ - baseScaffold, mountedFiles, routes                         │
│ - buildCommands (install, dev, build, start)                 │
│ - manifestHash (SHA-256, deterministic)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: WRITE MANIFEST                                      │
│ - Save manifest to nextjs-app/forge-manifest.json            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: RUNNABLE NEXT.JS APP                                 │
│ - nextjs-app/                                                │
│   ├── app/                                                   │
│   │   ├── layout.tsx                                         │
│   │   ├── page.tsx                                           │
│   │   └── [generated routes]                                 │
│   ├── components/ (if any)                                   │
│   ├── lib/ (if any)                                          │
│   ├── package.json                                           │
│   ├── next.config.js                                         │
│   ├── tsconfig.json                                          │
│   └── forge-manifest.json                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## PUBLIC API

### `assemble(input: ForgeImplementerOutput): Promise<NextJsManifest>`

**Purpose**: Main assembly entry point.

**Input**:
```typescript
interface ForgeImplementerOutput {
  appRequestId: string;
  executionLogId: string;
  executionLogHash: string; // Hash-chain reference
  workspaceDir: string;     // Absolute path to workspace
  filesCreated: string[];   // Relative paths
  filesModified: string[];  // Relative paths
  timestamp: string;        // ISO 8601
}
```

**Output**:
```typescript
interface NextJsManifest {
  manifestId: string;
  appRequestId: string;
  executionLogHash: string;
  frameworkVersion: string;       // e.g., "14.2.0"
  frameworkType: 'nextjs-app-router';
  outputDir: string;              // Absolute path to nextjs-app/
  baseScaffold: {
    appDir: string;               // Relative path to app/
    layoutPath: string;           // Relative path to app/layout.tsx
    rootPagePath: string;         // Relative path to app/page.tsx
    publicDir: string;            // Relative path to public/
  };
  mountedFiles: MountedFile[];
  routes: Route[];
  buildCommands: {
    install: string;              // "npm install"
    dev: string;                  // "npm run dev"
    build: string;                // "npm run build"
    start: string;                // "npm run start"
  };
  manifestHash: string;           // SHA-256 (deterministic)
  createdAt: string;              // ISO 8601
}
```

**Behavior**:
- Validates input (throws if invalid)
- Creates base scaffold
- Mounts all files
- Discovers routes
- Generates manifest
- Writes manifest to disk
- Returns manifest

**Throws**:
- `ASSEMBLY VALIDATION FAILED` if input is invalid
- Any file system errors (missing permissions, disk full, etc.)

### `validateAssembly(outputDir: string): ValidationResult`

**Purpose**: Validate that an assembled Next.js app is structurally correct.

**Input**: Absolute path to nextjs-app/ directory

**Output**:
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

**Behavior**:
- Checks required files exist (package.json, next.config.js, tsconfig.json, app/layout.tsx, app/page.tsx)
- Validates package.json is valid JSON
- Validates tsconfig.json is valid JSON
- Does NOT run builds or tests

---

## FILE MOUNTING RULES

Files are mounted to deterministic locations based on path and filename patterns.

**Rules are evaluated in order - first match wins.**

### Rule 1: Explicit app/ Directory

**Pattern**: File path starts with `app/`

**Mount**: Preserve path as-is

**Example**:
- `app/dashboard/page.tsx` → `app/dashboard/page.tsx`
- `app/api/users/route.ts` → `app/api/users/route.ts`

**File Type**: Inferred from filename

### Rule 2: Page Files

**Pattern**: Filename is `page.tsx` or `page.js`

**Mount**: `app/{original-path}/page.tsx`

**Example**:
- `dashboard/page.tsx` → `app/dashboard/page.tsx`
- `blog/post/page.tsx` → `app/blog/post/page.tsx`

**File Type**: `page`

### Rule 3: Layout Files

**Pattern**: Filename is `layout.tsx` or `layout.js`

**Mount**: `app/{original-path}/layout.tsx`

**Example**:
- `dashboard/layout.tsx` → `app/dashboard/layout.tsx`

**File Type**: `layout`

### Rule 4: Components Directory

**Pattern**: Path starts with `components/`

**Mount**: Preserve path as-is

**Example**:
- `components/Button.tsx` → `components/Button.tsx`
- `components/forms/Input.tsx` → `components/forms/Input.tsx`

**File Type**: `component`

### Rule 5: Lib Directory

**Pattern**: Path starts with `lib/`

**Mount**: Preserve path as-is

**Example**:
- `lib/utils.ts` → `lib/utils.ts`
- `lib/api/client.ts` → `lib/api/client.ts`

**File Type**: `lib`

### Rule 6: Styles

**Pattern**: Path starts with `styles/` OR extension is `.css` or `.scss`

**Mount**: `styles/{filename}` (if not already in styles/)

**Example**:
- `styles/globals.css` → `styles/globals.css`
- `theme.css` → `styles/theme.css`

**File Type**: `style`

### Rule 7: API Routes

**Pattern**: Path starts with `api/` OR filename is `route.ts` or `route.js`

**Mount**: `app/{original-path}`

**Example**:
- `api/users/route.ts` → `app/api/users/route.ts`
- `health/route.ts` → `app/health/route.ts`

**File Type**: `api`

### Rule 8: Config Files

**Pattern**: Filename matches config patterns (next.config.js, middleware.ts, etc.)

**Mount**: Root directory

**Example**:
- `next.config.js` → `next.config.js`
- `middleware.ts` → `middleware.ts`

**File Type**: `config`

### Rule 9: Default Code Files

**Pattern**: Extension is `.ts`, `.tsx`, `.js`, `.jsx`

**Mount**: `lib/{original-path}`

**Example**:
- `helpers/formatDate.ts` → `lib/helpers/formatDate.ts`

**File Type**: `lib`

### Rule 10: Passthrough

**Pattern**: Everything else

**Mount**: Preserve path as-is

**File Type**: `other`

---

## ROUTE DISCOVERY

After mounting files, the assembly layer scans the `app/` directory to discover routes.

### Page Routes

**Pattern**: Files named `page.tsx` or `page.js`

**Route Path**: Directory path relative to `app/`

**Example**:
- `app/page.tsx` → `/`
- `app/dashboard/page.tsx` → `/dashboard`
- `app/blog/[slug]/page.tsx` → `/blog/[slug]`

**Route Type**: `page`

### API Routes

**Pattern**: Files named `route.ts` or `route.js`

**Route Path**: Directory path relative to `app/`

**Example**:
- `app/api/users/route.ts` → `/api/users`
- `app/api/health/route.ts` → `/api/health`

**Route Type**: `api`

### Layout Routes

**Pattern**: Files named `layout.tsx` or `layout.js`

**Route Path**: Directory path relative to `app/`

**Example**:
- `app/layout.tsx` → `/`
- `app/dashboard/layout.tsx` → `/dashboard`

**Route Type**: `layout`

---

## MANIFEST SCHEMA

### Full Schema

```typescript
interface NextJsManifest {
  // Identity
  manifestId: string;              // UUID (non-deterministic)
  appRequestId: string;            // Links to AppRequest
  executionLogHash: string;        // Hash-chain reference to Forge Implementer output

  // Framework Metadata
  frameworkVersion: string;        // "14.2.0" (pinned)
  frameworkType: 'nextjs-app-router';

  // Paths
  outputDir: string;               // Absolute path to nextjs-app/

  // Base Scaffold
  baseScaffold: {
    appDir: string;                // "app"
    layoutPath: string;            // "app/layout.tsx"
    rootPagePath: string;          // "app/page.tsx"
    publicDir: string;             // "public"
  };

  // Mounted Files
  mountedFiles: MountedFile[];

  // Discovered Routes
  routes: Route[];

  // Build Commands
  buildCommands: {
    install: string;               // "npm install"
    dev: string;                   // "npm run dev"
    build: string;                 // "npm run build"
    start: string;                 // "npm run start"
  };

  // Hash Chain
  manifestHash: string;            // SHA-256 (deterministic, excludes manifestId and createdAt)
  createdAt: string;               // ISO 8601 timestamp
}
```

### MountedFile Schema

```typescript
interface MountedFile {
  sourcePath: string;    // Relative to workspace (e.g., "components/Button.tsx")
  mountPath: string;     // Relative to Next.js root (e.g., "components/Button.tsx")
  fileType: 'component' | 'page' | 'layout' | 'api' | 'lib' | 'style' | 'config' | 'other';
  determinedBy: string;  // Rule name (e.g., "RULE_4_COMPONENTS_DIR")
}
```

### Route Schema

```typescript
interface Route {
  path: string;        // e.g., "/dashboard"
  filePath: string;    // e.g., "app/dashboard/page.tsx"
  routeType: 'page' | 'api' | 'layout';
}
```

---

## TESTING

### Test Suite

**File**: `test-framework-assembly-nextjs.ts`

**Test Count**: 12 tests

**Categories**:
1. Input Validation (Tests 1-3)
2. Determinism (Test 4)
3. Base Scaffold (Test 5)
4. File Mounting (Tests 6-7)
5. Route Discovery (Tests 8-9)
6. Assembly Validation (Test 10)
7. Integration (Test 11)
8. Hash Chain (Test 12)

**Running Tests**:
```bash
npx tsx apps/server/test-framework-assembly-nextjs.ts
```

**Expected Output**:
```
✅ ALL TESTS PASSED - FRAMEWORK ASSEMBLY LAYER IS READY
```

---

## INTEGRATION

### Integration with Forge Pipeline

The Framework Assembly Layer sits **after** the constitutional agent chain:

```
Base Prompt (Tier 1)
  ↓
Planning Docs (Tier 2)
  ↓
Screen Index (Tier 2)
  ↓
User Journeys (Tier 2)
  ↓
Visual Contracts (Tier 3)
  ↓
Build Prompts (Tier 4)
  ↓
Execution Plans (Tier 4)
  ↓
Execution Logs (Tier 4) ← Forge Implementer Output
  ↓
[OPTIONAL] Verification → Repair Loop (Tier 5)
  ↓
Completion Report (Tier 5)
  ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK ASSEMBLY LAYER ← YOU ARE HERE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ↓
Runnable Next.js App
```

### Usage Example

```typescript
import { FrameworkAssemblyNextJs } from './assembly/framework-assembly-nextjs';

// After Forge Implementer completes execution
const forgeOutput = {
  appRequestId: executionLog.appRequestId,
  executionLogId: executionLog.id,
  executionLogHash: executionLog.logHash,
  workspaceDir: '/path/to/workspace',
  filesCreated: executionLog.filesCreated,
  filesModified: executionLog.filesModified,
  timestamp: executionLog.createdAt.toISOString(),
};

// Assemble Next.js app
const assembly = new FrameworkAssemblyNextJs();
const manifest = await assembly.assemble(forgeOutput);

// Validate assembly
const validation = assembly.validateAssembly(manifest.outputDir);
if (!validation.valid) {
  throw new Error(`Assembly validation failed: ${validation.errors.join(', ')}`);
}

// User can now run:
// cd nextjs-app
// npm install
// npm run dev
```

---

## LIMITATIONS

### What This Layer Does NOT Do

1. **No Code Generation**
   - Does not write TypeScript/JSX code
   - Only creates boilerplate scaffold files

2. **No Code Modification**
   - Does not fix, improve, or refactor generated code
   - Only copies files to mount locations

3. **No Build Execution**
   - Does not run `npm install`
   - Does not run `npm run build`
   - User must run these commands manually

4. **No Framework Detection**
   - Only supports Next.js 14.2.0 with App Router
   - Does not detect or support other frameworks (Vue, Svelte, etc.)

5. **No Error Recovery**
   - If a file is missing → FAIL
   - If validation fails → FAIL
   - No retry, no rollback, no fixes

### Supported Framework

**Only**: Next.js 14.2.0 with App Router

**Future Packs** (not yet implemented):
- Next.js Pages Router Pack
- Remix Pack
- Vue Pack
- Svelte Pack
- React SPA Pack

---

## MANIFEST HASH CHAIN

The Framework Assembly Layer extends the Forge hash chain:

```
Base Prompt
  ↓ basePromptHash
Planning Docs
  ↓ planningDocsHash
Screen Index
  ↓ screensHash
User Journeys
  ↓ journeysHash
Visual Contracts
  ↓ visualContractsHash
Build Prompts
  ↓ buildPromptHash
Execution Plans
  ↓ executionPlanHash
Execution Logs
  ↓ executionLogHash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Framework Assembly Manifest
  ↓ manifestHash
```

**Key Property**: The manifest includes `executionLogHash`, creating an immutable link from the runnable Next.js app back to the Forge Implementer output.

---

## DETERMINISM GUARANTEES

### What Is Deterministic

1. **File Mounting**: Same file structure → Same mount locations
2. **Route Discovery**: Same file structure → Same routes
3. **Manifest Hash**: Same input (excluding UUIDs/timestamps) → Same hash

### What Is NOT Deterministic

1. **manifestId**: UUID generated per assembly
2. **createdAt**: Current timestamp
3. **outputDir**: Absolute path (depends on workspace location)

### Hash Computation

**Included in Hash**:
- `appRequestId`
- `executionLogHash`
- `frameworkVersion`
- `frameworkType`
- `baseScaffold`
- `mountedFiles`
- `routes`
- `buildCommands`

**Excluded from Hash** (non-deterministic):
- `manifestId`
- `createdAt`
- `outputDir`

---

## TROUBLESHOOTING

### Assembly Fails with "Declared file does not exist"

**Cause**: Forge Implementer declared a file in `filesCreated` but did not actually create it.

**Fix**: Fix Forge Implementer to create all declared files.

### Assembly Fails with "Workspace directory does not exist"

**Cause**: Workspace path is invalid or deleted.

**Fix**: Ensure workspace exists before calling `assemble()`.

### Validation Fails with "Required file missing"

**Cause**: Base scaffold creation failed (disk permissions, disk full, etc.).

**Fix**: Check file system permissions and disk space.

### Routes Not Discovered

**Cause**: Files not mounted to `app/` directory.

**Fix**: Check file mounting rules - ensure page/layout/route files are in `app/` directory.

---

## PHILOSOPHY SUMMARY

> "The Framework Assembly Layer is a factory robot, not a thinking agent.
> It takes structured output from Forge Implementer and mechanically assembles it into a runnable Next.js app.
> If something is wrong, it fails loudly.
> It does not think. It does not fix. It assembles."

**Golden Rule**: NO INTELLIGENCE AT RUNTIME.

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-14
**Status**: Production-Ready
