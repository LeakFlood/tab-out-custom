/* ================================================================
   Tab Out — Dashboard App (Pure Extension Edition)

   This file is the brain of the dashboard. Now that the dashboard
   IS the extension page (not inside an iframe), it can call
   chrome.tabs and chrome.storage directly — no postMessage bridge needed.

   What this file does:
   1. Reads open browser tabs directly via chrome.tabs.query()
   2. Groups tabs by domain with a landing pages category
   3. Renders domain cards, banners, and stats
   4. Handles all user actions (close tabs, save for later, focus tab)
   5. Stores "Saved for Later" tabs in chrome.storage.local (no server)
   ================================================================ */

'use strict';


/* ----------------------------------------------------------------
   I18N — FR / EN language packs
   ---------------------------------------------------------------- */

const I18N = {
  fr: {
    greetingMorning: "Bonjour",
    greetingAfternoon: "Bon après-midi",
    greetingEvening: "Bonsoir",
    timePrefix: "Il est",
    datePrefix: "Nous sommes le",
    locale: "fr-FR",

    openTabs: "Onglets ouverts",
    homepages: "Pages d’accueil",
    domains: "domaines",
    domain: "domaine",
    tabs: "onglets",
    tab: "onglet",
    open: "ouverts",
    closeAllTabs: "Fermer les {count} onglets",
    closeAllDomainTabs: "Fermer les {count} onglets",
    closeDuplicate: "Fermer {count} doublon",
    closeDuplicates: "Fermer {count} doublons",
    duplicate: "doublon",
    duplicates: "doublons",
    showTabs: "Afficher les {count} onglets",
    hideTabs: "Masquer les {count} onglets",

    inboxZeroTitle: "Zéro onglet.",
    inboxZeroSubtitle: "Tu es libre.",
    noResults: "Aucun résultat",
    filterTabs: "Filtrer les onglets…",
    searchTabs: "Rechercher dans les onglets",
    closeTabSearch: "Fermer la recherche",
    noMatchingTabs: "Aucun onglet ne correspond à cette recherche.",

    justNow: "à l’instant",
    minAgo: "il y a {count} min",
    hourAgo: "il y a {count} h",
    yesterday: "hier",
    daysAgo: "il y a {count} jours",

    itemCount: "{count} élément",
    itemsCount: "{count} éléments",

    sessions: "Sessions",
    sessionsSubtitle: "Rouvre rapidement un groupe d’onglets.",
    createSessionButton: "+ Session",
    noSavedSession: "Aucune session sauvegardée pour le moment.",
    sessionsReordered: "Ordre des sessions sauvegardé",
    editSession: "Modifier cette session",
    createSessionTitle: "Créer une session",
    editSessionTitle: "Modifier la session",
    sessionNameRequired: "Donne un nom à ta session.",
    sessionTabsRequired: "Sélectionne au moins un onglet.",
    sessionSaved: "Session sauvegardée",
    sessionDeleted: "Session supprimée",
    sessionOpened: "Session ouverte : {name}",
    deleteSessionConfirm: "Supprimer cette session ?",
    sessionTabCount: "{count} onglet",
    sessionTabsCount: "{count} onglets",
    selectAll: "Tout sélectionner",
    clearAll: "Tout décocher",
    save: "Sauvegarder",
    cancel: "Annuler",
    delete: "Supprimer",

    shortcuts: "Raccourcis",
    shortcutAddButton: "Raccourci",
    addShortcutTitle: "Ajouter un raccourci",
    editShortcutTitle: "Modifier le raccourci",
    editShortcut: "Modifier ce raccourci",
    deleteShortcut: "Supprimer ce raccourci",
    saveShortcut: "Enregistrer",
    addShortcut: "Ajouter",
    deleteShortcutConfirm: "Supprimer le raccourci \"{name}\" ?",
    resetShortcutsConfirm: "Réinitialiser tous les raccourcis par défaut ?",

    saveForLater: "Sauvegarder pour plus tard",
    nothingSaved: "Rien de sauvegardé. Tu vis dans le présent.",
    archive: "Archive",
    archiveSearchPlaceholder: "Rechercher dans les onglets archivés...",
    tabOutDupePrefix: "Tu as",
    tabOutDupeSuffix: "onglets Tab Out ouverts. Garder uniquement celui-ci ?",
    closeExtras: "Fermer les autres",
    sessionNameLabel: "Nom de la session",
    sessionNamePlaceholder: "Ex : Dev Ultra",
    nameLabel: "Nom",
    urlLabel: "URL",
    shortcutNamePlaceholder: "Ex : Netflix",
    shortcutUrlPlaceholder: "https://example.com",
    savedForLater: "Sauvegardé pour plus tard",
    failedToSaveTab: "Impossible de sauvegarder l’onglet",
    tabClosed: "Onglet fermé",
    closeThisTab: "Fermer cet onglet",
    dismiss: "Retirer",
    archiveSearchFailed: "Recherche archive échouée",
    closedExtraTabOutTabs: "Onglets Tab Out en trop fermés",
    closedTabsFrom: "{count} onglet fermé depuis {name}",
    closedTabsFromPlural: "{count} onglets fermés depuis {name}",

    weatherSun: "Ensoleillé",
    weatherPartly: "Partiellement nuageux",
    weatherCloud: "Couvert",
    weatherFog: "Brume",
    weatherRain: "Pluie",
    weatherSnow: "Neige",
    weatherStorm: "Orage",
    weatherGeneric: "Météo",
    weatherFeelsLike: "Ressenti {temp}°C",
    weatherEnable: "Activer la météo",
    weatherLoading: "Chargement...",
    showCity: "Afficher la ville",
    hideCity: "Masquer la ville",

    backupMenuTitle: "Sauvegarde des données",
    exportData: "Exporter les données",
    importData: "Importer les données",
    exportSuccess: "Données exportées",
    exportFailed: "Export impossible",
    importConfirm: "Importer ces données va remplacer tes raccourcis, sessions, groupes sauvegardés, onglets archivés et préférences locales. Continuer ?",
    importSuccess: "Données importées",
    importFailed: "Import impossible",
    invalidBackupFile: "Fichier de sauvegarde invalide",

    protectedGroupsTab: "Groupes sauvegardés",
    syncChromeGroups: "Synchroniser",
    protectActiveGroup: "+ Protéger le groupe actif",
    protectChromeGroup: "Protéger ce groupe",
    chromeGroupUnprotected: "Non protégé",
    chromeGroupNativeColor: "Couleur du groupe Chrome",
    noChromeGroups: "Aucun groupe Chrome à afficher.",
    noProtectedGroups: "Aucun groupe sauvegardé pour le moment.",
    protectedGroupsEmptyTitle: "Aucun groupe sauvegardé pour le moment.",
    protectedGroupsEmptySubtitle: "Crée un groupe dans Chrome, puis utilise le crayon pour le sauvegarder dans Tab Out.",
    noActiveChromeGroup: "Aucun groupe Chrome actif sur cet onglet.",
    chromeGroupProtected: "Groupe sauvegardé : {name}",
    chromeGroupSnapshotUpdated: "Sauvegarde mise à jour : {name}",
    chromeGroupRestored: "Groupe restauré : {name}",
    chromeGroupCopyOpened: "Copie ouverte : {name}",
    chromeGroupDeleted: "Protection supprimée",
    chromeGroupIgnored: "Changement ignoré",
    chromeGroupSynced: "Sync",
    chromeGroupChanged: "Modifié",
    chromeGroupMissing: "Fermé",
    untitledChromeGroup: "Groupe sans nom",
    chromeGroupChangeAdded: "+{added}",
    chromeGroupChangeRemoved: "-{removed}",
    chromeGroupChangeAddedRemoved: "+{added} -{removed}",
    chromeGroupChangeTooltip: "Modifié : {added} onglet(s) ajouté(s), {removed} onglet(s) retiré(s).",
    chromeGroupTooltipStatusColor: "Barre gauche : état Tab Out. Point droit : couleur native Chrome.",
    chromeGroupLastSaved: "Dernière sauvegarde : {time}",
    chromeGroupTabCount: "{count} onglet",
    chromeGroupTabsCount: "{count} onglets",
    restoreProtectedGroup: "Restaurer",
    openProtectedGroupCopy: "Ouvrir comme nouveau groupe",
    updateProtectedGroup: "Mettre à jour depuis Chrome",
    ignoreProtectedGroupChange: "Ignorer le changement",
    deleteProtectedGroup: "Supprimer la protection",
    restoreProtectedGroupConfirm: "Ce groupe existe déjà dans Chrome. Restaurer la sauvegarde créera une copie. Continuer ?",
    updateProtectedGroupConfirm: "Remplacer la sauvegarde par l’état actuel du groupe Chrome ?",
    deleteProtectedGroupConfirm: "Supprimer cette protection ?",

    languageSwitchToEnglish: "Passer en anglais",
    languageSwitchToFrench: "Passer en français"
  },

  en: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    timePrefix: "It is",
    datePrefix: "Today is",
    locale: "en-US",

    openTabs: "Open tabs",
    homepages: "Homepages",
    domains: "domains",
    domain: "domain",
    tabs: "tabs",
    tab: "tab",
    open: "open",
    closeAllTabs: "Close {count} tabs",
    closeAllDomainTabs: "Close all {count} tabs",
    closeDuplicate: "Close {count} duplicate",
    closeDuplicates: "Close {count} duplicates",
    duplicate: "duplicate",
    duplicates: "duplicates",
    showTabs: "Show {count} tabs",
    hideTabs: "Hide {count} tabs",

    inboxZeroTitle: "Inbox zero, but for tabs.",
    inboxZeroSubtitle: "You're free.",
    noResults: "No results",
    filterTabs: "Filter tabs…",
    searchTabs: "Search open tabs",
    closeTabSearch: "Close search",
    noMatchingTabs: "No tabs match this search.",

    justNow: "just now",
    minAgo: "{count} min ago",
    hourAgo: "{count} hr ago",
    yesterday: "yesterday",
    daysAgo: "{count} days ago",

    itemCount: "{count} item",
    itemsCount: "{count} items",

    sessions: "Sessions",
    sessionsSubtitle: "Quickly reopen a group of tabs.",
    createSessionButton: "+ Session",
    noSavedSession: "No saved session yet.",
    sessionsReordered: "Session order saved",
    editSession: "Edit this session",
    createSessionTitle: "Create a session",
    editSessionTitle: "Edit session",
    sessionNameRequired: "Name your session.",
    sessionTabsRequired: "Select at least one tab.",
    sessionSaved: "Session saved",
    sessionDeleted: "Session deleted",
    sessionOpened: "Session opened: {name}",
    deleteSessionConfirm: "Delete this session?",
    sessionTabCount: "{count} tab",
    sessionTabsCount: "{count} tabs",
    selectAll: "Select all",
    clearAll: "Clear all",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",

    shortcuts: "Shortcuts",
    shortcutAddButton: "Shortcut",
    addShortcutTitle: "Add shortcut",
    editShortcutTitle: "Edit shortcut",
    editShortcut: "Edit this shortcut",
    deleteShortcut: "Delete this shortcut",
    saveShortcut: "Save",
    addShortcut: "Add",
    deleteShortcutConfirm: "Delete shortcut \"{name}\"?",
    resetShortcutsConfirm: "Reset all shortcuts to default?",

    saveForLater: "Save for later",
    nothingSaved: "Nothing saved. Living in the moment.",
    archive: "Archive",
    archiveSearchPlaceholder: "Search archived tabs...",
    tabOutDupePrefix: "You have",
    tabOutDupeSuffix: "Tab Out tabs open. Keep just this one?",
    closeExtras: "Close extras",
    sessionNameLabel: "Session name",
    sessionNamePlaceholder: "E.g. Dev Ultra",
    nameLabel: "Name",
    urlLabel: "URL",
    shortcutNamePlaceholder: "E.g. Netflix",
    shortcutUrlPlaceholder: "https://example.com",
    savedForLater: "Saved for later",
    failedToSaveTab: "Failed to save tab",
    tabClosed: "Tab closed",
    closeThisTab: "Close this tab",
    dismiss: "Dismiss",
    archiveSearchFailed: "Archive search failed",
    closedExtraTabOutTabs: "Closed extra Tab Out tabs",
    closedTabsFrom: "Closed {count} tab from {name}",
    closedTabsFromPlural: "Closed {count} tabs from {name}",

    weatherSun: "Sunny",
    weatherPartly: "Partly cloudy",
    weatherCloud: "Cloudy",
    weatherFog: "Fog",
    weatherRain: "Rain",
    weatherSnow: "Snow",
    weatherStorm: "Storm",
    weatherGeneric: "Weather",
    weatherFeelsLike: "Feels like {temp}°C",
    weatherEnable: "Enable weather",
    weatherLoading: "Loading...",
    showCity: "Show city",
    hideCity: "Hide city",

    backupMenuTitle: "Data backup",
    exportData: "Export data",
    importData: "Import data",
    exportSuccess: "Data exported",
    exportFailed: "Export failed",
    importConfirm: "Importing this backup will replace your shortcuts, sessions, saved groups, archived tabs, and local preferences. Continue?",
    importSuccess: "Data imported",
    importFailed: "Import failed",
    invalidBackupFile: "Invalid backup file",

    protectedGroupsTab: "Saved groups",
    syncChromeGroups: "Sync",
    protectActiveGroup: "+ Protect active group",
    protectChromeGroup: "Save this group",
    chromeGroupUnprotected: "Unsaved",
    chromeGroupNativeColor: "Chrome group color",
    noChromeGroups: "No Chrome group to show.",
    noProtectedGroups: "No saved group yet.",
    protectedGroupsEmptyTitle: "No saved group yet.",
    protectedGroupsEmptySubtitle: "Create a group in Chrome, then use the pencil to save it in Tab Out.",
    noActiveChromeGroup: "No active Chrome group on this tab.",
    chromeGroupProtected: "Saved group: {name}",
    chromeGroupSnapshotUpdated: "Saved version updated: {name}",
    chromeGroupRestored: "Group restored: {name}",
    chromeGroupCopyOpened: "Copy opened: {name}",
    chromeGroupDeleted: "Protection removed",
    chromeGroupIgnored: "Change ignored",
    chromeGroupSynced: "Sync",
    chromeGroupChanged: "Changed",
    chromeGroupMissing: "Closed",
    untitledChromeGroup: "Untitled group",
    chromeGroupChangeAdded: "+{added}",
    chromeGroupChangeRemoved: "-{removed}",
    chromeGroupChangeAddedRemoved: "+{added} -{removed}",
    chromeGroupChangeTooltip: "Changed: {added} tab(s) added, {removed} tab(s) removed.",
    chromeGroupTooltipStatusColor: "Left bar: Tab Out status. Right dot: native Chrome color.",
    chromeGroupLastSaved: "Last saved: {time}",
    chromeGroupTabCount: "{count} tab",
    chromeGroupTabsCount: "{count} tabs",
    restoreProtectedGroup: "Restore",
    openProtectedGroupCopy: "Open as new group",
    updateProtectedGroup: "Update from Chrome",
    ignoreProtectedGroupChange: "Ignore change",
    deleteProtectedGroup: "Remove protection",
    restoreProtectedGroupConfirm: "This group already exists in Chrome. Restoring the saved version will create a copy. Continue?",
    updateProtectedGroupConfirm: "Replace the saved version with the current Chrome group?",
    deleteProtectedGroupConfirm: "Remove this protection?",

    languageSwitchToEnglish: "Switch to English",
    languageSwitchToFrench: "Switch to French"
  }
};

