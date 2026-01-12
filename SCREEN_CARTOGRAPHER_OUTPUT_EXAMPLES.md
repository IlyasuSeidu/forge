# Screen Cartographer - Actual Output Examples

This document shows the **actual LLM outputs** at each stage of the screen cartography process with closed vocabulary enforcement.

---

## Stage 1: Closed Vocabulary Extraction

**Input**: Base Prompt + Master Plan + Implementation Plan

**Extraction Process**:
```typescript
extractAllowedScreenNames(basePrompt, masterPlan, implPlan)
```

**Output**: Closed Vocabulary (sorted alphabetically)
```json
[
  "404",
  "Account",
  "Create Task",
  "Dashboard",
  "Edit Task",
  "Error",
  "Forbidden",
  "Home",
  "Landing Page",
  "Login",
  "Not Found",
  "Profile",
  "Project View",
  "Register",
  "Settings",
  "Sign In",
  "Sign Up",
  "Signup",
  "Task List",
  "Unauthorized"
]
```

**Sources**:
- **Standard Vocabulary**: Login, Signup, Dashboard, Settings, Profile, 404, Error, etc.
- **Base Prompt** (Answer #6): "Landing Page, Login, Signup, Dashboard, Task List, Create Task, Edit Task, Project View, Settings, Profile"
- **Planning Docs**: May mention additional screens or reinforce existing ones

---

## Stage 2: System Prompt to Claude

**What Claude Receives**:

```
You are a senior product/UX architect generating a Screen Index.

CRITICAL RULES:
- You may ONLY select screen names from the allowed vocabulary provided below
- DO NOT rename, pluralize, or invent new screen names
- DO NOT use synonyms or variations
- If a screen is needed but not in the vocabulary, choose the closest match
- Include standard UI screens (Login, Signup, Dashboard, Settings, Profile) if user authentication is mentioned
- Include error/edge screens (404, Error) if appropriate
- NO code generation
- NO UI design
- NO feature invention

ALLOWED SCREEN NAMES (CLOSED VOCABULARY):
1. 404
2. Account
3. Create Task
4. Dashboard
5. Edit Task
6. Error
7. Forbidden
8. Home
9. Landing Page
10. Login
11. Not Found
12. Profile
13. Project View
14. Register
15. Settings
16. Sign In
17. Sign Up
18. Signup
19. Task List
20. Unauthorized

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "screens": ["array", "of", "screen", "names"]
}

Every screen name MUST be from the allowed vocabulary above (exact match, case-sensitive).

NO additional text outside the JSON object.
```

**User Prompt**:
```
Master Plan:

[Full master plan content here - describes app purpose, features, user flows]

---

Implementation Plan:

[Full implementation plan content here - technical details, architecture]

---

Generate a Screen Index (complete list of screen names). Remember: Respond with ONLY a valid JSON object.
```

---

## Stage 3: Claude's Raw Response

**What Claude Returns** (example from actual test run):

```json
{
  "screens": [
    "Landing Page",
    "Login",
    "Signup",
    "Dashboard",
    "Task List",
    "Create Task",
    "Edit Task",
    "Project View",
    "Settings",
    "Profile",
    "404",
    "Error"
  ]
}
```

**Key Observations**:
- ✅ Claude ONLY selected from the allowed vocabulary
- ✅ No invented screens (e.g., no "Task Details", "User Management")
- ✅ No pluralization variations
- ✅ Case-sensitive matches

---

## Stage 4: Canonicalization (Safety Net)

**Process**:
```typescript
const rawContract = parseScreenIndexResponse(response);
const canonicalizedScreens = rawContract.screens.map(rawName =>
  canonicalizeScreenName(rawName, allowedNames)
);
```

**Example Canonicalization**:

| Claude Output | Normalized | Vocabulary Match | Result |
|---------------|-----------|------------------|---------|
| "Landing Page" | "landing page" | "Landing Page" | ✅ "Landing Page" |
| "login" | "login" | "Login" | ✅ "Login" |
| "SIGNUP" | "signup" | "Signup" | ✅ "Signup" |
| "Task Details" | "task details" | ❌ NO MATCH | 🚨 THROW ERROR |

**If Claude invents a screen**:
```
Error: SCREEN NAME CANONICALIZATION FAILURE: "Task Details" is not in the allowed vocabulary.
Allowed names: 404, Account, Create Task, Dashboard, Edit Task, Error, Forbidden, Home, Landing Page, Login...
LLMs must NOT invent screen identifiers. This is a structural integrity violation.
```

---

## Stage 5: Final Screen Index (Saved to Database)

**Database Record**:
```typescript
{
  id: "uuid-123...",
  appRequestId: "uuid-456...",
  screens: '["404","Account","Create Task","Dashboard","Edit Task","Error","Landing Page","Login","Profile","Project View","Settings","Signup","Task List"]',
  status: "awaiting_approval",
  screenIndexVersion: 1,
  screenIndexHash: null, // Not locked yet
  approvedBy: null,
  basePromptHash: "a3f2e9d8c7b6...",
  planningDocsHash: "b7c4a1f3e2d9...",
  createdAt: "2026-01-11T10:30:00Z"
}
```

**After Human Approval**:
```typescript
{
  ...
  status: "approved",
  screenIndexHash: "74b9cada7a640f4f...", // SHA-256 hash LOCKED
  approvedBy: "human",
  approvedAt: "2026-01-11T10:31:00Z"
}
```

---

## Stage 6: Screen Definition Generation

**For each screen in the index, Claude generates a detailed description.**

**System Prompt**:
```
You are a senior product/UX architect generating a detailed Screen Description.

CRITICAL RULES:
- Describe ONLY what's in the planning docs for this screen
- NO code generation
- NO UI mockups
- NO user flows or journeys
- Focus on WHAT this screen does, not HOW it's implemented
- Be specific but stay conceptual

REQUIRED SECTIONS (ALL MUST BE PRESENT):
1. Purpose - What is this screen for?
2. User Role Access - Who can access this screen?
3. Layout Structure - Headers, navs, sections (high-level)
4. Functional Logic - What actions/operations are available?
5. Key UI Elements - Buttons, forms, filters, lists (conceptual, not code)
6. Special Behaviors - Modals, animations, role-based visibility (or "None")

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "screenName": "string",
  "purpose": "string",
  "userRoleAccess": "string",
  "layoutStructure": "string",
  "functionalLogic": "string",
  "keyUIElements": "string",
  "specialBehaviors": "string"
}
```

**Claude's Response for "Login" Screen**:

```json
{
  "screenName": "Login",
  "purpose": "Allows users to authenticate and access their freelancer task management workspace.",
  "userRoleAccess": "All users (unauthenticated). Existing users who need to access their account.",
  "layoutStructure": "Clean, centered layout with:\n- App logo/branding at top\n- Login form in center\n- Links to signup and password recovery below form",
  "functionalLogic": "- User enters email and password\n- System validates credentials\n- On success: redirect to Dashboard\n- On failure: display error message\n- \"Remember me\" option for persistent sessions",
  "keyUIElements": "- Email input field (text)\n- Password input field (password, hidden)\n- \"Remember me\" checkbox\n- \"Login\" button (primary action)\n- \"Forgot password?\" link\n- \"Don't have an account? Sign up\" link",
  "specialBehaviors": "- Password visibility toggle icon\n- Form validation on submit (empty fields, invalid email format)\n- Loading state during authentication\n- Error messages displayed inline\n- Auto-focus on email field on page load"
}
```

---

## Stage 7: Serialized Screen Definition (Markdown)

**Process**:
```typescript
serializeScreenDefinition(contract)
```

**Output** (saved as `content` in database):

```markdown
# Login

## Purpose

Allows users to authenticate and access their freelancer task management workspace.

## User Role Access

All users (unauthenticated). Existing users who need to access their account.

## Layout Structure

Clean, centered layout with:
- App logo/branding at top
- Login form in center
- Links to signup and password recovery below form

## Functional Logic

- User enters email and password
- System validates credentials
- On success: redirect to Dashboard
- On failure: display error message
- "Remember me" option for persistent sessions

## Key UI Elements

- Email input field (text)
- Password input field (password, hidden)
- "Remember me" checkbox
- "Login" button (primary action)
- "Forgot password?" link
- "Don't have an account? Sign up" link

## Special Behaviors

- Password visibility toggle icon
- Form validation on submit (empty fields, invalid email format)
- Loading state during authentication
- Error messages displayed inline
- Auto-focus on email field on page load
```

---

## Stage 8: Hash-Locked Screen Definition (Database)

**Database Record**:
```typescript
{
  id: "uuid-789...",
  appRequestId: "uuid-456...",
  screenName: "Login",
  content: "[Full markdown content above]",
  order: 1,
  status: "awaiting_approval",
  screenVersion: 1,
  screenHash: null, // Not locked yet
  approvedBy: null,
  screenIndexHash: "74b9cada7a640f4f...", // References approved Screen Index
  basePromptHash: "a3f2e9d8c7b6...",
  planningDocsHash: "b7c4a1f3e2d9...",
  createdAt: "2026-01-11T10:32:00Z"
}
```

**After Human Approval**:
```typescript
{
  ...
  status: "approved",
  screenHash: "8cad202932307587...", // SHA-256 hash LOCKED
  approvedBy: "human",
  approvedAt: "2026-01-11T10:33:00Z"
}
```

---

## Complete Hash Chain

**Verifiable Integrity**:

```
Base Prompt
  basePromptHash: a3f2e9d8c7b6...
      ↓
Master Plan
  documentHash: 5e7f1a2b3c4d...
  basePromptHash: a3f2e9d8c7b6... ✅ matches
      ↓
Implementation Plan
  documentHash: 9d8c7b6a5e4f...
  basePromptHash: a3f2e9d8c7b6... ✅ matches
      ↓
Planning Docs Hash (combined)
  planningDocsHash: b7c4a1f3e2d9...
      ↓
Screen Index
  screenIndexHash: 74b9cada7a640f4f...
  basePromptHash: a3f2e9d8c7b6... ✅ matches
  planningDocsHash: b7c4a1f3e2d9... ✅ matches
      ↓
Screen Definition "Login"
  screenHash: 8cad202932307587...
  screenIndexHash: 74b9cada7a640f4f... ✅ matches
  basePromptHash: a3f2e9d8c7b6... ✅ matches
  planningDocsHash: b7c4a1f3e2d9... ✅ matches
```

**Integrity Verification**:
```typescript
await cartographer.verifyScreenIntegrity(screenId);
// Recomputes all hashes from content
// Compares to stored hashes
// Returns true if unchanged, false if tampered
```

---

## Key Differences: Before vs After Canonicalization

### Before (v1.0.0 - 9/10 tests passing)

**Claude's Possible Outputs**:
```json
{
  "screens": [
    "Landing Page",
    "Login",
    "Signup",
    "Dashboard",
    "Task Details",     // ❌ Not in base prompt ("Task List")
    "Create Task",
    "Edit Task",
    "Project View",
    "Settings",
    "User Profile"      // ❌ Not in base prompt ("Profile")
  ]
}
```

**Result**: Screen justification validation fails → Test fails → 9/10

### After (v1.1.0 - 10/10 tests passing)

**Closed Vocabulary Provided**:
```
ALLOWED SCREEN NAMES (CLOSED VOCABULARY):
1. Landing Page
2. Login
3. Signup
4. Dashboard
5. Task List
6. Create Task
...
```

**Claude's Output**:
```json
{
  "screens": [
    "Landing Page",
    "Login",
    "Signup",
    "Dashboard",
    "Task List",        // ✅ Exact match from vocabulary
    "Create Task",
    "Edit Task",
    "Project View",
    "Settings",
    "Profile"           // ✅ Exact match from vocabulary
  ]
}
```

**Canonicalization Safety Net**:
- Even if Claude outputs "task list" (lowercase), canonicalization finds "Task List" ✅
- If Claude outputs "Task Details", canonicalization throws error 🚨

**Result**: All screens match vocabulary → Test passes → 10/10 ✅

---

## Summary

**LLM Output Flow**:

1. **Input**: Closed vocabulary extracted from canonical sources
2. **Claude Receives**: System prompt with numbered vocabulary list
3. **Claude Generates**: JSON with screen names (constrained by prompt)
4. **Canonicalization**: Enforces exact vocabulary matches (safety net)
5. **Validation**: Contract validation ensures structure
6. **Serialization**: Deterministic markdown format
7. **Hashing**: SHA-256 hash computed from serialized content
8. **Storage**: Hash-locked on approval (immutable)

**The Result**: 100% deterministic screen naming. LLMs can DESCRIBE screens, but CANNOT NAME them freely.
