# Session Summary: EEMS Frontend Major Updates

**Date:** Current Session  
**Branch:** `codex/fix-422-error-on-create-simulator`  
**Status:** ✅ Completed

---

## Overview

This session involved major refactoring of the EEMS Frontend application to combine the dashboard and simulator views, implement fast-forward mode for prototype demonstrations, and fix critical timezone and data display issues.

---

## Major Changes Implemented

### 1. Combined Dashboard and Simulator Pages

**What Changed:**
- Merged `/sim/[id]/page.tsx` (dashboard) and `/sim/[id]/run/page.tsx` (simulator) into a single unified page
- Created new `CombinedDashboard` component that displays chart/data view on top and simulator controls at the bottom

**Files Created:**
- `src/components/dashboard/combined-dashboard.tsx` - New unified dashboard component

**Files Modified:**
- `src/app/(sim)/[id]/page.tsx` - Updated to use CombinedDashboard

**Benefits:**
- Better UX: Users can see live data while controlling the simulator
- Single page layout reduces navigation
- Easier for investor demos

---

### 2. Fast-Forward Mode (30x Speed)

**What Changed:**
- Added fast-forward multiplier (30x speed: 1 real second = 30 simulated seconds)
- Simulator timestamps advance 30 seconds per real second when fast-forward is enabled
- Works for both Auto and Manual modes
- Added toggle checkbox in UI (enabled by default)

**Files Modified:**
- `src/lib/emitter.ts` - Added fast-forward support with timestamp advancement
- `src/components/common/auto-run-panel.tsx` - Updated descriptions
- `src/components/common/manual-run-panel.tsx` - Updated descriptions

**Key Implementation Details:**
- Fast-forward starts from current real-world time (not midnight) for immediate chart visibility
- Timestamps advance by `(intervalMs / 1000) * 30` seconds per tick
- Both modes respect the fast-forward setting

---

### 3. Chart Block Determination Logic

**What Changed:**
- Chart now determines current block from last received reading timestamp (prototype mode)
- Blocks are calculated starting from midnight (00:00) in 30-minute intervals
- Chart auto-switches to new block when readings cross 30-minute boundaries

**Files Created:**
- `src/lib/block-utils.ts` - New utility for timezone-aware block calculations

**Files Modified:**
- `src/components/dashboard/current-block-chart.tsx` - Updated to use lastReadingTs for block determination
- `src/lib/hooks.ts` - Added external lastReadingTs tracking

**Key Functions:**
- `getBlockStart()` - Calculates 30-minute block start from timestamp
- `getCurrentBlockFromReading()` - Determines current block from reading timestamp
- Uses iterative approach to handle timezone conversions correctly

---

### 4. Timezone Fixes

**Issue:**
- Chart was showing incorrect blocks (e.g., showing 08:00-08:30 when reading was at 16:20)
- Block calculation had incorrect timezone offset handling

**Solution:**
- Implemented iterative approach to find UTC time that represents local timezone block
- Handles timezone conversions correctly for Asia/Kuala_Lumpur (UTC+8)
- Allows up to 5 minutes tolerance for block matching (timezone rounding + backend processing delays)

**Files Modified:**
- `src/lib/block-utils.ts` - Fixed timezone calculation logic

---

### 5. Performance Optimizations (Flickering Fix)

**Issue:**
- Page was flickering every second when simulator was running
- State updates on every tick caused unnecessary re-renders

**Solution:**
- Only update `lastReadingTs` state when block actually changes
- Use refs to track values without causing re-renders
- Removed refresh on every SSE "reading" event (only refresh on "block-update" events)

**Files Modified:**
- `src/components/dashboard/combined-dashboard.tsx` - Optimized state updates
- `src/lib/hooks.ts` - Removed refresh on every reading event

**Result:**
- No flickering during normal operation
- Smooth updates only when block changes or backend sends block-update events

---

### 6. Chart Data Display Fix

**Issue:**
- Chart showed no data when simulator was running
- Data appeared after page refresh but disappeared when simulator started again

**Root Cause:**
- Chart was prioritizing calculated window from `lastReadingTs` over backend's actual block
- Block matching logic was too strict

