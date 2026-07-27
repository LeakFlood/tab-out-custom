const GMAIL_ACCOUNTS_KEY = globalThis.TabOutGmailAuth.KEYS.accounts;
const GMAIL_THREAD_CACHE_KEY = "tabOutGmailThreadCacheV3";
const GMAIL_SYNC_STATE_KEY = "tabOutGmailSyncStateV1";
const GMAIL_POPUP_TARGET_KEY = "tabOutGmailPopupTargetV1";
const GMAIL_ALARM_PREFIX = "tabOutGmailPoll:";
const GMAIL_NOTIFICATION_PREFIX = "tabout-gmail:";
const GMAIL_NOTIFICATION_FETCH_LIMIT = 100;
const GMAIL_KNOWN_MESSAGE_LIMIT = 500;
const GMAIL_NOTIFICATION_BURST_LIMIT = 5;

function createGmailError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function gmailMessageKeyForCode(code) {
  const keyByCode = {
    account_exists: "gmailAccountAlreadyConnected",
    account_not_found: "gmailAccountNotFound",
    browser_unsupported: "gmailBrowserUnsupported",
    callback_failed: "gmailOAuthCallbackFailed",
    cancelled: "gmailOAuthCancelled",
    config_missing: "gmailConfigMissing",
    gmail_api_not_enabled: "gmailApiNotEnabled",
    invalid_grant: "gmailAuthorizationExpired",
    invalid_query: "gmailInvalidQuery",
    network_error: "gmailNetworkError",
    notifications_denied: "gmailNotificationsDenied",
    oauth_authorization_code_rejected:
      "gmailOAuthAuthorizationCodeRejected",
    oauth_client_secret_missing: "gmailOAuthClientSecretMissing",
    oauth_invalid_client: "gmailOAuthInvalidClient",
    oauth_invalid_request: "gmailOAuthInvalidRequest",
    oauth_redirect_uri_mismatch: "gmailOAuthRedirectMismatch",
    oauth_scope_not_granted: "gmailOAuthScopeNotGranted",
    oauth_unauthorized_client: "gmailOAuthUnauthorizedClient",
    oauth_client_in_use: "gmailOAuthClientInUse",
    oauth_timeout: "gmailOAuthTimeout",
    permission_denied: "gmailPermissionDenied",
    reconnect_account_mismatch: "gmailReconnectAccountMismatch",
    reconnect_required: "gmailAuthorizationExpired",
    refresh_token_missing: "gmailRefreshTokenMissing",
    state_mismatch: "gmailOAuthStateMismatch",
    token_exchange_failed: "gmailTokenExchangeFailed"
  };
  return keyByCode[code] || "gmailWidgetError";
}

function getGmailConfig() {
  return globalThis.TabOutGmailConfig;
}

async function getDashboardSettings() {
  const settingsApi = globalThis.TabOutDashboardSettings;
  const stored = await chrome.storage.local.get(settingsApi.STORAGE_KEY);
  return settingsApi.normalizeSettings(stored[settingsApi.STORAGE_KEY]);
}

async function saveDashboardSettings(settings) {
  const settingsApi = globalThis.TabOutDashboardSettings;
  await chrome.storage.local.set({
    [settingsApi.STORAGE_KEY]: settingsApi.normalizeSettings(settings)
  });
}

async function ensureAccountPreferences(accountId) {
  const settings = await getDashboardSettings();
  const gmailSettings = settings.integrations.gmail;

  if (!gmailSettings.accountPreferences[accountId]) {
    gmailSettings.accountPreferences[accountId] =
      globalThis.TabOutDashboardSettings.clone(
        gmailSettings.accountDefaults
      );
    await saveDashboardSettings(settings);
  }

  return gmailSettings.accountPreferences[accountId];
}

async function removeAccountPreferences(accountId) {
  const settings = await getDashboardSettings();

  if (settings.integrations.gmail.accountPreferences[accountId]) {
    delete settings.integrations.gmail.accountPreferences[accountId];
    await saveDashboardSettings(settings);
  }
}

async function getAccountPreferences(accountId) {
  const settings = await getDashboardSettings();
  return (
    settings.integrations.gmail.accountPreferences[accountId] ||
    settings.integrations.gmail.accountDefaults
  );
}

async function initializeGmailAuthStorage() {
  await globalThis.TabOutGmailAuth.initialized;
  return globalThis.TabOutGmailAuth.getAccountsStore();
}

async function getAccountsStore() {
  return globalThis.TabOutGmailAuth.getAccountsStore();
}

async function saveAccountsStore(store) {
  return globalThis.TabOutGmailAuth.saveAccountsStore(store);
}

async function getGmailAccount(accountId) {
  return globalThis.TabOutGmailAuth.getAccount(accountId);
}

async function updateGmailAccount(accountId, updates) {
  return globalThis.TabOutGmailAuth.updateAccount(accountId, updates);
}

async function removeGmailAccessToken(accountId) {
  return globalThis.TabOutGmailAuth.invalidateAccessToken(accountId);
}

