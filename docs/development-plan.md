# Development Plan: Timeline Playback Enhancements

> **Generated from:** docs/prd.md
> **Created:** 2026-03-22
> **Last synced:** 2026-03-23
> **Status:** Active Planning Document
> **VibeKanban Project ID:** f40c2bb3-89c2-41f7-aa66-5a17854a36c5

## Overview

Enhance the existing ding-dong-ditch timeline view with three core improvements: auto-jump to the most recent event on load, continuous timeline scrubbing with a fixed time tooltip and preview thumbnail, and a wall-clock time overlay in the video player. All changes are frontend-only — no new API endpoints or schema changes needed.

## Tech Stack

- **Backend:** Node.js + Express, SQLite (WAL) — no changes
- **Frontend:** React + TypeScript, Vite — all changes here
- **Database:** SQLite — no schema changes
- **Infrastructure:** Self-hosted (Docker optional) — no changes

---

## Completion Status Summary

| Epic | Status | Progress |
|------|--------|----------|
| 1. Wall-Clock Time Display | Not Started | 0% |
| 2. Auto-Jump to Latest Event | Not Started | 0% |
| 3. Timeline Scrubbing & Time Indicator | Not Started | 0% |
| 4. Scrub Preview Thumbnails | Not Started | 0% |
| 5. Testing & Polish | Not Started | 0% |

---

## Epic 1: Wall-Clock Time Display (NOT STARTED)

Add an approximate real-world clock time to the video player, calculated from the recording's start timestamp plus the current playback position. Smallest-scope epic — isolated to the TimelinePlayer component.

### Acceptance Criteria

- [ ] Video player shows wall-clock time alongside elapsed time (e.g., `0:15 / 0:30 · 2:34 PM`)
- [ ] Time updates in real-time during playback and on seek
- [ ] Gracefully hidden when recording timestamp is missing or invalid

### Tasks

| ID | Title | Description | Priority | Complexity | Depends On | Status |
|----|-------|-------------|----------|------------|------------|--------|
| 1.1 | Wall-clock time calculation utility | Create a utility function that takes a recording ISO timestamp and a video currentTime (seconds) and returns a formatted wall-clock string (`h:mm:ss AM/PM`) | High | S | — | <!-- vk:73c2c7dd-0c84-4d3b-a14d-9b83c10be23a --> |
| 1.2 | Custom video time display | Add a custom time overlay to TimelinePlayer that shows elapsed, duration, and wall-clock time. Hook into video `timeupdate` and `seeked` events | High | M | 1.1 | <!-- vk:b71f2e4c-b947-4e85-a970-b148f31cdd55 --> |
| 1.3 | Timestamp validation & fallback | Validate recording timestamp before computing wall-clock time; hide the wall-clock portion if timestamp is missing, null, or not a valid ISO date | Medium | S | 1.2 | <!-- vk:beb5f907-b4e1-419e-af10-43e40078bd79 --> |
| 1.4 | Unit tests for wall-clock logic | Test the calculation utility: valid timestamps, edge cases (midnight rollover, timezone handling), invalid/null timestamps | High | S | 1.1 | <!-- vk:2bd1a9c6-9254-4c9b-9de1-9e29d981c80d --> |

### Task Details

**1.1 - Wall-clock time calculation utility**
- [ ] Function `formatWallClockTime(isoTimestamp: string, currentTimeSeconds: number): string | null` exists
- [ ] Returns formatted string like `2:34:15 PM` for valid inputs
- [ ] Returns `null` for invalid/missing timestamp
- [ ] Handles midnight rollover correctly (e.g., 11:59 PM + 120s = 12:01 AM)

**1.2 - Custom video time display**
- [ ] Time overlay visible below or beside the video player controls
- [ ] Format: `0:15 / 0:30 · 2:34 PM` (elapsed / duration · wall-clock)
- [ ] Updates on every `timeupdate` event during playback
- [ ] Updates immediately on `seeked` event when user scrubs within the video
- [ ] Separator (·) only shown when wall-clock time is available

**1.3 - Timestamp validation & fallback**
- [ ] Invalid ISO strings (empty, malformed, `"undefined"`) return null from utility
- [ ] When wall-clock is null, display shows only `0:15 / 0:30` without separator
- [ ] No console errors or visual glitches when timestamp is missing

