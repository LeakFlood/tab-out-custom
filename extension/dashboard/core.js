'use strict';

/* ----------------------------------------------------------------
   CHROME TABS — Direct API Access

   Since this page IS the extension's new tab page, it has full
   access to chrome.tabs and chrome.storage. No middleman needed.
   ---------------------------------------------------------------- */

// All open tabs — populated by fetchOpenTabs()
let openTabs = [];
let unassignedOpenTabs = [];
const UNASSIGNED_REMOVAL_HISTORY_KEY =
  "unassignedTabRemovalHistory";
const UNASSIGNED_REMOVAL_HISTORY_VERSION = 1;
const MAX_UNASSIGNED_REMOVAL_ENTRIES = 20;
let unassignedRemovalHistory = [];
let unassignedRemovalUndoBusy = false;

async function getIncludeSuspendedTabsPreference() {
  try {
    const runtime = globalThis.TabOutDashboardRuntime;

    if (runtime?.ready) {
      await runtime.ready;
      return runtime.getEffectiveSettings()?.behavior?.includeSuspendedTabs !==
        false;
    }

    const settingsApi = globalThis.TabOutDashboardSettings;

    if (!settingsApi) {
      return true;
    }

    const stored = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
    return settingsApi.normalizeSettings(
      stored[settingsApi.STORAGE_KEY]
    ).behavior.includeSuspendedTabs !== false;
  } catch {
    return true;
  }
}

async function queryTabsWithMetadata(query = {}) {
  const [tabs, includeSuspendedTabs] = await Promise.all([
    chrome.tabs.query(query),
    getIncludeSuspendedTabsPreference()
  ]);
  const metadataApi = globalThis.TabOutTabMetadata;

  if (!metadataApi) {
    return tabs;
  }

  return tabs.map((tab) =>
    metadataApi.normalizeBrowserTab(tab, { includeSuspendedTabs })
  );
}

function createUnassignedRemovalId() {
  const randomPart = globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(16).slice(2);
  return `unassigned-removal-${Date.now()}-${randomPart}`;
}

function normalizeUnassignedRemovalTab(value) {
  const url = String(value?.url || "").trim();

  if (!url) {
    return null;
  }

  return {
    sourceTabId: Number.isInteger(value?.sourceTabId)
      ? value.sourceTabId
      : null,
    url: url.slice(0, 16384),
    title: String(value?.title || url).slice(0, 1024),
    windowId: Number.isInteger(value?.windowId)
      ? value.windowId
      : null,
    index: Number.isInteger(value?.index) && value.index >= 0
      ? value.index
      : null,
    pinned: Boolean(value?.pinned)
  };
}

function normalizeUnassignedRemovalEntry(value) {
  const tabs = (Array.isArray(value?.tabs) ? value.tabs : [])
    .map(normalizeUnassignedRemovalTab)
    .filter(Boolean);

  if (tabs.length < 1) {
    return null;
  }

  const fallbackCounts = new Map();
  tabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.url);
    fallbackCounts.set(url, (fallbackCounts.get(url) || 0) + 1);
  });
  const targetCounts = new Map();
  const storedCounts = Array.isArray(value?.targetUrlCounts)
    ? value.targetUrlCounts
    : [];

  storedCounts.forEach((item) => {
    const url = normalizeOpenTabUrl(item?.url);
    const count = Number.parseInt(item?.count, 10);

    if (url && Number.isFinite(count) && count > 0) {
      targetCounts.set(url, Math.min(count, 100000));
    }
  });
  fallbackCounts.forEach((count, url) => {
    if (!targetCounts.has(url)) {
      targetCounts.set(url, count);
    }
  });

  return {
    id: String(value?.id || createUnassignedRemovalId()).slice(0, 200),
    createdAt: Number.isFinite(Date.parse(value?.createdAt))
      ? new Date(value.createdAt).toISOString()
      : new Date().toISOString(),
    kind: ["single", "domain", "duplicates", "all"].includes(value?.kind)
      ? value.kind
      : "single",
    tabs,
    targetUrlCounts: Array.from(targetCounts, ([url, count]) => ({
      url,
      count
    }))
  };
}

function normalizeUnassignedRemovalHistory(value) {
  const entries = Array.isArray(value)
    ? value
    : Array.isArray(value?.entries)
      ? value.entries
      : [];

  return entries
    .map(normalizeUnassignedRemovalEntry)
    .filter(Boolean)
    .slice(-MAX_UNASSIGNED_REMOVAL_ENTRIES);
}

function updateUnassignedRemovalUndoControl() {
  const button = document.querySelector(
    '[data-action="undo-unassigned-removal"]'
  );

  if (!button) {
    return;
  }

  const count = unassignedRemovalHistory.length;
  const title = count > 0
    ? t("unassignedUndoRemovalTitle", { count })
    : t("unassignedUndoRemovalEmpty");
  const countBadge = button.querySelector(".open-tabs-undo-count");

  button.disabled = unassignedRemovalUndoBusy || count < 1;
  button.title = title;
  button.setAttribute("aria-label", title);

  if (countBadge) {
    countBadge.textContent = String(count);
    countBadge.hidden = count <= 1;
  }
}

async function loadUnassignedRemovalHistory({ required = false } = {}) {
  try {
    const stored = await chrome.storage.local.get(
      UNASSIGNED_REMOVAL_HISTORY_KEY
    );
    unassignedRemovalHistory = normalizeUnassignedRemovalHistory(
      stored[UNASSIGNED_REMOVAL_HISTORY_KEY]
    );
  } catch (error) {
    console.warn(
      "[tab-out] Could not load unassigned removal history:",
      error
    );

    if (required) {
      throw error;
    }
  }

  updateUnassignedRemovalUndoControl();
  return unassignedRemovalHistory;
}

async function writeUnassignedRemovalHistory(entries) {
  const previousHistory = unassignedRemovalHistory;
  const nextHistory = normalizeUnassignedRemovalHistory(entries);

  try {
    await chrome.storage.local.set({
      [UNASSIGNED_REMOVAL_HISTORY_KEY]: {
        version: UNASSIGNED_REMOVAL_HISTORY_VERSION,
        entries: nextHistory
      }
    });
    unassignedRemovalHistory = nextHistory;
  } catch (error) {
    unassignedRemovalHistory = previousHistory;
    updateUnassignedRemovalUndoControl();
    throw error;
  }

  updateUnassignedRemovalUndoControl();
  return unassignedRemovalHistory;
}

async function appendUnassignedRemovalEntry(entry) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  await writeUnassignedRemovalHistory([...history, entry]);
  return entry;
}

async function replaceUnassignedRemovalEntry(entry) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const index = history.findIndex((item) => item.id === entry.id);

  if (index < 0) {
    return false;
  }

  history[index] = entry;
  await writeUnassignedRemovalHistory(history);
  return true;
}

async function removeUnassignedRemovalEntry(entryId) {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const nextHistory = history.filter((entry) => entry.id !== entryId);

  if (nextHistory.length === history.length) {
    return false;
  }

  await writeUnassignedRemovalHistory(nextHistory);
  return true;
}

function createUnassignedRemovalEntry(kind, selectedTabs, allTabs) {
  const selected = selectedTabs
    .map((tab) => normalizeUnassignedRemovalTab({
      sourceTabId: tab.id,
      url: tab.pendingUrl || tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
      pinned: tab.pinned
    }))
    .filter(Boolean);
  const selectedUrls = new Set(
    selected.map((tab) => normalizeOpenTabUrl(tab.url))
  );
  const targetCounts = new Map();

  allTabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

    if (selectedUrls.has(url)) {
      targetCounts.set(url, (targetCounts.get(url) || 0) + 1);
    }
  });

  return normalizeUnassignedRemovalEntry({
    id: createUnassignedRemovalId(),
    createdAt: new Date().toISOString(),
    kind,
    tabs: selected,
    targetUrlCounts: Array.from(targetCounts, ([url, count]) => ({
      url,
      count
    }))
  });
}

