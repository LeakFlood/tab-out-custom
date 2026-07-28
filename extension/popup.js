const POPUP_VIEW_KEY = "tabOutPopupLastView";
const DASHBOARD_SETTINGS_KEY = "tabOutDashboardSettings";
const POPUP_TRANSLATIONS = {
  fr: {
    titleCurrent: "Gérer l’onglet actuel",
    titleMail: "Consulter Gmail",
    currentTab: "Onglet actuel",
    mail: "Mail",
    search: "Rechercher une session…",
    sessions: "Sessions",
    add: "Ajouter",
    remove: "Retirer",
    adding: "Ajout…",
    removing: "Retrait…",
    saved: "Sauvegardée",
    groupOpen: "Groupe ouvert",
    groupChanged: "Modifications disponibles",
    groupClosed: "Groupe fermé",
    tabCount: "{count} onglet(s)",
    noSessions: "Aucune session correspondante.",
    unsupported: "Cet onglet ne peut pas être géré dans une session.",
    success: "Onglet ajouté à « {name} ».",
    removed: "Onglet retiré de « {name} ».",
    already: "Cet onglet est déjà présent dans « {name} ».",
    alreadyRemoved: "Cet onglet n’est déjà plus dans « {name} ».",
    failed: "Impossible d’ajouter cet onglet.",
    removeFailed: "Impossible de retirer cet onglet.",
    loading: "Chargement…",
    tabLinkCopied: "Lien de l’onglet copié.",
    tabLinkCopyFailed: "Impossible de copier le lien.",
    refresh: "Actualiser",
    openGmail: "Ouvrir Gmail",
    gmailUnavailable: "L’intégration Gmail n’est pas encore configurée.",
    gmailDisconnected: "Connecte Gmail dans les réglages du tableau de bord.",
    gmailOpenSettings: "Ouvrir le tableau de bord",
    gmailEmpty: "Aucune conversation ne correspond aux filtres.",
    gmailUnread: "{count} non lu(s)",
    gmailMarkRead: "Marquer comme lu",
    gmailMarkUnread: "Marquer comme non lu",
    gmailStar: "Ajouter aux suivis",
    gmailUnstar: "Retirer des suivis",
    gmailArchive: "Archiver",
    gmailTrash: "Mettre à la corbeille",
    gmailTrashConfirm: "Placer cette conversation dans la corbeille ?",
    gmailActionFailed: "Impossible d’appliquer cette action Gmail.",
    gmailLoadFailed: "Impossible de charger Gmail.",
    gmailNoBody: "Aucun aperçu texte disponible.",
    gmailReconnect: "Reconnexion requise depuis les réglages."
  },
  en: {
    titleCurrent: "Manage the current tab",
    titleMail: "Check Gmail",
    currentTab: "Current tab",
    mail: "Mail",
    search: "Search sessions…",
    sessions: "Sessions",
    add: "Add",
    remove: "Remove",
    adding: "Adding…",
    removing: "Removing…",
    saved: "Saved",
    groupOpen: "Group open",
    groupChanged: "Changes available",
    groupClosed: "Group closed",
    tabCount: "{count} tab(s)",
    noSessions: "No matching session.",
    unsupported: "This tab cannot be managed in a session.",
    success: "Tab added to “{name}”.",
    removed: "Tab removed from “{name}”.",
    already: "This tab is already in “{name}”.",
    alreadyRemoved: "This tab is already absent from “{name}”.",
    failed: "Could not add this tab.",
    removeFailed: "Could not remove this tab.",
    loading: "Loading…",
    tabLinkCopied: "Tab link copied.",
    tabLinkCopyFailed: "Could not copy the link.",
    refresh: "Refresh",
    openGmail: "Open Gmail",
    gmailUnavailable: "The Gmail integration is not configured yet.",
    gmailDisconnected: "Connect Gmail from the dashboard settings.",
    gmailOpenSettings: "Open dashboard",
    gmailEmpty: "No conversations match the filters.",
    gmailUnread: "{count} unread",
    gmailMarkRead: "Mark as read",
    gmailMarkUnread: "Mark as unread",
    gmailStar: "Star",
    gmailUnstar: "Unstar",
    gmailArchive: "Archive",
    gmailTrash: "Move to Trash",
    gmailTrashConfirm: "Move this conversation to Trash?",
    gmailActionFailed: "Could not apply this Gmail action.",
    gmailLoadFailed: "Could not load Gmail.",
    gmailNoBody: "No text preview is available.",
    gmailReconnect: "Reconnect this account from Settings."
  }
};

