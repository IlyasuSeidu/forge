# End-to-End Testing Guide

This guide walks you through testing the complete Forge platform from UI to verify all features work correctly.

**Current Status:**
- ✅ Backend: http://localhost:3001 (Running)
- ✅ Frontend: http://localhost:5174 (Running)

---

## 🎯 Testing Scenarios

We'll test three complete flows:
1. **Happy Path**: App passes verification without repair
2. **Self-Healing**: App has bugs that are automatically fixed
3. **Human Escalation**: App fails verification and needs human decision

---

## 📋 Pre-Test Checklist

Before starting, verify:

```bash
# Check backend is running
curl http://localhost:3001/health

# Check frontend is accessible
curl http://localhost:5174

# Verify API key is set (required for AI agents)
echo $ANTHROPIC_API_KEY
```

Expected:
- Backend returns `{"status":"healthy",...}`
- Frontend returns HTML
- API key is set (not empty)

---

## 🧪 Test Scenario 1: Happy Path (No Repair Needed)

**Goal**: Build an app that passes verification on first attempt

### Steps:

1. **Open Forge UI**
   - Navigate to: http://localhost:5174
   - You should see the Forge home page

2. **Create or Select Project**
   - Click "Projects" in navigation
   - Either select existing project or create new one:
     - Click "Create Project" (if needed)
     - Name: "Test Project - Happy Path"
     - Description: "Testing verification flow"

3. **Start "Build an App" Flow**
   - Click "Build an App" button
   - Enter this prompt:
     ```
     Build a simple counter app with HTML, CSS, and JavaScript.
     It should have a display showing the count and an increment button.
     Make sure all element IDs match between HTML and JavaScript.
     ```
   - Click "Submit"

4. **Watch the Planning Phase**
   - Status should show: "Planning your app..."
   - Wait for plan to be generated (~30 seconds)
   - You'll see a PRD (Product Requirements Document) displayed

5. **Approve the Build**
   - Review the plan
   - Look for the approval section with yellow highlight
   - Click "Approve" button
   - Status changes to "Building your app..."

6. **Monitor Building Phase**
   - Watch events appear in real-time:
     - "Execution started"
     - "Agent selected: claude"
     - "Agent execution started"
     - "Agent execution completed"
     - "Execution completed"

7. **Watch Verification Phase** ⭐ **KEY TEST**
   - Status changes to: "Checking your app works…"
   - Events should show:
     - "Verification started"
     - "Static verification started"
     - "Runtime verification started"
     - "Verification passed"

8. **Verify Success State** ✅
   - **Verification Panel** should appear with:
     - Green background
     - ✓ icon
     - "Your app is verified and ready 🎉"
     - NO "Self-Healed" badge (passed on first attempt)
     - Attempt Count: 1

9. **Test Download & Preview**
   - Click "Download App" button
     - ZIP file should download
   - Click "Preview App" button (if index.html exists)
     - App should open in new tab
     - Counter should work (click increment)

10. **Verify Execution Detail Page**
    - Click on execution ID or "View Details"
    - Should show:
      - Status: "Completed" ✓
      - All events in timeline
      - Green status badges
      - Artifacts list with files

**Expected Result:**
- ✅ App builds successfully
- ✅ Verification passes on attempt 1
- ✅ No repair attempts needed
- ✅ Status shows "completed"
- ✅ Download and preview work

---

## 🔧 Test Scenario 2: Self-Healing Success

**Goal**: Build an app with a bug that gets automatically fixed

### Steps:

1. **Create New Build**
   - Return to project page
   - Click "Build an App" again
   - Use this prompt (intentionally vague to cause ID mismatch):
     ```
     Build a simple todo list app.
     Add a button to add new todos and a div to show the list.
     ```
   - Submit

2. **Approve the Build**
   - Wait for plan
   - Click "Approve"

3. **Watch for Verification Issues** ⭐ **KEY TEST**
   - Build completes normally
   - Verification starts: "Checking your app works…"
   - **Watch for repair events:**
     - "Verification failed" (first attempt)
     - "Repair attempt started"
     - Status changes to: "Fixing a small issue automatically…"
     - "Repair attempt applied"
     - "Verification started" (re-running)
     - "Verification passed after repair" ✨

4. **Verify Self-Healing State** ✅
   - **Verification Panel** should show:
     - **Purple background** (key indicator!)
     - ✨ sparkle icon
     - "Your app is verified and ready 🎉"
     - **Purple "Self-Healed" badge** in header
     - Attempt Count: 2 or higher
     - Message: "Forge automatically fixed X issue(s) for you"
     - Collapsible "What was fixed?" section showing repair events

5. **Check Execution Events**
   - View execution detail page
   - Events should include:
     - Orange repair attempt events
     - Purple "Self-healing successful" event
     - Final green "Verification passed"