let currentLanguage = "fr";

async function getLanguage() {
  const { tabOutLanguage = "fr" } = await chrome.storage.local.get("tabOutLanguage");
  currentLanguage = I18N[tabOutLanguage] ? tabOutLanguage : "fr";
  return currentLanguage;
}

async function setLanguage(language) {
  currentLanguage = I18N[language] ? language : "fr";
  await chrome.storage.local.set({ tabOutLanguage: currentLanguage });
}

function t(key, vars = {}) {
  const pack = I18N[currentLanguage] || I18N.fr;
  let value = pack[key] || I18N.fr[key] || key;

  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, String(replacement));
  });

  return value;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.title = t(key);
  });
}


function activeLocale() {
  return t("locale");
}

function plural(count, singularKey, pluralKey) {
  return t(count === 1 ? singularKey : pluralKey, { count });
}


/* ----------------------------------------------------------------
   CHROME TABS — Direct API Access

   Since this page IS the extension's new tab page, it has full
   access to chrome.tabs and chrome.storage. No middleman needed.
   ---------------------------------------------------------------- */

// All open tabs — populated by fetchOpenTabs()
let openTabs = [];

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

    const tabs = await chrome.tabs.query({});
    openTabs = tabs.map(t => ({
      id:       t.id,
      url:      t.url,
      title:    t.title,
      windowId: t.windowId,
      active:   t.active,
      // Flag Tab Out's own pages so we can detect duplicate new tabs
      isTabOut: t.url === newtabUrl || t.url === 'chrome://newtab/',
    }));
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

  const allTabs = await chrome.tabs.query({});
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
  const allTabs = await chrome.tabs.query({});
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
  const allTabs = await chrome.tabs.query({});
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
  const allTabs = await chrome.tabs.query({});
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

  const allTabs = await chrome.tabs.query({});
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

