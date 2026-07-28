'use strict';

const DEFAULT_SHORTCUTS = window.TAB_OUT_DEFAULT_SHORTCUTS || [];

let editingShortcutIndex = null;

function normalizeUrl(url) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function getShortcutDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function getShortcutFavicon(domain) {
  if (!domain) {
    return "";
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function getStoredShortcuts() {
  const stored = localStorage.getItem("tabOutShortcuts");

  if (!stored) {
    return [...DEFAULT_SHORTCUTS];
  }

  try {
    const shortcuts = JSON.parse(stored);
    return Array.isArray(shortcuts) ? shortcuts : [...DEFAULT_SHORTCUTS];
  } catch {
    return [...DEFAULT_SHORTCUTS];
  }
}

function saveStoredShortcuts(shortcuts) {
  localStorage.setItem("tabOutShortcuts", JSON.stringify(shortcuts));
}

function renderShortcuts() {
  const container = document.querySelector(".quick-links");

  if (!container) {
    return;
  }

  const addButton = document.getElementById("addShortcutBtn");
  const shortcuts = getStoredShortcuts();

  container.querySelectorAll(".shortcut-item").forEach((item) => {
    item.remove();
  });

  shortcuts.forEach((shortcut, index) => {
    const item = document.createElement("div");
    item.className = "shortcut-item";

    const link = document.createElement("a");
    link.className = "quick-link";
    link.href = shortcut.url;

    const img = document.createElement("img");
    img.alt = "";
    img.src = getShortcutFavicon(shortcut.domain || getShortcutDomain(shortcut.url));

    const label = document.createElement("span");
    label.textContent = shortcut.name;

    const actions = document.createElement("div");
    actions.className = "shortcut-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "shortcut-action-btn shortcut-edit-btn";
    editButton.textContent = "✎";
    editButton.title = t("editShortcut");

    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openShortcutModal(index);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "shortcut-action-btn shortcut-delete-btn";
    deleteButton.textContent = "×";
    deleteButton.title = t("deleteShortcut");

    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const currentShortcuts = getStoredShortcuts();
      currentShortcuts.splice(index, 1);
      saveStoredShortcuts(currentShortcuts);
      renderShortcuts();
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    link.appendChild(img);
    link.appendChild(label);
    link.appendChild(actions);

    item.appendChild(link);
    container.insertBefore(item, addButton);
  });
}

function openShortcutModal(index = null) {
  const modal = document.getElementById("shortcutModal");
  const title = modal ? modal.querySelector("h2") : null;
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");
  const saveButton = document.getElementById("saveShortcutBtn");
  const deleteButton = document.getElementById("deleteShortcutBtn");

  if (!modal || !nameInput || !urlInput || !saveButton) {
    return;
  }

  editingShortcutIndex = Number.isInteger(index) ? index : null;

  if (editingShortcutIndex !== null) {
    const shortcut = getStoredShortcuts()[editingShortcutIndex];

    if (!shortcut) {
      editingShortcutIndex = null;
      return;
    }

    if (title) title.textContent = t("editShortcutTitle");
    nameInput.value = shortcut.name || "";
    urlInput.value = shortcut.url || "";
    saveButton.textContent = t("saveShortcut");
    if (deleteButton) deleteButton.hidden = false;
  } else {
    if (title) title.textContent = t("addShortcutTitle");
    nameInput.value = "";
    urlInput.value = "";
    saveButton.textContent = t("addShortcut");
    if (deleteButton) deleteButton.hidden = true;
  }

  modal.hidden = false;
  nameInput.focus();
}

function closeShortcutModal() {
  const modal = document.getElementById("shortcutModal");

  if (!modal) {
    return;
  }

  editingShortcutIndex = null;
  modal.hidden = true;
}

function saveShortcutFromModal() {
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");

  if (!nameInput || !urlInput) {
    return;
  }

  const name = nameInput.value.trim();
  const url = normalizeUrl(urlInput.value);

  if (!name || !url) {
    return;
  }

  const shortcuts = getStoredShortcuts();
  const domain = getShortcutDomain(url);
  const nextShortcut = {
    name,
    url,
    domain
  };

  if (editingShortcutIndex !== null && shortcuts[editingShortcutIndex]) {
    shortcuts[editingShortcutIndex] = nextShortcut;
  } else {
    shortcuts.push(nextShortcut);
  }

  saveStoredShortcuts(shortcuts);
  renderShortcuts();
  closeShortcutModal();
}

function deleteShortcut(index = editingShortcutIndex) {
  if (index === null || index === undefined) {
    return;
  }

  const shortcuts = getStoredShortcuts();
  const shortcut = shortcuts[index];

  if (!shortcut) {
    return;
  }

  const confirmed = confirm(t("deleteShortcutConfirm", { name: shortcut.name }));

  if (!confirmed) {
    return;
  }

  shortcuts.splice(index, 1);
  saveStoredShortcuts(shortcuts);
  renderShortcuts();
  closeShortcutModal();
}

function resetShortcutsToDefault() {
  const confirmed = confirm(t("resetShortcutsConfirm"));

  if (!confirmed) {
    return;
  }

  saveStoredShortcuts([...DEFAULT_SHORTCUTS]);
  renderShortcuts();
  closeShortcutModal();
}

function setupShortcutManager() {
  const addButton = document.getElementById("addShortcutBtn");
  const cancelButton = document.getElementById("cancelShortcutBtn");
  const saveButton = document.getElementById("saveShortcutBtn");
  const deleteButton = document.getElementById("deleteShortcutBtn");
  const modal = document.getElementById("shortcutModal");
  const nameInput = document.getElementById("shortcutNameInput");
  const urlInput = document.getElementById("shortcutUrlInput");

  if (addButton) {
    addButton.addEventListener("click", () => openShortcutModal());
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeShortcutModal);
  }

  if (saveButton) {
    saveButton.addEventListener("click", saveShortcutFromModal);
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", () => deleteShortcut());
  }

  [nameInput, urlInput].forEach((input) => {
    if (!input) return;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        saveShortcutFromModal();
      }

      if (event.key === "Escape") {
        closeShortcutModal();
      }
    });
  });

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeShortcutModal();
      }
    });
  }

  renderShortcuts();
  applyStaticTranslations();
}

document.addEventListener("DOMContentLoaded", setupShortcutManager);