async function getGmailAuthReadiness() {
  const readiness = await globalThis.TabOutGmailAuth.getReadiness();
  return {
    ok: readiness.ready,
    ...readiness
  };
}

async function getGmailOAuthSettings() {
  return globalThis.TabOutGmailAuth.getOAuthSettingsSummary();
}

async function markAccountReconnectRequired(accountId) {
  await globalThis.TabOutGmailAuth.markReconnectRequired(accountId);
  await clearAccountThreadCache(accountId);
}

async function getGmailAccessToken(accountId) {
  return globalThis.TabOutGmailAuth.getAccessToken(accountId);
}

async function gmailApiRequestWithToken(
  token,
  path,
  options = {}
) {
  return globalThis.TabOutGmailApi.requestWithToken(
    token,
    path,
    options
  );
}

async function gmailApiRequest(
  accountId,
  path,
  options = {},
  retryAuthorization = true
) {
  return globalThis.TabOutGmailApi.request(
    accountId,
    path,
    options,
    retryAuthorization
  );
}

function getHeaderValue(message, name) {
  const headers = Array.isArray(message?.payload?.headers)
    ? message.payload.headers
    : [];
  const header = headers.find(
    (candidate) =>
      String(candidate?.name || "").toLocaleLowerCase() ===
      name.toLocaleLowerCase()
  );
  return String(header?.value || "").trim();
}

function cleanGmailHeaderText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGmailSender(fromHeader) {
  const cleaned = cleanGmailHeaderText(fromHeader);
  const addressMatch = cleaned.match(/<([^<>]+)>/);
  const email = cleanGmailHeaderText(addressMatch?.[1] || cleaned);
  const rawName = addressMatch
    ? cleaned.slice(0, addressMatch.index).trim()
    : "";
  const name = rawName.replace(/^["']|["']$/g, "").trim();

  return {
    name: name || email || "Gmail",
    email
  };
}

function normalizeGmailThread(thread, accountId) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  const orderedMessages = [...messages].sort(
    (first, second) =>
      Number(first?.internalDate || 0) -
      Number(second?.internalDate || 0)
  );
  const latestMessage = orderedMessages[orderedMessages.length - 1] || {};
  const sender = parseGmailSender(getHeaderValue(latestMessage, "From"));
  const subject =
    cleanGmailHeaderText(getHeaderValue(latestMessage, "Subject")) ||
    "(No subject)";
  const timestamp =
    Number(latestMessage.internalDate) ||
    Date.parse(getHeaderValue(latestMessage, "Date")) ||
    0;
  const labelIds = Array.isArray(latestMessage.labelIds)
    ? latestMessage.labelIds
    : [];

  return {
    accountId,
    threadId: String(thread.id || ""),
    latestMessageId: String(latestMessage.id || ""),
    senderName: sender.name,
    senderEmail: sender.email,
    subject,
    snippet: cleanGmailHeaderText(
      latestMessage.snippet || thread.snippet || ""
    ),
    timestamp,
    unread: orderedMessages.some((message) =>
      Array.isArray(message?.labelIds) &&
      message.labelIds.includes("UNREAD")
    ),
    starred: labelIds.includes("STARRED"),
    inbox: labelIds.includes("INBOX"),
    messageCount: orderedMessages.length
  };
}

function normalizeGmailNotificationMessage(message, accountId) {
  const sender = parseGmailSender(getHeaderValue(message, "From"));
  return {
    accountId,
    id: String(message?.id || ""),
    threadId: String(message?.threadId || ""),
    senderName: sender.name,
    senderEmail: sender.email,
    subject:
      cleanGmailHeaderText(getHeaderValue(message, "Subject")) ||
      "(No subject)",
    snippet: cleanGmailHeaderText(message?.snippet || ""),
    timestamp:
      Number(message?.internalDate) ||
      Date.parse(getHeaderValue(message, "Date")) ||
      Date.now()
  };
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] =
        await mapper(values[currentIndex], currentIndex);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    () => runWorker()
  );
  await Promise.all(workers);
  return results;
}

function composeGmailQuery(preferences) {
  const queryParts = [];
  const filters = preferences?.filters || {};

  if (filters.inbox) {
    queryParts.push("in:inbox");
  }

  if (filters.unread) {
    queryParts.push("is:unread");
  }

  if (filters.starred) {
    queryParts.push("is:starred");
  }

  if (filters.important) {
    queryParts.push("is:important");
  }

  if (preferences?.advancedQuery) {
    queryParts.push(String(preferences.advancedQuery).trim());
  }

  return queryParts.filter(Boolean).join(" ");
}

async function getThreadCache() {
  const stored = await chrome.storage.session.get(GMAIL_THREAD_CACHE_KEY);
  return stored[GMAIL_THREAD_CACHE_KEY] || {};
}

async function setThreadCache(cache) {
  await chrome.storage.session.set({
    [GMAIL_THREAD_CACHE_KEY]: cache
  });
}