6. **Test the App**
   - Download and preview
   - Todo app should work correctly
   - All buttons should have proper event listeners

**Expected Result:**
- ✅ Initial verification fails (detects bug)
- ✅ Repair agent fixes the issue automatically
- ✅ Re-verification passes
- ✅ Purple "Self-Healed" badge shown
- ✅ Attempt count > 1
- ✅ App works correctly after repair

---

## ❌ Test Scenario 3: Human Escalation (Max Attempts)

**Goal**: Build an app that cannot be auto-fixed, triggering human decision

**Note**: This is harder to trigger naturally because the AI is very good at fixing issues. We'll create a deliberately complex scenario.

### Steps:

1. **Create Problematic Build**
   - Start new build
   - Use this complex prompt:
     ```
     Build a calculator app that loads external dependencies.
     Reference jQuery from CDN, use Bootstrap CSS, and include
     a custom math.js library. Make sure to validate all inputs.
     ```
   - Submit and approve

2. **Wait for Build & Verification**
   - Build completes
   - Verification starts

3. **Watch for Multiple Repair Attempts** ⭐ **KEY TEST**
   - If the app has unfixable issues:
     - "Repair attempt 1 started"
     - "Repair attempt 1 applied"
     - Still failing...
     - "Repair attempt 2 started"
     - ...continues up to attempt 5
     - "Max repair attempts reached"
     - "Verification failed"

4. **Verify Failure State with Human Escalation** ⚠️
   - **Verification Panel** should show:
     - **Orange background**
     - ⚠️ warning icon
     - "Forge needs your help to continue ⚠️"
     - Attempt Count: 5
     - Message: "Forge tried to fix this automatically but couldn't finish"
     - **User-friendly error summary** (first 3 issues)
     - Collapsible "View technical details"
     - **Three action buttons:**
       1. "Start Over & Rebuild" (orange, primary)
       2. "Download Anyway" (bordered)
       3. "Acknowledge" (bordered, gray)