async function closeUnassignedTabsWithUndo(tabIds, kind) {
  const requestedIds = new Set(
    (tabIds || []).filter(Number.isInteger)
  );

  if (requestedIds.size < 1) {
    return null;
  }

  const allTabs = await queryTabsWithMetadata({});
  const selectedTabs = allTabs.filter((tab) =>
    requestedIds.has(tab.id)
  );
  const entry = createUnassignedRemovalEntry(
    kind,
    selectedTabs,
    allTabs
  );

  if (!entry) {
    return null;
  }

  await appendUnassignedRemovalEntry(entry);
  let removalError = null;

  try {
    await chrome.tabs.remove(
      selectedTabs.map((tab) => tab.id)
    );
  } catch (error) {
    removalError = error;
  }

  let removedTabs = entry.tabs;

  try {
    const remainingTabs = await chrome.tabs.query({});
    const remainingIds = new Set(
      remainingTabs.map((tab) => tab.id)
    );
    removedTabs = entry.tabs.filter(
      (tab) => !remainingIds.has(tab.sourceTabId)
    );
  } catch (error) {
    console.warn(
      "[tab-out] Could not reconcile removed unassigned tabs:",
      error
    );
  }

  if (removedTabs.length < 1) {
    await removeUnassignedRemovalEntry(entry.id);

    if (removalError) {
      throw removalError;
    }

    return null;
  }

  if (removedTabs.length !== entry.tabs.length) {
    entry.tabs = removedTabs;
    await replaceUnassignedRemovalEntry(entry);
  }

  if (removalError) {
    console.warn(
      "[tab-out] Some unassigned tabs could not be closed:",
      removalError
    );
  }

  await fetchOpenTabs();
  return {
    entry,
    closedTabs: removedTabs,
    error: removalError
  };
}

function countTabsByNormalizedUrl(tabs) {
  const counts = new Map();

  (tabs || []).forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

    if (url) {
      counts.set(url, (counts.get(url) || 0) + 1);
    }
  });

  return counts;
}

async function restoreLatestUnassignedRemoval() {
  const history = await loadUnassignedRemovalHistory({
    required: true
  });
  const entry = history[history.length - 1];

  if (!entry) {
    return {
      restored: 0,
      failed: 0,
      alreadyPresent: 0,
      empty: true
    };
  }

  const currentTabs = await queryTabsWithMetadata({});
  const currentCounts = countTabsByNormalizedUrl(currentTabs);
  const targetCounts = new Map(
    entry.targetUrlCounts.map((item) => [
      normalizeOpenTabUrl(item.url),
      item.count
    ])
  );
  const descriptorsByUrl = new Map();

  entry.tabs.forEach((tab) => {
    const url = normalizeOpenTabUrl(tab.url);

    if (!descriptorsByUrl.has(url)) {
      descriptorsByUrl.set(url, []);
    }

    descriptorsByUrl.get(url).push(tab);
  });

  const tabsToRestore = [];
  let alreadyPresent = 0;

  descriptorsByUrl.forEach((descriptors, url) => {
    const targetCount = targetCounts.get(url) || descriptors.length;
    const currentCount = currentCounts.get(url) || 0;
    const missingCount = Math.max(
      0,
      Math.min(descriptors.length, targetCount - currentCount)
    );

    tabsToRestore.push(...descriptors.slice(0, missingCount));
    alreadyPresent += descriptors.length - missingCount;
  });

  tabsToRestore.sort((first, second) => {
    const firstWindow = first.windowId ?? Number.MAX_SAFE_INTEGER;
    const secondWindow = second.windowId ?? Number.MAX_SAFE_INTEGER;

    if (firstWindow !== secondWindow) {
      return firstWindow - secondWindow;
    }

    return (first.index ?? Number.MAX_SAFE_INTEGER) -
      (second.index ?? Number.MAX_SAFE_INTEGER);
  });

  const [windows, currentWindow] = await Promise.all([
    chrome.windows.getAll({ windowTypes: ["normal"] }),
    chrome.windows.getCurrent()
  ]);
  const availableWindowIds = new Set(
    windows.map((window) => window.id)
  );
  let restored = 0;
  let failed = 0;
  const failedTabs = [];

  for (const tab of tabsToRestore) {
    const hasOriginalWindow = availableWindowIds.has(tab.windowId);
    const createProperties = {
      url: tab.url,
      active: false,
      pinned: tab.pinned,
      windowId: hasOriginalWindow
        ? tab.windowId
        : currentWindow.id
    };

    if (hasOriginalWindow && Number.isInteger(tab.index)) {
      createProperties.index = tab.index;
    }

    try {
      await chrome.tabs.create(createProperties);
      restored += 1;
    } catch (error) {
      failed += 1;
      failedTabs.push(tab);
      console.warn(
        "[tab-out] Could not restore an unassigned tab:",
        tab.url,
        error
      );
    }
  }

  if (failed < 1) {
    await removeUnassignedRemovalEntry(entry.id);
  } else {
    entry.tabs = failedTabs;
    await replaceUnassignedRemovalEntry(entry);
  }

  await fetchOpenTabs();
  return {
    restored,
    failed,
    alreadyPresent,
    empty: false
  };
}

/**
 * fetchOpenTabs()
 *
 * Reads all currently open browser tabs directly from Chrome.
 * Sets the extensionId flag so we can identify Tab Out's own pages.
 */
async function fetchOpenTabs() {
  try {
    const extensionId = chrome.runtime.id;
    // The new URL for this page is now index.html (not newtab.html)
    const newtabUrl = `chrome-extension://${extensionId}/index.html`;

    const tabs = await queryTabsWithMetadata({});
    openTabs = tabs.map(t => {
      const tabUrl = t.pendingUrl || t.url || "";

      return {
        id:       t.id,
        url:      tabUrl,
        title:    t.title,
        windowId: t.windowId,
        groupId:  t.groupId,
        active:   t.active,
        favIconUrl: t.favIconUrl || "",
        // Flag Tab Out's own pages so we can detect duplicate new tabs
        isTabOut: tabUrl === newtabUrl || tabUrl === 'chrome://newtab/',
      };
    });
  } catch {
    // chrome.tabs API unavailable (shouldn't happen in an extension page)
    openTabs = [];
  }
}

/**
 * closeTabsByUrls(urls)
 *
 * Closes all open tabs whose hostname matches any of the given URLs.
 * After closing, re-fetches the tab list to keep our state accurate.
 *
 * Special case: file:// URLs are matched exactly (they have no hostname).
 */