async function clearAccountThreadCache(accountId) {
  const cache = await getThreadCache();
  delete cache[accountId];
  await setThreadCache(cache);
}

async function listGmailThreads(accountId, { force = false } = {}) {
  await getGmailAccount(accountId);
  const preferences = await getAccountPreferences(accountId);
  const query = composeGmailQuery(preferences);
  const signature = JSON.stringify({
    query,
    maxResults: preferences.maxResults
  });
  const cache = await getThreadCache();
  const cached = cache[accountId];
  const cacheAge = Date.now() - Number(cached?.fetchedAt || 0);
  const maxAge = getGmailConfig()?.CACHE_MAX_AGE_MS || 5 * 60 * 1000;

  if (
    !force &&
    cached?.signature === signature &&
    cacheAge >= 0 &&
    cacheAge < maxAge
  ) {
    return {
      ...cached,
      fromCache: true,
      stale: false
    };
  }

  try {
    const search = new URLSearchParams({
      maxResults: String(preferences.maxResults)
    });

    if (query) {
      search.set("q", query);
    }

    const list = await gmailApiRequest(
      accountId,
      `/gmail/v1/users/me/threads?${search.toString()}`
    );
    const references = Array.isArray(list.threads) ? list.threads : [];
    const threads = await mapWithConcurrency(
      references,
      4,
      async (reference) => {
        const metadataSearch = new URLSearchParams({ format: "metadata" });

        ["From", "Subject", "Date"].forEach((headerName) => {
          metadataSearch.append("metadataHeaders", headerName);
        });

        const thread = await gmailApiRequest(
          accountId,
          `/gmail/v1/users/me/threads/${encodeURIComponent(
            reference.id
          )}?${metadataSearch.toString()}`
        );
        return normalizeGmailThread(thread, accountId);
      }
    );
    const result = {
      accountId,
      signature,
      query,
      fetchedAt: Date.now(),
      resultSizeEstimate:
        Number(list.resultSizeEstimate) || threads.length,
      threads
    };
    cache[accountId] = result;
    await setThreadCache(cache);
    return {
      ...result,
      fromCache: false,
      stale: false
    };
  } catch (error) {
    if (cached?.threads && cached.signature === signature) {
      return {
        ...cached,
        fromCache: true,
        stale: true,
        refreshError: error.code || "gmail_api_failed"
      };
    }

    throw error;
  }
}

function decodeBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function collectMimeBodies(part, target) {
  if (!part || typeof part !== "object") {
    return;
  }

  const mimeType = String(part.mimeType || "").toLocaleLowerCase();
  const data = part.body?.data;

  if (data && mimeType === "text/plain") {
    target.plain.push(data);
  } else if (data && mimeType === "text/html") {
    target.html.push(data);
  }

  if (Array.isArray(part.parts)) {
    part.parts.forEach((child) => collectMimeBodies(child, target));
  }
}

function extractGmailBody(payload) {
  const candidates = { plain: [], html: [] };
  collectMimeBodies(payload, candidates);
  const encoded = candidates.plain[0] || candidates.html[0];

  if (!encoded) {
    return {
      kind: "none",
      content: "",
      truncated: false
    };
  }

  let content = "";

  try {
    content = decodeBase64Url(encoded);
  } catch {
    return {
      kind: "none",
      content: "",
      truncated: false
    };
  }

  const maxLength =
    getGmailConfig()?.MAX_RENDERED_BODY_BYTES || 512 * 1024;
  const truncated = new TextEncoder().encode(content).length > maxLength;

  return {
    kind: candidates.plain.length ? "plain" : "html",
    content: truncated ? content.slice(0, maxLength) : content,
    truncated
  };
}

function normalizeGmailMessage(message, accountId) {
  const sender = parseGmailSender(getHeaderValue(message, "From"));
  const labelIds = Array.isArray(message?.labelIds)
    ? message.labelIds
    : [];

  return {
    accountId,
    id: String(message?.id || ""),
    threadId: String(message?.threadId || ""),
    senderName: sender.name,
    senderEmail: sender.email,
    subject:
      cleanGmailHeaderText(getHeaderValue(message, "Subject")) ||
      "(No subject)",
    timestamp:
      Number(message?.internalDate) ||
      Date.parse(getHeaderValue(message, "Date")) ||
      0,
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
    inbox: labelIds.includes("INBOX"),
    body: extractGmailBody(message?.payload)
  };
}

function assertGmailResourceId(value) {
  const id = String(value || "");

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw createGmailError("invalid_request");
  }

  return id;
}

async function getLatestGmailMessage(accountId, messageId) {
  const id = assertGmailResourceId(messageId);
  const message = await gmailApiRequest(
    accountId,
    `/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=full`
  );
  return normalizeGmailMessage(message, accountId);
}

async function getFullGmailThread(accountId, threadId) {
  const id = assertGmailResourceId(threadId);
  const thread = await gmailApiRequest(
    accountId,
    `/gmail/v1/users/me/threads/${encodeURIComponent(id)}?format=full`
  );
  const messages = Array.isArray(thread.messages)
    ? thread.messages.map((message) =>
        normalizeGmailMessage(message, accountId)
      )
    : [];
  messages.sort((first, second) => first.timestamp - second.timestamp);
  return {
    accountId,
    threadId: id,
    messages
  };
}

