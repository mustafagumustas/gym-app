# Gym Programme

Static GitHub Pages workout tracker intended for Safari and iPhone Home Screen use. React 18 is served from the repository, and the service worker precaches the app for offline use.

## Stored data

- `workout_history` remains the original array of `{date, day, label, done, total}` entries. Existing entries are kept; every finalized workout adds a separate entry. New entries may also include `sets` and `activityLog`.
- `workout_active_draft_v2` stores the current workout and is saved on each change. A four-hour idle gap or local date change finalizes a non-empty draft. Changing to a different workout day finalizes it when the next tick or set entry arrives.
- `workout_activeDay` stores the selected day.

Export downloads the history and current draft as JSON. Import accepts the legacy `{workout_history: [...]}` backup and the new versioned backup. Import appends history entries and keeps the current draft, so existing history is not replaced.

Keep periodic backups: browser storage and service-worker caches are device storage, not cloud synchronization.