async function closeTabsByUrls(urls) {
  if (!urls || urls.length === 0) return;

  // Separate file:// URLs (exact match) from regular URLs (hostname match)
  const targetHostnames = [];
  const exactUrls = new Set();

  for (const u of urls) {
    if (u.startsWith('file://')) {
      exactUrls.add(u);
    } else {
      try { targetHostnames.push(new URL(u).hostname); }
      catch { /* skip unparseable */ }
    }
  }

  const allTabs = await queryTabsWithMetadata({});
  const toClose = allTabs
    .filter(tab => {
      const tabUrl = tab.url || '';
      if (tabUrl.startsWith('file://') && exactUrls.has(tabUrl)) return true;
      try {
        const tabHostname = new URL(tabUrl).hostname;
        return tabHostname && targetHostnames.includes(tabHostname);
      } catch { return false; }
    })
    .map(tab => tab.id);

  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * closeTabsExact(urls)
 *
 * Closes tabs by exact URL match (not hostname). Used for landing pages
 * so closing "Gmail inbox" doesn't also close individual email threads.
 */
async function closeTabsExact(urls) {
  if (!urls || urls.length === 0) return;
  const urlSet = new Set(urls);
  const allTabs = await queryTabsWithMetadata({});
  const toClose = allTabs.filter(t => urlSet.has(t.url)).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * focusTab(url)
 *
 * Switches Chrome to the tab with the given URL (exact match first,
 * then hostname fallback). Also brings the window to the front.
 */
async function focusTab(url) {
  if (!url) return;
  const allTabs = await queryTabsWithMetadata({});
  const currentWindow = await chrome.windows.getCurrent();

  // Try exact URL match first
  let matches = allTabs.filter(t => t.url === url);

  // Fall back to hostname match
  if (matches.length === 0) {
    try {
      const targetHost = new URL(url).hostname;
      matches = allTabs.filter(t => {
        try { return new URL(t.url).hostname === targetHost; }
        catch { return false; }
      });
    } catch {}
  }

  if (matches.length === 0) return;

  // Prefer a match in a different window so it actually switches windows
  const match = matches.find(t => t.windowId !== currentWindow.id) || matches[0];
  await chrome.tabs.update(match.id, { active: true });
  await chrome.windows.update(match.windowId, { focused: true });
}

/**
 * closeDuplicateTabs(urls, keepOne)
 *
 * Closes duplicate tabs for the given list of URLs.
 * keepOne=true → keep one copy of each, close the rest.
 * keepOne=false → close all copies.
 */
async function closeDuplicateTabs(urls, keepOne = true) {
  const allTabs = await queryTabsWithMetadata({});
  const toClose = [];

  for (const url of urls) {
    const matching = allTabs.filter(t => t.url === url);
    if (keepOne) {
      const keep = matching.find(t => t.active) || matching[0];
      for (const tab of matching) {
        if (tab.id !== keep.id) toClose.push(tab.id);
      }
    } else {
      for (const tab of matching) toClose.push(tab.id);
    }
  }

  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}

/**
 * closeTabOutDupes()
 *
 * Closes all duplicate Tab Out new-tab pages except the current one.
 */
async function closeTabOutDupes() {
  const extensionId = chrome.runtime.id;
  const newtabUrl = `chrome-extension://${extensionId}/index.html`;

  const allTabs = await queryTabsWithMetadata({});
  const currentWindow = await chrome.windows.getCurrent();
  const tabOutTabs = allTabs.filter(t =>
    t.url === newtabUrl || t.url === 'chrome://newtab/'
  );

  if (tabOutTabs.length <= 1) return;

  // Keep the active Tab Out tab in the CURRENT window — that's the one the
  // user is looking at right now. Falls back to any active one, then the first.
  const keep =
    tabOutTabs.find(t => t.active && t.windowId === currentWindow.id) ||
    tabOutTabs.find(t => t.active) ||
    tabOutTabs[0];
  const toClose = tabOutTabs.filter(t => t.id !== keep.id).map(t => t.id);
  if (toClose.length > 0) await chrome.tabs.remove(toClose);
  await fetchOpenTabs();
}


/* ----------------------------------------------------------------
   SAVED FOR LATER — chrome.storage.local

   Replaces the old server-side SQLite + REST API with Chrome's
   built-in key-value storage. Data persists across browser sessions
   and doesn't require a running server.

   Data shape stored under the "deferred" key:
   [
     {
       id: "1712345678901",          // timestamp-based unique ID
       url: "https://example.com",
       title: "Example Page",
       savedAt: "2026-04-04T10:00:00.000Z",  // ISO date string
       completed: false,             // true = checked off (archived)
       dismissed: false              // true = dismissed without reading
     },
     ...
   ]
   ---------------------------------------------------------------- */

/**
 * saveTabForLater(tab)
 *
 * Saves a single tab to the "Saved for Later" list in chrome.storage.local.
 * @param {{ url: string, title: string }} tab
 */
async function saveTabForLater(tab) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  deferred.push({
    id:        Date.now().toString(),
    url:       tab.url,
    title:     tab.title,
    savedAt:   new Date().toISOString(),
    completed: false,
    dismissed: false,
  });
  await chrome.storage.local.set({ deferred });
}

/**
 * getSavedTabs()
 *
 * Returns all saved tabs from chrome.storage.local.
 * Filters out dismissed items (those are gone for good).
 * Splits into active (not completed) and archived (completed).
 */
async function getSavedTabs() {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const visible = deferred.filter(t => !t.dismissed);
  return {
    active:   visible.filter(t => !t.completed),
    archived: visible.filter(t => t.completed),
  };
}

/**
 * checkOffSavedTab(id)
 *
 * Marks a saved tab as completed (checked off). It moves to the archive.
 */
async function checkOffSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.completed = true;
    tab.completedAt = new Date().toISOString();
    await chrome.storage.local.set({ deferred });
  }
}

/**
 * dismissSavedTab(id)
 *
 * Marks a saved tab as dismissed (removed from all lists).
 */
async function dismissSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(t => t.id === id);
  if (tab) {
    tab.dismissed = true;
    await chrome.storage.local.set({ deferred });
  }
}

async function restoreArchivedSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const tab = deferred.find(item => item.id === id && item.completed && !item.dismissed);

  if (!tab) {
    return false;
  }

  tab.completed = false;
  delete tab.completedAt;
  await chrome.storage.local.set({ deferred });
  return true;
}

async function deleteArchivedSavedTab(id) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');
  const index = deferred.findIndex(
    item => item.id === id && item.completed && !item.dismissed
  );

  if (index === -1) {
    return null;
  }

  const [item] = deferred.splice(index, 1);
  await chrome.storage.local.set({ deferred });
  return { item, index };
}

async function reinsertArchivedSavedTab(item, index) {
  const { deferred = [] } = await chrome.storage.local.get('deferred');

  if (deferred.some(savedTab => savedTab.id === item.id)) {
    return false;
  }

  const insertionIndex = Math.max(0, Math.min(index, deferred.length));
  deferred.splice(insertionIndex, 0, item);
  await chrome.storage.local.set({ deferred });
  return true;
}


/* ----------------------------------------------------------------
   UI HELPERS
   ---------------------------------------------------------------- */

/**
 * playCloseSound()
 *
 * Plays a clean "swoosh" sound when tabs are closed.
 * Built entirely with the Web Audio API — no sound files needed.
 * A filtered noise sweep that descends in pitch, like air moving.
 */
function playCloseSound() {
    return;
  }
/**
 * shootConfetti(x, y)
 *
 * Shoots a burst of colorful confetti particles from the given screen
 * coordinates (typically the center of a card being closed).
 * Pure CSS + JS, no libraries.
 */
function shootConfetti(x, y) {
  const colors = [
    '#c8713a', // amber
    '#e8a070', // amber light
    '#5a7a62', // sage
    '#8aaa92', // sage light
    '#5a6b7a', // slate
    '#8a9baa', // slate light
    '#d4b896', // warm paper
    '#b35a5a', // rose
  ];

  const particleCount = 17;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');

    const isCircle = Math.random() > 0.5;
    const size = 5 + Math.random() * 6; // 5–11px
    const color = colors[Math.floor(Math.random() * colors.length)];

    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${isCircle ? '50%' : '2px'};
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      opacity: 1;
    `;
    document.body.appendChild(el);

    // Physics: random angle and speed for the outward burst
    const angle   = Math.random() * Math.PI * 2;
    const speed   = 60 + Math.random() * 120;
    const vx      = Math.cos(angle) * speed;
    const vy      = Math.sin(angle) * speed - 80; // bias upward
    const gravity = 200;

    const startTime = performance.now();
    const duration  = 700 + Math.random() * 200; // 700–900ms

    function frame(now) {
      const elapsed  = (now - startTime) / 1000;
      const progress = elapsed / (duration / 1000);

      if (progress >= 1) { el.remove(); return; }

      const px = vx * elapsed;
      const py = vy * elapsed + 0.5 * gravity * elapsed * elapsed;
      const opacity = progress < 0.5 ? 1 : 1 - (progress - 0.5) * 2;
      const rotate  = elapsed * 200 * (isCircle ? 0 : 1);

      el.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rotate}deg)`;
      el.style.opacity = opacity;

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }
}

/**
 * animateCardOut(card)
 *
 * Smoothly removes a mission card: fade + scale down, then confetti.
 * After the animation, checks if the grid is now empty.
 */
function animateCardOut(card) {
  if (!card) return;

  const rect = card.getBoundingClientRect();
  shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

  card.classList.add('closing');
  setTimeout(() => {
    card.remove();
    checkAndShowEmptyState();
  }, 300);
}

let toastTimeoutId = null;
let toastSequence = 0;

function hideToast(sequence) {
  if (sequence !== undefined && sequence !== toastSequence) {
    return;
  }

  const toast = document.getElementById('toast');
  const actionButton = document.getElementById('toastAction');
  const cancelButton = document.getElementById('toastCancelAction');

  if (!toast) {
    return;
  }

  toast.classList.remove('visible', 'has-action');

  if (actionButton) {
    actionButton.hidden = true;
    actionButton.disabled = false;
    actionButton.onclick = null;
  }

  if (cancelButton) {
    cancelButton.hidden = true;
    cancelButton.disabled = false;
    cancelButton.onclick = null;
  }
}

