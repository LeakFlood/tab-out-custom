# Tab Out Custom Architecture

Tab Out Custom is a Manifest V3 browser extension with no build step. Every
runtime file is committed as plain JavaScript, HTML, or CSS and is loaded
directly by Chromium.

## Runtime Surfaces

The extension has three user-facing surfaces:

- `extension/index.html`: the full new-tab dashboard.
- `extension/popup.html`: the toolbar popup.
- `extension/gmail-oauth-result.html`: the Gmail authorization result page.

`extension/background.js` is the service worker. It imports the collection and
Gmail services and owns browser-level operations that must continue outside a
dashboard page.

## Dashboard Load Order

The order in `extension/index.html` is intentional because the dashboard uses
classic scripts rather than JavaScript modules:

1. Shared data/config APIs:
   `dashboard-settings.js`, `tab-metadata.js`, `gmail-config.js`, and
   `todo-service.js`.
2. Dashboard foundations:
   `dashboard/i18n.js`, `dashboard/core.js`, and
   `dashboard/collection-client.js`.
3. Session UI and event routing:
   `dashboard/sessions.js`, `dashboard/browser-events.js`, and
   `dashboard/events.js`.
4. Bootstrap:
   `app.js` performs the initial `renderDashboard()` call.
5. Optional dashboard capabilities:
   shortcuts, language, backup, weather, protected-group compatibility, TODO,
   and Gmail.
6. Settings:
   `settings/catalog.js` provides shared static display metadata and
   `settings-ui.js` owns the settings drawer runtime.

Do not reorder these scripts without checking their global dependencies.
`app.js` is deliberately small so initialization is easy to locate.

## Dashboard Modules

Files under `extension/dashboard/` are grouped by responsibility:

- `i18n.js`: dictionaries and translation helpers.
- `core.js`: Chrome tab queries, unassigned-tab rendering, Saved for later,
  common display helpers, and the main dashboard render.
- `collection-client.js`: the dashboard boundary for saved-session and legacy
  protected-group persistence.
- `browser-events.js`: one fan-out subscription layer for dashboard Chrome tab,
  tab-group, and storage events.
- `sessions.js`: session detail, editing, opening, grouping, ordering, and
  drag/drop behavior.
- `events.js`: dashboard-level delegated pointer, keyboard, input, and click
  handling plus debounced refresh scheduling.
- `shortcuts.js`, `language.js`, `backup.js`, and `weather.js`: focused
  dashboard capabilities.
- `protected-groups.js`: compatibility UI for the older protected Chrome-group
  workflow while unified sessions remain the primary collection model.

Gmail and TODO already have explicit service/widget boundaries and remain in
`gmail-*.js` and `todo-*.js`.

## Persistence Ownership

All user data remains in `chrome.storage.local`; this refactor does not change
storage keys or schemas.

The main ownership rules are:

- `collection-service.js` owns reads, migrations, and writes for
  `savedSessions`, `tabOutProtectedGroups`, and
  `tabOutSessionSchemaVersion`.
- `dashboard/collection-client.js` is the dashboard caller for those
  collection operations.
- `dashboard-settings.js` owns settings defaults and normalization;
  `settings-ui.js` owns settings editing and preview state.
- `todo-service.js` owns TODO data and TODO undo history.
- Gmail auth/service files own Gmail account configuration, tokens, cached
  mailbox state, and background refresh behavior.
- `dashboard/backup.js` is the deliberate exception: backup import/export must
  read and restore the complete supported key set.

The collection runtime messages are:

- `tabOut:getSessions`
- `tabOut:replaceSessions`
- `tabOut:getProtectedGroups`
- `tabOut:replaceProtectedGroups`
- `tabOut:ensureSessionMigration`
- existing focused operations for add/remove/rename/transfer and manual-link
  normalization

New collection mutations should be added to `collection-service.js` and called
through `dashboard/collection-client.js` instead of adding direct dashboard
storage writes.

## Refresh Flow

`dashboard/browser-events.js` registers the dashboard's Chrome event listeners
once and fans events out to subscribers. `dashboard/events.js` refreshes the
main tab/session views, while `dashboard/protected-groups.js` refreshes
group-specific state.

Refreshes remain debounced and defer while drag operations are active. Focus or
activation alone does not rerender the full dashboard because that previously
caused visible layout jumps.

Storage changes to `savedSessions` trigger a collection refresh. TODO, Gmail,
and settings runtimes keep their own storage listeners because they have
separate state and lifecycle rules.

## Stylesheets

`extension/style.css` is an ordered import manifest. Files in
`extension/styles/` preserve the original selector text and cascade order:

1. base and header
2. sessions and unassigned tabs
3. Saved for later and modals
4. common responsive rules and session views
5. backup and unassigned filtering
6. settings and Gmail
7. themes and TODO

Import order is behavior. Avoid moving rules between files unless the computed
styles are verified at every supported layout and theme.

## Behavior-Preserving Changes

When restructuring:

- Keep DOM IDs, `data-action` values, storage keys, runtime message names, and
  settings defaults stable.
- Keep classic-script load order stable unless dependencies are made explicit.
- Prefer one owner for storage and browser events.
- Preserve debouncing, focus behavior, drag thresholds, and background-tab
  opening semantics.
- Do not add a bundler or dependency manager unless the extension distribution
  workflow is intentionally changed.

## Validation

There is no committed build or test framework. Before packaging a change:

1. Run `node --check` for every JavaScript file.
2. Run `git diff --check`.
3. Exercise storage/message boundaries with temporary Chrome API mocks.
4. Reload the unpacked extension and smoke-test dashboard initialization,
   settings, session editing, drag/drop, Gmail, TODO, and the toolbar popup.
