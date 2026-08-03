'use strict';

/* ----------------------------------------------------------------
   PROTECTED CHROME TAB GROUPS
   Compact snapshot-based sync inside the Sessions section.
   ---------------------------------------------------------------- */

const CHROME_GROUP_COLORS = {
  grey: "#9aa0a6",
  blue: "#8ab4f8",
  red: "#f28b82",
  yellow: "#fdd663",
  green: "#81c995",
  pink: "#ff8bcb",
  purple: "#c58af9",
  cyan: "#78d9ec",
  orange: "#fcad70"
};

function protectedGroupsToast(message) {
  if (typeof showToast === "function") {
    showToast(message);
    return;
  }

  console.log(message);
}

function createProtectedGroupId() {
  return `protected-group-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeGroupUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url || "";
  }
}

function getGroupFavicon(url = "") {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`;
  } catch {
    return "";
  }
}

function getGroupSignature(group) {
  const urls = (group.tabs || [])
    .map((tab) => normalizeGroupUrl(tab.url))
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    title: group.title || "",
    color: group.color || "grey",
    urls
  });
}

async function getProtectedGroups() {
  return globalThis.TabOutCollectionClient.getProtectedGroups();
}

async function saveProtectedGroups(groups) {
  await globalThis.TabOutCollectionClient.replaceProtectedGroups(groups);
}

async function getCurrentChromeGroups() {
  if (!chrome?.tabGroups?.query) {
    return [];
  }

  const groups = await chrome.tabGroups.query({});
  const tabs = await queryTabsWithMetadata({});

  return groups
    .map((group) => {
      const groupTabs = tabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => ({
          id: tab.id,
          windowId: tab.windowId,
          title: tab.title || "",
          url: tab.pendingUrl || tab.url || "",
          favIconUrl: tab.favIconUrl || getGroupFavicon(tab.pendingUrl || tab.url || "")
        }))
        .filter((tab) => tab.url);

      return {
        chromeGroupId: group.id,
        windowId: group.windowId,
        title: group.title || t("untitledChromeGroup"),
        color: group.color || "grey",
        collapsed: Boolean(group.collapsed),
        tabs: groupTabs
      };
    })
    .filter((group) => group.tabs.length > 0);
}

async function getActiveChromeGroup() {
  if (!chrome?.tabGroups?.get) {
    return null;
  }

  const [activeTab] = await queryTabsWithMetadata({
    active: true,
    currentWindow: true
  });

  if (!activeTab || activeTab.groupId === undefined || activeTab.groupId === -1) {
    return null;
  }

  const chromeGroup = await chrome.tabGroups.get(activeTab.groupId);
  const allTabs = await queryTabsWithMetadata({});

  const groupTabs = allTabs
    .filter((tab) => tab.groupId === chromeGroup.id)
    .map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title || "",
      url: tab.pendingUrl || tab.url || "",
      favIconUrl: tab.favIconUrl || getGroupFavicon(tab.pendingUrl || tab.url || "")
    }))
    .filter((tab) => tab.url);

  if (!groupTabs.length) {
    return null;
  }

  return {
    chromeGroupId: chromeGroup.id,
    title: chromeGroup.title || t("untitledChromeGroup"),
    color: chromeGroup.color || "grey",
    collapsed: Boolean(chromeGroup.collapsed),
    tabs: groupTabs
  };
}

