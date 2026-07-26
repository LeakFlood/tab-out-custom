const SAVED_SESSIONS_STORAGE_KEY = "savedSessions";
const PROTECTED_GROUPS_STORAGE_KEY = "tabOutProtectedGroups";
const SESSION_SCHEMA_VERSION_KEY = "tabOutSessionSchemaVersion";
const SESSION_SCHEMA_VERSION = 2;

async function getCollectionDashboardSettings() {
  try {
    const settingsApi = globalThis.TabOutDashboardSettings;

    if (!settingsApi) {
      return {
        behavior: {
          includeSuspendedTabs: true,
          copyTabLinksOnRightClick: true,
          dragUnassignedTabs: true,
          reorderSessions: true
        }
      };
    }

    const stored = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
    return settingsApi.normalizeSettings(stored[settingsApi.STORAGE_KEY]);
  } catch {
    return {
      behavior: {
        includeSuspendedTabs: true,
        copyTabLinksOnRightClick: true,
        dragUnassignedTabs: true,
        reorderSessions: true
      }
    };
  }
}

async function getCollectionIncludeSuspendedTabsPreference() {
  return (await getCollectionDashboardSettings())
    .behavior.includeSuspendedTabs !== false;
}

async function queryCollectionBrowserTabs(query = {}) {
  const [tabs, includeSuspendedTabs] = await Promise.all([
    chrome.tabs.query(query),
    getCollectionIncludeSuspendedTabsPreference()
  ]);
  const metadataApi = globalThis.TabOutTabMetadata;

  if (!metadataApi) {
    return tabs;
  }

  return tabs.map((tab) =>
    metadataApi.normalizeBrowserTab(tab, { includeSuspendedTabs })
  );
}

async function getCollectionBrowserTab(tabId) {
  const [tab, includeSuspendedTabs] = await Promise.all([
    chrome.tabs.get(tabId),
    getCollectionIncludeSuspendedTabsPreference()
  ]);
  const metadataApi = globalThis.TabOutTabMetadata;

  return metadataApi
    ? metadataApi.normalizeBrowserTab(tab, { includeSuspendedTabs })
    : tab;
}

function createMigratedSessionId(snapshotId, existingIds) {
  const baseId = `session-from-${snapshotId || Date.now()}`;
  let candidateId = baseId;
  let suffix = 2;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(candidateId);
  return candidateId;
}

async function ensureUnifiedSessionsMigration() {
  const stored = await chrome.storage.local.get([
    SAVED_SESSIONS_STORAGE_KEY,
    PROTECTED_GROUPS_STORAGE_KEY,
    SESSION_SCHEMA_VERSION_KEY
  ]);
  const sessions = Array.isArray(stored[SAVED_SESSIONS_STORAGE_KEY])
    ? stored[SAVED_SESSIONS_STORAGE_KEY]
    : [];
  const protectedGroups = Array.isArray(stored[PROTECTED_GROUPS_STORAGE_KEY])
    ? stored[PROTECTED_GROUPS_STORAGE_KEY]
    : [];
  const currentVersion = Number(stored[SESSION_SCHEMA_VERSION_KEY] || 0);

  if (currentVersion >= SESSION_SCHEMA_VERSION) {
    if (protectedGroups.length) {
      await chrome.storage.local.remove(PROTECTED_GROUPS_STORAGE_KEY);
    }

    return sessions;
  }

  const existingIds = new Set(sessions.map((session) => session.id));
  const claimedGroupIds = new Set(
    sessions
      .map((session) => session.groupLink?.chromeGroupId)
      .filter(Number.isInteger)
  );
  const migratedSessions = protectedGroups.map((snapshot) => {
    const chromeGroupId = Number.isInteger(snapshot.chromeGroupId)
      ? snapshot.chromeGroupId
      : null;
    const canLinkGroup =
      Number.isInteger(chromeGroupId) &&
      !claimedGroupIds.has(chromeGroupId);
    const shouldKeepLink = canLinkGroup || !Number.isInteger(chromeGroupId);

    if (canLinkGroup) {
      claimedGroupIds.add(chromeGroupId);
    }

    return {
      id: createMigratedSessionId(snapshot.id, existingIds),
      name: snapshot.title || "Untitled group",
      tabs: (snapshot.tabs || []).map((tab) => ({
        title: tab.title || tab.url || "",
        url: tab.url || "",
        favIconUrl: tab.favIconUrl || ""
      })).filter((tab) => tab.url),
      groupTemplate: {
        title: snapshot.title || "Untitled group",
        color: snapshot.color || "grey"
      },
      ...(shouldKeepLink
        ? {
            groupLink: {
              chromeGroupId,
              lastReviewedSignature:
                snapshot.baseSignature || getCollectionGroupSignature(snapshot),
              lastReviewedAt:
                snapshot.updatedAt ||
                snapshot.createdAt ||
                new Date().toISOString()
            }
          }
        : {}),
      createdAt: snapshot.createdAt || new Date().toISOString(),
      updatedAt: snapshot.updatedAt || new Date().toISOString()
    };
  });
  const unifiedSessions = [...sessions, ...migratedSessions];

  await chrome.storage.local.set({
    [SAVED_SESSIONS_STORAGE_KEY]: unifiedSessions,
    [SESSION_SCHEMA_VERSION_KEY]: SESSION_SCHEMA_VERSION
  });

  if (protectedGroups.length || currentVersion < SESSION_SCHEMA_VERSION) {
    await chrome.storage.local.remove(PROTECTED_GROUPS_STORAGE_KEY);
  }

  return unifiedSessions;
}