/**
 * showToast(message)
 *
 * Brief pop-up notification at the bottom of the screen.
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastText').textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

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
      <div class="empty-title">${t("inboxZeroTitle")}</div>
      <div class="empty-subtitle">${t("inboxZeroSubtitle")}</div>
    </div>
  `;

  const countEl = document.getElementById('openTabsSectionCount');
  if (countEl) countEl.textContent = `0 ${t("domains")}`;
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
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
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

function renderOpenTabsSearchControls(realTabCount) {
  const searchValue = escapeAttr(openTabsFilterQuery);
  const activeClass = openTabsSearchVisible ? " is-visible" : "";

  return `
    <span id="openTabsFilteredCount" class="open-tabs-count-label"></span>
    <button class="open-tabs-search-btn" data-action="toggle-open-tabs-search" title="${escapeAttr(t("searchTabs"))}" aria-label="${escapeAttr(t("searchTabs"))}" aria-expanded="${openTabsSearchVisible ? "true" : "false"}">
      <svg class="open-tabs-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
      </svg>
    </button>
    <span class="open-tabs-search-wrap${activeClass}" id="openTabsSearchWrap">
      <input type="text" id="openTabsFilterInput" class="open-tabs-search-input" value="${searchValue}" placeholder="${escapeAttr(t("filterTabs"))}" autocomplete="off" spellcheck="false">
      <button type="button" class="open-tabs-search-clear" data-action="clear-open-tabs-search" title="${escapeAttr(t("closeTabSearch"))}" aria-label="${escapeAttr(t("closeTabSearch"))}">×</button>
    </span>
    <button class="action-btn close-tabs" data-action="close-all-open-tabs" style="font-size:11px;padding:3px 10px;">${ICONS.close} ${t("closeAllTabs", { count: realTabCount })}</button>
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
    openTabsMissionsEl.innerHTML = `
      <div class="missions-empty-state open-tabs-filter-empty">
        <div class="empty-title">${t("noResults")}</div>
        <div class="empty-subtitle">${t("noMatchingTabs")}</div>
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

  const visibleTabs = uniqueTabs.slice(0, 2);
  const extraCount  = uniqueTabs.length - visibleTabs.length;

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
  
    return `<div class="page-chip clickable${chipClass}" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
      ${faviconUrl ? `<img class="chip-favicon" src="${faviconUrl}" alt="" onerror="this.style.display='none'">` : ''}
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

  let actionsHtml = `
    <button class="action-btn close-tabs" data-action="close-domain-tabs" data-domain-id="${stableId}">
      ${ICONS.close}
      ${t("closeAllDomainTabs", { count: tabCount })}
    </button>`;

  if (hasDupes) {
    const dupeUrlsEncoded = dupeUrls.map(([url]) => encodeURIComponent(url)).join(',');
    actionsHtml += `
      <button class="action-btn" data-action="dedup-keep-one" data-dupe-urls="${dupeUrlsEncoded}">
        ${totalExtras === 1 ? t("closeDuplicate", { count: totalExtras }) : t("closeDuplicates", { count: totalExtras })}
      </button>`;
  }

  return `
    <div class="mission-card domain-card ${hasDupes ? 'has-amber-bar' : 'has-neutral-bar'}" data-domain-id="${stableId}">
      <div class="status-bar"></div>
      <div class="mission-content">
        <div class="mission-top">
          <span class="mission-name">${isLanding ? t("homepages") : (group.label || friendlyDomain(group.domain))}</span>
          ${tabBadge}
          ${dupeBadge}
        </div>
        <div class="mission-pages">${pageChips}</div>
        ${uniqueTabs.length > 2 ? renderTabDropdown(uniqueTabs, `${stableId}-dropdown`) : ""}
        <div class="actions">${actionsHtml}</div>
      </div>
      <div class="mission-meta">
        <div class="mission-page-count">${tabCount}</div>
        <div class="mission-page-label">${tabCount === 1 ? t("tab") : t("tabs")}</div>
      </div>
    </div>`;
}

function renderTabDropdown(tabs, groupId) {
  if (!tabs || tabs.length <= 1) {
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
      <button class="tab-dropdown-item" data-action="focus-tab" data-tab-url="${safeUrl}" title="${safeTitle}">
        ${faviconUrl ? `<img src="${faviconUrl}" alt="">` : ""}
        <span>${rawTitle}</span>
      </button>
    `;
  }).join("");

  return `
    <div class="tab-dropdown">
      <button class="tab-dropdown-toggle" data-action="toggle-tab-dropdown" data-dropdown-id="${groupId}">
        ${t("showTabs", { count: tabs.length })}
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

  if (!column) return;

  try {
    const { active, archived } = await getSavedTabs();

    // Hide the entire column if there's nothing to show
    if (active.length === 0 && archived.length === 0) {
      column.style.display = 'none';
      return;
    }

    column.style.display = 'block';

    // Render active checklist items
    if (active.length > 0) {
      countEl.textContent = plural(active.length, "itemCount", "itemsCount");
      list.innerHTML = active.map(item => renderDeferredItem(item)).join('');
      list.style.display = 'block';
      empty.style.display = 'none';
    } else {
      list.style.display = 'none';
      countEl.textContent = '';
      empty.style.display = 'block';
    }

    // Render archive section
    if (archived.length > 0) {
      archiveCountEl.textContent = `(${archived.length})`;
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      archiveEl.style.display = 'block';
    } else {
      archiveEl.style.display = 'none';
    }

  } catch (err) {
    console.warn('[tab-out] Could not load saved tabs:', err);
    column.style.display = 'none';
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
  return `
    <div class="archive-item">
      <a href="${item.url}" target="_blank" rel="noopener" class="archive-item-title" title="${(item.title || '').replace(/"/g, '&quot;')}">
        ${item.title || item.url}
      </a>
      <span class="archive-item-date">${ago}</span>
    </div>`;
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
  updateTimeDisplay();
  setInterval(updateTimeDisplay, 1000);

  // --- Fetch tabs ---
  await fetchOpenTabs();
  const realTabs = getRealTabs();

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

  for (const tab of realTabs) {
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

  if (domainGroups.length > 0 && openTabsSection) {
    if (openTabsSectionTitle) openTabsSectionTitle.textContent = t("openTabs");
    openTabsSectionCount.innerHTML = renderOpenTabsSearchControls(realTabs.length);
    renderFilteredOpenTabs();
    openTabsSection.style.display = 'block';
  } else if (openTabsSection) {
    openTabsSection.style.display = 'none';
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


/* ----------------------------------------------------------------
   SAVED SESSIONS
   ---------------------------------------------------------------- */

   let editingSessionId = null;

   async function getSavedSessions() {
     const { savedSessions = [] } = await chrome.storage.local.get("savedSessions");
     return savedSessions;
   }
   
   async function saveSavedSessions(sessions) {
     await chrome.storage.local.set({ savedSessions: sessions });
   }
   
   function getTabDisplayTitle(tab) {
     return cleanTitle(
       smartTitle(stripTitleNoise(tab.title || ""), tab.url),
       getTabDomain(tab.url)
     );
   }
   
   function getTabDomain(url) {
     try {
       return new URL(url).hostname;
     } catch {
       return "";
     }
   }
   
   function getTabFavicon(url, size = 16) {
     const domain = getTabDomain(url);
   
     if (!domain) {
       return "";
     }
   
     return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
   }
   
   function createSessionId() {
     return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
   }

   let draggedSavedSessionId = null;
   let suppressSavedSessionOpenUntil = 0;
   let savedSessionDragState = null;

   const SAVED_SESSION_DRAG_THRESHOLD = 7;

   function getSavedSessionCards(container) {
     return Array.from(
       container.querySelectorAll('.saved-session-card[data-session-draggable="true"]')
     ).filter((card) => !card.classList.contains('is-drag-source'));
   }

   function getSavedSessionInsertBefore(container, x, y) {
     const cards = getSavedSessionCards(container);

     return cards.find((card) => {
       const rect = card.getBoundingClientRect();
       const isSameRow = y >= rect.top && y <= rect.bottom;

       if (isSameRow) {
         return x < rect.left + rect.width / 2;
       }

       return y < rect.top + rect.height / 2;
     }) || null;
   }

   function getSavedSessionDomOrder(list) {
     if (!list) return [];

     return Array.from(
       list.querySelectorAll('.saved-session-card[data-session-draggable="true"]')
     ).map((card) => card.dataset.sessionId).filter(Boolean);
   }

   function hasSavedSessionOrderChanged(before, after) {
     if (before.length !== after.length) return true;
     return before.some((id, index) => id !== after[index]);
   }

   function startSavedSessionPointerDrag(event, state) {
     const { card, list } = state;
     const rect = card.getBoundingClientRect();

     state.dragging = true;
     draggedSavedSessionId = card.dataset.sessionId;
     suppressSavedSessionOpenUntil = Date.now() + 500;

     const placeholder = document.createElement('div');
     placeholder.className = 'saved-session-card saved-session-placeholder';
     placeholder.style.width = `${rect.width}px`;
     placeholder.style.height = `${rect.height}px`;

     const ghost = card.cloneNode(true);
     ghost.classList.add('saved-session-drag-ghost');
     ghost.style.width = `${rect.width}px`;
     ghost.style.height = `${rect.height}px`;
     ghost.style.left = `${rect.left}px`;
     ghost.style.top = `${rect.top}px`;

     state.offsetX = event.clientX - rect.left;
     state.offsetY = event.clientY - rect.top;
     state.placeholder = placeholder;
     state.ghost = ghost;

     list.classList.add('is-reordering');
     card.classList.add('is-drag-source');
     list.insertBefore(placeholder, card);
     card.remove();
     document.body.appendChild(ghost);

     updateSavedSessionPointerDrag(event);
   }

   function updateSavedSessionPointerDrag(event) {
     const state = savedSessionDragState;

     if (!state || !state.dragging) {
       return;
     }

     const { list, placeholder, ghost, offsetX, offsetY } = state;

     if (ghost) {
       ghost.style.transform = `translate3d(${event.clientX - offsetX}px, ${event.clientY - offsetY}px, 0)`;
     }

     if (!list || !placeholder) {
       return;
     }

     const insertBefore = getSavedSessionInsertBefore(list, event.clientX, event.clientY);

     if (insertBefore && insertBefore !== placeholder) {
       list.insertBefore(placeholder, insertBefore);
     } else if (!insertBefore) {
       list.appendChild(placeholder);
     }
   }

   async function finishSavedSessionPointerDrag(event) {
     const state = savedSessionDragState;

     if (!state) {
       return;
     }

     const { card, list, placeholder, ghost, initialOrder, dragging } = state;

     savedSessionDragState = null;

     if (card?.releasePointerCapture) {
       try { card.releasePointerCapture(event.pointerId); } catch {}
     }

     if (!dragging) {
       return;
     }

     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (placeholder && list) {
       list.insertBefore(card, placeholder);
       placeholder.remove();
     }

     if (ghost) {
       ghost.remove();
     }

     if (card) {
       card.classList.remove('is-drag-source');
     }

     if (list) {
       list.classList.remove('is-reordering');
     }

     draggedSavedSessionId = null;

     const finalOrder = getSavedSessionDomOrder(list);

     if (hasSavedSessionOrderChanged(initialOrder, finalOrder)) {
       await saveCurrentSavedSessionOrder();
       showToast(t('sessionsReordered'));
     }
   }

   async function saveCurrentSavedSessionOrder() {
     const list = document.getElementById("savedSessionsList");

     if (!list || savedSessionsViewMode !== "sessions") {
       return;
     }

     const orderedIds = getSavedSessionDomOrder(list);

     if (orderedIds.length === 0) {
       return;
     }

     const sessions = await getSavedSessions();
     const byId = new Map(sessions.map((session) => [session.id, session]));
     const reorderedSessions = orderedIds
       .map((id) => byId.get(id))
       .filter(Boolean);

     sessions.forEach((session) => {
       if (!orderedIds.includes(session.id)) {
         reorderedSessions.push(session);
       }
     });

     await saveSavedSessions(reorderedSessions);
   }

   let savedSessionsViewMode = "sessions";

