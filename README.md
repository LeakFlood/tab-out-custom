# Tab Out Custom

A customized Chrome new tab workflow dashboard based on [Tab Out](https://github.com/zarazhangrui/tab-out).

Original project by [Zara](https://github.com/zarazhangrui). Customized by [LK.](https://github.com/LeakFlood).

Tab Out Custom turns the browser new tab page into a compact productivity dashboard with shortcuts, saved sessions, open-tab cleanup, local weather, French/English support, and saved Chrome tab groups with local snapshots.

## Features

### Workflow dashboard

Tab Out Custom replaces the default Chrome new tab page with a clean dashboard showing:

* greeting;
* live time;
* current date;
* local weather;
* quick shortcuts;
* saved sessions;
* saved Chrome groups;
* open tab overview.

### Quick shortcuts

Add, edit, and delete custom shortcuts directly from the dashboard.

Shortcuts are stored locally with `chrome.storage.local`, so they stay private to each browser profile and are not included in the repository.

### Saved sessions

Create reusable sessions from currently open tabs.

Each saved session includes:

* a custom name;
* selected tabs;
* favicon preview;
* one-click reopening;
* edit and delete actions.

Sessions are useful for recurring workflows such as development, research, media, admin tools, or personal dashboards.

### Saved Chrome groups

Tab Out Custom can save Chrome tab groups as local snapshots.

This adds a protection layer on top of Chrome’s native tab groups:

* save a Chrome group;
* keep its name, color, and tabs;
* detect when the live Chrome group changes;
* restore a closed group from the saved snapshot;
* update the saved snapshot manually;
* open a saved group as a new Chrome group;
* ignore a detected change when needed.

Saved groups are never modified automatically. When Chrome changes a group, Tab Out Custom shows the difference and lets the user decide what to do.

Group states include:

* **Saved / synced** — the Chrome group matches the saved snapshot;
* **Changed** — tabs were added or removed since the last save;
* **Closed** — the group is not currently open, but can be restored;
* **Unsaved** — the group exists in Chrome but has not been saved yet.

### Open tabs overview

Open tabs are grouped by domain and shown as compact cards.

You can:

* view grouped tabs;
* focus an existing tab;
* close a single tab;
* close all tabs from a domain;
* close duplicate tabs;
* expand grouped tabs through a dropdown.

### Live refresh

The dashboard updates when browser tabs or saved groups change.

Refresh behavior is debounced to avoid unnecessary layout jumps during Chrome tab group updates.

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
* saved Chrome group snapshots;
* saved-for-later tabs;
* language preference.

The export creates a local JSON backup file.

This is useful before reinstalling the extension, moving it to another folder, or switching to a new manual version.

When importing a backup, existing local data is replaced after confirmation.

For normal manual updates, the recommended method is still:

1. keep the same local extension folder;
2. replace the extension files inside that folder;
3. reload the extension from `chrome://extensions`.

Removing the extension or loading it from a different folder may create a different local extension storage, which can make previous shortcuts, sessions, and saved groups unavailable.


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
* saved Chrome group snapshots;
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
* `tabGroups` — read, save, restore, and update Chrome tab groups;
* `activeTab` — interact with the active tab when needed;
* `storage` — save shortcuts, sessions, preferences, weather cache, and group snapshots;
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
├── index.html
├── manifest.json
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
* manual confirmation before changing saved Chrome group snapshots.

## Credits

Original project by [Zara](https://github.com/zarazhangrui).

Customized by [LK.](https://github.com/LeakFlood).

This project is based on Tab Out and keeps the original attribution.

## License

MIT