function canonicalCollectionUrl(url = "") {
  try {
    return new URL(url).toString();
  } catch {
    return String(url || "").trim();
  }
}

function normalizeGroupSignatureUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(url || "");
  }
}

function parseCollectionLink(rawUrl = "") {
  const trimmedUrl = String(rawUrl || "").trim();

  if (!trimmedUrl) {
    throw new Error("invalid_url");
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;
  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("invalid_url");
  }

  if (["javascript:", "data:", "blob:"].includes(parsed.protocol.toLowerCase())) {
    throw new Error("unsupported_url");
  }

  const normalizedUrl = parsed.toString();

  if (isTabOutPage(normalizedUrl)) {
    throw new Error("unsupported_url");
  }

  return normalizedUrl;
}

function deriveCollectionTitle(url, preferredTitle = "") {
  const trimmedTitle = String(preferredTitle || "").trim();

  if (trimmedTitle) {
    return trimmedTitle;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") || parsed.pathname || url;
  } catch {
    return url;
  }
}

function isTabOutPage(url = "") {
  const extensionRoot = `chrome-extension://${chrome.runtime.id}/`;
  return String(url || "").startsWith(extensionRoot);
}

function getCollectionGroupSignature(group) {
  const urls = (group.tabs || [])
    .map((tab) => normalizeGroupSignatureUrl(tab.url))
    .filter(Boolean)
    .sort();

  return JSON.stringify({
    title: group.title || "",
    color: group.color || "grey",
    urls
  });
}