let popupContext = null;
let popupLanguage = "fr";
let popupQuery = "";
let popupView = "current";
let gmailState = null;
let gmailTarget = null;
const pendingDestinations = new Set();
const gmailThreads = new Map();
const gmailPreviews = new Map();
const pendingGmailActions = new Set();

function applyPopupPreferences(value) {
  document.documentElement.dataset.theme =
    value?.appearance?.theme === "light" ? "light" : "dark";
  document.documentElement.dataset.gmailAccountMask = String(
    value?.integrations?.gmail?.maskAccountAddresses === true
  );
}

async function loadPopupPreferences() {
  const stored = await chrome.storage.local.get(DASHBOARD_SETTINGS_KEY);
  applyPopupPreferences(stored[DASHBOARD_SETTINGS_KEY]);
}

function popupText(key, replacements = {}) {
  let value = POPUP_TRANSLATIONS[popupLanguage]?.[key] ||
    POPUP_TRANSLATIONS.fr[key] ||
    key;

  Object.entries(replacements).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });

  return value;
}

function sendPopupMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, code: "chrome_api_failed" });
        return;
      }

      resolve(response || { ok: false, code: "chrome_api_failed" });
    });
  });
}

function getPopupDomain(url = "") {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

function setPopupFeedback(message, isError = false) {
  const feedback = document.getElementById("popupFeedback");
  feedback.hidden = !message;
  feedback.textContent = message;
  feedback.classList.toggle("is-error", isError);
}

function applyPopupTranslations() {
  document.documentElement.lang = popupLanguage;
  document.getElementById("popupTitle").textContent = popupText(
    popupView === "mail" ? "titleMail" : "titleCurrent"
  );
  document.getElementById("popupMailTab").textContent = popupText("mail");
  document.getElementById("popupCurrentTab").textContent =
    popupText("currentTab");
  document.getElementById("sessionsHeading").textContent =
    popupText("sessions");
  document.getElementById("popupSearchInput").placeholder =
    popupText("search");
  document.getElementById("popupSearchLabel").textContent =
    popupText("search");
  document.getElementById("mailRefreshAllBtn").textContent =
    popupText("refresh");
}

function setPopupView(view, { persist = true } = {}) {
  popupView = view === "mail" ? "mail" : "current";
  document.querySelectorAll("[data-popup-view]").forEach((button) => {
    const selected = button.dataset.popupView === popupView;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  document.querySelectorAll("[data-popup-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.popupPanel !== popupView;
  });
  applyPopupTranslations();

  if (persist) {
    chrome.storage.session.set({ [POPUP_VIEW_KEY]: popupView });
  }

  if (popupView === "mail") {
    void ensureGmailLoaded();
  }
}

function renderActiveTab() {
  const activeTab = popupContext?.activeTab;
  const activeTabCard = document.getElementById("activeTabCard");
  const favicon = document.getElementById("activeTabFavicon");
  const unsupported = document.getElementById("popupUnsupported");
  favicon.replaceChildren();

  if (activeTab?.url) {
    activeTabCard.dataset.tabUrl = activeTab.url;
  } else {
    delete activeTabCard.dataset.tabUrl;
  }

  if (activeTab?.favIconUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = activeTab.favIconUrl;
    favicon.appendChild(image);
  } else {
    favicon.textContent = "◎";
  }

  document.getElementById("activeTabTitle").textContent =
    activeTab?.title || activeTab?.url || popupText("loading");
  document.getElementById("activeTabUrl").textContent =
    getPopupDomain(activeTab?.url || "");
  unsupported.hidden = Boolean(activeTab?.supported);
  unsupported.textContent = popupText("unsupported");
  document.getElementById("popupSearchInput").disabled =
    !activeTab?.supported;
}

function getDestinationKey(destination) {
  return `${destination.kind}:${destination.id}`;
}

function getDestinationMeta(destination) {
  return [
    popupText(destination.status),
    popupText("tabCount", { count: destination.tabsCount })
  ].join(" · ");
}

function createDestinationRow(destination) {
  const row = document.createElement("div");
  row.className = "destination-row";
  const dot = document.createElement("span");
  dot.className = "destination-dot";
  dot.style.setProperty("--destination-color", "#91cda3");
  const copy = document.createElement("span");
  copy.className = "destination-copy";
  const title = document.createElement("strong");
  title.textContent = destination.title;
  const meta = document.createElement("span");
  meta.textContent = getDestinationMeta(destination);
  const button = document.createElement("button");
  const destinationKey = getDestinationKey(destination);
  const isPending = pendingDestinations.has(destinationKey);
  const intent = destination.containsActiveTab ? "remove" : "add";
  button.type = "button";
  button.className = "destination-add";
  button.classList.toggle("is-remove", intent === "remove");
  button.dataset.destinationKind = destination.kind;
  button.dataset.destinationId = String(destination.id);
  button.dataset.destinationTitle = destination.title;
  button.dataset.intent = intent;
  button.disabled = isPending || !popupContext?.activeTab?.supported;
  button.textContent = isPending
    ? popupText(intent === "remove" ? "removing" : "adding")
    : popupText(intent === "remove" ? "remove" : "add");
  copy.append(title, meta);
  row.append(dot, copy, button);
  return row;
}

function renderDestinationList(destinations, containerId, emptyKey) {
  const container = document.getElementById(containerId);
  const normalizedQuery = popupQuery.trim().toLocaleLowerCase();
  const filtered = destinations.filter((destination) =>
    destination.title.toLocaleLowerCase().includes(normalizedQuery)
  );
  container.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "destination-empty";
    empty.textContent = popupText(emptyKey);
    container.appendChild(empty);
    return 0;
  }

  filtered.forEach((destination) => {
    container.appendChild(createDestinationRow(destination));
  });
  return filtered.length;
}

function renderCurrentTab() {
  if (!popupContext) {
    return;
  }

  renderActiveTab();
  const sessionCount = renderDestinationList(
    popupContext.sessions || [],
    "sessionDestinations",
    "noSessions"
  );
  document.getElementById("sessionsCount").textContent =
    String(sessionCount);
}

async function loadPopupContext() {
  const response = await sendPopupMessage({
    type: "tabOut:getAddDestinations"
  });

  if (!response.ok) {
    setPopupFeedback(popupText("failed"), true);
    return response;
  }

  popupContext = response;
  popupLanguage = response.language === "en" ? "en" : "fr";
  applyPopupTranslations();
  renderCurrentTab();
  return response;
}

async function mutateActiveTabDestination(button) {
  const destinationKey =
    `${button.dataset.destinationKind}:${button.dataset.destinationId}`;
  const intent = button.dataset.intent === "remove" ? "remove" : "add";
  pendingDestinations.add(destinationKey);
  setPopupFeedback("");
  renderCurrentTab();
  const response = await sendPopupMessage({
    type: intent === "remove"
      ? "tabOut:removeActiveTab"
      : "tabOut:addActiveTab",
    tabId: popupContext.activeTab.id,
    target: {
      kind: button.dataset.destinationKind,
      id: button.dataset.destinationId
    }
  });
  pendingDestinations.delete(destinationKey);

  if (!response.ok) {
    setPopupFeedback(
      popupText(intent === "remove" ? "removeFailed" : "failed"),
      true
    );
    renderCurrentTab();
    return;
  }

  const messageKey = intent === "remove"
    ? response.code === "already_removed"
      ? "alreadyRemoved"
      : "removed"
    : response.code === "already_added"
      ? "already"
      : "success";
  setPopupFeedback(
    popupText(messageKey, { name: button.dataset.destinationTitle })
  );
  await loadPopupContext();
}

function gmailThreadKey(accountId, threadId) {
  return `${accountId}:${threadId}`;
}

function gmailDate(timestamp) {
  if (!timestamp) {
    return "";
  }

  return new Intl.DateTimeFormat(popupLanguage, {
    month: "short",
    day: "numeric"
  }).format(new Date(timestamp));
}

function gmailMessageBody(message) {
  const body = message?.body;

  if (!body?.content) {
    return "";
  }

  if (body.kind !== "html") {
    return String(body.content).trim();
  }

  const parsed = new DOMParser().parseFromString(
    String(body.content),
    "text/html"
  );
  parsed.querySelectorAll(
    "script, style, iframe, object, embed, img, audio, video"
  ).forEach((element) => element.remove());
  return String(parsed.body?.textContent || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createGmailActionButton(account, thread, action, labelKey, symbol) {
  const button = document.createElement("button");
  const key = gmailThreadKey(account.accountId, thread.threadId);
  button.type = "button";
  button.className = `mail-thread-action is-${action}`;
  button.textContent = symbol;
  button.title = popupText(labelKey);
  button.setAttribute("aria-label", popupText(labelKey));
  button.disabled = pendingGmailActions.has(key);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    void performGmailAction(account, thread, action);
  });
  return button;
}

function createMailThread(account, thread) {
  const key = gmailThreadKey(account.accountId, thread.threadId);
  const row = document.createElement("article");
  row.className = "mail-thread";
  row.classList.toggle("is-unread", Boolean(thread.unread));
  const summary = document.createElement("button");
  summary.type = "button";
  summary.className = "mail-thread-summary";
  const content = document.createElement("span");
  content.className = "mail-thread-copy";
  const sender = document.createElement("strong");
  sender.textContent = thread.senderName || thread.senderEmail || "Gmail";
  const subject = document.createElement("span");
  subject.textContent = thread.subject || "(No subject)";
  const snippet = document.createElement("small");
  snippet.textContent = thread.snippet || "";
  content.append(sender, subject, snippet);
  const date = document.createElement("time");
  date.textContent = gmailDate(thread.timestamp);
  summary.append(content, date);
  summary.addEventListener("click", () => {
    void toggleGmailPreview(account, thread);
  });
  const actions = document.createElement("div");
  actions.className = "mail-thread-actions";
  actions.append(
    createGmailActionButton(
      account,
      thread,
      thread.unread ? "markRead" : "markUnread",
      thread.unread ? "gmailMarkRead" : "gmailMarkUnread",
      thread.unread ? "○" : "●"
    ),
    createGmailActionButton(
      account,
      thread,
      thread.starred ? "unstar" : "star",
      thread.starred ? "gmailUnstar" : "gmailStar",
      thread.starred ? "★" : "☆"
    ),
    createGmailActionButton(
      account,
      thread,
      "archive",
      "gmailArchive",
      "↓"
    ),
    createGmailActionButton(
      account,
      thread,
      "trash",
      "gmailTrash",
      "×"
    )
  );
  row.append(summary, actions);

  if (gmailPreviews.has(key)) {
    const previewState = gmailPreviews.get(key);
    const preview = document.createElement("div");
    preview.className = "mail-thread-preview";
    preview.textContent = previewState.loading
      ? popupText("loading")
      : previewState.error
        ? popupText("gmailLoadFailed")
        : gmailMessageBody(previewState.message) ||
          popupText("gmailNoBody");
    row.appendChild(preview);
  }

  return row;
}

function createMailAccount(account) {
  const card = document.createElement("section");
  card.className = "mail-account";
  card.dataset.gmailAccountId = account.accountId;
  const header = document.createElement("header");
  const identity = document.createElement("span");
  const email = document.createElement("strong");
  email.className = "mail-account-email";
  const unread = document.createElement("small");
  email.textContent = account.email;
  unread.textContent = popupText("gmailUnread", {
    count: account.unreadCount || 0
  });
  identity.append(email, unread);
  const controls = document.createElement("span");
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.textContent = "↻";
  refresh.title = popupText("refresh");
  refresh.addEventListener("click", () => {
    void loadGmailAccount(account.accountId, true);
  });
  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "↗";
  open.title = popupText("openGmail");
  open.addEventListener("click", () => {
    void sendPopupMessage({
      type: "tabOutGmail:open",
      accountId: account.accountId
    });
  });
  controls.append(refresh, open);
  header.append(identity, controls);
  card.appendChild(header);

  if (account.reconnectRequired) {
    const warning = document.createElement("p");
    warning.className = "mail-account-warning";
    warning.textContent = popupText("gmailReconnect");
    card.appendChild(warning);
    return card;
  }

  const result = gmailThreads.get(account.accountId);
  const list = document.createElement("div");
  list.className = "mail-thread-list";

  if (result?.loading && !result.threads?.length) {
    list.textContent = popupText("loading");
    list.classList.add("mail-account-empty");
  } else if (result?.error) {
    list.textContent = popupText("gmailLoadFailed");
    list.classList.add("mail-account-empty", "is-error");
  } else if (!result?.threads?.length) {
    list.textContent = popupText("gmailEmpty");
    list.classList.add("mail-account-empty");
  } else {
    result.threads.forEach((thread) => {
      list.appendChild(createMailThread(account, thread));
    });
  }

  card.appendChild(list);
  return card;
}

function createMailState(messageKey, action = null) {
  const state = document.getElementById("mailPopupState");
  state.replaceChildren();
  const message = document.createElement("span");
  message.textContent = popupText(messageKey);
  state.appendChild(message);

  if (action) {
    state.appendChild(action);
  }

  state.hidden = false;
}

function renderGmail() {
  const accountsContainer = document.getElementById("mailPopupAccounts");
  const state = document.getElementById("mailPopupState");
  const refresh = document.getElementById("mailRefreshAllBtn");
  accountsContainer.replaceChildren();
  state.hidden = true;
  refresh.disabled = !gmailState?.accounts?.length;

  if (!gmailState || gmailState.status === "unavailable") {
    createMailState("gmailUnavailable");
    return;
  }

  if (!gmailState.accounts?.length) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mail-state-button";
    button.textContent = popupText("gmailOpenSettings");
    button.addEventListener("click", () => {
      chrome.tabs.create({
        url: chrome.runtime.getURL("index.html#settings=gmail")
      });
    });
    createMailState("gmailDisconnected", button);
    return;
  }

  gmailState.accounts.forEach((account) => {
    accountsContainer.appendChild(createMailAccount(account));
  });
}

