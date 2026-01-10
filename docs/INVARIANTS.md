# Forge Core Invariants (Phase 10)

**Status**: FROZEN
**Date Frozen**: 2026-01-11
**Version**: Phase 10 Complete

---

## Purpose

This document defines the **core guarantees** that Forge makes to users about quality, safety, and transparency.

**These invariants MUST NEVER be weakened.**

Any change that violates these invariants is considered a **breaking change** and requires extraordinary justification.

---

## The Five Sacred Invariants

### 1️⃣ No Silent Completion

**Rule**: No app may be marked "completed" unless:
- Static verification passes (all structural checks)
- Runtime verification passes (all behavioral checks)

**What this prevents**:
- Shipping broken apps to users
- Silent quality degradation
- False sense of success

**Enforcement**:
- `VerificationService.markPassed()` is the ONLY path to "completed" status
- AppRequest status cannot be manually set to "completed" without verification

---

### 2️⃣ No Silent Failures

**Rule**: Verification failures must:
- Be visible to the user in clear, non-technical language
- Never fail silently or be hidden behind abstractions
- Include actionable information about what went wrong

**What this prevents**:
- User confusion ("Why doesn't my app work?")
- Loss of trust ("Forge said it was done!")
- Support burden from hidden failures

**Enforcement**:
- All verification failures emit events
- UI must display verification status
- Errors must be stored and retrievable

---

### 3️⃣ Bounded Self-Healing

**Rule**: Self-healing MUST:
- Have a hard limit on repair attempts (currently 5)
- Only fix detected errors (no scope expansion)
- Re-verify after EVERY repair attempt
- Never bypass verification

**What this prevents**:
- Infinite repair loops
- Scope creep during repairs
- AI "improvements" that break other things
- False confidence in untested fixes

**Enforcement**:
- `MAX_REPAIR_ATTEMPTS` constant (currently 5)
- RepairAgent has strict prompt contract
- No repair can mark verification as passed directly

---

### 4️⃣ Human Control

**Rule**: Humans are always in control:
- No auto-approval of executions
- No auto-continuation after max repair attempts
- No forced downloads of failed apps
- Clear warnings before risky actions

**What this prevents**:
- Runaway AI agents
- Unwanted resource consumption
- Downloading broken code
- Loss of user agency

**Enforcement**:
- HITL (Human-in-the-Loop) approval gates
- Explicit user actions required for failed apps
- Confirmation dialogs for risky operations

---

### 5️⃣ Ratchet Rule (Strengthening Only)

**Rule**: Verification rules may only be:
- **Strengthened** (more checks, stricter rules)
- **Never relaxed** (fewer checks, looser rules)
- **Never bypassed** (no shortcuts, no exceptions)

**What this prevents**:
- Quality regression over time
- "Just this once" exceptions becoming permanent
- Erosion of trust through gradual weakening

**Enforcement**:
- Code review requirement for verification changes
- This document as the constitutional reference
- Git tag `phase-10-freeze` as the baseline

---

## How to Protect These Invariants

### ✅ Allowed Changes

These changes are **explicitly allowed** and do NOT violate invariants:

- **Adding new verification checks** (more thorough)
- **Improving error messages** (more clarity)
- **Enhancing repair agent prompts** (better fixes)
- **Optimizing performance** (faster verification, same checks)
- **Better UI presentation** (more user-friendly, same data)

### ❌ Forbidden Changes

These changes are **explicitly forbidden** and VIOLATE invariants:

- Skipping verification for "simple" apps
- Auto-approving failed verifications
- Hiding verification errors from users
- Removing existing verification checks
- Allowing infinite repair attempts
- Marking apps as completed without verification
- Adding a "bypass verification" flag/option
- Making verification "optional"

### ⚠️ Requires Extraordinary Justification

These changes require **documented justification** and team consensus:

- Changing `MAX_REPAIR_ATTEMPTS` (must remain bounded)
- Modifying verification pass/fail criteria (must strengthen, not weaken)
- Adding new paths to "completed" status (must still verify)

---

## Enforcement Process

### For Code Changes

1. **Before changing verification code**, ask:
   - Does this weaken any invariant?
   - Could this hide failures from users?
   - Does this bypass re-verification?

2. **If unsure**, diff against the frozen tag:
   ```bash
   git diff phase-10-freeze -- apps/server/src/services/verification-service.ts
   ```

3. **If weakening detected**, reject the change immediately

### For New Features

All new features must answer:

1. **Does this respect verification?**
   ✅ New deployment targets still verify
   ✅ New agents still go through verification
   ✅ New UI features still show verification state

2. **Does this maintain visibility?**
   ✅ Failures are still visible
   ✅ Users still have control
   ✅ No silent bypasses

3. **Does this strengthen or weaken?**
   ✅ More checks = allowed
   ❌ Fewer checks = forbidden

---

## Why These Invariants Matter

### User Trust

When Forge says "Your app is ready," users must **trust** that:
- The app actually works
- Quality checks have run
- Issues were either fixed or communicated

Breaking these invariants breaks user trust.

### System Credibility

Forge's entire value proposition is:
> "AI-generated apps that actually work"

If verification is bypassed, this promise is meaningless.

### Moat

These invariants are Forge's **competitive moat**:
- Other tools ship broken code silently
- Forge catches issues before users see them
- Users learn they can rely on Forge's "completed" status

This differentiation disappears if invariants weaken.

---

## Historical Context

**Phase 10** (completed 2026-01-11) established:
- Static verification (structural checks)
- Runtime verification (behavioral checks)
- Self-healing repair loop (up to 5 attempts)
- Human escalation UX (clear failures, user decisions)

Before Phase 10:
- Apps could be marked "completed" even if broken
- Users discovered bugs after download
- No quality guarantee existed

After Phase 10:
- "Completed" means verified
- Users see failures before download
- Quality is a first-class concern

**This is the line we hold.**

---

## If You Must Break an Invariant

If there is truly **no other way** to proceed without violating an invariant:

1. **Stop**
2. **Document why** the invariant conflicts with the requirement
3. **Propose an alternative** that respects the invariant
4. **Get consensus** (team review if applicable)
5. **Update this document** to reflect the new understanding

But understand: **Invariants exist because bypassing them causes harm.**

The default answer to "Can we skip verification for X?" is:

> **"No. That breaks Phase 10."**

No further discussion required.

---

## Appendix: Key Code Locations

These files implement the frozen invariants:

| File | Invariant Protected |
|------|---------------------|
| `apps/server/src/services/verification-service.ts` | 1, 2, 3 |
| `apps/server/src/agents/repair-agent.ts` | 3 |
| `apps/web/src/components/VerificationPanel.tsx` | 2, 4 |
| `apps/web/src/pages/BuildApp.tsx` | 2, 4 |
| `apps/server/src/services/app-request-service.ts` | 1, 4 |

Any changes to these files must be reviewed against this document.

---

## Tag Reference

Frozen baseline: `phase-10-freeze`
Git commit: `f6c4a02` (Phase 10 Complete: Self-Healing & Human Escalation UX)

To compare current code against frozen baseline:

```bash
git diff phase-10-freeze -- apps/server/src/services/verification-service.ts
```

To rollback to frozen state (emergency):

```bash
git checkout phase-10-freeze -- apps/server/src/services/
```

---

## Questions?

If you're unsure whether a change violates an invariant:

1. Read this document again
2. Diff against `phase-10-freeze`
3. Ask: "Does this make Forge less trustworthy?"

If the answer is yes, don't do it.

---

**Remember**: Everything new must pass THROUGH Phase 10, never around it.