async function cancelGmailAccountConnection(transactionId = "") {
  return globalThis.TabOutGmailAuth.cancelConnect(transactionId);
}

async function connectGmailAccount(options = {}) {
  return globalThis.TabOutGmailAuth.beginConnect(options);
}

async function clearAccountsAfterOAuthChange(accounts) {
  await Promise.all(
    accounts.map(async (account) => {
      await clearAccountThreadCache(account.accountId);
      await chrome.alarms?.clear?.(
        `${GMAIL_ALARM_PREFIX}${account.accountId}`
      );
    })
  );
  const syncState = await getSyncState();
  accounts.forEach((account) => {
    delete syncState[account.accountId];
  });
  await setSyncState(syncState);
  await requestTabOutBadgeRefresh();
}

async function saveSharedGmailOAuthClient(message) {
  const result = await globalThis.TabOutGmailAuth.saveSharedOAuthClient(
    {
      clientId: message.clientId,
      clientSecret: message.clientSecret
    },
    {
      replaceConnected: message.replaceConnected === true
    }
  );
  await clearAccountsAfterOAuthChange(
    result.affectedAccounts || []
  );
  return result;
}

async function removeSharedGmailOAuthClient(message) {
  const result =
    await globalThis.TabOutGmailAuth.removeSharedOAuthClient({
      replaceConnected: message.replaceConnected === true
    });
  await clearAccountsAfterOAuthChange(
    result.affectedAccounts || []
  );
  return result;
}

async function disconnectGmailAccount(accountId) {
  const result = await globalThis.TabOutGmailAuth.disconnect(accountId);
  await clearAccountThreadCache(accountId);
  await removeAccountSyncState(accountId);
  await removeAccountPreferences(accountId);
  await chrome.alarms?.clear?.(`${GMAIL_ALARM_PREFIX}${accountId}`);
  await requestTabOutBadgeRefresh();
  return result;
}

async function getSyncState() {
  const stored = await chrome.storage.local.get(GMAIL_SYNC_STATE_KEY);
  return stored[GMAIL_SYNC_STATE_KEY] || {};
}

async function setSyncState(state) {
  await chrome.storage.local.set({
    [GMAIL_SYNC_STATE_KEY]: state
  });
}

async function removeAccountSyncState(accountId) {
  const state = await getSyncState();
  delete state[accountId];
  await setSyncState(state);
}

async function getGmailUnreadTotal() {
  const state = await getSyncState();
  return Object.values(state).reduce(
    (total, account) =>
      total + Math.max(0, Number(account?.unreadCount) || 0),
    0
  );
}

async function getGmailUnreadByAccount() {
  const state = await getSyncState();
  return Object.fromEntries(
    Object.entries(state).map(([accountId, account]) => [
      accountId,
      Math.max(0, Number(account?.unreadCount) || 0)
    ])
  );
}

async function requestTabOutBadgeRefresh() {
  try {
    await globalThis.TabOutUpdateBadge?.();
  } catch {
    // Badge refresh is best effort.
  }
}

function notificationIdFor(message) {
  return `${GMAIL_NOTIFICATION_PREFIX}${message.accountId}:` +
    `${message.id}:${message.threadId}`;
}

function parseNotificationId(notificationId) {
  if (!notificationId.startsWith(GMAIL_NOTIFICATION_PREFIX)) {
    return null;
  }

  const [accountId, messageId, threadId] = notificationId
    .slice(GMAIL_NOTIFICATION_PREFIX.length)
    .split(":");

  if (!accountId || !messageId || !threadId) {
    return null;
  }

  return { accountId, messageId, threadId };
}

async function notificationsAreAvailable() {
  if (!chrome.notifications) {
    return false;
  }

  try {
    const contains = await chrome.permissions.contains({
      permissions: ["notifications"]
    });

    if (!contains) {
      return false;
    }

    if (chrome.notifications.getPermissionLevel) {
      return (
        await chrome.notifications.getPermissionLevel()
      ) === "granted";
    }

    return true;
  } catch {
    return false;
  }
}

async function getGmailNotificationCopy() {
  const stored = await chrome.storage.local.get("tabOutLanguage");
  const language = stored.tabOutLanguage === "en" ? "en" : "fr";
  return language === "en"
    ? {
        newUnread: "New unread message",
        noSubject: "(No subject)",
        markRead: "Mark as read",
        archive: "Archive",
        summary: "{count} new Gmail messages"
      }
    : {
        newUnread: "Nouveau message non lu",
        noSubject: "(Sans objet)",
        markRead: "Marquer comme lu",
        archive: "Archiver",
        summary: "{count} nouveaux messages Gmail"
      };
}