async function loadGmailState() {
  const response = await sendPopupMessage({
    type: "tabOutGmail:getState"
  });
  gmailState = response.ok
    ? response
    : { status: "unavailable", accounts: [] };
  renderGmail();
  return response;
}

async function loadGmailAccount(accountId, force = false) {
  const previous = gmailThreads.get(accountId) || { threads: [] };
  gmailThreads.set(accountId, { ...previous, loading: true, error: false });
  renderGmail();
  const response = await sendPopupMessage({
    type: "tabOutGmail:listThreads",
    accountId,
    force
  });
  gmailThreads.set(accountId, response.ok
    ? {
        threads: Array.isArray(response.threads) ? response.threads : [],
        loading: false,
        error: false
      }
    : {
        ...previous,
        loading: false,
        error: true
      }
  );
  renderGmail();
  return response;
}

async function ensureGmailLoaded(force = false) {
  await loadGmailState();

  if (!gmailState?.accounts?.length) {
    return;
  }

  await Promise.all(
    gmailState.accounts.map((account) =>
      force || !gmailThreads.has(account.accountId)
        ? loadGmailAccount(account.accountId, force)
        : null
    )
  );

  if (gmailTarget?.accountId) {
    const targetCard = document.querySelector(
      `[data-gmail-account-id="${CSS.escape(gmailTarget.accountId)}"]`
    );
    targetCard?.scrollIntoView({ block: "nearest" });
    const result = gmailThreads.get(gmailTarget.accountId);
    const thread = result?.threads?.find(
      (candidate) => candidate.threadId === gmailTarget.threadId
    );
    const account = gmailState.accounts.find(
      (candidate) => candidate.accountId === gmailTarget.accountId
    );

    if (thread && account) {
      await toggleGmailPreview(account, thread, true);
    }

    gmailTarget = null;
    await sendPopupMessage({ type: "tabOutGmail:clearPopupTarget" });
  }
}