function getCollectionUrlOverlapScore(snapshot, liveGroup) {
  const snapshotUrls = new Set(
    (snapshot.tabs || [])
      .map((tab) => normalizeGroupSignatureUrl(tab.url))
      .filter(Boolean)
  );
  const liveUrls = new Set(
    (liveGroup.tabs || [])
      .map((tab) => normalizeGroupSignatureUrl(tab.url))
      .filter(Boolean)
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

function findCollectionLiveGroupForSession(session, liveGroups) {
  if (!session?.groupLink) {
    return null;
  }

  const exactIdMatch = liveGroups.find(
    (group) => group.chromeGroupId === session.groupLink.chromeGroupId
  );

  if (exactIdMatch) {
    return exactIdMatch;
  }

  const exactSignatureMatches = liveGroups.filter(
    (group) =>
      getCollectionGroupSignature(group) ===
      session.groupLink.lastReviewedSignature
  );

  if (exactSignatureMatches.length === 1) {
    return exactSignatureMatches[0];
  }

  const expectedTitle = session.groupTemplate?.title || session.name || "";
  const comparableSession = {
    title: expectedTitle,
    color: session.groupTemplate?.color || "grey",
    tabs: session.tabs || []
  };
  const safeMatches = liveGroups.filter(
    (group) =>
      (group.title || "") === expectedTitle &&
      getCollectionUrlOverlapScore(comparableSession, group) >= 0.65
  );

  return safeMatches.length === 1 ? safeMatches[0] : null;
}

function collectionContainsUrl(tabs, url) {
  const targetUrl = canonicalCollectionUrl(url);
  return (tabs || []).some(
    (tab) => canonicalCollectionUrl(tab.url) === targetUrl
  );
}

async function getCollectionSavedSessions() {
  const [sessions, includeSuspendedTabs] = await Promise.all([
    ensureUnifiedSessionsMigration(),
    getCollectionIncludeSuspendedTabsPreference()
  ]);
  const metadataApi = globalThis.TabOutTabMetadata;

  return metadataApi
    ? sessions.map((session) =>
        metadataApi.normalizeSavedSession(session, {
          includeSuspendedTabs
        })
      )
    : sessions;
}

async function saveCollectionSavedSessions(sessions) {
  await chrome.storage.local.set({
    [SAVED_SESSIONS_STORAGE_KEY]: sessions
  });
}

async function getCollectionChromeGroups() {
  if (!chrome?.tabGroups?.query) {
    return [];
  }

  const [groups, tabs] = await Promise.all([
    chrome.tabGroups.query({}),
    queryCollectionBrowserTabs({})
  ]);

  return groups
    .map((group) => ({
      chromeGroupId: group.id,
      windowId: group.windowId,
      title: group.title || "Untitled group",
      color: group.color || "grey",
      collapsed: Boolean(group.collapsed),
      tabs: tabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => ({
          id: tab.id,
          windowId: tab.windowId,
          groupId: tab.groupId,
          pinned: Boolean(tab.pinned),
          title: tab.title || "",
          url: tab.pendingUrl || tab.url || "",
          favIconUrl: tab.favIconUrl || ""
        }))
        .filter((tab) => tab.url)
    }))
    .filter((group) => group.tabs.length > 0);
}

function createStoredTabDescriptor(tabLike, preferredTitle = "") {
  const url = parseCollectionLink(tabLike.pendingUrl || tabLike.url || "");

  return {
    title: deriveCollectionTitle(url, preferredTitle || tabLike.title || ""),
    url,
    favIconUrl: tabLike.favIconUrl || ""
  };
}

function createCollectionSessionId() {
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCollectionSessionName(name = "") {
  const normalizedName = String(name || "").trim();

  if (!normalizedName) {
    throw new Error("invalid_name");
  }

  return normalizedName;
}

async function getCollectionActiveTab() {
  const [activeTab] = await queryCollectionBrowserTabs({
    active: true,
    currentWindow: true
  });

  if (!activeTab) {
    return null;
  }

  const rawUrl = activeTab.pendingUrl || activeTab.url || "";

  if (!rawUrl || isTabOutPage(rawUrl)) {
    return {
      id: activeTab.id,
      supported: false,
      title: activeTab.title || "",
      url: rawUrl,
      favIconUrl: activeTab.favIconUrl || ""
    };
  }

  try {
    const url = parseCollectionLink(rawUrl);

    return {
      id: activeTab.id,
      windowId: activeTab.windowId,
      groupId: activeTab.groupId,
      pinned: Boolean(activeTab.pinned),
      supported: true,
      title: activeTab.title || deriveCollectionTitle(url),
      url,
      favIconUrl: activeTab.favIconUrl || ""
    };
  } catch {
    return {
      id: activeTab.id,
      supported: false,
      title: activeTab.title || "",
      url: rawUrl,
      favIconUrl: activeTab.favIconUrl || ""
    };
  }
}

async function getCollectionAddDestinations() {
  const [activeTab, sessions, liveGroups, languageData, dashboardSettings] =
    await Promise.all([
      getCollectionActiveTab(),
      getCollectionSavedSessions(),
      getCollectionChromeGroups(),
      chrome.storage.local.get("tabOutLanguage"),
      getCollectionDashboardSettings()
    ]);

  return {
    activeTab,
    language: languageData.tabOutLanguage === "en" ? "en" : "fr",
    copyTabLinksOnRightClick:
      dashboardSettings.behavior.copyTabLinksOnRightClick !== false,
    sessions: sessions.map((session) => {
      const liveGroup = findCollectionLiveGroupForSession(
        session,
        liveGroups
      );
      const status = !session.groupLink
        ? "saved"
        : !liveGroup
          ? "groupClosed"
          : getCollectionGroupSignature(liveGroup) ===
              session.groupLink.lastReviewedSignature
            ? "groupOpen"
            : "groupChanged";

      return {
        kind: "session",
        id: session.id,
        title: session.name,
        status,
        tabsCount: session.tabs?.length || 0,
        containsActiveTab: activeTab
          ? collectionContainsUrl(session.tabs, activeTab.url)
          : false
      };
    })
  };
}

async function addDescriptorToSession(sessionId, descriptor) {
  const sessions = await getCollectionSavedSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === sessionId);

  if (sessionIndex < 0) {
    throw new Error("not_found");
  }

  if (collectionContainsUrl(sessions[sessionIndex].tabs, descriptor.url)) {
    return { code: "already_added" };
  }

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    tabs: [...(sessions[sessionIndex].tabs || []), descriptor],
    updatedAt: new Date().toISOString()
  };
  await saveCollectionSavedSessions(sessions);

  return { code: "added", mode: "saved" };
}

async function removeDescriptorFromSession(sessionId, url) {
  const sessions = await getCollectionSavedSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === sessionId);

  if (sessionIndex < 0) {
    throw new Error("not_found");
  }

  const targetUrl = canonicalCollectionUrl(url);
  const currentTabs = sessions[sessionIndex].tabs || [];
  const nextTabs = currentTabs.filter(
    (tab) => canonicalCollectionUrl(tab.url) !== targetUrl
  );
  const removed = currentTabs.length - nextTabs.length;

  if (!removed) {
    return { code: "already_removed", removed: 0 };
  }

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    tabs: nextTabs,
    updatedAt: new Date().toISOString()
  };
  await saveCollectionSavedSessions(sessions);

  return { code: "removed", removed };
}