async function renderSavedSessions() {
    const section = document.getElementById("savedSessionsSection");
    const list = document.getElementById("savedSessionsList");
    const sessionsTab = document.getElementById("sessionsViewBtn");
    const groupsTab = document.getElementById("groupsViewBtn");
    const createButton = document.getElementById("createSessionActionBtn");
    const groupsActionButton = document.getElementById("syncChromeGroupsBtn");

    if (!section || !list) {
      return;
    }

    section.hidden = false;

    if (sessionsTab) {
      sessionsTab.classList.toggle("is-active", savedSessionsViewMode === "sessions");
    }

    if (groupsTab) {
      groupsTab.classList.toggle("is-active", savedSessionsViewMode === "groups");
    }

    if (createButton) {
      createButton.hidden = savedSessionsViewMode !== "sessions";
    }

    if (groupsActionButton) {
      groupsActionButton.hidden = savedSessionsViewMode !== "groups";
    }

    if (savedSessionsViewMode === "groups") {
      await renderProtectedGroupsIntoSessions(list, { force: true });
      return;
    }

    const sessions = await getSavedSessions();

    list.innerHTML = "";

    if (sessions.length === 0) {
      list.innerHTML = `
        <div class="saved-sessions-empty">
          ${t("noSavedSession")}
        </div>
      `;
      return;
    }

    sessions.forEach((session) => {
      const card = document.createElement("div");
      card.className = "saved-session-card";
      card.dataset.sessionId = session.id;
      card.dataset.sessionDraggable = "true";
      card.draggable = false;

      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "saved-session-open";
      openButton.dataset.action = "open-saved-session";
      openButton.dataset.sessionId = session.id;

      const title = document.createElement("span");
      title.className = "saved-session-title";
      title.textContent = session.name;

      const meta = document.createElement("span");
      meta.className = "saved-session-meta";
      meta.textContent = plural(session.tabs.length, "sessionTabCount", "sessionTabsCount");

      const favicons = document.createElement("span");
      favicons.className = "saved-session-favicons";

      session.tabs.slice(0, 4).forEach((tab) => {
        const favicon = getTabFavicon(tab.url, 16);

        if (!favicon) {
          return;
        }

        const img = document.createElement("img");
        img.alt = "";
        img.src = favicon;
        favicons.appendChild(img);
      });

      if (session.tabs.length > 4) {
        const more = document.createElement("span");
        more.className = "saved-session-more";
        more.textContent = `+${session.tabs.length - 4}`;
        favicons.appendChild(more);
      }

      openButton.appendChild(title);
      openButton.appendChild(meta);
      openButton.appendChild(favicons);

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "saved-session-edit";
      editButton.textContent = "✎";
      editButton.title = t("editSession");
      editButton.dataset.action = "edit-saved-session";
      editButton.dataset.sessionId = session.id;

      card.appendChild(openButton);
      card.appendChild(editButton);

      list.appendChild(card);
    });
  }

   async function openSavedSession(sessionId) {
     const sessions = await getSavedSessions();
     const session = sessions.find((item) => item.id === sessionId);
   
     if (!session) {
       return;
     }
   
     for (const tab of session.tabs) {
       if (tab.url) {
         await chrome.tabs.create({ url: tab.url, active: false });
       }
     }
   
     await (async () => {
  await getLanguage();
  applyStaticTranslations();
  await renderDashboard();
})();
     await renderSavedSessions();
     showToast(t("sessionOpened", { name: session.name }));
   }
   
   async function getCurrentSessionCandidateTabs(existingSession = null) {
     await fetchOpenTabs();
   
     const realTabs = getRealTabs();
     const byUrl = new Map();
   
     if (existingSession && Array.isArray(existingSession.tabs)) {
       existingSession.tabs.forEach((tab) => {
         if (tab.url) {
           byUrl.set(tab.url, {
             title: tab.title || tab.url,
             url: tab.url,
             source: "saved"
           });
         }
       });
     }
   
     realTabs.forEach((tab) => {
       if (!tab.url) {
         return;
       }
   
       byUrl.set(tab.url, {
         title: getTabDisplayTitle(tab),
         url: tab.url,
         source: "open"
       });
     });
   
     return Array.from(byUrl.values());
   }
   
   async function openSessionModal(sessionId = null) {
     editingSessionId = sessionId;
   
     const modal = document.getElementById("sessionModal");
     const title = document.getElementById("sessionModalTitle");
     const nameInput = document.getElementById("sessionNameInput");
     const deleteButton = document.getElementById("deleteSessionBtn");
     const tabsList = document.getElementById("sessionTabsList");
   
     if (!modal || !title || !nameInput || !deleteButton || !tabsList) {
       return;
     }
   
     const sessions = await getSavedSessions();
     const existingSession = sessionId
       ? sessions.find((session) => session.id === sessionId)
       : null;
   
     title.textContent = existingSession ? t("editSessionTitle") : t("createSessionTitle");
     nameInput.value = existingSession ? existingSession.name : "";
     deleteButton.hidden = !existingSession;
   
     const selectedUrls = new Set(
       existingSession
         ? existingSession.tabs.map((tab) => tab.url)
         : []
     );
   
     const candidateTabs = await getCurrentSessionCandidateTabs(existingSession);
   
     tabsList.innerHTML = "";
   
     candidateTabs.forEach((tab) => {
       const row = document.createElement("label");
       row.className = "session-tab-row";
   
       const checkbox = document.createElement("input");
       checkbox.type = "checkbox";
       checkbox.value = tab.url;
       checkbox.checked = existingSession ? selectedUrls.has(tab.url) : true;
   
       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = getTabFavicon(tab.url, 16);
   
       const info = document.createElement("span");
       info.className = "session-tab-info";
   
       const tabTitle = document.createElement("span");
       tabTitle.className = "session-tab-title";
       tabTitle.textContent = tab.title || tab.url;
   
       const tabUrl = document.createElement("span");
       tabUrl.className = "session-tab-url";
       tabUrl.textContent = getTabDomain(tab.url) || tab.url;
   
       info.appendChild(tabTitle);
       info.appendChild(tabUrl);
   
       row.appendChild(checkbox);
       row.appendChild(favicon);
       row.appendChild(info);
   
       tabsList.appendChild(row);
     });
   
     modal.hidden = false;
     nameInput.focus();
   }
   
   function closeSessionModal() {
     const modal = document.getElementById("sessionModal");
   
     if (!modal) {
       return;
     }
   
     editingSessionId = null;
     modal.hidden = true;
   }
   
   async function saveSessionFromModal() {
     const nameInput = document.getElementById("sessionNameInput");
     const tabsList = document.getElementById("sessionTabsList");
   
     if (!nameInput || !tabsList) {
       return;
     }
   
     const name = nameInput.value.trim();
   
     if (!name) {
       alert(t("sessionNameRequired"));
       return;
     }
   
     const checkedInputs = Array.from(
       tabsList.querySelectorAll("input[type='checkbox']:checked")
     );
   
     if (checkedInputs.length === 0) {
       alert(t("sessionTabsRequired"));
       return;
     }
   
     const allRows = Array.from(tabsList.querySelectorAll(".session-tab-row"));
   
     const selectedTabs = checkedInputs.map((input) => {
       const row = allRows.find((item) => item.querySelector("input") === input);
       const title = row?.querySelector(".session-tab-title")?.textContent || input.value;
   
       return {
         title,
         url: input.value
       };
     });
   
     const sessions = await getSavedSessions();
   
     if (editingSessionId) {
       const index = sessions.findIndex((session) => session.id === editingSessionId);
   
       if (index !== -1) {
        sessions[index] = {
          ...sessions[index],
          name,
          tabs: selectedTabs,
          updatedAt: new Date().toISOString()
        };
       }
     } else {
       sessions.push({
         id: createSessionId(),
         name,
         tabs: selectedTabs,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
       });
     }
   
     await saveSavedSessions(sessions);
     await renderSavedSessions();
     closeSessionModal();
   
     showToast(t("sessionSaved"));
   }
   
   async function deleteCurrentSession() {
     if (!editingSessionId) {
       return;
     }
   
     const confirmed = confirm(t("deleteSessionConfirm"));
   
     if (!confirmed) {
       return;
     }
   
     const sessions = await getSavedSessions();
     const updatedSessions = sessions.filter((session) => session.id !== editingSessionId);
   
     await saveSavedSessions(updatedSessions);
     await renderSavedSessions();
     closeSessionModal();
   
     showToast(t("sessionDeleted"));
   }
   
   function setupSessionManager() {
     const cancelButton = document.getElementById("cancelSessionBtn");
     const saveButton = document.getElementById("saveSessionBtn");
     const deleteButton = document.getElementById("deleteSessionBtn");
     const selectAllButton = document.getElementById("selectAllSessionTabsBtn");
     const clearButton = document.getElementById("clearSessionTabsBtn");
     const modal = document.getElementById("sessionModal");
   
     if (cancelButton) {
       cancelButton.addEventListener("click", closeSessionModal);
     }
   
     if (saveButton) {
       saveButton.addEventListener("click", saveSessionFromModal);
     }
   
     if (deleteButton) {
       deleteButton.addEventListener("click", deleteCurrentSession);
     }
   
     if (selectAllButton) {
       selectAllButton.addEventListener("click", () => {
         document
           .querySelectorAll("#sessionTabsList input[type='checkbox']")
           .forEach((checkbox) => {
             checkbox.checked = true;
           });
       });
     }
   
     if (clearButton) {
       clearButton.addEventListener("click", () => {
         document
           .querySelectorAll("#sessionTabsList input[type='checkbox']")
           .forEach((checkbox) => {
             checkbox.checked = false;
           });
       });
     }
   
     if (modal) {
       modal.addEventListener("click", (event) => {
         if (event.target === modal) {
           closeSessionModal();
         }
       });
     }
   
     renderSavedSessions();
     applyStaticTranslations();
   }
   
   document.addEventListener("DOMContentLoaded", setupSessionManager);



   /* ----------------------------------------------------------------
   LIVE TAB REFRESH
   Refresh Tab Out when Chrome tabs change.
   ---------------------------------------------------------------- */