async function toggleGmailPreview(account, thread, forceOpen = false) {
  const key = gmailThreadKey(account.accountId, thread.threadId);

  if (gmailPreviews.has(key) && !forceOpen) {
    gmailPreviews.delete(key);
    renderGmail();
    return;
  }

  gmailPreviews.set(key, { loading: true });
  renderGmail();
  const response = await sendPopupMessage({
    type: "tabOutGmail:getLatestMessage",
    accountId: account.accountId,
    messageId: thread.latestMessageId
  });
  gmailPreviews.set(key, response.ok
    ? { loading: false, message: response.message }
    : { loading: false, error: true }
  );
  renderGmail();
}

async function performGmailAction(account, thread, action) {
  if (action === "trash" && !confirm(popupText("gmailTrashConfirm"))) {
    return;
  }

  const key = gmailThreadKey(account.accountId, thread.threadId);
  pendingGmailActions.add(key);
  renderGmail();
  const response = await sendPopupMessage({
    type: "tabOutGmail:action",
    accountId: account.accountId,
    threadId: thread.threadId,
    action
  });
  pendingGmailActions.delete(key);

  if (!response.ok) {
    setPopupFeedback(popupText("gmailActionFailed"), true);
    renderGmail();
    return;
  }

  gmailPreviews.delete(key);
  await Promise.all([
    loadGmailAccount(account.accountId, true),
    loadGmailState()
  ]);
}