function notificationText(message, previewMode, labels) {
  if (previewMode === "private") {
    return {
      title: "Gmail",
      message: labels.newUnread
    };
  }

  if (previewMode === "senderSubject") {
    return {
      title: message.senderName || message.senderEmail || "Gmail",
      message: message.subject || labels.noSubject
    };
  }

  const subject = message.subject || labels.noSubject;
  const snippet = message.snippet || "";
  return {
    title: message.senderName || message.senderEmail || "Gmail",
    message: snippet ? `${subject} — ${snippet}` : subject
  };
}

async function showGmailMessageNotification(account, preferences, message) {
  const labels = await getGmailNotificationCopy();
  const copy = notificationText(
    message,
    preferences.notificationPreview,
    labels
  );
  await chrome.notifications.create(notificationIdFor(message), {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: copy.title.slice(0, 120),
    message: copy.message.slice(0, 320),
    contextMessage: account.email,
    eventTime: message.timestamp,
    buttons: [
      { title: labels.markRead },
      { title: labels.archive }
    ],
    priority: 1
  });
}

async function showGmailSummaryNotification(account, messages) {
  const labels = await getGmailNotificationCopy();
  await chrome.notifications.create(
    `${GMAIL_NOTIFICATION_PREFIX}${account.accountId}:summary:summary`,
    {
      type: "list",
      iconUrl: "icons/icon128.png",
      title: labels.summary.replace("{count}", String(messages.length)),
      message: account.email,
      contextMessage: account.email,
      items: messages.slice(0, 5).map((message) => ({
        title: message.senderName || message.senderEmail || "Gmail",
        message: message.subject || labels.noSubject
      })),
      priority: 1
    }
  );
}

async function fetchNotificationMessage(accountId, messageId) {
  const search = new URLSearchParams({ format: "metadata" });
  ["From", "Subject", "Date"].forEach((headerName) => {
    search.append("metadataHeaders", headerName);
  });
  const message = await gmailApiRequest(
    accountId,
    `/gmail/v1/users/me/messages/${encodeURIComponent(
      messageId
    )}?${search.toString()}`
  );
  return normalizeGmailNotificationMessage(message, accountId);
}

async function queryUnreadCount(accountId) {
  const inboxLabel = await gmailApiRequest(
    accountId,
    "/gmail/v1/users/me/labels/INBOX"
  );
  return Math.max(0, Number(inboxLabel.messagesUnread) || 0);
}

async function pollGmailAccount(
  accountId,
  {
    notify = true,
    forceSeed = false
  } = {}
) {
  const account = await getGmailAccount(accountId);

  if (account.reconnectRequired) {
    return {
      ok: false,
      accountId,
      code: "reconnect_required"
    };
  }

  const preferences = await getAccountPreferences(accountId);

  if (!preferences.pollingEnabled && notify) {
    return {
      ok: true,
      accountId,
      skipped: true
    };
  }

  const query = composeGmailQuery(preferences);
  const querySignature = JSON.stringify({ query });
  const search = new URLSearchParams({
    maxResults: String(GMAIL_NOTIFICATION_FETCH_LIMIT)
  });

  if (query) {
    search.set("q", query);
  }

  const [result, unreadCount] = await Promise.all([
    gmailApiRequest(
      accountId,
      `/gmail/v1/users/me/messages?${search.toString()}`
    ),
    queryUnreadCount(accountId)
  ]);
  const currentIds = (Array.isArray(result.messages) ? result.messages : [])
    .map((message) => String(message.id || ""))
    .filter(Boolean);
  const syncState = await getSyncState();
  const previous = syncState[accountId] || {};
  const mustSeed =
    forceSeed ||
    !previous.initialized ||
    previous.querySignature !== querySignature;
  const knownIds = new Set(
    Array.isArray(previous.knownMessageIds)
      ? previous.knownMessageIds
      : []
  );
  const newIds = mustSeed
    ? []
    : currentIds.filter((messageId) => !knownIds.has(messageId));
  let newMessages = [];

  if (newIds.length) {
    newMessages = await mapWithConcurrency(
      newIds.slice(0, 20),
      4,
      (messageId) => fetchNotificationMessage(accountId, messageId)
    );
    newMessages.sort(
      (first, second) => first.timestamp - second.timestamp
    );
  }

  const mergedKnownIds = [
    ...currentIds,
    ...Array.from(knownIds).filter(
      (messageId) => !currentIds.includes(messageId)
    )
  ].slice(0, GMAIL_KNOWN_MESSAGE_LIMIT);
  syncState[accountId] = {
    initialized: true,
    querySignature,
    knownMessageIds: mergedKnownIds,
    unreadCount,
    lastSuccessfulPollAt: Date.now(),
    consecutiveFailures: 0
  };
  await setSyncState(syncState);
  await requestTabOutBadgeRefresh();

  if (
    notify &&
    preferences.notificationsEnabled &&
    newMessages.length &&
    await notificationsAreAvailable()
  ) {
    if (newMessages.length > GMAIL_NOTIFICATION_BURST_LIMIT) {
      await showGmailSummaryNotification(account, newMessages);
    } else {
      for (const message of newMessages) {
        await showGmailMessageNotification(
          account,
          preferences,
          message
        );
      }
    }
  }

  return {
    ok: true,
    accountId,
    unreadCount,
    newMessageCount: newMessages.length,
    lastSuccessfulPollAt: syncState[accountId].lastSuccessfulPollAt
  };
}