**Solution:**
- Changed priority: Backend block is now source of truth (Priority 1)
- Only use calculated window when backend block is not available
- Improved block matching with tolerance and secondary checks

**Files Modified:**
- `src/components/dashboard/current-block-chart.tsx` - Fixed priority order and matching logic

**Priority Order:**
1. Backend `block_start_local` (source of truth)
2. Calculated from `lastReadingTs` (fallback)
3. Real-world time (last resort)

---

## Technical Details

### Block Calculation Logic

**Block Definition:**
- Blocks start at midnight (00:00) and are 30 minutes each
- Block 0: 00:00-00:30, Block 1: 00:30-01:00, etc.
- Blocks are calculated based on Asia/Kuala_Lumpur timezone (UTC+8)

**Block Matching:**
- Allows up to 5 minutes tolerance for matching
- Checks both timestamp difference and formatted hour:minute strings
- Handles timezone conversions correctly

### Fast-Forward Implementation

**How It Works:**
- When enabled, each tick's timestamp advances by 30 seconds per real second
- First tick starts from current real-world time
- Subsequent ticks advance: `lastTimestamp + (intervalMs / 1000) * 30 seconds`
- Backend receives timestamps that advance 30x faster than real time

### State Management

**Optimizations:**
- Use refs for values that don't need to trigger re-renders
- Only update state when block changes
- SSE events handle data updates automatically
- Block refresh only triggered on block boundary crossings

---

## Files Summary

### New Files Created
- `src/components/dashboard/combined-dashboard.tsx` - Unified dashboard component
- `src/lib/block-utils.ts` - Block calculation utilities

### Files Modified
- `src/lib/emitter.ts` - Fast-forward support
- `src/lib/hooks.ts` - External lastReadingTs tracking, removed refresh on reading events
- `src/components/dashboard/current-block-chart.tsx` - Block priority fix, improved matching
- `src/app/(sim)/[id]/page.tsx` - Uses CombinedDashboard
- `src/components/common/auto-run-panel.tsx` - Updated descriptions
- `src/components/common/manual-run-panel.tsx` - Updated descriptions

---

## Commits Made

1. `25180c8` - feat: combine dashboard and simulator, add 30x fast-forward mode, fix chart to use last reading timestamp for block determination
2. `b6536e5` - fix: start simulator from current time instead of midnight for immediate chart visibility
3. `081243c` - fix: correct timezone calculation in block start - use iterative approach to find UTC time for local timezone block
4. `02827bc` - fix: reduce flickering by only refreshing on block changes, improve block matching logic for chart data display
5. `e54487e` - fix: add null check for block in buildChartData to fix TypeScript error
6. `707f25d` - fix: prioritize backend block over calculated window, reduce flickering by only updating state on block changes

---

## Testing Results

✅ Build test passed - No TypeScript or compilation errors  
✅ All pages generated successfully  
✅ No linter errors

---

## Known Issues Resolved

1. ✅ Chart not displaying data when simulator running
2. ✅ Page flickering every second
3. ✅ Timezone mismatch causing incorrect block display
4. ✅ Chart showing wrong time window (8-hour offset)

---

## Future Considerations

1. **Backend Block Determination**: The backend should ideally determine blocks based on the last received reading timestamp (prototype mode), similar to frontend logic
2. **Performance**: Consider debouncing or throttling if further optimization needed
3. **Error Handling**: May want to add better error boundaries for chart rendering
4. **Documentation**: Consider adding inline comments explaining the prototype mode vs production mode differences

---

## Key Learnings

1. **Backend as Source of Truth**: Always prioritize backend data over client-side calculations
2. **State Update Optimization**: Use refs for values that don't need to trigger re-renders
3. **Timezone Handling**: Use iterative approaches for complex timezone conversions
4. **Prototype Mode**: Fast-forward mode enables rapid demonstrations for investors

---

## Deployment Notes

- All changes are on branch: `codex/fix-422-error-on-create-simulator`
- Ready for testing and deployment
- Environment variables required:
  - `NEXT_PUBLIC_BACKEND_URL`
  - `NEXT_PUBLIC_BACKEND_TOKEN`
  - `NEXT_PUBLIC_TIMEZONE_LABEL` (optional, defaults to Asia/Kuala_Lumpur)

---

**End of Summary**