function copyPopupTextWithExecCommand(text) {
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

async function copyPopupTextToClipboard(value) {
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

  const fallbackCopied = copyPopupTextWithExecCommand(text);
  return clipboardRequest
    ? (await clipboardRequest) || fallbackCopied
    : fallbackCopied;
}

document.addEventListener("contextmenu", async (event) => {
  if (popupContext?.copyTabLinksOnRightClick === false) {
    return;
  }

  const tabElement = event.target.closest?.("[data-tab-url]");
  const tabUrl = tabElement?.dataset.tabUrl || "";

  if (!tabUrl) {
    return;
  }

  event.preventDefault();
  const copied = await copyPopupTextToClipboard(tabUrl);
  setPopupFeedback(
    popupText(copied ? "tabLinkCopied" : "tabLinkCopyFailed"),
    !copied
  );
});

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-popup-view]");

  if (viewButton) {
    setPopupFeedback("");
    setPopupView(viewButton.dataset.popupView);
    return;
  }

  const destinationButton = event.target.closest(".destination-add");

  if (destinationButton && !destinationButton.disabled) {
    void mutateActiveTabDestination(destinationButton);
  }
});

document.getElementById("popupSearchInput").addEventListener(
  "input",
  (event) => {
    popupQuery = event.target.value || "";
    renderCurrentTab();
  }
);
document.getElementById("mailRefreshAllBtn").addEventListener(
  "click",
  () => void ensureGmailLoaded(true)
);

async function initializePopup() {
  const [stored, target] = await Promise.all([
    chrome.storage.session.get(POPUP_VIEW_KEY),
    sendPopupMessage({ type: "tabOutGmail:getPopupTarget" }),
    loadPopupContext(),
    loadPopupPreferences()
  ]);
  gmailTarget = target.ok ? target.target : null;
  setPopupView(
    gmailTarget?.view === "mail"
      ? "mail"
      : stored[POPUP_VIEW_KEY] === "mail"
        ? "mail"
        : "current",
    { persist: false }
  );
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    changes[DASHBOARD_SETTINGS_KEY]
  ) {
    applyPopupPreferences(
      changes[DASHBOARD_SETTINGS_KEY].newValue
    );
  }
});

void initializePopup();
