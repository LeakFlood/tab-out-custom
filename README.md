# Tab Out Custom

A customized Chrome new tab workflow dashboard based on [Tab Out](https://github.com/zarazhangrui/tab-out).

Original project by [Zara](https://github.com/zarazhangrui). Customized by [LK.](https://github.com/LeakFlood).

Tab Out Custom turns the browser new tab page into a compact productivity dashboard with shortcuts, reusable sessions, open-tab cleanup, local weather, French/English support, and optional native tab-group connections.

## Features

### Workflow dashboard

Tab Out Custom replaces the default Chrome new tab page with a clean dashboard showing:

* greeting;
* live time;
* current date;
* local weather;
* quick shortcuts;
* saved sessions;
* unassigned open-tab overview.

### Quick shortcuts

Add, edit, and delete custom shortcuts directly from the dashboard.

Shortcuts are stored locally with `chrome.storage.local`, so they stay private to each browser profile and are not included in the repository.

### Saved sessions

Create reusable sessions from currently open tabs.

Each saved session includes:

* a custom name;
* an editor split between included tabs and currently open tabs available to add;
* favicon preview;
* manual tab creation from a link, with an optional custom name, directly in the editor;
* individual and bulk tab removal, with multi-level undo until the editor is saved or closed;
* a detail view for opening selected tabs in the background without duplicating tabs already open in the current window;
* one-click opening and switching to a specific tab;
* one-click reopening;
* importing a Chrome or Brave tab group through a tab-selection review;
* detecting changes in an optionally connected browser group;
* opening any session as a native tab group;
* edit and delete actions.

Session names can be edited directly from their card. Click the title or use the discreet pencil shown on hover, then press Enter or click away to save.

Sessions are useful for recurring workflows such as development, research, media, admin tools, or personal dashboards.

Native browser groups are not stored as a second type of collection. They can be imported into a new or existing session, and connected sessions show **Group open**, **Changes available**, or **Group closed**. Changes are never applied automatically: the review dialog lets the user keep or remove each tab explicitly.

### Unassigned tabs overview

Open tabs that do not already belong to a saved session are grouped by domain and shown as compact cards. Exact URLs are used for assignment, so query-string and hash variants remain independent.

You can:

* view grouped tabs;
* focus an existing tab;
* press and drag a tab onto a session to assign it without closing the live browser tab;
* drag one unassigned tab onto another to create a two-tab session with inline naming;
* close a single tab;
* close all unassigned tabs from a domain;
* close duplicate tabs;
* expand grouped tabs through a dropdown.

Dragging uses a movement threshold, so a normal click still focuses the tab. While dragging, the source, floating tab preview, session targets, and two-tab creation target are visually distinct.

### Live refresh

The dashboard updates when browser tabs or connected groups change.

Refresh behavior is debounced to avoid unnecessary layout jumps during Chrome tab group updates.

### Toolbar session management

Click the extension icon from any supported browser tab to open a compact destination picker.

From the picker, the current tab can be added to or removed from any existing saved session. Each row clearly shows the action that will be applied. This changes the saved session only and never modifies a connected live group.

### Weather widget

The dashboard includes a local weather widget with:

* current temperature in °C;
* feels-like temperature;
* weather condition label;
* animated visual state;
* privacy-friendly city masking.

The city is hidden by default and only appears when clicked. It is automatically hidden again after reload or browser restart.

Weather data is fetched through Open-Meteo. Reverse geocoding is handled through Nominatim.

### French / English interface

The interface supports:

* French;
* English.

The selected language is saved locally in Chrome.

## Browser compatibility

Tested primarily on Google Chrome.

Because the extension uses Chromium extension APIs, it should also work on Chromium-based browsers such as Brave.

For Brave, open:

```text
brave://extensions
```

## Backup and restore

Tab Out Custom includes a discreet backup menu for manual installs and updates.

The backup menu is available from the small `⋯` button in the bottom-right corner of the dashboard.

It can export and import local user data, including:

* custom shortcuts;
* saved sessions;
* session group connections and display preferences;
* saved-for-later tabs;
* language preference.

The export creates a local JSON backup file.

This is useful before reinstalling the extension, moving it to another folder, or switching to a new manual version.

When importing a backup, existing local data is replaced after confirmation.

For normal manual updates, the recommended method is still:

1. keep the same local extension folder;
2. replace the extension files inside that folder;
3. reload the extension from `chrome://extensions`.

Removing the extension or loading it from a different folder may create a different local extension storage, which can make previous shortcuts and sessions unavailable.


## Installation

1. Download or clone this repository.
2. Open Chrome.
3. Go to:

```text
chrome://extensions
```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the folder:

```text
extension
```

7. Open a new tab.

## Privacy

Tab Out Custom is designed to keep personal workflow data local.

Stored locally in Chrome:

* custom shortcuts;
* saved sessions;
* session group connections and display preferences;
* language preference;
* weather cache.

This data is stored with `chrome.storage.local` and is not included when sharing or pushing the project files.

The project supports an optional private configuration file:

```text
extension/config.local.js
```

This file should not be committed or shared.

## Private configuration

You can create:

```text
extension/config.local.js
```

Example:

```js
window.TAB_OUT_DEFAULT_SHORTCUTS = [
  {
    name: "Example",
    url: "https://example.com"
  }
];
```

Do not commit this file if it contains personal links or private workflow data.

## Git ignore

The repository should ignore:

```text
extension/config.local.js
```

## Permissions

This extension may use the following Chrome permissions:

* `tabs` — read and manage open browser tabs;
* `tabGroups` — import, inspect, focus, and recreate native Chrome tab groups;
* `activeTab` — interact with the active tab when needed;
* `storage` — save shortcuts, sessions, preferences, and weather cache;
* `geolocation` — retrieve local weather if the user allows it.

External requests are used for:

* weather data;
* reverse geocoding;
* favicons.

## Project structure

```text
extension/
├── app.js
├── background.js
├── collection-service.js
├── index.html
├── manifest.json
├── popup.css
├── popup.html
├── popup.js
├── style.css
└── icons/
```

## Notes

This is a personal customization of Tab Out, extended into a workflow-focused new tab dashboard.

The project is still evolving and currently prioritizes:

* compact interface;
* local-first storage;
* browser workflow control;
* privacy-conscious behavior;
* explicit review before applying connected-group changes to sessions.

## Credits

Original project by [Zara](https://github.com/zarazhangrui).

Customized by [LK.](https://github.com/LeakFlood).

This project is based on Tab Out and keeps the original attribution.

## License

MIT