**1.4 - Unit tests for wall-clock logic**
- [ ] Test valid timestamp + 0 seconds = recording start time
- [ ] Test valid timestamp + N seconds = correct offset
- [ ] Test midnight rollover
- [ ] Test null/undefined/empty string returns null
- [ ] Test malformed ISO string returns null
- [ ] All tests pass with `npm test`

---

## Epic 2: Auto-Jump to Latest Event (NOT STARTED)

On initial timeline view load, automatically position the timeline at the most recent recording and begin playback. No re-jump on filter/camera changes.

### Acceptance Criteria

- [ ] Timeline auto-scrolls to center the most recent recording on initial load
- [ ] Most recent recording auto-plays on initial load
- [ ] Changing camera or filter does NOT trigger re-jump
- [ ] Empty state displayed when no recordings match current filters
- [ ] Graceful fallback if query fails (timeline loads normally without auto-selection)

### Tasks

| ID | Title | Description | Priority | Complexity | Depends On | Status |
|----|-------|-------------|----------|------------|------------|--------|
| 2.1 | Find most recent recording in useTimeline | After timeline data loads, identify the most recent recording by timestamp. Expose it as `latestRecording` from the hook | High | S | — | <!-- vk:0638ddb4-55c2-4b6a-8482-6985a17d25b7 --> |
| 2.2 | Auto-select on initial load | On first data load (not re-fetches), auto-set `selectedRecording` to `latestRecording` and trigger playback. Use a ref to track whether initial jump has occurred | High | M | 2.1 | <!-- vk:76ad2d30-d01a-4d08-b8ac-271c256ad110 --> |
| 2.3 | Auto-scroll timeline to selection | When a recording is auto-selected, scroll the TimelineBar so the selected recording's block is centered horizontally in the viewport | High | M | 2.2 | <!-- vk:4b080955-09a0-4470-bec4-14b1a87ea5f1 --> |
| 2.4 | Empty state for no recordings | When timeline data returns empty array, show a centered message in the player area: "No recordings found" with suggestion to adjust filters or time range | Medium | S | — | <!-- vk:22c6c83b-27c8-48b9-a186-8abda3311821 --> |
| 2.5 | Tests for auto-jump behavior | Test: initial load triggers auto-select; subsequent filter changes do not re-trigger; empty data shows empty state; failed fetch falls back gracefully | High | M | 2.2, 2.3 | <!-- vk:1fda2441-9e96-4283-a35e-3fe73fb804c4 --> |

### Task Details

**2.1 - Find most recent recording in useTimeline**
- [ ] `useTimeline` exposes `latestRecording` computed from sorted timeline data
- [ ] Returns `null` when recordings array is empty
- [ ] Most recent = highest timestamp value

**2.2 - Auto-select on initial load**
- [ ] On first successful data fetch, `selectedRecording` is set to `latestRecording`
- [ ] A `hasAutoJumped` ref prevents re-triggering on subsequent data loads
- [ ] Changing camera or event type filter re-fetches data but does NOT reset `hasAutoJumped`
- [ ] Video auto-plays for the selected recording

**2.3 - Auto-scroll timeline to selection**
- [ ] TimelineBar exposes a `scrollToRecording(recording)` method or accepts a `centeredRecording` prop
- [ ] The selected recording's block is horizontally centered in the visible timeline area
- [ ] Scroll animation is smooth (CSS scroll-behavior or requestAnimationFrame)
- [ ] Works correctly across all zoom levels / time range presets

**2.4 - Empty state for no recordings**
- [ ] Empty state renders when `recordings.length === 0` and `loading === false`
- [ ] Message is centered in the player area
- [ ] Suggests adjusting filters or time range
- [ ] Consistent with existing dark theme styling

**2.5 - Tests for auto-jump behavior**
- [ ] Test: first load with recordings → selectedRecording equals latest
- [ ] Test: filter change after initial load → selectedRecording unchanged (no re-jump)
- [ ] Test: first load with empty data → no selectedRecording, empty state shown
- [ ] Test: API error → no selectedRecording, timeline loads without crash
- [ ] All tests pass with `npm test`

---

## Epic 3: Timeline Scrubbing & Time Indicator (NOT STARTED)

Add continuous hover and drag scrubbing to the TimelineBar. A fixed time tooltip above the bar shows the time at the cursor position. Clicking within a recording block seeks proportionally; clicking a gap selects the nearest recording.