/**
 * showToast(message, options)
 *
 * Brief pop-up notification at the bottom of the screen.
 */
function showToast(message, options = {}) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toastText');
  const actionButton = document.getElementById('toastAction');
  const cancelButton = document.getElementById('toastCancelAction');

  if (!toast || !text) {
    return;
  }

  const {
    actionLabel = "",
    onAction = null,
    cancelLabel = "",
    onCancel = null,
    duration = 2500
  } = options;
  const sequence = ++toastSequence;
  const hasAction = Boolean(actionButton && actionLabel && typeof onAction === "function");
  const hasCancel = Boolean(
    cancelButton &&
    cancelLabel &&
    typeof onCancel === "function"
  );

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
  }

  text.textContent = message;
  toast.classList.toggle('has-action', hasAction);

  if (actionButton) {
    actionButton.hidden = !hasAction;
    actionButton.disabled = false;
    actionButton.onclick = null;

    if (hasAction) {
      actionButton.textContent = actionLabel;
      actionButton.onclick = async () => {
        if (sequence !== toastSequence) {
          return;
        }

        actionButton.disabled = true;

        try {
          await onAction();
        } catch (error) {
          console.warn('[tab-out] Toast action failed:', error);
        } finally {
          if (sequence === toastSequence) {
            hideToast(sequence);
          }
        }
      };
    }
  }

  if (cancelButton) {
    cancelButton.hidden = !hasCancel;
    cancelButton.disabled = false;
    cancelButton.onclick = null;

    if (hasCancel) {
      cancelButton.textContent = cancelLabel;
      cancelButton.onclick = async () => {
        if (sequence !== toastSequence) {
          return;
        }

        cancelButton.disabled = true;

        try {
          await onCancel();
        } catch (error) {
          console.warn('[tab-out] Toast cancel action failed:', error);
        } finally {
          if (sequence === toastSequence) {
            hideToast(sequence);
          }
        }
      };
    }
  }

  toast.classList.add('visible');
  toastTimeoutId = duration > 0
    ? setTimeout(() => hideToast(sequence), duration)
    : null;
}

document.addEventListener("keydown", (event) => {
  const toast = document.getElementById("toast");
  const cancelButton = document.getElementById("toastCancelAction");

  if (
    event.key === "Escape" &&
    toast?.classList.contains("visible") &&
    cancelButton &&
    !cancelButton.hidden
  ) {
    event.preventDefault();
    cancelButton.click();
  }
});

function copyTextWithExecCommand(text) {
  const previousFocus = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
    previousFocus?.focus?.({ preventScroll: true });
  }
}

async function copyTextToClipboard(value) {
  const text = String(value || "");

  if (!text) {
    return false;
  }

  let clipboardRequest = null;

  if (navigator.clipboard?.writeText) {
    try {
      clipboardRequest = navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => false);
    } catch {}
  }

  const fallbackCopied = copyTextWithExecCommand(text);
  return clipboardRequest
    ? (await clipboardRequest) || fallbackCopied
    : fallbackCopied;
}

function isDashboardBehaviorEnabled(behaviorKey) {
  return globalThis.TabOutDashboardRuntime
    ?.getEffectiveSettings()
    ?.behavior
    ?.[behaviorKey] !== false;
}

function isTabLinkRightClickCopyEnabled() {
  return isDashboardBehaviorEnabled("copyTabLinksOnRightClick");
}

document.addEventListener("contextmenu", async (event) => {
  if (!isTabLinkRightClickCopyEnabled()) {
    return;
  }

  const tabElement = event.target.closest?.("[data-tab-url]");
  const tabUrl = tabElement?.dataset.tabUrl || "";

  if (!tabUrl) {
    return;
  }

  event.preventDefault();
  const copied = await copyTextToClipboard(tabUrl);
  showToast(t(copied ? "tabLinkCopied" : "tabLinkCopyFailed"));
});

/**
 * checkAndShowEmptyState()
 *
 * Shows a cheerful "Inbox zero" message when all domain cards are gone.
 */
function checkAndShowEmptyState() {
  const missionsEl = document.getElementById('openTabsMissions');
  if (!missionsEl) return;

  const remaining = missionsEl.querySelectorAll('.mission-card:not(.closing)').length;
  if (remaining > 0) return;

  missionsEl.innerHTML = `
    <div class="missions-empty-state">
      <div class="empty-checkmark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div class="empty-title">${t("allTabsAssignedTitle")}</div>
      <div class="empty-subtitle">${t("allTabsAssignedSubtitle")}</div>
    </div>
  `;

  const countEl = document.getElementById('openTabsSectionCount');
  const countLabel = document.getElementById("openTabsFilteredCount");

  if (countLabel) {
    countLabel.textContent = `0 ${t("domains")}`;
  } else if (countEl) {
    countEl.innerHTML = renderOpenTabsSearchControls(0);
  }

  const closeAllButton = countEl?.querySelector(
    '[data-action="close-all-open-tabs"]'
  );

  if (closeAllButton) {
    closeAllButton.disabled = true;
  }

  updateUnassignedRemovalUndoControl();
}

/**
 * timeAgo(dateStr)
 *
 * Converts an ISO date string into a human-friendly relative time.
 * "2026-04-04T10:00:00Z" → "2 hrs ago" or "yesterday"
 */
function timeAgo(dateStr) {
  if (!dateStr) return "";

  const then = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now - then) / 60000);
  const diffHours = Math.floor((now - then) / 3600000);
  const diffDays = Math.floor((now - then) / 86400000);

  if (diffMins < 1) return t("justNow");
  if (diffMins < 60) return t("minAgo", { count: diffMins });
  if (diffHours < 24) return t("hourAgo", { count: diffHours });
  if (diffDays === 1) return t("yesterday");

  return t("daysAgo", { count: diffDays });
}

/**
 * getGreeting() — "Good morning / afternoon / evening"
 */
function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return t("greetingMorning");
  }

  if (hour < 18) {
    return t("greetingAfternoon");
  }

  return t("greetingEvening");
}

/**
 * getDateDisplay() — "Friday, April 4, 2026"
 */
