# Links Sidebar Scroll Preservation - Debug Test Plan

## Current Status
The dev server is running with comprehensive debug logging added to:
1. **LinksSidebar.tsx** - Component lifecycle, render state, scroll save/restore
2. **read/[id].tsx** - Navigation to ingest, currentText changes
3. **linksSidebar.ts** (store) - Link extraction

## Test Procedure

### Step 1: Open a Text with Links
1. Open the application (http://localhost:1420)
2. Navigate to Library
3. Open a text that has multiple Wikipedia links (ideally 20+ links)
4. Open the Links Sidebar (click the Link2 icon in the header)

**Expected Logs:**
- `[LinksSidebar] COMPONENT MOUNTED`
- `[LinksSidebarStore] EXTRACT LINKS` with link count
- `[LinksSidebar] RENDER STATE` showing isOpen: true, linksCount: X

### Step 2: Scroll Down in the Sidebar
1. In the Links Sidebar, scroll down significantly (past the first 5-10 links)
2. Observe your scroll position

**Expected Logs (as you scroll):**
- Multiple `[LinksSidebar] SCROLL POSITION SAVED` entries showing:
  - The saved position value
  - scrollHeight and clientHeight
  - isRestoring: false

### Step 3: Click a Link to Ingest
1. Click on one of the Wikipedia links in the sidebar
2. This will navigate to the /ingest page

**Expected Logs:**
- `[ReadPage] NAVIGATE TO INGEST` group showing:
  - URL being ingested
  - Current scroll position (should match the sidebar scroll position)
  - Current text ID
  - Navigation state
- `[ReadPage] CURRENT TEXT CHANGED` might fire
- `[LinksSidebar] COMPONENT UNMOUNTING` might fire if the component unmounts

### Step 4: Observe After Navigation
1. The ingest page should load
2. Watch the console for any LinksSidebar activity

**Key Questions to Answer:**
- Does the LinksSidebar component unmount when navigating to ingest?
- Are there any logs showing the component trying to restore scroll?
- What happens to the saved scroll position?

### Step 5: Complete Ingest (or Cancel)
1. Either complete the ingest or cancel/go back
2. You should return to the reading page

**Expected Logs:**
- `[ReadPage] CURRENT TEXT CHANGED` when returning
- `[LinksSidebarStore] EXTRACT LINKS` when re-extracting links from content
- `[LinksSidebar] RESTORE EFFECT TRIGGERED` multiple times showing:
  - Dependencies (linksCount, filteredWikipediaCount, etc.)
  - State before restoration (hasContainer, savedPosition, containerScrollTop)
  - Whether it will restore or skip
  - If restoring: RAF 1/3, 2/3, 3/3 sequence
  - SCROLL RESTORED with success status

### Step 6: Check Sidebar Scroll Position
1. Look at the Links Sidebar
2. Is it at the top or at your previous scroll position?

**Expected Behavior:**
- Sidebar SHOULD be at your previous scroll position
- If it's at the top, the logs will show us WHY

## What to Look For in the Logs

### Scenario A: Scroll is Lost Because Component Unmounts
**Symptoms:**
- You see `[LinksSidebar] COMPONENT UNMOUNTING` when navigating to ingest
- You see `[LinksSidebar] COMPONENT MOUNTED` when returning
- The scrollPositionRef is reset because it's a new component instance

**Solution:**
- Move scroll state to the Zustand store instead of component state

### Scenario B: Scroll is Saved But Not Restored
**Symptoms:**
- You see scroll being saved before navigation
- You see `[LinksSidebar] RESTORE EFFECT TRIGGERED` but `SKIP RESTORE` with reason "no saved position"
- The savedPosition is 0

**Solution:**
- The ref is being reset somewhere - need to move to store

### Scenario C: Scroll is Restored Too Early
**Symptoms:**
- You see `SCROLL RESTORED` logs
- But `success: false` because afterScroll !== targetPosition
- Or scrollHeight is too small (DOM not ready)

**Solution:**
- Need more RAF delays or different timing strategy

### Scenario D: Links Array Changes Reset Scroll
**Symptoms:**
- You see `[LinksSidebarStore] EXTRACT LINKS` triggering after navigation
- Links count changes (even slightly)
- This triggers the restore effect but with wrong dependencies

**Solution:**
- Need to preserve scroll across link re-extraction

## Additional Console Commands to Run

While testing, you can check the current state in the browser console:

```javascript
// Check current links sidebar state
useLinksSidebarStore.getState()

// Check if links array changed
// (run before and after ingest)
useLinksSidebarStore.getState().links.length
```

## Next Steps After Collecting Logs

1. Copy all the console logs from your test session
2. Look for the patterns described in "What to Look For"
3. Identify which scenario matches your logs
4. We'll implement the appropriate fix based on the diagnosis

## Files Modified (All have debug logging)

- `/Users/why/repos/trivium/src/lib/components/reading/LinksSidebar.tsx`
- `/Users/why/repos/trivium/src/routes/read/[id].tsx`
- `/Users/why/repos/trivium/src/lib/stores/linksSidebar.ts`

## Important Notes

- The debug logs use timestamps to help track timing issues
- Console.group/groupEnd organize related logs together
- All logs are prefixed with [LinksSidebar], [ReadPage], or [LinksSidebarStore]
- The logs are VERY verbose - this is intentional for diagnosis
