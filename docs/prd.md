# PRD: Timeline Playback Enhancements

> **Author:** Francisco Sales
> **Created:** 2026-03-22
> **Status:** Draft

## Problem Statement

The ding-dong-ditch timeline view lets homeowners browse and play back security recordings, but the experience lacks temporal context and fluid navigation. Users land on an empty player with no indication of recent activity, must click individual recording blocks rather than scrubbing freely through time, and have no sense of what real-world time a frame corresponds to. These gaps make it harder to quickly review events and correlate footage with real-life moments.

## Goals

1. **Instant context on load** — automatically position the timeline at the most recent event and begin playback so users see relevant footage immediately.
2. **Fluid timeline scrubbing** — allow continuous hover/drag interaction across the timeline bar with a fixed time indicator, enabling quick scanning without clicking individual clips.
3. **Real-world time overlay** — display the approximate wall-clock time in the video player so users can correlate footage with real events.

## Non-Goals (Out of Scope)

- Live streaming from camera feed (requires WebSocket/RTSP infrastructure not yet in place)
- Video editing, clipping, or exporting
- Multi-camera simultaneous playback
- Mobile-native app (web only)
- Notification system or alerting changes

## Target Users / Personas

### Persona 1: Homeowner
- **Description:** A homeowner using ding-dong-ditch to monitor their doorbell camera and review motion/doorbell events.
- **Needs:** Quickly see the most recent event when opening the timeline, scrub through the day's footage efficiently, and know what time of day something happened while watching a recording.
- **Pain points:** Currently must manually find and click the latest recording; no way to scan the timeline without selecting individual clips; elapsed playback time has no real-world meaning.

## Functional Requirements

### FR-1: Auto-Jump to Most Recent Event

- On initial load of the timeline view, the system SHALL query for the most recent recording across the selected camera/filter.
- The timeline SHALL scroll/position to center the most recent event in view.
- The most recent recording SHALL automatically begin playback.
- If no recordings exist for the current filter, the timeline SHALL display an empty state with a message (e.g., "No recordings found").
- When the user changes camera or filter, the timeline SHALL NOT re-jump. The user's current scroll position is preserved to avoid disrupting manual navigation.

### FR-2: Timeline Scrubbing with Time Indicator

- The timeline bar SHALL support continuous hover interaction — as the user moves their cursor over the bar, a vertical scrub indicator line SHALL track the cursor position.
- A fixed time indicator SHALL appear above the timeline bar showing the time corresponding to the cursor's position (format: `HH:MM AM/PM` or `HH:MM:SS AM/PM` depending on zoom level).
- Clicking on any position in the timeline SHALL:
  - If the position falls within a recording block: select that recording and seek to a proportional offset within the clip (e.g., clicking at the visual midpoint seeks to 50% of the video duration).
  - If the position falls in a gap between recordings: select and play the nearest recording from the beginning (whichever is closest in time).
- Click-and-drag scrubbing SHALL be supported: holding the mouse button and dragging across the timeline continuously updates the selected recording and playback position.
- Touch devices: swipe-to-scrub SHALL mirror the click-and-drag behavior.
- A scrub preview thumbnail SHALL appear alongside the time tooltip, showing a snapshot from the recording at the hovered position. If the hovered position falls in a gap (no recording), the thumbnail is hidden and only the time is shown.
- The scrub indicator and time tooltip SHALL be visually distinct from the existing "now" indicator and recording selection scrubber.

### FR-3: Video Player Wall-Clock Time Display

- The video player SHALL display an approximate wall-clock time alongside the standard elapsed/duration display.
- The wall-clock time SHALL be calculated as: `recording.timestamp + video.currentTime`.
- Display format: `h:mm:ss AM/PM` (e.g., `2:34:15 PM`).
- The time SHALL update in real-time as the video plays or as the user seeks within the video.
- The wall-clock time SHALL appear alongside the elapsed time, not replace it (e.g., `0:15 / 0:30 · 2:34 PM`).
- If the recording timestamp is unavailable or invalid, the wall-clock time SHALL gracefully hide rather than show incorrect data.

## Non-Functional Requirements

- **Performance:** Scrubbing interaction must feel instant — the time indicator must update at >=30fps during hover/drag with no perceptible lag. Auto-jump query should complete within 200ms.
- **Scalability:** Timeline scrubbing must remain smooth with up to 500 recordings visible in the current time range.
- **Accessibility:** Time indicator must be readable (sufficient contrast, minimum 12px font). Keyboard users should be able to scrub with arrow keys when the timeline is focused.
- **Reliability:** If the auto-jump query fails, the timeline should fall back to the current behavior (show the selected time range without auto-selecting).
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest 2 versions).

## Tech Stack (Existing)

- **Backend:** Node.js + Express, SQLite (WAL mode)
- **Frontend:** React + TypeScript, Vite
- **Storage:** Local filesystem or S3-compatible (abstracted)
- **Infrastructure:** Self-hosted (Docker optional)

No new tech stack additions required for these features.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time to first meaningful playback | < 2 seconds from page load | Manual testing / performance profiling |
| Scrub interaction frame rate | >= 30fps | Browser DevTools performance panel |
| Wall-clock time accuracy | Within 1 second of actual | Compare displayed time vs recording timestamp + elapsed |
| All existing tests passing | 103/103 pass | `npm test` |

## Dependencies

- Recording `timestamp` field must be reliably populated (already is — ISO 8601 stored at recording start)
- Video files must support HTTP range requests for seeking (already supported)
- No external dependencies or third-party services needed

## Risks & Open Questions

| Risk/Question | Impact | Mitigation/Answer |
|---------------|--------|-------------------|
| Recordings without valid timestamps | Medium | Gracefully hide wall-clock time; auto-jump skips entries with null timestamps |
| Large time ranges with many recordings may slow scrubbing | Medium | Use efficient hit-testing (binary search on sorted timestamps); debounce scrub events if needed |
| Auto-jump behavior may be unexpected if user navigates away and back | Low | Only auto-jump on initial load; no re-jump on filter/camera changes |
| Scrub thumbnail generation requires loading video metadata | Medium | Use a hidden video element to seek and capture frames via canvas; cache thumbnails to avoid redundant loads |
| Video duration unknown until metadata loads | Low | Wall-clock time starts displaying once video `loadedmetadata` event fires |

## Timeline / Milestones

| Milestone | Target Date | Description |
|-----------|-------------|-------------|
| MVP | 2026-03-22 | All three features implemented and tested |

### Implementation Order (suggested)

1. **FR-3: Wall-clock time display** — smallest scope, isolated to TimelinePlayer component
2. **FR-1: Auto-jump to most recent** — requires hook changes + API query, moderate scope
3. **FR-2: Timeline scrubbing** — largest scope, touches TimelineBar interaction model