### Acceptance Criteria

- [ ] Hovering the timeline shows a vertical scrub indicator tracking the cursor
- [ ] A fixed time tooltip above the bar displays the time at the cursor position
- [ ] Clicking within a recording block selects it and seeks to a proportional offset
- [ ] Clicking in a gap selects the nearest recording and plays from the beginning
- [ ] Click-and-drag scrubbing continuously updates selection and playback position
- [ ] Touch swipe mirrors drag behavior
- [ ] Keyboard arrow keys scrub when timeline is focused
- [ ] Scrub indicator is visually distinct from the "now" indicator

### Tasks

| ID | Title | Description | Priority | Complexity | Depends On | Status |
|----|-------|-------------|----------|------------|------------|--------|
| 3.1 | Hover scrub indicator line | Add a vertical line that follows the mouse cursor horizontally across the TimelineBar. Visible only on hover, disappears on mouse leave | High | S | — | <!-- vk:0f3bceed-23a4-4e7a-ab2c-66168690944b --> |
| 3.2 | Pixel-to-time conversion utility | Create a utility that converts a pixel x-offset within the timeline bar to a timestamp, based on the current time range and container width | High | S | — | <!-- vk:e152328b-dc00-4aa0-a8ed-2dfaeefaaa9b --> |
| 3.3 | Fixed time tooltip above bar | Display a fixed-position tooltip above the timeline bar showing the time at the cursor position. Format: `HH:MM AM/PM` (or `HH:MM:SS AM/PM` at high zoom) | High | M | 3.1, 3.2 | <!-- vk:8679cd17-15bf-4479-8239-201b617f5264 --> |
| 3.4 | Click-to-seek within recording blocks | When clicking inside a recording block, calculate proportional offset (click position within block / block width * duration) and seek the video to that offset | High | M | 3.2 | <!-- vk:6b02f1d9-2da9-4c3f-9969-ffdfad512a6f --> |
| 3.5 | Click-in-gap nearest recording | When clicking in a gap between recordings, find the nearest recording by timestamp (whichever direction is closest) and select it, playing from the beginning | High | M | 3.2 | <!-- vk:7cf94062-6816-4197-af7a-a13a3def7011 --> |
| 3.6 | Hit-test utility for recordings | Create a function that, given a timestamp, returns either the recording containing that time (with offset) or the nearest recording. Use binary search for performance with large datasets | High | M | 3.2 | <!-- vk:322bc86a-1582-40ec-a6a7-d75b05f7af01 --> |
| 3.7 | Click-and-drag continuous scrubbing | On mousedown + mousemove, continuously update the selected recording and seek position as the user drags across the timeline. Debounce video seeks to avoid excessive loading | High | L | 3.4, 3.5, 3.6 | <!-- vk:2d97216d-d3ce-43ef-aada-cd0c94789ca4 --> |
| 3.8 | Touch swipe scrubbing | Mirror drag scrubbing for touch events (touchstart, touchmove, touchend). Distinguish between timeline-scrub and timeline-pan gestures | Medium | M | 3.7 | <!-- vk:84b3b981-c4b0-41b2-8f1d-4fc14de1cd55 --> |
| 3.9 | Keyboard arrow scrubbing | When TimelineBar is focused, Left/Right arrow keys move the scrub position by one recording step. Integrate with existing keyboard shortcut handling | Medium | S | 3.6 | <!-- vk:c5b417fd-ac40-4ac9-a9fb-c93234a85045 --> |
| 3.10 | Tests for scrubbing interactions | Test: pixel-to-time conversion accuracy, hit-test with various recording layouts, proportional seek calculation, gap-click nearest-recording logic | High | M | 3.2, 3.6 | <!-- vk:6a205264-9ed0-43fd-a8b1-3dd05a6a599e --> |

### Task Details

**3.1 - Hover scrub indicator line**
- [ ] Vertical line renders at cursor x-position within the TimelineBar
- [ ] Line appears on `mouseenter`, follows on `mousemove`, disappears on `mouseleave`
- [ ] Visually distinct from the "now" indicator (different color/style, e.g., dashed or lighter)
- [ ] Does not interfere with existing click-to-select or drag-to-pan behavior