function createSnapshotFromChromeGroup(group) {
  return {
    id: createProtectedGroupId(),
    chromeGroupId: group.chromeGroupId,
    title: group.title || t("untitledChromeGroup"),
    color: group.color || "grey",
    tabs: (group.tabs || []).map((tab) => ({
      title: tab.title || "",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || getGroupFavicon(tab.url || "")
    })),
    baseSignature: getGroupSignature(group),
    ignoredSignature: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function getUrlOverlapScore(snapshot, liveGroup) {
  const snapshotUrls = new Set(
    (snapshot.tabs || []).map((tab) => normalizeGroupUrl(tab.url)).filter(Boolean)
  );

  const liveUrls = new Set(
    (liveGroup.tabs || []).map((tab) => normalizeGroupUrl(tab.url)).filter(Boolean)
  );

  if (!snapshotUrls.size || !liveUrls.size) {
    return 0;
  }

  let matches = 0;

  snapshotUrls.forEach((url) => {
    if (liveUrls.has(url)) {
      matches += 1;
    }
  });

  return matches / Math.max(snapshotUrls.size, liveUrls.size);
}

function findLiveGroupForSnapshot(snapshot, liveGroups) {
  const exactIdMatch = liveGroups.find(
    (group) => group.chromeGroupId === snapshot.chromeGroupId
  );

  if (exactIdMatch) {
    return exactIdMatch;
  }

  const sameTitleGroups = liveGroups.filter(
    (group) => (group.title || "") === (snapshot.title || "")
  );

  if (sameTitleGroups.length === 1) {
    return sameTitleGroups[0];
  }

  let bestMatch = null;
  let bestScore = 0;

  liveGroups.forEach((group) => {
    const score = getUrlOverlapScore(snapshot, group);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = group;
    }
  });

  return bestScore >= 0.5 ? bestMatch : null;
}

function diffProtectedGroup(snapshot, liveGroup) {
  if (!liveGroup) {
    return {
      missing: true,
      changed: true,
      ignored: false,
      addedTabs: [],
      removedTabs: snapshot.tabs || []
    };
  }

  const liveSignature = getGroupSignature(liveGroup);
  const changed = liveSignature !== snapshot.baseSignature;
  const ignored = changed && snapshot.ignoredSignature === liveSignature;

  const snapshotUrls = new Map(
    (snapshot.tabs || []).map((tab) => [normalizeGroupUrl(tab.url), tab])
  );

  const liveUrls = new Map(
    (liveGroup.tabs || []).map((tab) => [normalizeGroupUrl(tab.url), tab])
  );

  const addedTabs = [];
  const removedTabs = [];

  liveUrls.forEach((tab, url) => {
    if (!snapshotUrls.has(url)) {
      addedTabs.push(tab);
    }
  });

  snapshotUrls.forEach((tab, url) => {
    if (!liveUrls.has(url)) {
      removedTabs.push(tab);
    }
  });

  return {
    missing: false,
    changed,
    ignored,
    liveSignature,
    addedTabs,
    removedTabs
  };
}

function getProtectedGroupChangeLabel(diff) {
  const added = diff.addedTabs?.length || 0;
  const removed = diff.removedTabs?.length || 0;

  if (added && removed) {
    return t("chromeGroupChangeAddedRemoved", { added, removed });
  }

  if (added) {
    return t("chromeGroupChangeAdded", { added });
  }

  if (removed) {
    return t("chromeGroupChangeRemoved", { removed });
  }

  return t("chromeGroupChanged");
}

function getProtectedGroupChangeTooltip(diff) {
  return t("chromeGroupChangeTooltip", {
    added: diff.addedTabs?.length || 0,
    removed: diff.removedTabs?.length || 0
  });
}

function getProtectedGroupStatus(snapshot, liveGroup, diff) {
  if (diff.missing) {
    return {
      className: "is-missing",
      label: t("chromeGroupMissing"),
      tooltip: t("chromeGroupMissing")
    };
  }

  if (!diff.changed || diff.ignored) {
    return {
      className: "is-synced",
      label: t("chromeGroupSynced"),
      tooltip: t("chromeGroupSynced")
    };
  }

  return {
    className: "is-changed",
    label: getProtectedGroupChangeLabel(diff),
    tooltip: getProtectedGroupChangeTooltip(diff)
  };
}

function getProtectedGroupLastSavedText(snapshot) {
  const savedAt = snapshot.updatedAt || snapshot.createdAt;

  if (!savedAt) {
    return "";
  }

  return t("chromeGroupLastSaved", { time: timeAgo(savedAt) });
}

function getProtectedGroupCardTooltip({ title, tabsCount, statusLabel, statusTooltip, lastSavedText = "" }) {
  return [
    title,
    `${tabsCount} · ${statusLabel}`,
    statusTooltip && statusTooltip !== statusLabel ? statusTooltip : "",
    lastSavedText,
    t("chromeGroupTooltipStatusColor")
  ].filter(Boolean).join("\n");
}

function renderProtectedGroupFavicons(targetEl, tabs = []) {
  targetEl.innerHTML = "";

  tabs.slice(0, 4).forEach((tab) => {
    const favicon = tab.favIconUrl || getGroupFavicon(tab.url);

    if (!favicon) {
      return;
    }

    const img = document.createElement("img");
    img.alt = "";
    img.src = favicon;
    targetEl.appendChild(img);
  });

  if (tabs.length > 4) {
    const more = document.createElement("span");
    more.className = "saved-session-more";
    more.textContent = `+${tabs.length - 4}`;
    targetEl.appendChild(more);
  }
}

function closeProtectedGroupMenus() {
  document.querySelectorAll(".protected-group-menu").forEach((menu) => {
    menu.hidden = true;
  });
}

function toggleProtectedGroupMenu(menuKey) {
  const menu = document.querySelector(
    `.protected-group-menu[data-menu-key="${CSS.escape(menuKey)}"]`
  );

  if (!menu) {
    return;
  }

  const shouldOpen = menu.hidden;

  closeProtectedGroupMenus();

  menu.hidden = !shouldOpen;
}

function createProtectedMenuButton(label, action, dataset = {}, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;

  Object.entries(dataset).forEach(([key, value]) => {
    button.dataset[key] = value;
  });

  if (className) {
    button.className = className;
  }

  return button;
}

function findSnapshotForLiveGroup(liveGroup, protectedGroups) {
  const exactMatch = protectedGroups.find(
    (snapshot) => snapshot.chromeGroupId === liveGroup.chromeGroupId
  );

  if (exactMatch) {
    return exactMatch;
  }

  let bestMatch = null;
  let bestScore = 0;

  protectedGroups.forEach((snapshot) => {
    const score = getUrlOverlapScore(snapshot, liveGroup);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = snapshot;
    }
  });

  return bestScore >= 0.65 ? bestMatch : null;
}