let tabRefreshTimer = null;

function scheduleDashboardRefresh() {
  clearTimeout(tabRefreshTimer);

  tabRefreshTimer = setTimeout(async () => {
    await renderDashboard();
  }, 350);
}

if (chrome?.tabs?.onCreated) {
  chrome.tabs.onCreated.addListener(() => {
    scheduleDashboardRefresh();
  });
}

if (chrome?.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener(() => {
    scheduleDashboardRefresh();
  });
}

if (chrome?.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (
      changeInfo.status === "complete" ||
      changeInfo.url ||
      changeInfo.title
    ) {
      scheduleDashboardRefresh();
    }
  });
}

// Do not refresh the whole dashboard on focus/activation only.
// It caused visible layout jumps while switching between Tab Out and grouped tabs.
// Tab creation/removal and URL/title completion still refresh the open-tabs section.

/* ----------------------------------------------------------------
   EVENT HANDLERS — using event delegation

   One listener on document handles ALL button clicks.
   Think of it as one security guard watching the whole building
   instead of one per door.
   ---------------------------------------------------------------- */

document.addEventListener("pointerdown", (e) => {
  const card = e.target.closest('.saved-session-card[data-session-draggable="true"]');

  if (!card || savedSessionsViewMode !== "sessions") {
    return;
  }

  if (e.button !== 0 || e.target.closest('.saved-session-edit')) {
    return;
  }

  const list = card.closest("#savedSessionsList");

  if (!list) {
    return;
  }

  savedSessionDragState = {
    card,
    list,
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    initialOrder: getSavedSessionDomOrder(list),
    placeholder: null,
    ghost: null
  };

  if (card.setPointerCapture) {
    try { card.setPointerCapture(e.pointerId); } catch {}
  }
});

document.addEventListener("pointermove", (e) => {
  const state = savedSessionDragState;

  if (!state || state.pointerId !== e.pointerId) {
    return;
  }

  const distanceX = Math.abs(e.clientX - state.startX);
  const distanceY = Math.abs(e.clientY - state.startY);

  if (!state.dragging) {
    if (Math.max(distanceX, distanceY) < SAVED_SESSION_DRAG_THRESHOLD) {
      return;
    }

    e.preventDefault();
    startSavedSessionPointerDrag(e, state);
    return;
  }

  e.preventDefault();
  updateSavedSessionPointerDrag(e);
});