async function recordPollFailure(accountId, error) {
  const state = await getSyncState();
  const previous = state[accountId] || {};
  state[accountId] = {
    ...previous,
    consecutiveFailures:
      Math.min(6, Number(previous.consecutiveFailures) || 0) + 1,
    lastFailureAt: Date.now(),
    lastFailureCode: error?.code || "gmail_api_failed"
  };
  await setSyncState(state);
}

async function seedGmailNotificationState(accountId) {
  try {
    return await pollGmailAccount(accountId, {
      notify: false,
      forceSeed: true
    });
  } catch (error) {
    await recordPollFailure(accountId, error);
    return {
      ok: false,
      accountId,
      code: error?.code || "gmail_api_failed"
    };
  }
}

async function pollAllGmailAccounts({ notify = true } = {}) {
  const store = await getAccountsStore();
  const results = [];

  for (const account of store.accounts) {
    try {
      results.push(
        await pollGmailAccount(account.accountId, { notify })
      );
    } catch (error) {
      await recordPollFailure(account.accountId, error);
      results.push({
        ok: false,
        accountId: account.accountId,
        code: error?.code || "gmail_api_failed"
      });
    }
  }

  return results;
}

async function syncGmailAlarms() {
  if (!chrome.alarms) {
    return;
  }

  let alarmsAllowed = false;

  try {
    alarmsAllowed = await chrome.permissions.contains({
      permissions: ["alarms"]
    });
  } catch {
    alarmsAllowed = false;
  }

  if (!alarmsAllowed) {
    return;
  }

  const [store, settings, alarms] = await Promise.all([
    getAccountsStore(),
    getDashboardSettings(),
    chrome.alarms.getAll()
  ]);
  const expectedNames = new Set();

  for (const account of store.accounts) {
    const preferences =
      settings.integrations.gmail.accountPreferences[account.accountId] ||
      settings.integrations.gmail.accountDefaults;
    const alarmName = `${GMAIL_ALARM_PREFIX}${account.accountId}`;

    if (
      alarmsAllowed &&
      preferences.pollingEnabled &&
      !account.reconnectRequired
    ) {
      expectedNames.add(alarmName);
      const existing = alarms.find((alarm) => alarm.name === alarmName);

      if (
        !existing ||
        existing.periodInMinutes !==
          preferences.pollingIntervalMinutes
      ) {
        await chrome.alarms.create(alarmName, {
          delayInMinutes: preferences.pollingIntervalMinutes,
          periodInMinutes: preferences.pollingIntervalMinutes
        });
      }
    }
  }

  for (const alarm of alarms) {
    if (
      alarm.name.startsWith(GMAIL_ALARM_PREFIX) &&
      !expectedNames.has(alarm.name)
    ) {
      await chrome.alarms.clear(alarm.name);
    }
  }
}

async function applyGmailThreadAction(accountId, threadId, action) {
  const id = assertGmailResourceId(threadId);
  const modifyActions = {
    markRead: { removeLabelIds: ["UNREAD"] },
    markUnread: { addLabelIds: ["UNREAD"] },
    archive: { removeLabelIds: ["INBOX"] },
    restoreInbox: { addLabelIds: ["INBOX"] },
    star: { addLabelIds: ["STARRED"] },
    unstar: { removeLabelIds: ["STARRED"] }
  };

  if (modifyActions[action]) {
    await gmailApiRequest(
      accountId,
      `/gmail/v1/users/me/threads/${encodeURIComponent(id)}/modify`,
      {
        method: "POST",
        body: modifyActions[action]
      }
    );
  } else if (action === "trash" || action === "untrash") {
    await gmailApiRequest(
      accountId,
      `/gmail/v1/users/me/threads/${encodeURIComponent(id)}/${action}`,
      { method: "POST" }
    );
  } else {
    throw createGmailError("invalid_request");
  }

  await clearAccountThreadCache(accountId);

  try {
    await pollGmailAccount(accountId, { notify: false });
  } catch {
    // The action succeeded; background refresh can recover later.
  }

  return {
    accountId,
    threadId: id,
    action
  };
}

async function publicGmailAccount(account) {
  const [preferences, syncState] = await Promise.all([
    getAccountPreferences(account.accountId),
    getSyncState()
  ]);
  const sync = syncState[account.accountId] || {};

  return {
    accountId: account.accountId,
    email: account.email,
    connectedAt: account.connectedAt,
    reconnectRequired: Boolean(account.reconnectRequired),
    credentialSource:
      account.credentialSource === "dedicated"
        ? "dedicated"
        : "shared",
    scope: String(account.scope || getGmailConfig().GMAIL_SCOPE),
    preferences,
    unreadCount: Math.max(0, Number(sync.unreadCount) || 0),
    lastSuccessfulPollAt:
      Number(sync.lastSuccessfulPollAt) || 0,
    lastFailureCode: String(sync.lastFailureCode || "")
  };
}