function renderLiveChromeGroupCard(group) {
  const menuKey = `chrome-${group.chromeGroupId}`;
  const groupTitle = group.title || t("untitledChromeGroup");
  const tabsText = plural(group.tabs.length, "chromeGroupTabCount", "chromeGroupTabsCount");
  const statusLabel = t("chromeGroupUnprotected");

  const card = document.createElement("div");
  card.className = "saved-session-card is-protected-group is-unprotected";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "saved-session-open";
  openButton.dataset.action = "view-live-chrome-group";
  openButton.dataset.groupId = String(group.chromeGroupId);
  openButton.title = getProtectedGroupCardTooltip({
    title: groupTitle,
    tabsCount: tabsText,
    statusLabel,
    statusTooltip: statusLabel
  });

  const title = document.createElement("span");
  title.className = "saved-session-title";
  title.textContent = groupTitle;

  const meta = document.createElement("span");
  meta.className = "saved-session-meta";
  meta.textContent = `${tabsText} · ${statusLabel}`;
  meta.title = openButton.title;

  const favicons = document.createElement("span");
  favicons.className = "saved-session-favicons";
  renderProtectedGroupFavicons(favicons, group.tabs);

  const colorDot = document.createElement("span");
  colorDot.className = "chrome-group-color-dot";
  colorDot.style.setProperty("--chrome-group-color", CHROME_GROUP_COLORS[group.color] || CHROME_GROUP_COLORS.grey);
  colorDot.title = t("chromeGroupNativeColor");

  openButton.appendChild(colorDot);
  openButton.appendChild(title);
  openButton.appendChild(meta);
  openButton.appendChild(favicons);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-session-edit";
  editButton.textContent = "✎";
  editButton.title = t("protectChromeGroup");
  editButton.dataset.action = "toggle-protected-group-menu";
  editButton.dataset.menuKey = menuKey;

  const menu = document.createElement("div");
  menu.className = "protected-group-menu";
  menu.dataset.menuKey = menuKey;
  menu.hidden = true;

  menu.appendChild(createProtectedMenuButton(
    t("protectChromeGroup"),
    "protect-chrome-group",
    { groupId: String(group.chromeGroupId) }
  ));

  card.appendChild(openButton);
  card.appendChild(editButton);
  card.appendChild(menu);

  return card;
}