document.addEventListener("pointerup", async (e) => {
  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("pointercancel", async (e) => {
  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("input", (event) => {
  if (event.target?.id !== "openTabsFilterInput") {
    return;
  }

  openTabsFilterQuery = event.target.value || "";
  renderFilteredOpenTabs();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target && (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );

  if (event.key === "/" && !isTyping) {
    const openTabsSection = document.getElementById("openTabsSection");
    if (!openTabsSection || openTabsSection.style.display === "none") return;

    event.preventDefault();
    openTabsSearchVisible = true;
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector('[data-action="toggle-open-tabs-search"]');
    const input = document.getElementById("openTabsFilterInput");

    if (searchWrap) searchWrap.classList.add("is-visible");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (input) input.focus();
    return;
  }

  if (event.key === "Escape" && target?.id === "openTabsFilterInput") {
    event.preventDefault();
    openTabsFilterQuery = "";
    target.value = "";
    openTabsSearchVisible = false;

    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector('[data-action="toggle-open-tabs-search"]');
    if (searchWrap) searchWrap.classList.remove("is-visible");
    if (toggle) toggle.setAttribute("aria-expanded", "false");

    target.blur();
    renderFilteredOpenTabs();
  }
});

document.addEventListener('click', async (e) => {
  // Walk up the DOM to find the nearest element with data-action
  const actionEl = e.target.closest('[data-action]');
  
  if (!actionEl) return;

  const action = actionEl.dataset.action;

  // ---- Open tabs search ----
  if (action === "toggle-open-tabs-search") {
    e.preventDefault();
    e.stopPropagation();

    openTabsSearchVisible = !openTabsSearchVisible;
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const input = document.getElementById("openTabsFilterInput");

    if (searchWrap) searchWrap.classList.toggle("is-visible", openTabsSearchVisible);
    actionEl.setAttribute("aria-expanded", openTabsSearchVisible ? "true" : "false");

    if (openTabsSearchVisible && input) {
      requestAnimationFrame(() => input.focus());
    }

    if (!openTabsSearchVisible && !normalizeFilterText(openTabsFilterQuery)) {
      return;
    }

    return;
  }

  if (action === "clear-open-tabs-search") {
    e.preventDefault();
    e.stopPropagation();

    const hadQuery = Boolean(normalizeFilterText(openTabsFilterQuery));
    openTabsFilterQuery = "";

    const input = document.getElementById("openTabsFilterInput");
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector('[data-action="toggle-open-tabs-search"]');

    if (input) {
      input.value = "";
    }

    if (hadQuery) {
      if (input) input.focus();
      renderFilteredOpenTabs();
      return;
    }

    openTabsSearchVisible = false;
    if (searchWrap) searchWrap.classList.remove("is-visible");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (input) input.blur();
    renderFilteredOpenTabs();
    return;
  }

    // ---- Backup / import ----
    if (action === "toggle-backup-menu") {
      e.preventDefault();
      e.stopPropagation();

      toggleBackupMenu();
      return;
    }

    if (action === "export-tab-out-data") {
      e.preventDefault();
      e.stopPropagation();

      await exportTabOutData();
      return;
    }

    if (action === "import-tab-out-data") {
      e.preventDefault();
      e.stopPropagation();

      openBackupImportPicker();
      return;
    }

    // ---- Saved sessions ----
    if (action === "create-saved-session") {
      e.preventDefault();
      e.stopPropagation();
  
      await openSessionModal(null);
      return;
    }
  
    if (action === "edit-saved-session") {
      e.preventDefault();
      e.stopPropagation();
  
      await openSessionModal(actionEl.dataset.sessionId);
      return;
    }
  
    if (action === "open-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      if (Date.now() < suppressSavedSessionOpenUntil) {
        return;
      }
  
      await openSavedSession(actionEl.dataset.sessionId);
      return;
    }

    
    if (action === "set-sessions-view") {
      e.preventDefault();
      e.stopPropagation();

      savedSessionsViewMode = actionEl.dataset.sessionView === "groups" ? "groups" : "sessions";
      await renderSavedSessions();
      return;
    }

    if (action === "sync-protected-groups") {
      e.preventDefault();
      e.stopPropagation();

      lastProtectedGroupsRenderSignature = "";
      await renderProtectedGroupsIntoSessions(document.getElementById("savedSessionsList"), { force: true });
      protectedGroupsToast(t("syncChromeGroups"));
      return;
    }

    if (action === "protect-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await protectChromeGroup(actionEl.dataset.groupId);
      return;
    }

    if (action === "toggle-protected-group-menu") {
      e.preventDefault();
      e.stopPropagation();

      toggleProtectedGroupMenu(actionEl.dataset.menuKey);
      return;
    }

    if (action === "focus-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await focusProtectedGroup(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "focus-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await focusChromeGroup(actionEl.dataset.groupId);
      return;
    }

    if (action === "restore-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      const needsConfirmation = await shouldConfirmProtectedGroupRestore(actionEl.dataset.snapshotId);

      if (!needsConfirmation || confirm(t("restoreProtectedGroupConfirm"))) {
        await restoreProtectedGroup(actionEl.dataset.snapshotId);
      }
      return;
    }

    if (action === "open-protected-group-copy") {
      e.preventDefault();
      e.stopPropagation();

      await openProtectedGroupCopy(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "update-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("updateProtectedGroupConfirm"))) {
        await updateProtectedSnapshot(actionEl.dataset.snapshotId);
      }
      return;
    }

    if (action === "ignore-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await ignoreProtectedGroupChange(actionEl.dataset.snapshotId);
      return;
    }

    if (action === "delete-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("deleteProtectedGroupConfirm"))) {
        await deleteProtectedSnapshot(actionEl.dataset.snapshotId);
      }
      return;
    }
// ---- Toggle tab dropdown ----
    if (action === "toggle-tab-dropdown") {
      e.preventDefault();
      e.stopPropagation();
  
      const dropdownId = actionEl.dataset.dropdownId;
      const dropdown = document.getElementById(dropdownId);
  
      if (!dropdown) {
        return;
      }
  
      dropdown.hidden = !dropdown.hidden;
  
      const tabCount = dropdown.querySelectorAll(".tab-dropdown-item").length;

      actionEl.textContent = dropdown.hidden
        ? t("showTabs", { count: tabCount })
        : t("hideTabs", { count: tabCount });
  
      return;
    }

  // ---- Close duplicate Tab Out tabs ----
  if (action === 'close-tabout-dupes') {
    await closeTabOutDupes();
    playCloseSound();
    const banner = document.getElementById('tabOutDupeBanner');
    if (banner) {
      banner.style.transition = 'opacity 0.4s';
      banner.style.opacity = '0';
      setTimeout(() => { banner.style.display = 'none'; banner.style.opacity = '1'; }, 400);
    }
    showToast(t("closedExtraTabOutTabs"));

    await renderDashboard();
    await renderSavedSessions();

    return;
  }

  const card = actionEl.closest('.mission-card');

  // ---- Expand overflow chips ("+N more") ----
  if (action === 'expand-chips') {
    const overflowContainer = actionEl.parentElement.querySelector('.page-chips-overflow');
    if (overflowContainer) {
      overflowContainer.style.display = 'contents';
      actionEl.remove();
    }
    return;
  }

  // ---- Focus a specific tab ----
  if (action === 'focus-tab') {
    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // ---- Close a single tab ----
  if (action === 'close-single-tab') {
    e.stopPropagation(); // don't trigger parent chip's focus-tab
    const tabUrl = actionEl.dataset.tabUrl;
    if (!tabUrl) return;

    // Close the tab in Chrome directly
    const allTabs = await chrome.tabs.query({});
    const match   = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    playCloseSound();

    // Animate the chip row out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      const rect = chip.getBoundingClientRect();
      shootConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => {
        chip.remove();
        // If the card now has no tabs, remove it too
        const parentCard = document.querySelector('.mission-card:has(.mission-pages:empty)');
        if (parentCard) animateCardOut(parentCard);
        document.querySelectorAll('.mission-card').forEach(c => {
          if (c.querySelectorAll('.page-chip[data-action="focus-tab"]').length === 0) {
            animateCardOut(c);
          }
        });
      }, 200);
    }

    // Update footer
    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;

    showToast(t("tabClosed"));
    return;
  }

  // ---- Save a single tab for later (then close it) ----
  if (action === 'defer-single-tab') {
    e.stopPropagation();
    const tabUrl   = actionEl.dataset.tabUrl;
    const tabTitle = actionEl.dataset.tabTitle || tabUrl;
    if (!tabUrl) return;

    // Save to chrome.storage.local
    try {
      await saveTabForLater({ url: tabUrl, title: tabTitle });
    } catch (err) {
      console.error('[tab-out] Failed to save tab:', err);
      showToast(t("failedToSaveTab"));
      return;
    }

    // Close the tab in Chrome
    const allTabs = await chrome.tabs.query({});
    const match   = allTabs.find(t => t.url === tabUrl);
    if (match) await chrome.tabs.remove(match.id);
    await fetchOpenTabs();

    // Animate chip out
    const chip = actionEl.closest('.page-chip');
    if (chip) {
      chip.style.transition = 'opacity 0.2s, transform 0.2s';
      chip.style.opacity    = '0';
      chip.style.transform  = 'scale(0.8)';
      setTimeout(() => chip.remove(), 200);
    }

    showToast(t("savedForLater"));
    await renderDeferredColumn();
    return;
  }

  // ---- Check off a saved tab (moves it to archive) ----
  if (action === 'check-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await checkOffSavedTab(id);

    // Animate: strikethrough first, then slide out
    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('checked');
      setTimeout(() => {
        item.classList.add('removing');
        setTimeout(() => {
          item.remove();
          renderDeferredColumn(); // refresh counts and archive
        }, 300);
      }, 800);
    }
    return;
  }

  // ---- Dismiss a saved tab (removes it entirely) ----
  if (action === 'dismiss-deferred') {
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    await dismissSavedTab(id);

    const item = actionEl.closest('.deferred-item');
    if (item) {
      item.classList.add('removing');
      setTimeout(() => {
        item.remove();
        renderDeferredColumn();
      }, 300);
    }
    return;
  }

  // ---- Close all tabs in a domain group ----
  if (action === 'close-domain-tabs') {
    const domainId = actionEl.dataset.domainId;
    const group    = domainGroups.find(g => {
      return 'domain-' + g.domain.replace(/[^a-z0-9]/g, '-') === domainId;
    });
    if (!group) return;

    const urls      = group.tabs.map(t => t.url);
    // Landing pages and custom groups (whose domain key isn't a real hostname)
    // must use exact URL matching to avoid closing unrelated tabs
    const useExact  = group.domain === '__landing-pages__' || !!group.label;

    if (useExact) {
      await closeTabsExact(urls);
    } else {
      await closeTabsByUrls(urls);
    }

    if (card) {
      playCloseSound();
      animateCardOut(card);
    }

    // Remove from in-memory groups
    const idx = domainGroups.indexOf(group);
    if (idx !== -1) domainGroups.splice(idx, 1);

    const groupLabel = group.domain === '__landing-pages__' ? t('homepages') : (group.label || friendlyDomain(group.domain));
    showToast(t(urls.length === 1 ? "closedTabsFrom" : "closedTabsFromPlural", { count: urls.length, name: groupLabel }));

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // ---- Close duplicates, keep one copy ----
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;

    await closeDuplicateTabs(urls, true);
    playCloseSound();

    // Hide the dedup button
    actionEl.style.transition = 'opacity 0.2s';
    actionEl.style.opacity    = '0';
    setTimeout(() => actionEl.remove(), 200);

    // Remove dupe badges from the card
    if (card) {
      card.querySelectorAll('.chip-dupe-badge').forEach(b => {
        b.style.transition = 'opacity 0.2s';
        b.style.opacity    = '0';
        setTimeout(() => b.remove(), 200);
      });
      card.querySelectorAll('.open-tabs-badge').forEach(badge => {
        if (badge.textContent.includes('duplicate')) {
          badge.style.transition = 'opacity 0.2s';
          badge.style.opacity    = '0';
          setTimeout(() => badge.remove(), 200);
        }
      });
      card.classList.remove('has-amber-bar');
      card.classList.add('has-neutral-bar');
    }

    showToast('Closed duplicates, kept one copy each');
    return;
  }

  // ---- Close ALL open tabs ----
  if (action === 'close-all-open-tabs') {
    const allUrls = openTabs
      .filter(t => t.url && !t.url.startsWith('chrome') && !t.url.startsWith('about:'))
      .map(t => t.url);
    await closeTabsByUrls(allUrls);
    playCloseSound();

    document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
      shootConfetti(
        c.getBoundingClientRect().left + c.offsetWidth / 2,
        c.getBoundingClientRect().top  + c.offsetHeight / 2
      );
      animateCardOut(c);
    });

    showToast('All tabs closed. Fresh start.');
    return;
  }
});

