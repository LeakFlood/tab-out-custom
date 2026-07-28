'use strict';

/* ----------------------------------------------------------------
   BACKUP / IMPORT — discreet local data safety net
   ---------------------------------------------------------------- */

const TAB_OUT_BACKUP_VERSION = 4;
const TAB_OUT_CHROME_STORAGE_BACKUP_KEYS = [
  "savedSessions",
  "tabOutSessionSchemaVersion",
  "tabOutLanguage",
  "tabOutDashboardSettings",
  "deferred",
  "tabOutTodoStateV1"
];
const TAB_OUT_LEGACY_BACKUP_KEYS = [
  "tabOutProtectedGroups"
];
const TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS = [
  "tabOutShortcuts"
];

function toggleBackupMenu(forceOpen = null) {
  const menu = document.getElementById("backupMenu");
  const button = document.getElementById("backupMenuBtn");

  if (!menu || !button) {
    return;
  }

  const shouldOpen = forceOpen === null ? menu.hidden : Boolean(forceOpen);

  menu.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
}

function closeBackupMenu() {
  toggleBackupMenu(false);
}

async function collectTabOutBackupData() {
  const chromeData = await chrome.storage.local.get(TAB_OUT_CHROME_STORAGE_BACKUP_KEYS);
  const localData = {};

  TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS.forEach((key) => {
    const rawValue = localStorage.getItem(key);

    if (rawValue === null) {
      return;
    }

    try {
      localData[key] = JSON.parse(rawValue);
    } catch {
      localData[key] = rawValue;
    }
  });

  return {
    app: "Tab Out Custom",
    type: "tab-out-backup",
    version: TAB_OUT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      chromeStorage: chromeData,
      localStorage: localData
    }
  };
}

function downloadJsonBackup(payload) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `tab-out-backup-${date}.json`;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportTabOutData() {
  try {
    const backup = await collectTabOutBackupData();

    downloadJsonBackup(backup);
    closeBackupMenu();
    showToast(t("exportSuccess"));
  } catch (error) {
    console.warn("[tab-out] backup export failed:", error);
    showToast(t("exportFailed"));
  }
}

function openBackupImportPicker() {
  const input = document.getElementById("backupImportInput");

  closeBackupMenu();

  if (!input) {
    return;
  }

  input.value = "";
  input.click();
}

function validateBackupPayload(payload) {
  return Boolean(
    payload &&
    payload.type === "tab-out-backup" &&
    payload.data &&
    typeof payload.data === "object" &&
    payload.data.chromeStorage &&
    typeof payload.data.chromeStorage === "object" &&
    payload.data.localStorage &&
    typeof payload.data.localStorage === "object"
  );
}

async function importTabOutDataFromFile(file) {
  if (!file) {
    return;
  }

  try {
    const rawText = await file.text();
    const payload = JSON.parse(rawText);

    if (!validateBackupPayload(payload)) {
      showToast(t("invalidBackupFile"));
      return;
    }

    const confirmed = confirm(t("importConfirm"));

    if (!confirmed) {
      return;
    }

    const chromeStorageData = {};
    const acceptedChromeKeys = [
      ...TAB_OUT_CHROME_STORAGE_BACKUP_KEYS,
      ...TAB_OUT_LEGACY_BACKUP_KEYS
    ];

    acceptedChromeKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload.data.chromeStorage, key)) {
        chromeStorageData[key] = payload.data.chromeStorage[key];
      }
    });

    if (
      chromeStorageData.tabOutTodoStateV1 &&
      globalThis.TabOutTodoService?.normalizeState
    ) {
      chromeStorageData.tabOutTodoStateV1 =
        globalThis.TabOutTodoService.normalizeState(
          chromeStorageData.tabOutTodoStateV1
        );
    }

    await chrome.storage.local.remove([
      ...acceptedChromeKeys,
      "tabOutTodoUndoV1"
    ]);

    if (Object.keys(chromeStorageData).length) {
      await chrome.storage.local.set(chromeStorageData);
    }

    unifiedSessionMigrationPromise = null;
    await ensureUnifiedSessionStorage();

    TAB_OUT_LOCAL_STORAGE_BACKUP_KEYS.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(payload.data.localStorage, key)) {
        return;
      }

      localStorage.setItem(key, JSON.stringify(payload.data.localStorage[key]));
    });

    await getLanguage();
    applyStaticTranslations();

    if (typeof renderShortcuts === "function") {
      renderShortcuts();
    }

    await renderDashboard();
    await renderSavedSessions();
    await globalThis.TabOutTodoWidget?.refresh?.();

    showToast(t("importSuccess"));
  } catch (error) {
    console.warn("[tab-out] backup import failed:", error);
    showToast(t("importFailed"));
  }
}

function setupBackupMenu() {
  const input = document.getElementById("backupImportInput");

  if (input) {
    input.addEventListener("change", async () => {
      await importTabOutDataFromFile(input.files?.[0]);
      input.value = "";
    });
  }
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("#backupMenuWrap")) {
    closeBackupMenu();
  }
});

document.addEventListener("DOMContentLoaded", setupBackupMenu);