function renderProtectedGroupCard(snapshot, liveGroups, liveGroupOverride = undefined) {
  const liveGroup = liveGroupOverride === undefined
    ? findLiveGroupForSnapshot(snapshot, liveGroups)
    : liveGroupOverride;
  const diff = diffProtectedGroup(snapshot, liveGroup);
  const status = getProtectedGroupStatus(snapshot, liveGroup, diff);
  const menuKey = `snapshot-${snapshot.id}`;
  const groupTitle = snapshot.title || t("untitledChromeGroup");
  const tabsText = plural(snapshot.tabs.length, "chromeGroupTabCount", "chromeGroupTabsCount");
  const lastSavedText = getProtectedGroupLastSavedText(snapshot);

  const card = document.createElement("div");
  card.className = `saved-session-card is-protected-group ${status.className}`;

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "saved-session-open";
  openButton.dataset.action = "view-protected-group";
  openButton.dataset.snapshotId = snapshot.id;
  openButton.title = getProtectedGroupCardTooltip({
    title: groupTitle,
    tabsCount: tabsText,
    statusLabel: status.label,
    statusTooltip: status.tooltip,
    lastSavedText
  });

  const title = document.createElement("span");
  title.className = "saved-session-title";
  title.textContent = groupTitle;

  const meta = document.createElement("span");
  meta.className = "saved-session-meta";
  meta.textContent = `${tabsText} · ${status.label}`;
  meta.title = openButton.title;

  const favicons = document.createElement("span");
  favicons.className = "saved-session-favicons";
  renderProtectedGroupFavicons(favicons, snapshot.tabs);

  const colorDot = document.createElement("span");
  colorDot.className = "chrome-group-color-dot";
  colorDot.style.setProperty("--chrome-group-color", CHROME_GROUP_COLORS[snapshot.color] || CHROME_GROUP_COLORS.grey);
  colorDot.title = t("chromeGroupNativeColor");

  openButton.appendChild(colorDot);
  openButton.appendChild(title);
  openButton.appendChild(meta);
  openButton.appendChild(favicons);

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-session-edit";
  editButton.textContent = "✎";
  editButton.title = t("editSession");
  editButton.dataset.action = "toggle-protected-group-menu";
  editButton.dataset.menuKey = menuKey;

  const menu = document.createElement("div");
  menu.className = "protected-group-menu";
  menu.dataset.menuKey = menuKey;
  menu.hidden = true;

  if (lastSavedText) {
    const note = document.createElement("div");
    note.className = "protected-group-menu-note";
    note.textContent = lastSavedText;
    menu.appendChild(note);
  }

  menu.appendChild(createProtectedMenuButton(
    t("restoreProtectedGroup"),
    "restore-protected-group",
    { snapshotId: snapshot.id }
  ));

  menu.appendChild(createProtectedMenuButton(
    t("openProtectedGroupCopy"),
    "open-protected-group-copy",
    { snapshotId: snapshot.id }
  ));

  if (liveGroup) {
    menu.appendChild(createProtectedMenuButton(
      t("updateProtectedGroup"),
      "update-protected-group",
      { snapshotId: snapshot.id }
    ));
  }

  if (diff.changed && !diff.ignored && liveGroup) {
    menu.appendChild(createProtectedMenuButton(
      t("ignoreProtectedGroupChange"),
      "ignore-protected-group",
      { snapshotId: snapshot.id }
    ));
  }

  menu.appendChild(createProtectedMenuButton(
    t("deleteProtectedGroup"),
    "delete-protected-group",
    { snapshotId: snapshot.id },
    "danger"
  ));

  card.appendChild(openButton);
  card.appendChild(editButton);
  card.appendChild(menu);

  return card;
}

let lastProtectedGroupsRenderSignature = "";