// ---- Archive toggle — expand/collapse the archive section ----
document.addEventListener('click', (e) => {
  const toggle = e.target.closest('#archiveToggle');
  if (!toggle) return;

  toggle.classList.toggle('open');
  const body = document.getElementById('archiveBody');
  if (body) {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }
});

// ---- Archive search — filter archived items as user types ----
document.addEventListener('input', async (e) => {
  if (e.target.id !== 'archiveSearch') return;

  const q = e.target.value.trim().toLowerCase();
  const archiveList = document.getElementById('archiveList');
  if (!archiveList) return;

  try {
    const { archived } = await getSavedTabs();

    if (q.length < 2) {
      // Show all archived items
      archiveList.innerHTML = archived.map(item => renderArchiveItem(item)).join('');
      return;
    }

    // Filter by title or URL containing the query string
    const results = archived.filter(item =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.url  || '').toLowerCase().includes(q)
    );

    archiveList.innerHTML = results.map(item => renderArchiveItem(item)).join('')
      || `<div style="font-size:12px;color:var(--muted);padding:8px 0">${t("noResults")}</div>`;
  } catch (err) {
    console.warn(`[tab-out] ${t("archiveSearchFailed")}:`, err);
  }
});


function updateClock() {
  const clock = document.getElementById("clockDisplay");
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString(activeLocale(), {
    hour: "2-digit",
    minute: "2-digit"
  });
}

updateClock();
setInterval(updateClock, 1000);

/* ----------------------------------------------------------------
   INITIALIZE
   ---------------------------------------------------------------- */
renderDashboard();


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


/* ----------------------------------------------------------------
   LANGUAGE SWITCHER
   ---------------------------------------------------------------- */

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.placeholder = t(key);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.title = t(key);
  });

  updateLanguageButton();
}

function updateLanguageButton() {
  const button = document.getElementById("languageToggleBtn");

  if (!button) {
    return;
  }

  button.textContent = currentLanguage.toUpperCase();
  button.title = currentLanguage === "fr" ? t("languageSwitchToEnglish") : t("languageSwitchToFrench");
}

async function setupLanguageSwitcher() {
  await getLanguage();

  applyStaticTranslations();

  const button = document.getElementById("languageToggleBtn");

  if (!button) {
    return;
  }

  updateLanguageButton();

  button.addEventListener("click", async () => {
    const nextLanguage = currentLanguage === "fr" ? "en" : "fr";

    await setLanguage(nextLanguage);

    applyStaticTranslations();
    updateLanguageButton();

    await renderDashboard();
    await renderSavedSessions();
    await loadWeather({ force: false });
  });
}

document.addEventListener("DOMContentLoaded", setupLanguageSwitcher);

/* ----------------------------------------------------------------
   BACKUP / IMPORT — discreet local data safety net
   ---------------------------------------------------------------- */

const TAB_OUT_BACKUP_VERSION = 1;
const TAB_OUT_CHROME_STORAGE_BACKUP_KEYS = [
  "savedSessions",
  "tabOutProtectedGroups",
  "tabOutLanguage",
  "deferred"
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

    TAB_OUT_CHROME_STORAGE_BACKUP_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(payload.data.chromeStorage, key)) {
        chromeStorageData[key] = payload.data.chromeStorage[key];
      }
    });

    if (Object.keys(chromeStorageData).length) {
      await chrome.storage.local.set(chromeStorageData);
    }

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

/* ----------------------------------------------------------------
   WEATHER WIDGET — local weather, city hidden by default
   ---------------------------------------------------------------- */

   const WEATHER_CACHE_KEY = "tabOutWeatherCache";
   const WEATHER_CACHE_MAX_AGE = 45 * 60 * 1000; // 45 min
   const WEATHER_AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // vérifie toutes les 5 min
   let weatherAutoRefreshTimer = null;
   let weatherCityVisible = false;
   
   function mapWeatherCode(code) {
     if ([0].includes(code)) {
       return { kind: "sun", label: t("weatherSun") };
     }
   
     if ([1, 2].includes(code)) {
       return { kind: "partly", label: t("weatherPartly") };
     }
   
     if ([3].includes(code)) {
       return { kind: "cloud", label: t("weatherCloud") };
     }
   
     if ([45, 48].includes(code)) {
       return { kind: "fog", label: t("weatherFog") };
     }
   
     if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
       return { kind: "rain", label: t("weatherRain") };
     }
   
     if ([71, 73, 75, 77, 85, 86].includes(code)) {
       return { kind: "snow", label: t("weatherSnow") };
     }
   
     if ([95, 96, 99].includes(code)) {
       return { kind: "storm", label: t("weatherStorm") };
     }
   
     return { kind: "cloud", label: t("weatherGeneric") };
   }
   
   function roundTemp(value) {
     if (typeof value !== "number") {
       return "--";
     }
   
     return Math.round(value);
   }


   function startWeatherAutoRefresh() {
    if (weatherAutoRefreshTimer) {
      clearInterval(weatherAutoRefreshTimer);
    }
  
    weatherAutoRefreshTimer = setInterval(() => {
      loadWeather({ force: false });
    }, WEATHER_AUTO_REFRESH_INTERVAL);
  }
   
   async function getStoredWeatherCache() {
     const { [WEATHER_CACHE_KEY]: cache } = await chrome.storage.local.get(WEATHER_CACHE_KEY);
   
     if (!cache || !cache.timestamp) {
       return null;
     }
   
     const isFresh = Date.now() - cache.timestamp < WEATHER_CACHE_MAX_AGE;
   
     return isFresh ? cache : null;
   }
   
   async function saveWeatherCache(data) {
     await chrome.storage.local.set({
       [WEATHER_CACHE_KEY]: {
         ...data,
         timestamp: Date.now()
       }
     });
   }
   
   function getCurrentPositionPromise() {
     return new Promise((resolve, reject) => {
       if (!navigator.geolocation) {
         reject(new Error("Geolocation unavailable"));
         return;
       }
   
       navigator.geolocation.getCurrentPosition(resolve, reject, {
         enableHighAccuracy: false,
         timeout: 8000,
         maximumAge: 60 * 60 * 1000
       });
     });
   }
   
   async function reverseGeocodeCity(latitude, longitude) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${latitude}` +
        `&lon=${longitude}` +
        `&zoom=10` +
        `&addressdetails=1`;
  
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });
  
      if (!response.ok) {
        return "";
      }
  
      const data = await response.json();
      const address = data.address || {};
  
      return (
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state ||
        ""
      );
    } catch {
      return "";
    }
  }
   
   async function fetchWeatherForPosition(latitude, longitude) {
     const url =
       `https://api.open-meteo.com/v1/forecast` +
       `?latitude=${latitude}` +
       `&longitude=${longitude}` +
       `&current=temperature_2m,apparent_temperature,weather_code` +
       `&timezone=auto`;
   
     const response = await fetch(url);
   
     if (!response.ok) {
       throw new Error("Weather request failed");
     }
   
     const data = await response.json();
     const current = data.current || {};
     const mapped = mapWeatherCode(current.weather_code);
   
     const city = await reverseGeocodeCity(latitude, longitude);
   
     return {
       temperature: roundTemp(current.temperature_2m),
       feelsLike: roundTemp(current.apparent_temperature),
       condition: mapped.label,
       kind: mapped.kind,
       city,
       latitude,
       longitude
     };
   }
   
   