function getDateDisplay() {
  const date = new Date().toLocaleDateString(activeLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedDate = date.charAt(0).toUpperCase() + date.slice(1);

  return `${t("datePrefix")} ${formattedDate}`;
}


function updateTimeDisplay() {
  if (
    globalThis.TabOutDashboardRuntime &&
    !globalThis.TabOutDashboardRuntime.isModuleVisible("time")
  ) {
    return;
  }

  const timeEl = document.getElementById("timeDisplay");

  if (!timeEl) {
    return;
  }

  const time = new Date().toLocaleTimeString(activeLocale(), {
    hour: "2-digit",
    minute: "2-digit"
  });

  timeEl.textContent = `${t("timePrefix")} ${time}`;
}

let dashboardTimeInterval = null;

function syncDashboardClockVisibility() {
  const visible =
    !globalThis.TabOutDashboardRuntime ||
    globalThis.TabOutDashboardRuntime.isModuleVisible("time");

  if (!visible && dashboardTimeInterval) {
    clearInterval(dashboardTimeInterval);
    dashboardTimeInterval = null;
    return;
  }

  if (visible && !dashboardTimeInterval) {
    updateTimeDisplay();
    dashboardTimeInterval = setInterval(updateTimeDisplay, 1000);
  }
}

/* ----------------------------------------------------------------
   DOMAIN & TITLE CLEANUP HELPERS
   ---------------------------------------------------------------- */

// Map of known hostnames → friendly display names.
const FRIENDLY_DOMAINS = {
  'github.com':           'GitHub',
  'www.github.com':       'GitHub',
  'gist.github.com':      'GitHub Gist',
  'youtube.com':          'YouTube',
  'www.youtube.com':      'YouTube',
  'music.youtube.com':    'YouTube Music',
  'x.com':                'X',
  'www.x.com':            'X',
  'twitter.com':          'X',
  'www.twitter.com':      'X',
  'reddit.com':           'Reddit',
  'www.reddit.com':       'Reddit',
  'old.reddit.com':       'Reddit',
  'substack.com':         'Substack',
  'www.substack.com':     'Substack',
  'medium.com':           'Medium',
  'www.medium.com':       'Medium',
  'linkedin.com':         'LinkedIn',
  'www.linkedin.com':     'LinkedIn',
  'stackoverflow.com':    'Stack Overflow',
  'www.stackoverflow.com':'Stack Overflow',
  'news.ycombinator.com': 'Hacker News',
  'google.com':           'Google',
  'www.google.com':       'Google',
  'mail.google.com':      'Gmail',
  'docs.google.com':      'Google Docs',
  'drive.google.com':     'Google Drive',
  'calendar.google.com':  'Google Calendar',
  'meet.google.com':      'Google Meet',
  'gemini.google.com':    'Gemini',
  'chatgpt.com':          'ChatGPT',
  'www.chatgpt.com':      'ChatGPT',
  'chat.openai.com':      'ChatGPT',
  'claude.ai':            'Claude',
  'www.claude.ai':        'Claude',
  'code.claude.com':      'Claude Code',
  'notion.so':            'Notion',
  'www.notion.so':        'Notion',
  'figma.com':            'Figma',
  'www.figma.com':        'Figma',
  'slack.com':            'Slack',
  'app.slack.com':        'Slack',
  'discord.com':          'Discord',
  'www.discord.com':      'Discord',
  'wikipedia.org':        'Wikipedia',
  'en.wikipedia.org':     'Wikipedia',
  'amazon.com':           'Amazon',
  'www.amazon.com':       'Amazon',
  'netflix.com':          'Netflix',
  'www.netflix.com':      'Netflix',
  'spotify.com':          'Spotify',
  'open.spotify.com':     'Spotify',
  'vercel.com':           'Vercel',
  'www.vercel.com':       'Vercel',
  'npmjs.com':            'npm',
  'www.npmjs.com':        'npm',
  'developer.mozilla.org':'MDN',
  'arxiv.org':            'arXiv',
  'www.arxiv.org':        'arXiv',
  'huggingface.co':       'Hugging Face',
  'www.huggingface.co':   'Hugging Face',
  'producthunt.com':      'Product Hunt',
  'www.producthunt.com':  'Product Hunt',
  'xiaohongshu.com':      'RedNote',
  'www.xiaohongshu.com':  'RedNote',
  'local-files':          'Local Files',
};

function friendlyDomain(hostname) {
  if (!hostname) return '';
  if (FRIENDLY_DOMAINS[hostname]) return FRIENDLY_DOMAINS[hostname];

  if (hostname.endsWith('.substack.com') && hostname !== 'substack.com') {
    return capitalize(hostname.replace('.substack.com', '')) + "'s Substack";
  }
  if (hostname.endsWith('.github.io')) {
    return capitalize(hostname.replace('.github.io', '')) + ' (GitHub Pages)';
  }

  let clean = hostname
    .replace(/^www\./, '')
    .replace(/\.(com|org|net|io|co|ai|dev|app|so|me|xyz|info|us|uk|co\.uk|co\.jp)$/, '');

  return clean.split('.').map(part => capitalize(part)).join(' ');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripTitleNoise(title) {
  if (!title) return '';
  // Strip leading notification count: "(2) Title"
  title = title.replace(/^\(\d+\+?\)\s*/, '');
  // Strip inline counts like "Inbox (16,359)"
  title = title.replace(/\s*\([\d,]+\+?\)\s*/g, ' ');
  // Strip email addresses (privacy + cleaner display)
  title = title.replace(/\s*[\-\u2010-\u2015]\s*[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  title = title.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '');
  // Clean X/Twitter format
  title = title.replace(/\s+on X:\s*/, ': ');
  title = title.replace(/\s*\/\s*X\s*$/, '');
  return title.trim();
}

function cleanTitle(title, hostname) {
  if (!title || !hostname) return title || '';

  const friendly = friendlyDomain(hostname);
  const domain   = hostname.replace(/^www\./, '');
  const seps     = [' - ', ' | ', ' — ', ' · ', ' – '];

  for (const sep of seps) {
    const idx = title.lastIndexOf(sep);
    if (idx === -1) continue;
    const suffix     = title.slice(idx + sep.length).trim();
    const suffixLow  = suffix.toLowerCase();
    if (
      suffixLow === domain.toLowerCase() ||
      suffixLow === friendly.toLowerCase() ||
      suffixLow === domain.replace(/\.\w+$/, '').toLowerCase() ||
      domain.toLowerCase().includes(suffixLow) ||
      friendly.toLowerCase().includes(suffixLow)
    ) {
      const cleaned = title.slice(0, idx).trim();
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return title;
}

function smartTitle(title, url) {
  if (!url) return title || '';
  let pathname = '', hostname = '';
  try { const u = new URL(url); pathname = u.pathname; hostname = u.hostname; }
  catch { return title || ''; }

  const titleIsUrl = !title || title === url || title.startsWith(hostname) || title.startsWith('http');

  if ((hostname === 'x.com' || hostname === 'twitter.com' || hostname === 'www.x.com') && pathname.includes('/status/')) {
    const username = pathname.split('/')[1];
    if (username) return titleIsUrl ? `Post by @${username}` : title;
  }

  if (hostname === 'github.com' || hostname === 'www.github.com') {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo, ...rest] = parts;
      if (rest[0] === 'issues' && rest[1]) return `${owner}/${repo} Issue #${rest[1]}`;
      if (rest[0] === 'pull'   && rest[1]) return `${owner}/${repo} PR #${rest[1]}`;
      if (rest[0] === 'blob' || rest[0] === 'tree') return `${owner}/${repo} — ${rest.slice(2).join('/')}`;
      if (titleIsUrl) return `${owner}/${repo}`;
    }
  }

  if ((hostname === 'www.youtube.com' || hostname === 'youtube.com') && pathname === '/watch') {
    if (titleIsUrl) return 'YouTube Video';
  }

  if ((hostname === 'www.reddit.com' || hostname === 'reddit.com' || hostname === 'old.reddit.com') && pathname.includes('/comments/')) {
    const parts  = pathname.split('/').filter(Boolean);
    const subIdx = parts.indexOf('r');
    if (subIdx !== -1 && parts[subIdx + 1]) {
      if (titleIsUrl) return `r/${parts[subIdx + 1]} post`;
    }
  }

  return title || url;
}


/* ----------------------------------------------------------------
   SVG ICON STRINGS
   ---------------------------------------------------------------- */
const ICONS = {
  tabs:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8.25V18a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 18V8.25m-18 0V6a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 6v2.25m-18 0h18" /></svg>`,
  close:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>`,
  undo:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 14 4 9m0 0 5-5M4 9h10a6 6 0 0 1 0 12h-1" /></svg>`,
  archive: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>`,
  focus:   `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>`,
};


/* ----------------------------------------------------------------
   IN-MEMORY STORE FOR OPEN-TAB GROUPS
   ---------------------------------------------------------------- */
let domainGroups = [];
let openTabsFilterQuery = "";
let openTabsSearchVisible = false;


/* ----------------------------------------------------------------
   HELPER: filter out browser-internal pages
   ---------------------------------------------------------------- */

/**
 * getRealTabs()
 *
 * Returns tabs that are real web pages — no chrome://, extension
 * pages, about:blank, etc.
 */
function getRealTabs() {
  return openTabs.filter(t => {
    const url = t.url || '';
    return (
      !url.startsWith('chrome://') &&
      !url.startsWith('chrome-extension://') &&
      !url.startsWith('about:') &&
      !url.startsWith('edge://') &&
      !url.startsWith('brave://')
    );
  });
}

/**
 * checkTabOutDupes()
 *
 * Counts how many Tab Out pages are open. If more than 1,
 * shows a banner offering to close the extras.
 */
function checkTabOutDupes() {
  const tabOutTabs = openTabs.filter(t => t.isTabOut);
  const banner  = document.getElementById('tabOutDupeBanner');
  const countEl = document.getElementById('tabOutDupeCount');
  if (!banner) return;

  if (tabOutTabs.length > 1) {
    if (countEl) countEl.textContent = tabOutTabs.length;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}


/* ----------------------------------------------------------------
   OVERFLOW CHIPS ("+N more" expand button in domain cards)
   ---------------------------------------------------------------- */

function buildOverflowChips(hiddenTabs, urlCounts = {}) {
  const hiddenChips = hiddenTabs.map(tab => {
    const label    = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), '');
    const count    = urlCounts[tab.url] || 1;
    const dupeTag  = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl   = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');
    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}
    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" draggable="false" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="${t("saveForLater")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="${t("closeThisTab")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="page-chips-overflow" style="display:none">${hiddenChips}</div>
    <div class="page-chip page-chip-overflow clickable" data-action="expand-chips">
      <span class="chip-text">+${hiddenTabs.length} more</span>
    </div>`;
}


/* ----------------------------------------------------------------
   OPEN TABS FILTER
   ---------------------------------------------------------------- */

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeFilterText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDomainGroupSearchText(group) {
  const parts = [
    group.domain,
    group.label,
    friendlyDomain(group.domain)
  ];

  for (const tab of group.tabs || []) {
    parts.push(tab.title, tab.url);
    try {
      const parsed = new URL(tab.url);
      parts.push(parsed.hostname, parsed.pathname, friendlyDomain(parsed.hostname));
    } catch {}
  }

  return normalizeFilterText(parts.filter(Boolean).join(" "));
}

function getFilteredDomainGroups(groups = domainGroups) {
  const query = normalizeFilterText(openTabsFilterQuery);
  if (!query) return groups;

  const terms = query.split(/\s+/).filter(Boolean);
  return groups.filter((group) => {
    const haystack = getDomainGroupSearchText(group);
    return terms.every((term) => haystack.includes(term));
  });
}

function getOpenTabsCountLabel(filteredGroups, allGroups) {
  const filteredCount = filteredGroups.length;
  const totalCount = allGroups.length;
  const domainLabel = filteredCount === 1 ? t("domain") : t("domains");

  if (normalizeFilterText(openTabsFilterQuery)) {
    return `${filteredCount}/${totalCount} ${domainLabel}`;
  }

  return `${totalCount} ${totalCount === 1 ? t("domain") : t("domains")}`;
}

function renderOpenTabsSearchControls(unassignedTabCount) {
  const searchValue = escapeAttr(openTabsFilterQuery);
  const activeClass = openTabsSearchVisible ? " is-visible" : "";
  const undoCount = unassignedRemovalHistory.length;
  const undoDisabled = unassignedRemovalUndoBusy || undoCount < 1;
  const undoTitle = undoCount > 0
    ? t("unassignedUndoRemovalTitle", { count: undoCount })
    : t("unassignedUndoRemovalEmpty");

  return `
    <span id="openTabsFilteredCount" class="open-tabs-count-label"></span>
    <button class="open-tabs-undo-btn" data-action="undo-unassigned-removal" title="${escapeAttr(undoTitle)}" aria-label="${escapeAttr(undoTitle)}" ${undoDisabled ? "disabled" : ""}>
      ${ICONS.undo}
      <span class="open-tabs-undo-label">${t("unassignedUndoRemoval")}</span>
      <span class="open-tabs-undo-count"${undoCount > 1 ? "" : " hidden"}>${undoCount}</span>
    </button>
    <button class="open-tabs-search-btn" data-action="toggle-open-tabs-search" title="${escapeAttr(t("searchTabs"))}" aria-label="${escapeAttr(t("searchTabs"))}" aria-expanded="${openTabsSearchVisible ? "true" : "false"}">
      <svg class="open-tabs-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
      </svg>
    </button>
    <span class="open-tabs-search-wrap${activeClass}" id="openTabsSearchWrap">
      <input type="text" id="openTabsFilterInput" class="open-tabs-search-input" value="${searchValue}" placeholder="${escapeAttr(t("filterTabs"))}" autocomplete="off" spellcheck="false">
      <button type="button" class="open-tabs-search-clear" data-action="clear-open-tabs-search" title="${escapeAttr(t("closeTabSearch"))}" aria-label="${escapeAttr(t("closeTabSearch"))}">×</button>
    </span>
    <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;" ${unassignedTabCount === 0 ? "disabled" : ""}>${ICONS.close} ${t("closeAllTabs", { count: unassignedTabCount })}</button>
  `;
}

function updateOpenTabsFilterUI(filteredGroups = getFilteredDomainGroups(), allGroups = domainGroups) {
  const countLabel = document.getElementById("openTabsFilteredCount");
  if (countLabel) {
    countLabel.textContent = getOpenTabsCountLabel(filteredGroups, allGroups);
  }

  const clearButton = document.querySelector(".open-tabs-search-clear");
  if (clearButton) {
    clearButton.hidden = !openTabsSearchVisible;
  }
}

function renderFilteredOpenTabs() {
  const openTabsMissionsEl = document.getElementById("openTabsMissions");
  if (!openTabsMissionsEl) return;

  const filteredGroups = getFilteredDomainGroups(domainGroups);

  if (filteredGroups.length > 0) {
    openTabsMissionsEl.innerHTML = filteredGroups.map(g => renderDomainCard(g)).join("");
  } else {
    const hasQuery = Boolean(normalizeFilterText(openTabsFilterQuery));
    openTabsMissionsEl.innerHTML = `
      <div class="missions-empty-state open-tabs-filter-empty">
        <div class="empty-title">${t(hasQuery ? "noResults" : "allTabsAssignedTitle")}</div>
        <div class="empty-subtitle">${t(hasQuery ? "noMatchingTabs" : "allTabsAssignedSubtitle")}</div>
      </div>
    `;
  }

  updateOpenTabsFilterUI(filteredGroups, domainGroups);
}


/* ----------------------------------------------------------------
   DOMAIN CARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderDomainCard(group, groupIndex)
 *
 * Builds the HTML for one domain group card.
 * group = { domain: string, tabs: [{ url, title, id, windowId, active }] }
 */
function renderDomainCard(group) {
  const tabs      = group.tabs || [];
  const tabCount  = tabs.length;
  const isLanding = group.domain === '__landing-pages__';
  const stableId  = 'domain-' + group.domain.replace(/[^a-z0-9]/g, '-');

  // Count duplicates (exact URL match)
  const urlCounts = {};
  for (const tab of tabs) urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1;
  const dupeUrls   = Object.entries(urlCounts).filter(([, c]) => c > 1);
  const hasDupes   = dupeUrls.length > 0;
  const totalExtras = dupeUrls.reduce((s, [, c]) => s + c - 1, 0);

  const tabBadge = `<span class="open-tabs-badge">
    ${ICONS.tabs}
    ${tabCount} ${tabCount === 1 ? t("tab") : t("tabs")} ${t("open")}
  </span>`;

  const dupeBadge = hasDupes
    ? `<span class="open-tabs-badge" style="color:var(--accent-amber);background:rgba(200,113,58,0.08);">
        ${totalExtras} ${totalExtras === 1 ? t("duplicate") : t("duplicates")}
      </span>`
    : '';

  // Deduplicate for display: show each URL once, with (Nx) badge if duped
  const seen = new Set();
  const uniqueTabs = [];
  for (const tab of tabs) {
    if (!seen.has(tab.url)) { seen.add(tab.url); uniqueTabs.push(tab); }
  }

  const visibleTabSetting =
    document.documentElement.dataset.unassignedVisibleTabCount;
  const visibleTabLimit =
    visibleTabSetting === "all"
      ? uniqueTabs.length
      : visibleTabSetting === "4"
        ? 4
        : 2;
  const visibleTabs = uniqueTabs.slice(0, visibleTabLimit);
  const hiddenTabs = uniqueTabs.slice(visibleTabLimit);

  const pageChips = visibleTabs.map(tab => {
    let label = cleanTitle(smartTitle(stripTitleNoise(tab.title || ''), tab.url), group.domain);

    try {
      const parsed = new URL(tab.url);
      if (parsed.hostname === 'localhost' && parsed.port) label = `${parsed.port} ${label}`;
    } catch {}

    const count    = urlCounts[tab.url];
    const dupeTag  = count > 1 ? ` <span class="chip-dupe-badge">(${count}x)</span>` : '';
    const chipClass = count > 1 ? ' chip-has-dupes' : '';
    const safeUrl   = (tab.url || '').replace(/"/g, '&quot;');
    const safeTitle = label.replace(/"/g, '&quot;');

    let domain = '';
    try { domain = new URL(tab.url).hostname; } catch {}

    const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : '';

    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" draggable="false" onerror="this.style.display='none'">` : ''}
      <span class="chip-text">${label}</span>${dupeTag}
      <div class="chip-actions">
        <button class="chip-action chip-save" data-action="defer-single-tab" data-tab-url="${safeUrl}" data-tab-title="${safeTitle}" title="${t("saveForLater")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
        </button>
        <button class="chip-action chip-close" data-action="close-single-tab" data-tab-url="${safeUrl}" title="${t("closeThisTab")}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  const closeAllHtml = `
    <button class="action-btn close-tabs domain-close-all" data-action="close-domain-tabs" data-domain-id="${stableId}">
      ${ICONS.close}
      ${t("closeAllDomainTabs", { count: tabCount })}
    </button>`;
  let actionsHtml = "";

  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    actionsHtml = `
      <button class="action-btn" data-action="dedup-keep-one" data-dupe-urls="${dupeUrlsEncoded}">
        ${totalExtras === 1 ? t("closeDuplicate", { count: totalExtras }) : t("closeDuplicates", { count: totalExtras })}
      </button>`;
  }

  return `
    <div class="mission-card domain-card ${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="status-bar"></div>
      <div class="mission-content">
        ${closeAllHtml}
        <div class="mission-top">
          <span class="mission-name">${isLanding ? t("homepages") : (group.label || friendlyDomain(group.domain))}</span>
          ${tabBadge}
          ${dupeBadge}
        </div>
        <div class="mission-pages">${pageChips}</div>
        ${renderTabDropdown(hiddenTabs, `${stableId}-dropdown`)}
        ${actionsHtml ? `<div class="actions">${actionsHtml}</div>` : ""}
      </div>
      <div class="mission-meta">
        <div class="mission-page-count">${tabCount}</div>
        <div class="mission-page-label">${tabCount === 1 ? t("tab") : t("tabs")}</div>
      </div>
    </div>`;
}

function renderTabDropdown(tabs, groupId) {
  if (!tabs || tabs.length === 0) {
    return "";
  }

  const items = tabs.map((tab) => {
    const safeUrl = (tab.url || "").replace(/"/g, "&quot;");
    const rawTitle = cleanTitle(
      smartTitle(stripTitleNoise(tab.title || ""), tab.url),
      ""
    );

    const safeTitle = rawTitle.replace(/"/g, "&quot;");

    let domain = "";
    try {
      domain = new URL(tab.url).hostname;
    } catch {}

    const faviconUrl = domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16`
      : "";

    return `
      <button class="tab-dropdown-item" data-action="focus-tab" data-open-tab-draggable="true" data-tab-id="${tab.id}" data-tab-url="${safeUrl}" draggable="false" title="${safeTitle}">
        ${faviconUrl ? `<img src="${faviconUrl}" alt="" draggable="false">` : ""}
        <span>${rawTitle}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="tab-dropdown">
      <button class="tab-dropdown-toggle" data-action="toggle-tab-dropdown" data-dropdown-id="${groupId}">
        ${t("showMoreTabs", { count: tabs.length })}
      </button>

      <div class="tab-dropdown-list" id="${groupId}" hidden>
        ${items}
      </div>
    </div>
  `;
}


/* ----------------------------------------------------------------
   SAVED FOR LATER — Render Checklist Column
   ---------------------------------------------------------------- */

/**
 * renderDeferredColumn()
 *
 * Reads saved tabs from chrome.storage.local and renders the right-side
 * "Saved for Later" checklist column. Shows active items as a checklist
 * and completed items in a collapsible archive.
 */
async function renderDeferredColumn() {
  const column         = document.getElementById('deferredColumn');
  const list           = document.getElementById('deferredList');
  const empty          = document.getElementById('deferredEmpty');
  const countEl        = document.getElementById('deferredCount');
  const archiveEl      = document.getElementById('deferredArchive');
  const archiveCountEl = document.getElementById('archiveCount');
  const archiveList    = document.getElementById('archiveList');
  const moduleWrapper  = column?.closest('[data-dashboard-module="savedLater"]');

  if (!column) return;

  try {
    const { active, archived } = await getSavedTabs();

    // Hide the entire column if there's nothing to show
    if (active.length === 0 && archived.length === 0) {
      column.style.display = 'none';
      moduleWrapper?.classList.add("is-data-empty");
      return;
    }

    moduleWrapper?.classList.remove("is-data-empty");
    column.style.display = 'block';

    // Render active checklist items
    if (active.length > 0) {
      countEl.textContent = plural(active.length, "itemCount", "itemsCount");
      list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
      list.style.display = '';
      empty.style.display = 'none';
    } else {
      list.style.display = 'none';
      countEl.textContent = '';
      empty.style.display = 'block';
    }

    // Render archive section
    if (archived.length > 0) {
      archiveCountEl.textContent = `(${archived.length})`;
      renderArchiveItems(archived);
      archiveEl.style.display = 'block';
    } else {
      archiveCountEl.textContent = '';
      archiveList.innerHTML = '';
      archiveEl.style.display = 'none';
    }

  } catch (err) {
    console.warn('[tab-out] Could not load saved tabs:', err);
    column.style.display = 'none';
    moduleWrapper?.classList.add("is-data-empty");
  }
}

/**
 * renderDeferredItem(item)
 *
 * Builds HTML for one active checklist item: checkbox, title link,
 * domain, time ago, dismiss button.
 */
function renderDeferredItem(item) {
  let domain = '';
  try { domain = new URL(item.url).hostname.replace(/^www\./, ''); } catch {}
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
  const ago = timeAgo(item.savedAt);

  return `
    <div class="deferred-item" data-deferred-id="${item.id}">
      <input type="checkbox" class="deferred-checkbox" data-action="check-deferred" data-deferred-id="${item.id}">
      <div class="deferred-info">
        <a href="${item.url}" target="_blank" rel="noopener" class="deferred-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
          <img src="${faviconUrl}" alt="" style="width:14px;height:14px;vertical-align:-2px;margin-right:4px" onerror="this.style.display='none'">${item.title || item.url}
        </a>
        <div class="deferred-meta">
          <span>${domain}</span>
          <span>${ago}</span>
        </div>
      </div>
      <button class="deferred-dismiss" data-action="dismiss-deferred" data-deferred-id="${item.id}" title="${t("dismiss")}">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      </button>
    </div>`;
}

/**
 * renderArchiveItem(item)
 *
 * Builds HTML for one completed/archived item (simpler: just title + date).
 */
function renderArchiveItem(item) {
  const ago = item.completedAt ? timeAgo(item.completedAt) : timeAgo(item.savedAt);
  const safeId = escapeAttr(item.id);
  const safeUrl = escapeAttr(item.url);
  const safeTitle = escapeAttr(item.title || item.url);
  return `
    <div class="archive-item" data-deferred-id="${safeId}">
      <a href="${safeUrl}" target="_blank" rel="noopener" class="archive-item-title" title="${safeTitle}">
        ${safeTitle}
      </a>
      <span class="archive-item-date">${ago}</span>
      <div class="archive-item-actions">
        <button type="button" class="archive-item-action archive-item-restore" data-action="restore-archived-tab" data-deferred-id="${safeId}" title="${escapeAttr(t("restoreArchivedTab"))}" aria-label="${escapeAttr(t("restoreArchivedTab"))}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83L3.75 8.59m0-4.84v4.84h4.84" />
          </svg>
        </button>
        <button type="button" class="archive-item-action archive-item-delete" data-action="delete-archived-tab" data-deferred-id="${safeId}" title="${escapeAttr(t("deleteArchivedTab"))}" aria-label="${escapeAttr(t("deleteArchivedTab"))}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 7.5h15m-10.5 0V4.75h6V7.5m-8.25 0 .75 12h9l.75-12M10 11v5m4-5v5" />
          </svg>
        </button>
      </div>
    </div>`;
}

function filterArchivedTabs(archived, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (normalizedQuery.length < 2) {
    return archived;
  }

  return archived.filter(item =>
    (item.title || '').toLowerCase().includes(normalizedQuery) ||
    (item.url || '').toLowerCase().includes(normalizedQuery)
  );
}

function renderArchiveItems(archived) {
  const archiveList = document.getElementById('archiveList');
  const query = document.getElementById('archiveSearch')?.value || "";

  if (!archiveList) {
    return;
  }

  const visibleItems = filterArchivedTabs(archived, query);
  archiveList.innerHTML = visibleItems.map(item => renderArchiveItem(item)).join('')
    || `<div class="archive-search-empty">${escapeAttr(t("noResults"))}</div>`;
}


/* ----------------------------------------------------------------
   MAIN DASHBOARD RENDERER
   ---------------------------------------------------------------- */

/**
 * renderStaticDashboard()
 *
 * The main render function:
 * 1. Paints greeting + date
 * 2. Fetches open tabs via chrome.tabs.query()
 * 3. Groups tabs by domain (with landing pages pulled out to their own group)
 * 4. Renders domain cards
 * 5. Updates footer stats
 * 6. Renders the "Saved for Later" checklist
 */
async function renderStaticDashboard() {
  // --- Header ---
  const greetingEl = document.getElementById('greeting');
  const dateEl     = document.getElementById('dateDisplay');
  if (greetingEl) greetingEl.textContent = getGreeting();
  if (dateEl)     dateEl.textContent     = getDateDisplay();
  syncDashboardClockVisibility();

  // --- Fetch tabs ---
  await fetchOpenTabs();
  await loadUnassignedRemovalHistory();
  const realTabs = getRealTabs();
  let sessions = [];

  try {
    sessions = await getSavedSessions();
  } catch (error) {
    console.warn("[tab-out] could not load sessions for tab assignment:", error);
  }

  const assignedUrls = getAssignedSessionUrlSet(sessions);
  const assignedGroupIds = getAssignedSessionGroupIdSet(sessions);
  (provisionalSessionState?.tabs || []).forEach((tab) => {
    const normalizedUrl = normalizeOpenTabUrl(tab.url);

    if (normalizedUrl) {
      assignedUrls.add(normalizedUrl);
    }
  });
  unassignedOpenTabs = realTabs.filter(
    (tab) =>
      !assignedUrls.has(normalizeOpenTabUrl(tab.url)) &&
      !assignedGroupIds.has(tab.groupId)
  );

  // --- Group tabs by domain ---
  // Landing pages (Gmail inbox, Twitter home, etc.) get their own special group
  // so they can be closed together without affecting content tabs on the same domain.
  const LANDING_PAGE_PATTERNS = [
    { hostname: 'mail.google.com', test: (p, h) =>
        !h.includes('#inbox/') && !h.includes('#sent/') && !h.includes('#search/') },
    { hostname: 'x.com',               pathExact: ['/home'] },
    { hostname: 'www.linkedin.com',    pathExact: ['/'] },
    { hostname: 'github.com',          pathExact: ['/'] },
    { hostname: 'www.youtube.com',     pathExact: ['/'] },
    // Merge personal patterns from config.local.js (if it exists)
    ...(typeof LOCAL_LANDING_PAGE_PATTERNS !== 'undefined' ? LOCAL_LANDING_PAGE_PATTERNS : []),
  ];

  function isLandingPage(url) {
    try {
      const parsed = new URL(url);
      return LANDING_PAGE_PATTERNS.some(p => {
        // Support both exact hostname and suffix matching (for wildcard subdomains)
        const hostnameMatch = p.hostname
          ? parsed.hostname === p.hostname
          : p.hostnameEndsWith
            ? parsed.hostname.endsWith(p.hostnameEndsWith)
            : false;
        if (!hostnameMatch) return false;
        if (p.test)       return p.test(parsed.pathname, url);
        if (p.pathPrefix) return parsed.pathname.startsWith(p.pathPrefix);
        if (p.pathExact)  return p.pathExact.includes(parsed.pathname);
        return parsed.pathname === '/';
      });
    } catch { return false; }
  }

  domainGroups = [];
  const groupMap    = {};
  const landingTabs = [];

  // Custom group rules from config.local.js (if any)
  const customGroups = typeof LOCAL_CUSTOM_GROUPS !== 'undefined' ? LOCAL_CUSTOM_GROUPS : [];

  // Check if a URL matches a custom group rule; returns the rule or null
  function matchCustomGroup(url) {
    try {
      const parsed = new URL(url);
      return customGroups.find(r => {
        const hostMatch = r.hostname
          ? parsed.hostname === r.hostname
          : r.hostnameEndsWith
            ? parsed.hostname.endsWith(r.hostnameEndsWith)
            : false;
        if (!hostMatch) return false;
        if (r.pathPrefix) return parsed.pathname.startsWith(r.pathPrefix);
        return true; // hostname matched, no path filter
      }) || null;
    } catch { return null; }
  }

  for (const tab of unassignedOpenTabs) {
    try {
      if (isLandingPage(tab.url)) {
        landingTabs.push(tab);
        continue;
      }

      // Check custom group rules first (e.g. merge subdomains, split by path)
      const customRule = matchCustomGroup(tab.url);
      if (customRule) {
        const key = customRule.groupKey;
        if (!groupMap[key]) groupMap[key] = { domain: key, label: customRule.groupLabel, tabs: [] };
        groupMap[key].tabs.push(tab);
        continue;
      }

      let hostname;
      if (tab.url && tab.url.startsWith('file://')) {
        hostname = 'local-files';
      } else {
        hostname = new URL(tab.url).hostname;
      }
      if (!hostname) continue;

      if (!groupMap[hostname]) groupMap[hostname] = { domain: hostname, tabs: [] };
      groupMap[hostname].tabs.push(tab);
    } catch {
      // Skip malformed URLs
    }
  }

  if (landingTabs.length > 0) {
    groupMap['__landing-pages__'] = { domain: '__landing-pages__', tabs: landingTabs };
  }

  // Sort: landing pages first, then domains from landing page sites, then by tab count
  // Collect exact hostnames and suffix patterns for priority sorting
  const landingHostnames = new Set(LANDING_PAGE_PATTERNS.map(p => p.hostname).filter(Boolean));
  const landingSuffixes = LANDING_PAGE_PATTERNS.map(p => p.hostnameEndsWith).filter(Boolean);
  function isLandingDomain(domain) {
    if (landingHostnames.has(domain)) return true;
    return landingSuffixes.some(s => domain.endsWith(s));
  }
  domainGroups = Object.values(groupMap).sort((a, b) => {
    const aIsLanding = a.domain === '__landing-pages__';
    const bIsLanding = b.domain === '__landing-pages__';
    if (aIsLanding !== bIsLanding) return aIsLanding ? -1 : 1;

    const aIsPriority = isLandingDomain(a.domain);
    const bIsPriority = isLandingDomain(b.domain);
    if (aIsPriority !== bIsPriority) return aIsPriority ? -1 : 1;

    return b.tabs.length - a.tabs.length;
  });

  // --- Render domain cards ---
  const openTabsSection      = document.getElementById('openTabsSection');
  const openTabsMissionsEl   = document.getElementById('openTabsMissions');
  const openTabsSectionCount = document.getElementById('openTabsSectionCount');
  const openTabsSectionTitle = document.getElementById('openTabsSectionTitle');

  if (openTabsSection) {
    if (openTabsSectionTitle) openTabsSectionTitle.textContent = t("unassignedTabs");
    openTabsSectionCount.innerHTML = renderOpenTabsSearchControls(
      unassignedOpenTabs.length
    );
    renderFilteredOpenTabs();
    openTabsSection.style.display = 'block';
  }

  // --- Footer stats ---
  const statTabs = document.getElementById('statTabs');
  if (statTabs) statTabs.textContent = openTabs.length;

  // --- Check for duplicate Tab Out tabs ---
  checkTabOutDupes();

  // --- Render "Saved for Later" column ---
  await renderDeferredColumn();
}

async function renderDashboard() {
  await renderStaticDashboard();
}
