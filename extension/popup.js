const POPUP_TRANSLATIONS = {
  fr: {
    title: "Gérer l’onglet actuel",
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
    tabLinkCopyFailed: "Impossible de copier le lien."
  },
  en: {
    title: "Manage the current tab",
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
    tabLinkCopyFailed: "Could not copy the link."
  }
};

let popupContext = null;
let popupLanguage = "fr";
let popupQuery = "";
const pendingDestinations = new Set();

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
  document.getElementById("popupTitle").textContent = popupText("title");
  document.getElementById("sessionsHeading").textContent = popupText("sessions");
  document.getElementById("popupSearchInput").placeholder = popupText("search");
  document.getElementById("popupSearchLabel").textContent = popupText("search");
}

function renderActiveTab() {
  const activeTab = popupContext?.activeTab;
  const activeTabCard = document.getElementById("activeTabCard");
  const favicon = document.getElementById("activeTabFavicon");
  const unsupported = document.getElementById("popupUnsupported");

  favicon.innerHTML = "";

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
  dot.style.setProperty(
    "--destination-color",
    "#91cda3"
  );

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

  copy.appendChild(title);
  copy.appendChild(meta);
  row.appendChild(dot);
  row.appendChild(copy);
  row.appendChild(button);

  return row;
}

function renderDestinationList(destinations, containerId, emptyKey) {
  const container = document.getElementById(containerId);
  const normalizedQuery = popupQuery.trim().toLocaleLowerCase();
  const filtered = destinations.filter((destination) =>
    destination.title.toLocaleLowerCase().includes(normalizedQuery)
  );

  container.innerHTML = "";

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

function renderPopup() {
  if (!popupContext) {
    return;
  }

  applyPopupTranslations();
  renderActiveTab();
  const sessionCount = renderDestinationList(
    popupContext.sessions || [],
    "sessionDestinations",
    "noSessions"
  );

  document.getElementById("sessionsCount").textContent = String(sessionCount);
}

async function loadPopupContext() {
  const response = await sendPopupMessage({
    type: "tabOut:getAddDestinations"
  });

  if (!response.ok) {
    setPopupFeedback(popupText("failed"), true);
    return;
  }

  popupContext = response;
  popupLanguage = response.language === "en" ? "en" : "fr";
  renderPopup();
}

async function mutateActiveTabDestination(button) {
  const destinationKey =
    `${button.dataset.destinationKind}:${button.dataset.destinationId}`;
  const intent = button.dataset.intent === "remove" ? "remove" : "add";
  pendingDestinations.add(destinationKey);
  setPopupFeedback("");
  renderPopup();

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
    renderPopup();
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
  const button = event.target.closest(".destination-add");

  if (!button || button.disabled) {
    return;
  }

  mutateActiveTabDestination(button);
});

document.getElementById("popupSearchInput").addEventListener("input", (event) => {
  popupQuery = event.target.value || "";
  renderPopup();
});

loadPopupContext();