function getProtectedGroupsRenderSignature(liveGroups, protectedGroups) {
  const livePart = liveGroups
    .map((group) => ({
      id: group.chromeGroupId,
      title: group.title || "",
      color: group.color || "grey",
      signature: getGroupSignature(group)
    }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const protectedPart = protectedGroups.map((snapshot) => ({
    id: snapshot.id,
    chromeGroupId: snapshot.chromeGroupId,
    title: snapshot.title || "",
    color: snapshot.color || "grey",
    baseSignature: snapshot.baseSignature || "",
    ignoredSignature: snapshot.ignoredSignature || "",
    createdAt: snapshot.createdAt || "",
    updatedAt: snapshot.updatedAt || ""
  }));

  return JSON.stringify({ livePart, protectedPart, language: currentLanguage });
}

function sortLiveChromeGroupsForDisplay(groups) {
  return [...groups].sort((a, b) => {
    const titleCompare = (a.title || "").localeCompare(b.title || "", activeLocale(), {
      sensitivity: "base",
      numeric: true
    });

    if (titleCompare !== 0) {
      return titleCompare;
    }

    return String(a.chromeGroupId).localeCompare(String(b.chromeGroupId));
  });
}

async function renderProtectedGroupsIntoSessions(list, { force = false } = {}) {
  if (!list) {
    return;
  }

  const [liveGroups, protectedGroups] = await Promise.all([
    getCurrentChromeGroups(),
    getProtectedGroups()
  ]);

  const signature = getProtectedGroupsRenderSignature(liveGroups, protectedGroups);

  if (!force && signature === lastProtectedGroupsRenderSignature) {
    return;
  }

  lastProtectedGroupsRenderSignature = signature;

  const renderedSnapshotIds = new Set();
  const renderedLiveGroupIds = new Set();
  const fragment = document.createDocumentFragment();

  // Protected groups are rendered first and keep the user's snapshot order.
  // This prevents Chrome's live group ordering from reshuffling the cards on focus changes.
  protectedGroups.forEach((snapshot) => {
    const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

    if (liveGroup) {
      renderedLiveGroupIds.add(liveGroup.chromeGroupId);
    }

    renderedSnapshotIds.add(snapshot.id);
    fragment.appendChild(renderProtectedGroupCard(snapshot, liveGroups, liveGroup || null));
  });

  sortLiveChromeGroupsForDisplay(liveGroups).forEach((liveGroup) => {
    if (renderedLiveGroupIds.has(liveGroup.chromeGroupId)) {
      return;
    }

    const snapshot = findSnapshotForLiveGroup(liveGroup, protectedGroups);

    if (snapshot && renderedSnapshotIds.has(snapshot.id)) {
      return;
    }

    fragment.appendChild(renderLiveChromeGroupCard(liveGroup));
  });

  list.innerHTML = "";

  if (!fragment.childNodes.length) {
    list.innerHTML = `
      <div class="saved-sessions-empty protected-groups-empty">
        <strong>${t("protectedGroupsEmptyTitle")}</strong>
        <span>${t("protectedGroupsEmptySubtitle")}</span>
      </div>
    `;
    return;
  }

  list.appendChild(fragment);
}

async function protectChromeGroup(chromeGroupId) {
  const liveGroups = await getCurrentChromeGroups();
  const liveGroup = liveGroups.find(
    (group) => String(group.chromeGroupId) === String(chromeGroupId)
  );

  if (!liveGroup) {
    protectedGroupsToast(t("noActiveChromeGroup"));
    return;
  }

  const protectedGroups = await getProtectedGroups();
  const existingIndex = protectedGroups.findIndex(
    (snapshot) => snapshot.chromeGroupId === liveGroup.chromeGroupId
  );

  const snapshot = createSnapshotFromChromeGroup(liveGroup);

  if (existingIndex >= 0) {
    snapshot.id = protectedGroups[existingIndex].id;
    snapshot.createdAt = protectedGroups[existingIndex].createdAt;
    protectedGroups[existingIndex] = snapshot;
    protectedGroupsToast(t("chromeGroupSnapshotUpdated", { name: liveGroup.title }));
  } else {
    protectedGroups.push(snapshot);
    protectedGroupsToast(t("chromeGroupProtected", { name: liveGroup.title }));
  }

  await saveProtectedGroups(protectedGroups);
  savedSessionsViewMode = "groups";
  await renderSavedSessions();
}

async function focusChromeGroup(chromeGroupId) {
  const liveGroups = await getCurrentChromeGroups();
  const liveGroup = liveGroups.find(
    (group) => String(group.chromeGroupId) === String(chromeGroupId)
  );

  const tab = liveGroup?.tabs?.[0];

  if (!tab?.id) {
    return;
  }

  await chrome.tabs.update(tab.id, { active: true });

  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

async function focusProtectedGroup(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return;
  }

  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  if (!liveGroup || !liveGroup.tabs.length) {
    await restoreProtectedGroup(snapshotId, { focusAfterRestore: true, showMessage: false });
    return;
  }

  const tab = liveGroup.tabs[0];

  if (!tab?.id) {
    await restoreProtectedGroup(snapshotId, { focusAfterRestore: true, showMessage: false });
    return;
  }

  await chrome.tabs.update(tab.id, { active: true });

  if (tab.windowId) {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

async function shouldConfirmProtectedGroupRestore(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return false;
  }

  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  return Boolean(liveGroup?.tabs?.length);
}

async function openProtectedGroupCopy(snapshotId) {
  const protectedGroups = await getProtectedGroups();
  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  await restoreProtectedGroup(snapshotId, {
    focusAfterRestore: true,
    showMessage: false,
    updateSnapshotReference: false
  });

  if (snapshot) {
    protectedGroupsToast(t("chromeGroupCopyOpened", { name: snapshot.title || t("untitledChromeGroup") }));
  }
}

async function restoreProtectedGroup(snapshotId, options = {}) {
  const {
    focusAfterRestore = false,
    showMessage = true,
    updateSnapshotReference = true
  } = options;
  const protectedGroups = await getProtectedGroups();
  const snapshot = protectedGroups.find((group) => group.id === snapshotId);

  if (!snapshot) {
    return;
  }

  const result = await createNativeCollectionGroup(snapshot.tabs || [], {
    title: snapshot.title || t("untitledChromeGroup"),
    color: snapshot.color || "grey",
    focusAfterOpen: focusAfterRestore
  });

  if (!Number.isInteger(result.chromeGroupId)) {
    return;
  }

  if (updateSnapshotReference) {
    await updateProtectedGroupReference(snapshotId, result.chromeGroupId);
  }

  await renderSavedSessions();

  if (showMessage) {
    protectedGroupsToast(t("chromeGroupRestored", { name: snapshot.title }));
  }
}

async function updateProtectedSnapshot(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const snapshotIndex = protectedGroups.findIndex((group) => group.id === snapshotId);

  if (snapshotIndex < 0) {
    return;
  }

  const snapshot = protectedGroups[snapshotIndex];
  const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

  if (!liveGroup) {
    return;
  }

  const updatedSnapshot = createSnapshotFromChromeGroup(liveGroup);

  updatedSnapshot.id = snapshot.id;
  updatedSnapshot.createdAt = snapshot.createdAt;

  protectedGroups[snapshotIndex] = updatedSnapshot;

  await saveProtectedGroups(protectedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupSnapshotUpdated", { name: updatedSnapshot.title }));
}

async function ignoreProtectedGroupChange(snapshotId) {
  const [protectedGroups, liveGroups] = await Promise.all([
    getProtectedGroups(),
    getCurrentChromeGroups()
  ]);

  const updatedGroups = protectedGroups.map((snapshot) => {
    if (snapshot.id !== snapshotId) {
      return snapshot;
    }

    const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);

    if (!liveGroup) {
      return snapshot;
    }

    return {
      ...snapshot,
      ignoredSignature: getGroupSignature(liveGroup),
      updatedAt: new Date().toISOString()
    };
  });

  await saveProtectedGroups(updatedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupIgnored"));
}

async function deleteProtectedSnapshot(snapshotId) {
  const protectedGroups = await getProtectedGroups();
  const updatedGroups = protectedGroups.filter((group) => group.id !== snapshotId);

  await saveProtectedGroups(updatedGroups);
  await renderSavedSessions();

  protectedGroupsToast(t("chromeGroupDeleted"));
}

document.addEventListener("click", (event) => {
  if (!event.target.closest(".protected-group-menu") &&
      !event.target.closest('[data-action="toggle-protected-group-menu"]')) {
    closeProtectedGroupMenus();
  }
});

let protectedGroupsRefreshTimer = null;

function scheduleProtectedGroupsRefresh() {
  clearTimeout(protectedGroupsRefreshTimer);

  protectedGroupsRefreshTimer = setTimeout(async () => {
    if (
      savedSessionRowDragState?.dragging ||
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging ||
      savedLaterDragState?.dragging
    ) {
      scheduleProtectedGroupsRefresh();
      return;
    }

    if (collectionDetailState?.kind === "session") {
      await reloadCollectionDetailSource();
      return;
    }

    await renderSavedSessions();
  }, 700);
}

globalThis.TabOutBrowserEvents.subscribe(
  "tab-group-created",
  scheduleProtectedGroupsRefresh
);
globalThis.TabOutBrowserEvents.subscribe(
  "tab-group-updated",
  scheduleProtectedGroupsRefresh
);
globalThis.TabOutBrowserEvents.subscribe(
  "tab-group-removed",
  scheduleProtectedGroupsRefresh
);
globalThis.TabOutBrowserEvents.subscribe(
  "tab-created",
  scheduleProtectedGroupsRefresh
);
globalThis.TabOutBrowserEvents.subscribe(
  "tab-removed",
  scheduleProtectedGroupsRefresh
);
globalThis.TabOutBrowserEvents.subscribe("tab-updated", (tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url || changeInfo.title) {
    scheduleProtectedGroupsRefresh();
  }
});
