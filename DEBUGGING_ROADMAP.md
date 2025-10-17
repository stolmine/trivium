# Mark Text as Read - Debugging Roadmap

## Documentation Overview

Four comprehensive guides totaling 1,110 lines of documentation for debugging the mark text as read feature:

### 1. EXECUTION_PATH_DEBUG.md (370 lines)
**Purpose:** Complete technical reference
- Detailed explanation of every function and line number
- Full code snippets with context
- Global state variables
- Failure point analysis
- Expected execution trace
- Quick verification checklist

**When to use:** You need exact line numbers, full context, or want to understand the complete architecture

**Key sections:**
- Section 1: Mark Action Trigger (keyboard & context menu)
- Section 2: Reading Store Mark Function (markRangeAsRead/unmarkRangeAsRead)
- Section 3: Cache Invalidation Call (invalidateProgressCache)
- Section 4: Hook Subscription Verification (useTextProgress setup)
- Section 5: Component Rendering (TextNode/FolderNode)
- Section 6: Notification Propagation
- Section 7-13: Failure analysis, testing, async flow

---

### 2. EXECUTION_CHAIN_DIAGRAM.md (203 lines)
**Purpose:** Quick reference visual guide
- ASCII flow diagram of execution path
- File locations quick reference
- Critical functions table with line numbers
- Global state variables summary
- Debugging decision tree
- Async vs sync breakdown
- Testing strategy

**When to use:** You need a quick overview, want to visualize the flow, or need to navigate between files

**Key sections:**
- Visual flow with branches
- File locations organized by purpose
- Function table with line numbers
- Dependency chains for debugging
- Async vs sync execution breakdown

---

### 3. DEBUG_CONSOLE_LOGS.md (346 lines)
**Purpose:** Practical hands-on debugging
- Copy-paste ready console.log statements
- Exact file locations and line numbers
- Where to add each log
- Expected console output
- Testing procedures
- Troubleshooting specific issues
- How to remove logs when done

**When to use:** You're actively debugging and need to trace execution in real-time

**Key sections:**
- Logs for each file (reading.ts, useTextProgress.ts, TextNode.tsx, FolderNode.tsx)
- Testing procedures (step-by-step)
- Expected output sequences
- Debugging specific issues (mark doesn't update, shortcut doesn't work)
- Troubleshooting flow

---

### 4. MARK_ACTION_DEBUGGING_SUMMARY.md (191 lines)
**Purpose:** High-level debugging guide
- Overview of all documents
- Quick start procedures
- Key files & line numbers table
- Execution flow summary
- Already present debug logging
- Most likely issues
- Common debugging mistakes
- 8 key questions to answer when debugging

**When to use:** You're new to this codebase or need a starting point

**Key sections:**
- Quick start guide
- Summary table of all key locations
- Most likely issues
- Testing procedures
- Common mistakes to avoid
- 8-question debugging framework

---

## Quick Navigation Guide

### "I need to understand how it works"
1. Start with MARK_ACTION_DEBUGGING_SUMMARY.md (overview)
2. Read EXECUTION_CHAIN_DIAGRAM.md (visual flow)
3. Deep dive into EXECUTION_PATH_DEBUG.md (full details)

### "It's not working, debug it"
1. Read MARK_ACTION_DEBUGGING_SUMMARY.md (likely issues)
2. Check EXECUTION_CHAIN_DIAGRAM.md (decide which function might be broken)
3. Use DEBUG_CONSOLE_LOGS.md (add logs and trace execution)

### "I need the exact code locations"
1. Go to EXECUTION_PATH_DEBUG.md (Section 8 - Summary Table)
2. Or check EXECUTION_CHAIN_DIAGRAM.md (File Locations section)
3. Or check MARK_ACTION_DEBUGGING_SUMMARY.md (Key Files section)

### "I'm adding debug logging"
1. Use DEBUG_CONSOLE_LOGS.md
2. Copy-paste the console.log statements
3. Add them to the specified locations
4. Run the test procedures
5. Analyze the console output

### "Everything is broken, where do I start?"
1. Read MARK_ACTION_DEBUGGING_SUMMARY.md "Most Likely Issues"
2. Answer the 8 key questions
3. Use DEBUG_CONSOLE_LOGS.md for each failing component
4. Check EXECUTION_PATH_DEBUG.md for detailed context

---

## File Structure Reference

```
Execution Path Documents:
├── MARK_ACTION_DEBUGGING_SUMMARY.md      (Start here)
├── EXECUTION_CHAIN_DIAGRAM.md             (Visual overview)
├── EXECUTION_PATH_DEBUG.md                (Deep dive)
└── DEBUG_CONSOLE_LOGS.md                  (Hands-on debugging)

Supporting Documentation:
├── DEBUGGING_ROADMAP.md                   (This file)
└── (older docs: DEBUGGING_SUMMARY.md, DEBUG_GUIDE.md)
```

---

## Key Locations Quick Lookup

| Problem | File | Line | Section |
|---------|------|------|---------|
| Keyboard shortcut not working | TextSelectionMenu.tsx | 85 | EXECUTION_PATH_DEBUG.md:1.B |
| Mark doesn't persist | reading.ts | 96 | EXECUTION_PATH_DEBUG.md:2 |
| Cache doesn't invalidate | reading.ts | 99 | EXECUTION_PATH_DEBUG.md:2 |
| Listeners not called | useTextProgress.ts | 14 | EXECUTION_PATH_DEBUG.md:3 |
| Hook effect doesn't run | useTextProgress.ts | 64 | EXECUTION_PATH_DEBUG.md:4 |
| Progress not displayed | TextNode.tsx | 70-74 | EXECUTION_PATH_DEBUG.md:5 |