5. **Test "Download Anyway" Action**
   - Click "Download Anyway"
   - Should see **warning dialog**:
     - "⚠️ Warning: This app has known issues that may prevent it from working correctly."
     - "Are you sure you want to download it anyway?"
   - Click "Cancel" (don't download yet)

6. **Test "Start Over & Rebuild"**
   - Click "Start Over & Rebuild"
   - Should clear the current request
   - Form should reset
   - You can enter a new prompt

7. **Test "Acknowledge"**
   - Click "Acknowledge"
   - Should show simple alert
   - User can navigate away

**Expected Result:**
- ✅ Multiple repair attempts (up to 5)
- ✅ Final status: "verification_failed"
- ✅ Orange warning panel shown
- ✅ Non-technical error summary displayed
- ✅ Three clear action buttons provided
- ✅ Download warning shown when clicking "Download Anyway"
- ✅ No forced actions - user controls next step

---

## 🎨 UI/UX Verification Checklist

Test these visual elements across all scenarios:

### Verification Panel
- [ ] Correct color coding:
  - Green for passed (no repair)
  - Purple for self-healed
  - Orange for failed
- [ ] Correct icons (✓, ✨, ⚠️)
- [ ] "Self-Healed" badge only shown when repaired
- [ ] Attempt count displayed correctly
- [ ] Error messages are non-technical
- [ ] Technical details collapsed by default
- [ ] Action buttons only shown when appropriate

### Status Messages
- [ ] "Checking your app works…" during verification
- [ ] "Fixing a small issue automatically…" during repair
- [ ] "Your app is verified and ready 🎉" on success
- [ ] "Forge needs your help to continue ⚠️" on failure

### Execution Timeline
- [ ] Events appear in chronological order
- [ ] Repair events have orange background
- [ ] Self-healing success has purple background
- [ ] Event icons match event types
- [ ] Timestamps are accurate

### Interactive Elements
- [ ] Download button works
- [ ] Preview button opens new tab (if index.html exists)
- [ ] "Start Over" clears form
- [ ] "Download Anyway" shows warning
- [ ] "Acknowledge" dismisses with confirmation

---

## 🐛 Common Issues & Solutions

### Issue: Verification Always Passes
**Symptom**: Even buggy apps pass verification
**Cause**: AI is generating correct code consistently
**Solution**: This is actually GOOD! The AI is working well.
**To test repairs**: Manually create test scenarios (see test-verification-scenarios.ts)

### Issue: API Key Error
**Symptom**: "ClaudeService disabled: ANTHROPIC_API_KEY not set"
**Solution**:
```bash
export ANTHROPIC_API_KEY=your_key_here
# Restart backend server
```

### Issue: Verification Takes Too Long
**Symptom**: Stuck on "Checking your app works…"
**Cause**: Runtime verification with Playwright
**Solution**: This is normal - runtime checks take 5-10 seconds

### Issue: Frontend Shows Old Data
**Symptom**: Status not updating, old verification panel
**Solution**:
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Check auto-refresh is working (should update every 3 seconds)

### Issue: Download Doesn't Work
**Symptom**: Download button does nothing
**Cause**: CORS or artifact not found
**Solution**: Check browser console for errors

---

## 📊 What to Look For

### Good Signs ✅
- Smooth transition through build phases
- Verification completes in 10-20 seconds
- Clear status messages throughout
- All events logged in timeline
- Verification panel matches actual state
- Download produces valid ZIP file
- Preview opens working app

### Red Flags ❌
- Verification never completes (stuck)
- Status shows "completed" but verification failed
- Missing events in timeline
- Incorrect badge colors
- Download fails silently
- Preview shows blank page
- No error messages on failure

---

## 🔍 Testing the Invariants

Use this checklist to verify Phase 10 invariants are enforced:

### Invariant 1: No Silent Completion
- [ ] Apps that fail verification are NOT marked "completed"
- [ ] Execution status is "failed" when verification fails
- [ ] AppRequest status is "verification_failed" not "completed"

### Invariant 2: No Silent Failures
- [ ] All verification failures are visible in UI
- [ ] Error messages are displayed in Verification Panel
- [ ] Users can see what went wrong
- [ ] Technical details are available (even if collapsed)

### Invariant 3: Bounded Self-Healing
- [ ] Maximum 5 repair attempts enforced
- [ ] Each repair triggers re-verification
- [ ] Attempt count is accurate
- [ ] "Max attempts reached" event appears after 5 tries

### Invariant 4: Human Control
- [ ] No auto-continuation after max attempts
- [ ] User must choose action (download/restart/acknowledge)
- [ ] Warning shown before downloading failed apps
- [ ] All actions require explicit user click

### Invariant 5: Ratchet Rule
- [ ] Cannot bypass verification
- [ ] Cannot mark app as completed without verification
- [ ] No "skip verification" option anywhere

---

## 📝 Test Report Template

After testing, document your findings:

```markdown
## Test Session Report

**Date**: [Date]
**Tester**: [Your Name]
**Environment**: Development (localhost)

### Scenario 1: Happy Path
- Status: [PASS/FAIL]
- Notes: [Any observations]
- Screenshots: [If applicable]

### Scenario 2: Self-Healing
- Status: [PASS/FAIL]
- Repair Attempts: [Number]
- Notes: [What was fixed?]

### Scenario 3: Human Escalation
- Status: [PASS/FAIL]
- Final Attempt: [Number]
- Notes: [Error messages shown?]

### Issues Found
1. [Issue description]
   - Severity: [High/Medium/Low]
   - Steps to reproduce: [...]

### Invariants Verified
- [ ] No Silent Completion
- [ ] No Silent Failures
- [ ] Bounded Self-Healing
- [ ] Human Control
- [ ] Ratchet Rule

### Overall Assessment
[Summary of test results]
```

---

## 🎯 Quick Smoke Test (5 Minutes)

If you just want to verify everything works:

1. **Open UI**: http://localhost:5174
2. **Create Project**: "Quick Test"
3. **Build App**: "Build a simple HTML page with a click counter"
4. **Approve Build**: Click approve
5. **Wait for Completion**: Watch status updates
6. **Verify Success**: Check for green verification panel
7. **Download**: Click download button
8. **Done**: If all steps work, system is healthy

---

## 🚀 Advanced Testing

For more thorough testing:

### Test Multiple Projects
- Create 3-5 projects
- Build apps in each
- Verify isolation (workspace separation)

### Test Concurrent Builds
- Start build in Project A
- Switch to Project B
- Start another build
- Verify both complete independently

### Test Error Recovery
- Stop backend mid-build
- Restart backend
- Check execution recovery logs
- Verify paused executions can resume

### Test API Directly
```bash
# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test","description":"Testing via API"}'

# Create app request
curl -X POST http://localhost:3001/api/projects/{PROJECT_ID}/app-requests \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Build a hello world app"}'

# Get verification status
curl http://localhost:3001/api/projects/{PROJECT_ID}/app-requests/{APP_REQUEST_ID}/verification
```

---

## ✅ Success Criteria

Testing is complete when:

1. ✅ All three scenarios pass
2. ✅ All UI elements display correctly
3. ✅ All invariants are verified
4. ✅ Downloads and previews work
5. ✅ No console errors
6. ✅ Events log completely
7. ✅ Status updates in real-time

---

## 📞 Need Help?

If you encounter issues:

1. Check browser console for errors
2. Check backend logs (terminal running npm start)
3. Check frontend logs (terminal running npm run dev)
4. Review docs/INVARIANTS.md for expected behavior
5. Compare against phase-10-freeze baseline

---

**Happy Testing! 🧪**

Remember: The goal is to verify that Forge's quality guarantees are working in practice. Focus on the verification flow and user experience.