async function getGmailState() {
  const readiness = await globalThis.TabOutGmailAuth.getReadiness();
  const store = await getAccountsStore();
  const accounts = await Promise.all(
    store.accounts.map(publicGmailAccount)
  );
  const reconnectRequired = accounts.some(
    (account) => account.reconnectRequired
  );

  return {
    status: readiness.pending
      ? "connecting"
      : accounts.length
        ? reconnectRequired
          ? "reconnect_required"
          : "connected"
        : readiness.ready
          ? "disconnected"
          : "unavailable",
    accounts,
    authReadiness: readiness,
    pendingAuth: readiness.pending
  };
}

async function openGmailTarget(accountId, threadId = "") {
  const account = await getGmailAccount(accountId);
  const safeThreadId = threadId
    ? assertGmailResourceId(threadId)
    : "";
  const targetUrl = safeThreadId
    ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(
        account.email
      )}#all/${safeThreadId}`
    : `https://mail.google.com/mail/?authuser=${encodeURIComponent(
        account.email
      )}#inbox`;
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => {
    const url = String(tab.pendingUrl || tab.url || "");

    if (!url.startsWith("https://mail.google.com/")) {
      return false;
    }

    return safeThreadId ? url.includes(safeThreadId) : url === targetUrl;
  });

  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });

    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }

    return { reused: true, tabId: existing.id };
  }

  const created = await chrome.tabs.create({
    url: targetUrl,
    active: true
  });
  return {
    reused: false,
    tabId: created.id
  };
}

async function openGmailPopupTarget(target) {
  await chrome.storage.session.set({
    [GMAIL_POPUP_TARGET_KEY]: {
      view: "mail",
      ...target,
      createdAt: Date.now()
    }
  });

  if (chrome.action.openPopup) {
    try {
      await chrome.action.openPopup();
      return;
    } catch {
      // Brave and older Chromium versions use the dashboard fallback.
    }
  }

  const dashboardUrl = chrome.runtime.getURL(
    `index.html#gmail=${encodeURIComponent(
      target.accountId || ""
    )}`
  );
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) =>
    String(tab.url || "").startsWith(chrome.runtime.getURL("index.html"))
  );

  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, {
      active: true,
      url: dashboardUrl
    });

    if (existing.windowId !== undefined) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({
      url: dashboardUrl,
      active: true
    });
  }
}

async function handleGmailMessage(message) {
  switch (message.type) {
    case "tabOutGmail:getState":
      return {
        ok: true,
        ...(await getGmailState())
      };
    case "tabOutGmail:getAuthReadiness":
      return await getGmailAuthReadiness();
    case "tabOutGmail:getOAuthSettings":
      return {
        ok: true,
        ...(await getGmailOAuthSettings())
      };
    case "tabOutGmail:saveSharedOAuthClient":
      return {
        ok: true,
        ...(await saveSharedGmailOAuthClient(message))
      };
    case "tabOutGmail:removeSharedOAuthClient":
      return {
        ok: true,
        ...(await removeSharedGmailOAuthClient(message))
      };
    case "tabOutGmail:beginConnect":
      return {
        ok: true,
        ...(await connectGmailAccount({
          replaceAccountId: String(message.replaceAccountId || ""),
          credentialSource:
            message.credentialSource === "dedicated"
              ? "dedicated"
              : message.credentialSource === "shared"
                ? "shared"
                : "",
          oauthClient:
            message.oauthClient &&
            typeof message.oauthClient === "object"
              ? {
                  clientId: String(
                    message.oauthClient.clientId || ""
                  ),
                  clientSecret: String(
                    message.oauthClient.clientSecret || ""
                  )
                }
              : null
        }))
      };
    case "tabOutGmail:cancelConnect":
      return {
        ok: true,
        ...(await cancelGmailAccountConnection(
          String(message.transactionId || "")
        ))
      };
    case "tabOutGmail:disconnect":
      return {
        ok: true,
        ...(await disconnectGmailAccount(message.accountId))
      };
    case "tabOutGmail:listThreads":
      return {
        ok: true,
        ...(await listGmailThreads(message.accountId, {
          force: message.force === true
        }))
      };
    case "tabOutGmail:getLatestMessage":
      return {
        ok: true,
        message: await getLatestGmailMessage(
          message.accountId,
          message.messageId
        )
      };
    case "tabOutGmail:getThread":
      return {
        ok: true,
        thread: await getFullGmailThread(
          message.accountId,
          message.threadId
        )
      };
    case "tabOutGmail:action":
      return {
        ok: true,
        ...(await applyGmailThreadAction(
          message.accountId,
          message.threadId,
          message.action
        ))
      };
    case "tabOutGmail:poll":
      return {
        ok: true,
        results: message.accountId
          ? [
              await pollGmailAccount(message.accountId, {
                notify: message.notify === true,
                forceSeed: message.forceSeed === true
              })
            ]
          : await pollAllGmailAccounts({
              notify: message.notify === true
            })
      };
    case "tabOutGmail:syncAlarms":
      await syncGmailAlarms();
      return { ok: true };
    case "tabOutGmail:open":
      return {
        ok: true,
        ...(await openGmailTarget(
          message.accountId,
          message.threadId
        ))
      };
    case "tabOutGmail:getPopupTarget": {
      const stored = await chrome.storage.session.get(
        GMAIL_POPUP_TARGET_KEY
      );
      return {
        ok: true,
        target: stored[GMAIL_POPUP_TARGET_KEY] || null
      };
    }
    case "tabOutGmail:clearPopupTarget":
      await chrome.storage.session.remove(GMAIL_POPUP_TARGET_KEY);
      return { ok: true };
    default:
      throw createGmailError("not_found");
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    !String(message?.type || "").startsWith("tabOutGmail:") ||
    message.type === "tabOutGmail:authCompleted"
  ) {
    return undefined;
  }

  handleGmailMessage(message)
    .then(sendResponse)
    .catch((error) => {
      const code = error?.code || "gmail_api_failed";
      sendResponse({
        ok: false,
        code,
        messageKey: gmailMessageKeyForCode(code)
      });
    });

  return true;
});

