importScripts(
  "gmail-oauth-client.js",
  "gmail-config.js",
  "dashboard-settings.js",
  "tab-metadata.js",
  "collection-service.js",
  "gmail-auth.js",
  "gmail-api.js",
  "gmail-service.js"
);

function isBadgeEligibleTab(tab) {
  const url = String(tab?.url || "");
  return (
    !url.startsWith("chrome://") &&
    !url.startsWith("chrome-extension://") &&
    !url.startsWith("about:") &&
    !url.startsWith("edge://") &&
    !url.startsWith("brave://")
  );
}

function tabBadgeColor(tabCount) {
  if (tabCount <= 10) {
    return "#3d7a4a";
  }

  if (tabCount <= 20) {
    return "#b8892e";
  }

  return "#b35a5a";
}

async function updateBadge() {
  try {
    const [tabs, storedSettings, gmailUnread] = await Promise.all([
      queryCollectionBrowserTabs({}),
      chrome.storage.local.get([
        TabOutDashboardSettings.STORAGE_KEY,
        "tabOutLanguage"
      ]),
      getGmailUnreadTotal()
    ]);
    const tabCount = tabs.filter(isBadgeEligibleTab).length;
    const settings = TabOutDashboardSettings.normalizeSettings(
      storedSettings[TabOutDashboardSettings.STORAGE_KEY]
    );
    const badgeMode =
      settings.integrations.gmail.badgeMode || "openTabs";
    let count = tabCount;
    let color = tabBadgeColor(tabCount);

    if (badgeMode === "hidden") {
      count = 0;
    } else if (badgeMode === "gmailUnread") {
      count = gmailUnread;
      color = "#c95f55";
    } else if (badgeMode === "combined") {
      count = tabCount + gmailUnread;
      color = "#7567b8";
    }

    await chrome.action.setBadgeText({
      text: count > 0
        ? count > 999
          ? "999+"
          : String(count)
        : ""
    });
    await chrome.action.setTitle({
      title: storedSettings.tabOutLanguage === "en"
        ? `Tab Out · ${tabCount} open tab(s) · ` +
          `${gmailUnread} unread Gmail message(s)`
        : `Tab Out · ${tabCount} onglet(s) ouvert(s) · ` +
          `${gmailUnread} message(s) Gmail non lu(s)`
    });

    if (count > 0) {
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  } catch {
    await chrome.action.setBadgeText({ text: "" });
  }
}

globalThis.TabOutUpdateBadge = updateBadge;

function runSessionMigration() {
  ensureUnifiedSessionsMigration().catch((error) => {
    console.warn("[tab-out] session migration failed:", error);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  runSessionMigration();
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => {
  runSessionMigration();
  updateBadge();
  pollAllGmailAccounts({ notify: true }).catch(() => undefined);
});

chrome.tabs.onCreated.addListener(updateBadge);
chrome.tabs.onRemoved.addListener(updateBadge);
chrome.tabs.onUpdated.addListener(updateBadge);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (
      changes[TabOutDashboardSettings.STORAGE_KEY] ||
      changes[GMAIL_SYNC_STATE_KEY] ||
      changes[GMAIL_ACCOUNTS_KEY] ||
      changes.tabOutLanguage
    )
  ) {
    updateBadge();
  }
});

runSessionMigration();
updateBadge();
