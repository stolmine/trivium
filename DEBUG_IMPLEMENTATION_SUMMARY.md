# Links Sidebar Scroll Debug - Implementation Summary

## What Was Added

Comprehensive debug logging has been added to track the complete lifecycle of the Links Sidebar scroll preservation during ingest operations.

## Modified Files

### 1. `/Users/why/repos/trivium/src/lib/components/reading/LinksSidebar.tsx`

#### Added Logging:
- **Component Lifecycle**: Logs when component mounts/unmounts
- **Render State**: Logs every time component renders with current state
- **Scroll Container Ref**: Logs when the scroll container ref gets attached/detached
- **Scroll Position Save**: Logs every time scroll position is saved with detailed metrics
- **Scroll Position Restore**:
  - Logs when restore effect is triggered
  - Logs all dependencies that triggered the effect
  - Logs state before restoration (container status, saved position, current scroll)
  - Logs the triple RAF sequence (1/3, 2/3, 3/3)
  - Logs success/failure of scroll restoration with before/after values
- **Rendering State**: Logs when returning null vs actually rendering UI

### 2. `/Users/why/repos/trivium/src/routes/read/[id].tsx`

#### Added Logging:
- **Current Text Changes**: Logs when currentText changes with text details
- **Link Extraction**: Logs when extractLinks() is called
- **Navigate to Ingest**:
  - Logs when user clicks a link to ingest
  - Logs the URL being ingested
  - Logs current scroll position being saved
  - Logs navigation state being passed

### 3. `/Users/why/repos/trivium/src/lib/stores/linksSidebar.ts`

#### Added Logging:
- **Extract Links**:
  - Logs when links are being extracted from content
  - Logs content length
  - Logs number of links found (total, wikipedia, other)
  - Logs when store state is updated

## Log Format

All logs use consistent formatting:
- **Timestamp**: ISO format for precise timing analysis
- **Component ID**: [LinksSidebar], [ReadPage], or [LinksSidebarStore]
- **Console Groups**: Related logs are grouped together for clarity
- **Detailed Context**: Each log includes relevant state/values

## Key Logging Points

### Before Ingest:
1. User scrolls sidebar → `SCROLL POSITION SAVED`
2. User clicks link → `NAVIGATE TO INGEST`
3. Component may close → `NOT RENDERING (isOpen: false)`

### During Ingest:
4. Text may reload → `CURRENT TEXT CHANGED`
5. Links may re-extract → `EXTRACT LINKS`

### After Ingest Return:
6. Text reloads → `CURRENT TEXT CHANGED`
7. Links re-extract → `EXTRACT LINKS` + `Store state updated`
8. Sidebar re-renders → `RENDER STATE`
9. Restore effect triggers → `RESTORE EFFECT TRIGGERED`
10. RAF sequence executes → `RAF 1/3`, `RAF 2/3`, `RAF 3/3`
11. Scroll attempts restore → `SCROLL RESTORED` with success status

## Diagnostic Scenarios

The logs will reveal one of these scenarios:

### Scenario A: Component Unmounts
- Logs show `COMPONENT UNMOUNTING` and `COMPONENT MOUNTED`
- Solution: Move scroll position to Zustand store

### Scenario B: Ref is Reset
- Logs show saved position but `SKIP RESTORE: no saved position`
- Solution: Move scroll position to Zustand store

### Scenario C: DOM Not Ready
- Logs show `SCROLL RESTORED` but `success: false`
- scrollHeight is too small or element not ready
- Solution: Adjust timing strategy (more RAF or different approach)

### Scenario D: Links Array Changes
- Logs show links count changing after return
- This triggers unnecessary restore effect
- Solution: Better dependency management or store-based scroll

### Scenario E: Sidebar Closes/Opens
- Logs show `NOT RENDERING` then `RENDERING SIDEBAR UI`
- The `isOpen` state might be toggling
- Solution: Track why sidebar is closing

## Next Steps

1. **Run the test plan** (see DEBUG_TEST_PLAN.md)
2. **Collect console logs** from a complete ingest flow
3. **Analyze logs** to identify which scenario matches
4. **Implement fix** based on the diagnosed issue
5. **Test again** to verify fix works
6. **Remove debug logs** once issue is resolved

## Current Hypothesis

Based on previous attempts, the most likely issue is:

**Hypothesis**: The component does NOT unmount, but the links array changes when extractLinks() is called after returning from ingest. This causes the restore effect to run, but by the time it runs, the savedPosition ref might be stale or the timing might be wrong.

**Expected Fix**: Move scroll position to the Zustand store alongside the links array, so it persists across re-renders and is always in sync with the links state.

## Dev Server

The dev server is currently running at http://localhost:1420
- All debug code is active
- Console logs will appear in the browser dev tools
- Test with a text that has many Wikipedia links for best results
