# Tab Out Custom privacy

Tab Out Custom is a local-first browser extension. The optional Gmail notifier is disabled by default and requires an explicit account connection from Settings.

## Data kept in the browser

Normal dashboard data remains in `chrome.storage.local`, `chrome.storage.session`, or `localStorage`, including shortcuts, sessions, layout settings, language, weather cache, saved-for-later tabs, TODO tasks, the bounded TODO-only undo history, and the bounded Unassigned tabs removal history used to restore explicitly closed tabs.

When Gmail is enabled, the browser stores:

| Data | Storage | Retention |
| --- | --- | --- |
| Shared and per-account Google OAuth client IDs and client secrets | Trusted-context `chrome.storage.local` | Until replaced, removed, or extension data is removed |
| Connected email addresses and Google refresh tokens | Trusted-context `chrome.storage.local` | Until each account is disconnected or extension data is removed |
| Per-account filters, polling, notification, preview, and display preferences | `chrome.storage.local` | Until changed, disconnected, or extension data removal |
| Short-lived Google access tokens | `chrome.storage.session` | Current browser session or token expiry |
| Pending PKCE verifier, CSRF state, callback URL, and authorization code | `chrome.storage.session` | Until connection completes, is cancelled, or expires after five minutes |
| Conversation IDs, sender/subject/snippet metadata, unread/starred state | `chrome.storage.session` | Current browser session; refreshed on demand |
| Known message IDs, unread count, and poll timestamps | `chrome.storage.local` | Until account disconnect or extension data removal |
| Expanded message bodies | Dashboard or popup page memory | Until that page is closed or reloaded |

Refresh tokens persist so background polling and notifications continue after a browser restart. Browser extension storage is not equivalent to an operating-system keychain. Tokens are not additionally encrypted with a key stored beside them because that would not add meaningful protection.

Tokens are never exposed through the dashboard DOM, toolbar popup, public runtime responses, logs, or public account metadata. Local storage access is restricted to trusted extension contexts.

## Direct OAuth with PKCE

Tab Out uses Google Desktop OAuth client IDs and the client secrets issued with those installed-application credentials. A shared client can authorize multiple Gmail accounts, while individual accounts can instead use dedicated clients. Google's token endpoint requires the matching values for the configured client. Because an extension is distributed to users, these client secrets cannot be treated as confidential. PKCE, not an embedded secret, protects the authorization code.

For every connection, the extension:

1. creates a random PKCE verifier and S256 challenge;
2. creates a separate high-entropy CSRF state;
3. opens Google's authorization page in a focused browser tab;
4. requests an authorization-code redirect to a randomized `127.0.0.1` loopback URL;
5. observes that tab's redirect without running a local server;
6. verifies the exact tab, callback URL, state, and five-minute lifetime;
7. exchanges the code directly with `oauth2.googleapis.com` using the Desktop client credentials and PKCE verifier;
8. stores the refresh token locally and the access token in session storage.

Only one authorization transaction can be active at a time. Closing its tab cancels it. A failed callback is replaced by a local extension error page.

No Tab Out-operated server receives OAuth tokens, Gmail data, account identifiers, or authorization metadata.

## Gmail rendering

The Gmail notifier requests:

```text
https://www.googleapis.com/auth/gmail.modify
```

This scope allows the extension to read messages and apply mark read/unread, archive, restore to Inbox, star/unstar, and trash/untrash actions. Tab Out does not send mail, permanently delete messages, manage spam, download attachments, or access contacts.

The dashboard and toolbar popup first request conversation metadata. A message body is requested only when its conversation is expanded. A full thread is requested only after selecting **Load full conversation**.

Email HTML is parsed in a detached document and converted to text. Scripts, styles, frames, embedded objects, media, and remote images are removed. Attachments are not fetched or rendered.

## Polling, badges, and notifications

When enabled for an account, the extension uses a browser alarm to query Gmail directly every one, five, fifteen, or thirty minutes. Five minutes is the default. It keeps a bounded local list of message IDs so the first check seeds state without notifying for old mail.

Native notifications can show only a generic new-mail notice, sender and subject, or a full subject/snippet preview. Full preview is the default and can be changed or disabled per account. Notification actions can mark a conversation read or archive it. This data is displayed by the browser or operating-system notification service and may remain in operating-system notification history according to local system settings.

The toolbar badge can show eligible open tabs, Gmail unread mail, their combined total, or nothing.

## Disconnect and deletion

Disconnecting Gmail:

1. asks Google to revoke the stored refresh token;
2. removes the local account and refresh token even if revocation cannot be confirmed;
3. removes access tokens and conversation caches;
4. removes account preferences, unread and polling state, and alarms;
5. removes optional Gmail, alarms, and notification permissions when no Gmail accounts remain.

The user can also revoke Tab Out from their Google Account security settings.

The first brokerless release performs a one-time Gmail-only reset. It removes all accounts, connection data, caches, alarms, notifications, and Gmail preferences created by the former server-assisted implementation. Sessions, shortcuts, layouts, weather, and unrelated settings are preserved.

## Other network requests

Without Gmail, Tab Out can contact Open-Meteo for weather, Nominatim for reverse geocoding, and favicon sources used by the dashboard. Personal workflow collections remain local to the browser.

With Gmail enabled, OAuth requests go directly to `accounts.google.com` and `oauth2.googleapis.com`; mailbox requests go directly to `gmail.googleapis.com`.

## Public distribution requirements

`gmail.modify` is a Google restricted scope. A public release must complete Google's OAuth app verification and any required security assessment, publish accurate privacy disclosures, demonstrate the complete PKCE connection and Gmail feature flow, and comply with the Google API Services User Data Policy before making the integration generally available.