function handleGmailAlarm(alarm) {
  if (alarm.name.startsWith(GMAIL_ALARM_PREFIX)) {
    const accountId = alarm.name.slice(GMAIL_ALARM_PREFIX.length);
    pollGmailAccount(accountId, { notify: true }).catch(async (error) => {
      await recordPollFailure(accountId, error);
    });
  }
}

function handleGmailNotificationClick(notificationId) {
  const target = parseNotificationId(notificationId);

  if (!target) {
    return;
  }

  chrome.notifications.clear(notificationId);
  openGmailPopupTarget(
    target.messageId === "summary"
      ? { accountId: target.accountId }
      : target
  );
}

function handleGmailNotificationButton(notificationId, buttonIndex) {
  const target = parseNotificationId(notificationId);

  if (!target || target.messageId === "summary") {
    return;
  }

  const action = buttonIndex === 0 ? "markRead" : "archive";
  applyGmailThreadAction(
    target.accountId,
    target.threadId,
    action
  )
    .then(() => chrome.notifications.clear(notificationId))
    .catch(() => undefined);
}

let gmailAlarmListenerRegistered = false;
let gmailNotificationListenersRegistered = false;

function registerGmailOptionalApiListeners() {
  if (!gmailAlarmListenerRegistered && chrome.alarms?.onAlarm) {
    chrome.alarms.onAlarm.addListener(handleGmailAlarm);
    gmailAlarmListenerRegistered = true;
  }

  if (
    !gmailNotificationListenersRegistered &&
    chrome.notifications?.onClicked &&
    chrome.notifications?.onButtonClicked
  ) {
    chrome.notifications.onClicked.addListener(
      handleGmailNotificationClick
    );
    chrome.notifications.onButtonClicked.addListener(
      handleGmailNotificationButton
    );
    gmailNotificationListenersRegistered = true;
  }
}

registerGmailOptionalApiListeners();
chrome.permissions?.onAdded?.addListener(() => {
  registerGmailOptionalApiListeners();
  syncGmailAlarms().catch(() => undefined);
});

async function handleGmailAccountsChanged(change) {
  const previousAccounts = Array.isArray(change?.oldValue?.accounts)
    ? change.oldValue.accounts
    : [];
  const currentAccounts = Array.isArray(change?.newValue?.accounts)
    ? change.newValue.accounts
    : [];
  const previousById = new Map(
    previousAccounts.map((account) => [account.accountId, account])
  );
  const connectedAccounts = currentAccounts.filter((account) => {
    const previous = previousById.get(account.accountId);
    return (
      !previous ||
      previous.connectedAt !== account.connectedAt ||
      previous.reconnectRequired !== account.reconnectRequired
    );
  });

  for (const account of connectedAccounts) {
    await clearAccountThreadCache(account.accountId);

    if (!account.reconnectRequired) {
      await seedGmailNotificationState(account.accountId).catch(
        () => undefined
      );
    }
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (
      changes[TabOutDashboardSettings.STORAGE_KEY] ||
      changes[GMAIL_ACCOUNTS_KEY]
    )
  ) {
    if (changes[GMAIL_ACCOUNTS_KEY]) {
      handleGmailAccountsChanged(
        changes[GMAIL_ACCOUNTS_KEY]
      ).catch(() => undefined);
    }
    syncGmailAlarms().catch(() => undefined);
    requestTabOutBadgeRefresh();
  }
});

async function initializeGmailService() {
  await initializeGmailAuthStorage();
  await syncGmailAlarms();
  await requestTabOutBadgeRefresh();
}

initializeGmailService().catch(() => undefined);
