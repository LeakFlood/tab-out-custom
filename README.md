# Tab Out Custom

A customized Chrome new tab workflow dashboard based on [Tab Out](https://github.com/zarazhangrui/tab-out).

Original project by [Zara](https://github.com/zarazhangrui). Customized by [LK.](https://github.com/LeakFlood).

Tab Out Custom turns the browser new tab page into a compact productivity dashboard with shortcuts, reusable sessions, open-tab cleanup, local weather, French/English support, optional native tab-group connections, an optional local TODO list, and an optional Gmail notifier.

## Features

### Workflow dashboard

Tab Out Custom replaces the default Chrome new tab page with a clean dashboard showing:

* greeting;
* live time;
* current date;
* local weather;
* quick shortcuts;
* saved sessions;
* unassigned open-tab overview;
* an optional local TODO list with deadlines and archives;
* an optional multi-account Gmail notifier and conversation widget.

### Dashboard settings

Open the fixed gear button or press `Ctrl+,` (`Command+,` on macOS) to customize the full Tab Out dashboard.

The settings workspace provides:

* Original, Focus, and Compact starting layouts, with Original preserving the historical dashboard placement;
* independent visibility and placement for the greeting, time, date, weather, website shortcuts, language, sessions, unassigned tabs, Saved for later, TODO list, Gmail, and statistics;
* a Dark theme that preserves the original appearance and an optional Light theme, both shared with the toolbar popup;
* a responsive 12-column drag-and-drop grid with snapped resizing;
* configurable responsive left/right dashboard padding;
* inline or four-corner placement for the language control;
* tile/list/card alternatives for the major modules;
* live preview with explicit Save and Cancel actions;
* configurable in-page keyboard commands.

The default keyboard commands are `/` for unassigned-tab search and `Ctrl+,` / `Command+,` for Settings. Navigation and creation commands can be assigned from the Keyboard settings panel.

### Quick shortcuts

Add, edit, and delete custom shortcuts directly from the dashboard.

Shortcuts are stored in browser-local storage, so they stay private to each browser profile and are not included in the repository.

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
* undo up to 20 explicit removal actions, including after dashboard or browser reloads;
* expand grouped tabs through a dropdown.

The Unassigned tabs undo history records only explicit close actions. Assigning or moving a tab into a saved session never adds an undo entry. Dragging uses a movement threshold, so a normal click still focuses the tab. While dragging, the source, floating tab preview, session targets, and two-tab creation target are visually distinct.

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

### Optional Gmail notifier

The Gmail module is disabled and hidden by default. Add one or more accounts from **Settings > General > Gmail notifier** to reveal it automatically. Enter OAuth credentials there; no source-code edit is required.

The module provides:

* separate cards and preferences for each connected Gmail account;
* an optional privacy mask that replaces connected account addresses with a black redaction bar across the dashboard, Settings, and toolbar popup;
* guided Inbox, Unread, Starred, and Important filters;
* an optional advanced Gmail search query;
* limits from 5 to 25 conversations;
* Scan, Balanced, and Reading display presets plus custom density, text size, snippet length, unread emphasis, reading width, and message spacing;
* an adaptive split reading pane on wide widgets with an automatic inline fallback when space is limited;
* latest-message previews with an explicit full-conversation loader and collapsible earlier messages;
* direct links back to Gmail and a Mail tab in the toolbar popup;
* mark read/unread, archive, star/unstar, and move-to-trash actions;
* configurable one, five, fifteen, or thirty-minute background checks;
* native new-mail notifications with configurable preview privacy;
* a toolbar badge showing open tabs, Gmail unread mail, both totals, or nothing.

Tab Out requests `gmail.modify` so it can read mail and apply the listed mailbox actions. Gmail data and OAuth tokens travel only between the extension and Google. Message HTML is converted to inert text; remote images, scripts, attachments, and active email content are not rendered.

Authorization uses Google Desktop OAuth credentials, an S256 PKCE challenge, and a loopback callback observed by the extension. The client secret issued for an installed application is included because Google's token endpoint requires it for this client, but it cannot be confidential inside a distributed extension; PKCE protects the one-time code. No backend or local server is used. See [`PRIVACY.md`](PRIVACY.md) for the complete data boundary.

Gmail display preferences are available in **Settings > Layout > Gmail** so layout and readability changes can be previewed together. Balanced is the default; selecting an individual display control switches the Gmail preset to Custom.

### Optional TODO list

The TODO module is hidden by default. Enable and position it from **Settings > Layout**, then configure its behavior from **Settings > General > TODO list**.

Each task supports:

* a required title, optional notes, and an optional checklist;
* a choice between compact single-line titles and complete multi-line titles;
* a local deadline date with an optional time;
* configurable overdue, today, due-soon, and future priority colors;
* automatic archiving, manual archiving, or automatic deletion after completion;
* creation and completion dates in the archive;
* restoration or deletion of archived tasks;
* a dedicated 20-step undo history that survives dashboard reloads.

Tasks and TODO undo history remain in browser-local storage. Task data is included in manual backups, while undo history is intentionally cleared after importing a backup.

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
* dashboard layout and keyboard settings;
* saved-for-later tabs;
* TODO tasks and their archive;
* language preference.

The export creates a local JSON backup file.

This is useful before reinstalling the extension, moving it to another folder, or switching to a new manual version.

When importing a backup, existing local data is replaced after confirmation.

For normal manual updates, the recommended method is still:

1. keep the same local extension folder;
2. replace the extension files inside that folder;
3. reload the extension from `chrome://extensions`.

Removing the extension or loading it from a different folder may create a different local extension storage, which can make previous shortcuts and sessions unavailable.

## Development

Tab Out Custom has no build step or package manager. Chromium loads the files in
`extension/` directly. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for script order,
module boundaries, storage ownership, refresh flow, and validation guidance.


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

Tab Out Custom is designed to keep personal workflow data local. The Gmail integration is the only feature that requires an account connection, and it remains fully optional.

Stored locally in Chrome:

* custom shortcuts;
* saved sessions;
* session group connections and display preferences;
* dashboard layout and keyboard settings;
* language preference;
* weather cache;
* Gmail email addresses, local refresh tokens, preferences, short-lived access tokens, and temporary conversation metadata when Gmail is enabled.

This data is stored with `chrome.storage.local`, `chrome.storage.session`, or browser `localStorage` and is not included when sharing or pushing the project files.

Refresh tokens remain in trusted-context `chrome.storage.local`; access tokens remain in `chrome.storage.session`. Disconnecting asks Google to revoke the refresh token and then removes the local account data.

See [`PRIVACY.md`](PRIVACY.md) for retention and data-flow details.

The project supports an optional private configuration file:

```text
extension/config.local.js
```

These files should not be committed or shared.

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

### Gmail OAuth client

The Gmail integration requires a public Google **Desktop app** OAuth client:

1. Create or select a Google Cloud project.
2. Enable the Gmail API.
3. Configure Google Auth Platform branding, audience, test users, and the `gmail.modify` scope.
4. Create a Desktop app OAuth client.
5. Open **Settings → General → Gmail notifier** and enter the issued client ID and client secret.

One shared client can connect multiple Gmail accounts. Accounts can also use separate dedicated clients, and both approaches can be mixed. The information button beside **Gmail notifier** contains the complete Google Cloud procedure and direct links.

For local development only, you may instead copy extension/gmail-oauth-client.example.js to extension/gmail-oauth-client.js, fill in the two values, and reload the unpacked extension. The destination file is ignored by Git and loaded only when present. Never commit, share, or include that local file in a distributed package.

Desktop and other installed applications cannot keep a client secret confidential. Do not reuse this credential for a server-side application, and expect both values to be extractable from an installed extension. OAuth clients and tokens are stored only in trusted extension storage and are excluded from Tab Out backups.

The extension opens Google authorization in a focused tab and observes the redirect to a randomized `127.0.0.1` loopback URL. PKCE protects the one-time authorization code; no process listens on that address.

## Git ignore

The repository should ignore:

```text
extension/config.local.js
extension/gmail-oauth-client.js
```

## Permissions

This extension may use the following Chrome permissions:

* `tabs` — read and manage open browser tabs;
* `tabGroups` — import, inspect, focus, and recreate native Chrome tab groups;
* `activeTab` — interact with the active tab when needed;
* `storage` — save shortcuts, sessions, preferences, and weather cache;
* `geolocation` — retrieve local weather if the user allows it.

When the user explicitly connects Gmail, the extension additionally requests these optional permissions:

* `alarms` - schedule per-account mail checks at the selected interval;
* `notifications` - show native new-mail notifications and actions;
* `https://gmail.googleapis.com/*` - fetch the connected account's Gmail data directly;
* `https://oauth2.googleapis.com/*` - exchange, refresh, and revoke Google OAuth tokens directly.

External requests are used for:

* weather data;
* reverse geocoding;
* favicons;
* direct Gmail API reads and user-requested mailbox actions when Gmail is enabled;
* OAuth token lifecycle requests when Gmail is enabled.

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

The Gmail implementation additionally uses `extension/dashboard-settings.js`, `extension/gmail-auth.js`, `extension/gmail-api.js`, `extension/gmail-config.js`, `extension/gmail-service.js`, and `extension/gmail-widget.js`.

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
