# Tab Out Custom

Original project by [Zara](https://github.com/zarazhangrui). Customized by [LK.](https://github.com/LeakFlood).

A customized Chrome new tab dashboard based on **Tab Out**.

This version turns the new tab page into a clean productivity dashboard with shortcut management, saved tab sessions, live open-tab cleanup, local weather, and French/English interface support.

## Features

### Custom new tab dashboard

Replaces Chrome’s default new tab page with a minimalist dashboard showing:

* current greeting;
* live time;
* current date;
* weather widget;
* quick shortcuts;
* saved sessions;
* open tab overview.

### Quick shortcuts

Add, edit, and delete custom shortcuts directly from the dashboard.

Shortcuts are stored locally in Chrome using `chrome.storage.local`, so they are private to each user and are not included when sharing the project files.

### Saved sessions

Create reusable tab sessions from currently open tabs.

A saved session can be reopened later with one click. Each session includes:

* custom name;
* selected tabs;
* favicon preview;
* edit mode;
* delete option.

### Open tabs overview

Tab Out groups currently open tabs by domain and displays them as clean cards.

You can:

* view grouped tabs;
* focus an existing tab;
* close a single tab;
* close all tabs from a domain;
* close duplicate tabs;
* expand grouped tabs through a dropdown.

### Live refresh

The dashboard updates when Chrome tabs change.

It reacts to:

* new tabs;
* closed tabs;
* updated tabs;
* active tab changes;
* window focus changes.

### Weather widget

Includes a local weather card with:

* current temperature in °C;
* feels-like temperature;
* condition label;
* animated weather visual;
* hidden city by default for privacy.

The city is masked by default and only appears when clicked. It is automatically hidden again after reload or browser restart.

Weather data is fetched through Open-Meteo and reverse geocoding through Nominatim.

### French / English interface

The dashboard includes a language switcher.

Supported languages:

* French;
* English.

The selected language is saved locally in Chrome.


## Browser compatibility

Tested primarily on Chrome.

Because the extension uses Chromium extension APIs, it should also work on Chromium-based browsers such as Brave. To install it in Brave, open:

```text
brave://extensions
```

## Privacy-oriented setup

Personal data is not hardcoded into the shared files.

User-created shortcuts and sessions are stored locally in Chrome, not in the repository.

Optional private configuration can be placed in:

```text
extension/config.local.js
```

This file should not be committed or shared.

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

## Private configuration

You can create a local private configuration file:

```text
extension/config.local.js
```

This file is ignored by Git and should be kept private.

Example:

```js
window.TAB_OUT_DEFAULT_SHORTCUTS = [
  {
    name: "Example",
    url: "https://example.com"
  }
];
```

Do not commit this file if it contains personal links.

## Git ignore

The repository should ignore:

```text
extension/config.local.js
```

This prevents personal shortcuts or private configuration from being pushed to GitHub.

## Permissions

This extension may use the following Chrome permissions:

* `tabs` — read and manage open tabs;
* `activeTab` — interact with the active tab;
* `storage` — save shortcuts, sessions, preferences, and weather cache;
* `geolocation` — retrieve local weather if the user allows it.

External requests are used for:

* weather data;
* reverse geocoding;
* favicons.

## Notes

This is a personal customization of Tab Out, designed for a cleaner and more functional new tab workflow.

Original project:

```text
https://github.com/zarazhangrui/tab-out
```

## License

If this project is based on the original Tab Out repository, keep the original license and attribution.


## License

MIT

---

Original project by [Zara](https://x.com/zarazhangrui). Customized by [LK.](https://github.com/LeakFlood).
This project is based on Tab Out and keeps the original MIT License.