function translateWeatherKind(kind, fallback = "") {
  const keyMap = {
    sun: "weatherSun",
    partly: "weatherPartly",
    cloud: "weatherCloud",
    fog: "weatherFog",
    rain: "weatherRain",
    snow: "weatherSnow",
    storm: "weatherStorm"
  };

  return t(keyMap[kind] || "weatherGeneric") || fallback;
}

function renderWeatherWidget(weather, cityVisible = false) {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");
     const visual = document.getElementById("weatherVisual");
     const temp = document.getElementById("weatherTemp");
     const condition = document.getElementById("weatherCondition");
     const feelsLike = document.getElementById("weatherFeelsLike");
     const cityText = document.getElementById("weatherCityText");
     const cityToggle = document.getElementById("weatherCityToggle");
   
     if (!widget || !enableBtn || !content || !visual || !temp || !condition || !feelsLike || !cityText || !cityToggle) {
       return;
     }
   
     widget.hidden = false;
     enableBtn.hidden = true;
     content.hidden = false;
   
     visual.dataset.weather = weather.kind || "cloud";
     temp.textContent = `${weather.temperature}°C`;
     condition.textContent = translateWeatherKind(weather.kind, weather.condition);
     feelsLike.textContent = t("weatherFeelsLike", { temp: weather.feelsLike });
   
     cityText.textContent = cityVisible && weather.city ? weather.city : "";
     cityToggle.classList.toggle("is-visible", cityVisible && Boolean(weather.city));
     cityToggle.setAttribute("aria-label", cityVisible ? t("hideCity") : t("showCity"));
   }
   
   function renderWeatherEnableState() {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");
   
     if (!widget || !enableBtn || !content) {
       return;
     }
   
     widget.hidden = false;
     enableBtn.hidden = false;
     content.hidden = true;
   }
   
   async function loadWeather({ force = false } = {}) {
     try {
       const cached = !force ? await getStoredWeatherCache() : null;
       const cityVisible = false;
       weatherCityVisible = false;
   
       if (cached) {
         renderWeatherWidget(cached, cityVisible);
         return;
       }
   
       const position = await getCurrentPositionPromise();
       const { latitude, longitude } = position.coords;
   
       const weather = await fetchWeatherForPosition(latitude, longitude);
   
       await saveWeatherCache(weather);
       renderWeatherWidget(weather, cityVisible);
     } catch {
       renderWeatherEnableState();
     }
   }
   
   async function setupWeatherWidget() {
     const enableBtn = document.getElementById("weatherEnableBtn");
     const cityToggle = document.getElementById("weatherCityToggle");
     const widget = document.getElementById("weatherWidget");
   
     if (!widget) {
       return;
     }
   
     renderWeatherEnableState();
   
     const cached = await getStoredWeatherCache();
   
     if (cached) {
      weatherCityVisible = false;
      renderWeatherWidget(cached, false);
    }
   
     if (enableBtn) {
       enableBtn.addEventListener("click", async () => {
         enableBtn.textContent = t("weatherLoading");
         await loadWeather({ force: true });
         enableBtn.textContent = t("weatherEnable");
       });
     }
   
     if (cityToggle) {
      cityToggle.addEventListener("click", async () => {
        weatherCityVisible = !weatherCityVisible;
  
        const cache = await getStoredWeatherCache();
  
        if (cache) {
          renderWeatherWidget(cache, weatherCityVisible);
        }
      });
    }


    startWeatherAutoRefresh();
  }
  
  document.addEventListener("DOMContentLoaded", setupWeatherWidget);

/* ----------------------------------------------------------------
   PROTECTED CHROME TAB GROUPS
   Compact snapshot-based sync inside the Sessions section.
   ---------------------------------------------------------------- */

const PROTECTED_GROUPS_STORAGE_KEY = "tabOutProtectedGroups";

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
  const result = await chrome.storage.local.get(PROTECTED_GROUPS_STORAGE_KEY);
  return result[PROTECTED_GROUPS_STORAGE_KEY] || [];
}

async function saveProtectedGroups(groups) {
  await chrome.storage.local.set({
    [PROTECTED_GROUPS_STORAGE_KEY]: groups
  });
}

async function getCurrentChromeGroups() {
  if (!chrome?.tabGroups?.query) {
    return [];
  }

  const groups = await chrome.tabGroups.query({});
  const tabs = await chrome.tabs.query({});

  return groups
    .map((group) => {
      const groupTabs = tabs
        .filter((tab) => tab.groupId === group.id)
        .map((tab) => ({
          id: tab.id,
          title: tab.title || "",
          url: tab.url || "",
          favIconUrl: tab.favIconUrl || getGroupFavicon(tab.url || "")
        }))
        .filter((tab) => tab.url);

      return {
        chromeGroupId: group.id,
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

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!activeTab || activeTab.groupId === undefined || activeTab.groupId === -1) {
    return null;
  }

  const chromeGroup = await chrome.tabGroups.get(activeTab.groupId);
  const allTabs = await chrome.tabs.query({});

  const groupTabs = allTabs
    .filter((tab) => tab.groupId === chromeGroup.id)
    .map((tab) => ({
      id: tab.id,
      title: tab.title || "",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl || getGroupFavicon(tab.url || "")
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
  openButton.dataset.action = "focus-chrome-group";
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
  openButton.dataset.action = "focus-protected-group";
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

  const tabIds = [];

  for (const tab of snapshot.tabs || []) {
    if (!tab.url) {
      continue;
    }

    const createdTab = await chrome.tabs.create({
      url: tab.url,
      active: false
    });

    if (createdTab?.id) {
      tabIds.push(createdTab.id);
    }
  }

  if (!tabIds.length) {
    return;
  }

  const chromeGroupId = await chrome.tabs.group({ tabIds });

  await chrome.tabGroups.update(chromeGroupId, {
    title: snapshot.title || t("untitledChromeGroup"),
    color: snapshot.color || "grey",
    collapsed: false
  });

  if (focusAfterRestore && tabIds[0]) {
    const firstTab = await chrome.tabs.update(tabIds[0], { active: true });

    if (firstTab?.windowId) {
      await chrome.windows.update(firstTab.windowId, { focused: true });
    }
  }

  if (updateSnapshotReference) {
    const updatedGroups = protectedGroups.map((group) => {
      if (group.id !== snapshotId) {
        return group;
      }

      return {
        ...group,
        chromeGroupId,
        ignoredSignature: "",
        updatedAt: new Date().toISOString()
      };
    });

    await saveProtectedGroups(updatedGroups);
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

  protectedGroupsRefreshTimer = setTimeout(() => {
    if (savedSessionsViewMode === "groups") {
      renderProtectedGroupsIntoSessions(document.getElementById("savedSessionsList"));
    }
  }, 700);
}

if (chrome?.tabGroups?.onCreated) {
  chrome.tabGroups.onCreated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabGroups?.onUpdated) {
  chrome.tabGroups.onUpdated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabGroups?.onRemoved) {
  chrome.tabGroups.onRemoved.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onCreated) {
  chrome.tabs.onCreated.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onRemoved) {
  chrome.tabs.onRemoved.addListener(scheduleProtectedGroupsRefresh);
}

if (chrome?.tabs?.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url || changeInfo.title) {
      scheduleProtectedGroupsRefresh();
    }
  });
}