---

## Debugging Workflow

```
1. User reports issue
    ↓
2. Read MARK_ACTION_DEBUGGING_SUMMARY.md
    ↓
3. Identify likely issue from "Most Likely Issues"
    ↓
4. Answer 8 key questions:
   - Is handleToggleRead being called?
   - Is invalidateProgressCache being called?
   - Are listeners being notified?
   - Is progress fetch effect running?
   - Is API call succeeding?
   - Is setProgress being called?
   - Are components re-rendering?
   - Is new progress visible?
    ↓
5. Based on answer, pick the failing function
    ↓
6. Look up that function in EXECUTION_CHAIN_DIAGRAM.md
    ↓
7. Add debug logs from DEBUG_CONSOLE_LOGS.md
    ↓
8. Run test and check console output
    ↓
9. Compare actual output to expected output
    ↓
10. Find the function that's not producing expected output
    ↓
11. Deep dive into that function in EXECUTION_PATH_DEBUG.md
    ↓
12. Fix the bug or add more specific logging
```

---

## Testing Checklist Before Debugging

Before adding any debug logs, verify:
- [ ] You're testing the right feature (mark text as read)
- [ ] You're using the right shortcut (Ctrl+M on Windows, Cmd+M on Mac)
- [ ] Text is actually selected (not collapsed selection)
- [ ] Article element is visible and has textContent
- [ ] Browser DevTools console is open
- [ ] No JavaScript errors are showing
- [ ] Backend API is running (for Tauri app)
- [ ] You have permission to mark this text

---

## Adding Debug Logs - Step by Step

1. Open DEBUG_CONSOLE_LOGS.md
2. Read "File 2: useTextProgress.ts - Location 1"
3. Open `/Users/why/repos/trivium/src/lib/hooks/useTextProgress.ts`
4. Find function notifyCacheInvalidation at line 12
5. Replace lines 12-15 with the code from the guide
6. Save file
7. Reload the app
8. Open DevTools console (F12)
9. Test mark action
10. Compare console output to expected output
11. If output matches: check next function
12. If output doesn't match: found the bug!

---

## Console Output Indicators

### Good Sign - You should see:
```
TextSelectionMenu: handleToggleRead === 
[reading.ts] markRangeAsRead called
[reading.ts] Cache invalidated
[useTextProgress] notifyCacheInvalidation firing
[useTextProgress] Number of listeners to notify: 1
[useTextProgress] Progress fetch effect triggered
[useTextProgress] API returned progress: 45.2
[TextNode] Rendered with textId: 42 progress: 45.2
```

### Bad Sign - You should NOT see:
```
TypeError: Cannot read property 'textContent' of null
undefined is not a function
[object Object] is not a number
ReferenceError: invalidateProgressCache is not defined
```

---

## Common Issues & Their Locations

| Issue | Root Cause | File | Line | Fix |
|-------|-----------|------|------|-----|
| Selection not recognized | handleToggleRead early return | TextSelectionMenu.tsx | 24-30 | Check DOM state |
| Positions wrong | Calculation bug | TextSelectionMenu.tsx | 41-42 | Check logs |
| API fails | Backend error | api wrapper | N/A | Check Network tab |
| Cache not cleared | Line 99 not reached | reading.ts | 99 | Add log before call |
| Listeners not called | notifyCacheInvalidation not called | reading.ts | 99 | Add log at line 99 |
| Effect not triggered | dependency not changing | useTextProgress.ts | 64 | Check refreshTrigger |
| Progress not fetched | Cache hit | useTextProgress.ts | 46-48 | Clear cache or wait 60s |
| Component not updating | setProgress not called | useTextProgress.ts | 57 | Check API response |
| UI doesn't refresh | TextNode not re-rendering | TextNode.tsx | 70 | Check if progress prop changed |

---

## Important Constants & Values

| Variable | File | Line | Default Value | Purpose |
|----------|------|------|---|---------|
| CACHE_DURATION_MS | useTextProgress.ts | 6 | 60000 (60 seconds) | Cache TTL |
| cacheVersion | useTextProgress.ts | 9 | 0 | Version counter |
| cacheVersionListeners | useTextProgress.ts | 10 | Set() | Active listeners |
| progressCache | useTextProgress.ts | 4 | Map() | Cached progress values |

---

## Performance Considerations

- Each invalidateProgressCache call triggers ALL listeners
- Each listener recalculates progress from API
- Cache prevents redundant API calls within 60 seconds
- Multiple rapid marks = multiple API calls
- No debouncing on setRefreshTrigger

Potential optimization: Add debouncing to setRefreshTrigger if user marks multiple texts in succession.

---

## Version History

- **Phase 6:** Cache invalidation system implemented
- **Phase 6.5:** Touch-ups and documentation
- **Phase 8:** Polish and critical bug fixes
- **Current:** Comprehensive debugging documentation added

Line numbers reflect Phase 8 commit: 8ee6b7b

---

## Need More Help?

### For specific code location:
→ EXECUTION_CHAIN_DIAGRAM.md (File Locations section)

### For visual overview:
→ EXECUTION_CHAIN_DIAGRAM.md (Visual flow)

### For exact line numbers:
→ EXECUTION_PATH_DEBUG.md (Summary table, Section 10)

### For debugging procedure:
→ DEBUG_CONSOLE_LOGS.md (Testing procedure)

### For understanding architecture:
→ EXECUTION_PATH_DEBUG.md (Sections 1-6)

### For finding most likely issue:
→ MARK_ACTION_DEBUGGING_SUMMARY.md (Most likely issues)