async function createSessionFromDescriptors(name, tabLikes = []) {
  const normalizedName = normalizeCollectionSessionName(name);
  const descriptorsByUrl = new Map();
  const candidates = Array.isArray(tabLikes) ? tabLikes : [];

  candidates.forEach((tabLike) => {
    const descriptor = createStoredTabDescriptor(tabLike);
    const key = canonicalCollectionUrl(descriptor.url);

    if (key && !descriptorsByUrl.has(key)) {
      descriptorsByUrl.set(key, descriptor);
    }
  });

  const tabs = Array.from(descriptorsByUrl.values());

  if (tabs.length !== 2) {
    throw new Error("invalid_tabs");
  }

  const sessions = await getCollectionSavedSessions();
  const now = new Date().toISOString();
  const session = {
    id: createCollectionSessionId(),
    name: normalizedName,
    tabs,
    createdAt: now,
    updatedAt: now
  };

  await saveCollectionSavedSessions([...sessions, session]);

  return { code: "created", session };
}

async function renameCollectionSession(sessionId, name) {
  const normalizedName = normalizeCollectionSessionName(name);
  const sessions = await getCollectionSavedSessions();
  const sessionIndex = sessions.findIndex((session) => session.id === sessionId);

  if (sessionIndex < 0) {
    throw new Error("not_found");
  }

  sessions[sessionIndex] = {
    ...sessions[sessionIndex],
    name: normalizedName,
    updatedAt: new Date().toISOString()
  };
  await saveCollectionSavedSessions(sessions);

  return {
    code: "renamed",
    session: sessions[sessionIndex]
  };
}

async function addDescriptorToDestination(target, descriptor) {
  if (!target?.kind || target.id === undefined || target.id === null) {
    throw new Error("not_found");
  }

  if (target.kind === "session") {
    return addDescriptorToSession(target.id, descriptor);
  }

  throw new Error("not_found");
}

async function handleCollectionMessage(message) {
  if (message.type === "tabOut:ensureSessionMigration") {
    const sessions = await ensureUnifiedSessionsMigration();
    return {
      ok: true,
      version: SESSION_SCHEMA_VERSION,
      sessionsCount: sessions.length
    };
  }

  if (message.type === "tabOut:getAddDestinations") {
    return {
      ok: true,
      ...(await getCollectionAddDestinations())
    };
  }

  if (
    message.type === "tabOut:addActiveTab" ||
    message.type === "tabOut:addTabToSession"
  ) {
    const activeTab = await getCollectionBrowserTab(message.tabId);

    if (!activeTab || isTabOutPage(activeTab.pendingUrl || activeTab.url || "")) {
      throw new Error("unsupported_url");
    }

    const descriptor = createStoredTabDescriptor(activeTab);
    const target = message.type === "tabOut:addTabToSession"
      ? { kind: "session", id: message.sessionId }
      : message.target;
    const result = await addDescriptorToDestination(target, descriptor);

    return { ok: true, ...result };
  }

  if (message.type === "tabOut:createSessionFromTabs") {
    const result = await createSessionFromDescriptors(
      message.name,
      message.tabs
    );

    return { ok: true, ...result };
  }

  if (message.type === "tabOut:renameSession") {
    const result = await renameCollectionSession(
      message.sessionId,
      message.name
    );

    return { ok: true, ...result };
  }

  if (message.type === "tabOut:removeActiveTab") {
    const activeTab = await getCollectionBrowserTab(message.tabId);

    if (!activeTab || isTabOutPage(activeTab.pendingUrl || activeTab.url || "")) {
      throw new Error("unsupported_url");
    }

    if (message.target?.kind !== "session") {
      throw new Error("not_found");
    }

    const descriptor = createStoredTabDescriptor(activeTab);
    const result = await removeDescriptorFromSession(
      message.target.id,
      descriptor.url
    );

    return { ok: true, ...result };
  }

  if (message.type === "tabOut:normalizeManualLink") {
    const url = parseCollectionLink(message.link?.url);
    const descriptor = createStoredTabDescriptor(
      { url },
      message.link?.title || ""
    );

    return { ok: true, tab: descriptor };
  }

  throw new Error("not_found");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!String(message?.type || "").startsWith("tabOut:")) {
    return undefined;
  }

  handleCollectionMessage(message)
    .then(sendResponse)
    .catch((error) => {
      const knownCodes = new Set([
        "invalid_url",
        "unsupported_url",
        "not_found",
        "already_added",
        "already_removed",
        "invalid_name",
        "invalid_tabs"
      ]);
      const code = knownCodes.has(error?.message)
        ? error.message
        : "chrome_api_failed";

      console.warn("[tab-out] collection action failed:", error);
      sendResponse({ ok: false, code });
    });

  return true;
});