**3.2 - Pixel-to-time conversion utility**
- [ ] Function `pixelToTime(xOffset: number, containerWidth: number, timeRange: { from: Date, to: Date }): Date`
- [ ] Linear interpolation: `from + (xOffset / containerWidth) * (to - from)`
- [ ] Handles edge cases: xOffset < 0 clamps to `from`, xOffset > containerWidth clamps to `to`

**3.3 - Fixed time tooltip above bar**
- [ ] Tooltip rendered in a fixed position above the timeline bar (not following the cursor vertically)
- [ ] Horizontally aligned with the cursor x-position
- [ ] Shows `h:mm AM/PM` at 24h+ zoom, `h:mm:ss AM/PM` at <1h zoom
- [ ] Tooltip stays within viewport bounds (doesn't overflow left/right edges)
- [ ] Minimum 12px font, sufficient contrast against dark background

**3.4 - Click-to-seek within recording blocks**
- [ ] Clicking at the visual midpoint of a block seeks to ~50% of video duration
- [ ] Clicking at the start edge seeks to ~0:00
- [ ] Clicking at the end edge seeks to near the end
- [ ] Video element receives a `currentTime` assignment after `loadedmetadata`
- [ ] Selected recording updates in useTimeline state

**3.5 - Click-in-gap nearest recording**
- [ ] Clicking in a gap selects the closest recording by time distance
- [ ] Ties broken by whichever is chronologically closer
- [ ] Selected recording plays from the beginning (currentTime = 0)
- [ ] Works correctly when gap is at the start or end of the time range

**3.6 - Hit-test utility for recordings**
- [ ] Function `hitTestRecording(timestamp: Date, recordings: TimelineRecording[]): { recording, offset? } | null`
- [ ] Uses binary search (O(log n)) for performance with 500+ recordings
- [ ] Returns `{ recording, offsetRatio }` when timestamp falls within a recording's time span
- [ ] Returns `{ recording, offsetRatio: 0 }` (nearest) when timestamp falls in a gap
- [ ] Returns `null` only when recordings array is empty

**3.7 - Click-and-drag continuous scrubbing**
- [ ] On mousedown within timeline, entering drag mode
- [ ] mousemove updates scrub indicator, time tooltip, and selected recording
- [ ] Video seek updates are debounced (e.g., every 100ms or on recording change)
- [ ] mouseup exits drag mode and finalizes selection
- [ ] Drag does not trigger pan (existing drag-to-pan disabled during scrub)

**3.8 - Touch swipe scrubbing**
- [ ] touchstart initiates scrub mode (after brief hold to distinguish from pan)
- [ ] touchmove updates scrub position
- [ ] touchend finalizes selection
- [ ] Existing touch-pan behavior preserved for quick swipes

**3.9 - Keyboard arrow scrubbing**
- [ ] Left arrow selects previous recording, Right arrow selects next
- [ ] Only active when TimelineBar (or a parent container) has focus
- [ ] Does not conflict with video player keyboard controls
- [ ] Visual scrub indicator updates to reflect keyboard selection

**3.10 - Tests for scrubbing interactions**
- [ ] pixelToTime: test at 0%, 50%, 100% of container width
- [ ] pixelToTime: test clamping at negative and overflow values
- [ ] hitTest: test click within recording returns correct recording + offset
- [ ] hitTest: test click in gap returns nearest recording
- [ ] hitTest: test empty recordings returns null
- [ ] hitTest: performance acceptable with 500 recordings (< 1ms)
- [ ] All tests pass with `npm test`

---

## Epic 4: Scrub Preview Thumbnails (NOT STARTED)

Show a video frame thumbnail alongside the time tooltip when hovering over a recording block on the timeline. Uses a hidden video element to seek and capture frames via canvas.

### Acceptance Criteria

- [ ] Hovering over a recording block shows a thumbnail preview alongside the time tooltip
- [ ] Thumbnail shows the approximate frame at the hovered position within the recording
- [ ] Hovering over a gap shows only the time tooltip (no thumbnail)
- [ ] Thumbnail generation does not impact main video playback performance

### Tasks

| ID | Title | Description | Priority | Complexity | Depends On | Status |
|----|-------|-------------|----------|------------|------------|--------|
| 4.1 | Hidden video element for thumbnail generation | Create a hidden `<video>` element that loads recording files for frame capture. Manages loading state and seeks to requested times | High | M | 3.6 | <!-- vk:61d32946-c176-4bde-baf7-94b35d4323ae --> |
| 4.2 | Canvas frame capture utility | Capture the current frame from the hidden video element to a canvas, then extract as a data URL or ImageBitmap for display | High | M | 4.1 | <!-- vk:8f3656e9-3d74-49c4-8445-fee7888cace6 --> |
| 4.3 | Thumbnail cache | Cache generated thumbnails keyed by `recordingPath:offsetRatio` to avoid redundant video seeks. LRU cache with configurable size limit (e.g., 50 entries) | Medium | S | 4.2 | <!-- vk:0a82ede5-1545-46ef-a049-a663814f9300 --> |
| 4.4 | Thumbnail tooltip integration | Display the captured thumbnail alongside the time tooltip above the timeline bar. Size: ~160x90px. Show loading placeholder while frame is being captured | High | M | 4.2, 3.3 | <!-- vk:aaa6b21f-ab71-4d1e-b0c0-00261e052562 --> |
| 4.5 | Performance guard | Debounce thumbnail generation during rapid mouse movement (e.g., only capture frame after cursor is stationary for ~150ms). Cancel in-flight seeks when cursor moves | Medium | S | 4.4 | <!-- vk:58ff2596-276d-4509-9858-4f797d58d02c --> |
| 4.6 | Tests for thumbnail generation | Test: canvas capture produces valid data URL, cache hits avoid re-seek, debounce prevents excessive captures, graceful fallback on video load error | Medium | M | 4.2, 4.3 | <!-- vk:c154e1bb-e055-48e9-9e0e-075ed7e25528 --> |

### Task Details

**4.1 - Hidden video element for thumbnail generation**
- [ ] Hidden `<video>` element created once (not per-hover) with `preload="metadata"`
- [ ] Loads recording URL when a new recording is hovered
- [ ] Seeks to the calculated offset within the recording
- [ ] Fires a callback when seek is complete (`seeked` event)
- [ ] Does not produce audio output (muted)

**4.2 - Canvas frame capture utility**
- [ ] Function `captureFrame(videoElement: HTMLVideoElement): string` returns data URL
- [ ] Canvas dimensions match video aspect ratio, scaled to thumbnail size (~160x90)
- [ ] Returns empty string / null on capture failure
- [ ] Works cross-browser (Chrome, Firefox, Safari, Edge)

**4.3 - Thumbnail cache**
- [ ] LRU cache with max 50 entries
- [ ] Key format: `${recordingPath}:${Math.round(offsetRatio * 100)}` (1% granularity)
- [ ] Cache hit returns immediately without video seek
- [ ] Cache evicts oldest entries when full

**4.4 - Thumbnail tooltip integration**
- [ ] Thumbnail appears above the timeline bar, alongside the time text
- [ ] Size: ~160x90px with rounded corners
- [ ] Shows a subtle loading indicator (pulse/skeleton) while frame is being captured
- [ ] Hidden when cursor is over a gap (no recording at that position)
- [ ] Smooth transition between thumbnails (no flicker)

**4.5 - Performance guard**
- [ ] Thumbnail capture only triggers after cursor stationary for ~150ms
- [ ] Moving cursor cancels any in-flight seek/capture
- [ ] Main video playback is unaffected (separate video element)
- [ ] No memory leaks from uncancelled operations

**4.6 - Tests for thumbnail generation**
- [ ] Canvas capture with mock video element returns valid data URL
- [ ] Cache returns cached value on second call with same key
- [ ] Cache evicts oldest when full
- [ ] Debounce prevents capture when cursor moves within 150ms
- [ ] All tests pass with `npm test`

---

## Epic 5: Testing & Polish (NOT STARTED)

End-to-end validation, edge case handling, and visual polish across all new features.

### Acceptance Criteria

- [ ] All existing 103 tests continue passing
- [ ] New features have unit test coverage
- [ ] Edge cases handled gracefully (no recordings, failed loads, missing timestamps)
- [ ] Visual consistency with existing dark theme
- [ ] No performance regressions during scrubbing

### Tasks

| ID | Title | Description | Priority | Complexity | Depends On | Status |
|----|-------|-------------|----------|------------|------------|--------|
| 5.1 | Integration test: auto-jump + wall-clock | End-to-end test that loads timeline view, verifies auto-jump to latest recording, and checks wall-clock time display updates during playback | High | M | 1.2, 2.2 | <!-- vk:6a948145-a331-4c92-9a7c-62faff4ec52e --> |
| 5.2 | Integration test: scrubbing flow | Test hover indicator appears, time tooltip shows correct time, click-to-seek works within recording block, gap click selects nearest | High | M | 3.7 | <!-- vk:d7ca8790-d13a-47f3-bf53-f1051b242461 --> |
| 5.3 | Visual polish pass | Ensure all new UI elements (time tooltip, scrub indicator, wall-clock overlay, thumbnail) match the existing dark theme. Check contrast, spacing, font sizes | Medium | S | 4.4 | <!-- vk:19642a50-308b-4eb7-9be8-28101ae2de80 --> |
| 5.4 | Performance validation | Verify scrubbing stays >=30fps with 500 recordings visible. Profile thumbnail generation doesn't block main thread. Check auto-jump completes within 200ms | Medium | M | 3.7, 4.5 | <!-- vk:af33abd8-a707-4261-a5ea-99301aed2e3f --> |
| 5.5 | Edge case sweep | Test: recordings with null timestamps, single recording in range, recordings spanning midnight, very short clips (<1s), very long time ranges (7 days), rapid filter switching | Medium | M | 1.3, 2.4, 3.5 | <!-- vk:cb6f32f8-a680-443d-ad00-98e68fb23a45 --> |

### Task Details

**5.1 - Integration test: auto-jump + wall-clock**
- [ ] Timeline loads and auto-selects the most recent recording
- [ ] Video player shows wall-clock time matching recording timestamp
- [ ] Seeking within video updates wall-clock time correctly
- [ ] All assertions pass in `npm test`

**5.2 - Integration test: scrubbing flow**
- [ ] Hover over timeline bar shows scrub indicator and time tooltip
- [ ] Click within recording block triggers seek
- [ ] Click in gap selects nearest recording
- [ ] All assertions pass in `npm test`

**5.3 - Visual polish pass**
- [ ] Time tooltip uses dark background with light text, matching existing theme
- [ ] Scrub indicator line uses appropriate color (not conflicting with now indicator or selection)
- [ ] Wall-clock time styled consistently with existing metadata display
- [ ] Thumbnail has subtle border/shadow matching existing hover previews
- [ ] No layout shifts or overflow issues at any zoom level

**5.4 - Performance validation**
- [ ] Scrubbing at 500 recordings: no frame drops below 30fps
- [ ] Thumbnail generation: main thread not blocked (uses async seek + capture)
- [ ] Auto-jump query: < 200ms from data loaded to scroll complete
- [ ] No memory leaks after extended scrubbing session (check Chrome DevTools)

**5.5 - Edge case sweep**
- [ ] Null timestamp recording: wall-clock hidden, auto-jump skips it
- [ ] Single recording: auto-jump selects it, scrubbing limited to that block
- [ ] Midnight rollover: wall-clock correctly shows AM/PM transition
- [ ] Sub-1-second clip: block visible (minimum width), seek works
- [ ] 7-day range with many recordings: scrubbing remains responsive
- [ ] Rapid filter switching: no race conditions or stale selections

---

## Dependencies

- Recording `timestamp` field reliably populated as ISO 8601 (already in place)
- HTTP range request support for video seeking (already in place)
- Existing `/api/recordings/timeline` endpoint returns lightweight recording data (already in place)
- Existing TimelineBar, TimelinePlayer, and useTimeline hook (already built)

## Out of Scope

- Live streaming from camera feed
- Video editing, clipping, or exporting
- Multi-camera simultaneous playback
- New backend API endpoints or database schema changes
- Mobile-native app

## Open Questions

- [ ] Should the time tooltip respect browser locale for 12h/24h format, or always use 12h AM/PM?
- [ ] Should thumbnail generation use server-side frame extraction in a future iteration for better performance?

## Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| docs/prd.md | Product Requirements (Timeline Playback Enhancements) | Current |

---

## Changelog

- **2026-03-23**: Synced with VibeKanban — all 30 tasks at "To do", no status changes
- **2026-03-22**: Generated 35 VibeKanban issues (5 epics + 30 tasks) and linked to plan
- **2026-03-22**: Initial development plan created from PRD
