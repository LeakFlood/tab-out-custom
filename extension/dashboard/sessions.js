'use strict';

/* ----------------------------------------------------------------
   SAVED SESSIONS
   ---------------------------------------------------------------- */

   const SAVED_SESSION_ROWS_STORAGE_KEY = "tabOutSessionRowsV1";
   const SAVED_SESSION_ROW_COLORS = Object.freeze({
     "": "",
     sage: "#8fc8a3",
     sky: "#83b9dc",
     amber: "#d9ad68",
     rose: "#d68fa0",
     violet: "#aa98d8"
   });
   let unifiedSessionMigrationPromise = null;

   async function ensureUnifiedSessionStorage() {
     if (!unifiedSessionMigrationPromise) {
       unifiedSessionMigrationPromise = sendCollectionRuntimeMessage({
         type: "tabOut:ensureSessionMigration"
       }).then((response) => {
         if (!response.ok) {
           throw new Error(response.code || "session_migration_failed");
         }

         return response;
       }).catch((error) => {
         unifiedSessionMigrationPromise = null;
         console.warn("[tab-out] session migration failed:", error);
         return null;
       });
     }

     return unifiedSessionMigrationPromise;
   }

   async function getSavedSessions() {
     await ensureUnifiedSessionStorage();
     return globalThis.TabOutCollectionClient.getSessions();
   }

   async function saveSavedSessions(sessions) {
     await globalThis.TabOutCollectionClient.replaceSessions(sessions);
   }

   async function getSavedSessionRows(sessions = []) {
     try {
       return await globalThis.TabOutCollectionClient.getSessionRows();
     } catch (error) {
       console.warn("[tab-out] session rows could not be loaded:", error);
       return sessions.length
         ? [{
             id: createSavedSessionRowId(),
             sessionIds: sessions.map(
               (session) => String(session.id)
             ),
             title: "",
             color: ""
           }]
         : [];
     }
   }

   async function saveSavedSessionRows(rows) {
     await globalThis.TabOutCollectionClient.replaceSessionRows(rows);
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

   function createSavedSessionRowId() {
     const randomPart = globalThis.crypto?.randomUUID?.() ||
       `${Date.now()}-${Math.random().toString(16).slice(2)}`;

     return `row-${randomPart}`;
   }

   function normalizeSavedSessionRowColor(value) {
     const color = String(value || "").trim().toLowerCase();
     return Object.prototype.hasOwnProperty.call(
       SAVED_SESSION_ROW_COLORS,
       color
     )
       ? color
       : "";
   }

   function normalizeSavedSessionRowTitle(value) {
     return String(value || "").trim().slice(0, 80);
   }

   function normalizeSavedSessionRowData(row) {
     if (Array.isArray(row)) {
       return {
         id: createSavedSessionRowId(),
         sessionIds: row.map((sessionId) => String(sessionId)),
         title: "",
         color: ""
       };
     }

     return {
       id: String(row?.id || "").trim() ||
         createSavedSessionRowId(),
       sessionIds: Array.isArray(row?.sessionIds)
         ? row.sessionIds.map((sessionId) => String(sessionId))
         : [],
       title: normalizeSavedSessionRowTitle(row?.title),
       color: normalizeSavedSessionRowColor(row?.color)
     };
   }

   let collectionDetailState = null;
   let collectionDetailReturnFocus = null;
   let collectionDetailScrollY = 0;
   let collectionDetailOpenStateRefreshTimer = null;

   function normalizeOpenTabUrl(url = "") {
     try {
       return new URL(url).toString();
     } catch {
       return String(url || "").trim();
     }
   }

   function getAssignedSessionUrlSet(sessions = []) {
     const assignedUrls = new Set();

     sessions.forEach((session) => {
       (session.tabs || []).forEach((tab) => {
         const normalizedUrl = normalizeOpenTabUrl(tab.url);

         if (normalizedUrl) {
           assignedUrls.add(normalizedUrl);
         }
       });
     });

     return assignedUrls;
   }

   function getAssignedSessionGroupIdSet(sessions = []) {
     return new Set(
       sessions
         .map((session) => session.groupLink?.chromeGroupId)
         .filter(Number.isInteger)
     );
   }

   async function getCurrentWindowTabsByUrl(windowId = null) {
     const targetWindowId = Number.isInteger(windowId)
       ? windowId
       : await getCollectionTargetWindowId();
     const tabs = await queryTabsWithMetadata(
       Number.isInteger(targetWindowId)
         ? { windowId: targetWindowId }
         : { currentWindow: true }
     );
     const byUrl = new Map();

     tabs.forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.pendingUrl || tab.url);

       if (!normalizedUrl) {
         return;
       }

       const existingTab = byUrl.get(normalizedUrl);

       if (!existingTab || tab.active) {
         byUrl.set(normalizedUrl, tab);
       }
     });

     return {
       windowId: targetWindowId,
       tabs,
       byUrl
     };
   }

   function applyCollectionDetailOpenState(detail, openState) {
     detail.targetWindowId = openState.windowId;

     detail.tabs.forEach((item) => {
       item.existingTab = openState.byUrl.get(
         normalizeOpenTabUrl(item.url)
       ) || null;

       if (item.existingTab) {
         detail.selectedKeys?.delete(item.key);
       }
     });
   }

   async function refreshCollectionDetailOpenState({ render = true } = {}) {
     const detail = collectionDetailState;

     if (!detail) {
       return;
     }

     const openState = await getCurrentWindowTabsByUrl(detail.targetWindowId);

     if (collectionDetailState !== detail) {
       return;
     }

     applyCollectionDetailOpenState(detail, openState);

     if (render) {
       renderCollectionDetail();
     }
   }

   function scheduleCollectionDetailOpenStateRefresh() {
     if (!collectionDetailState) {
       return;
     }

     clearTimeout(collectionDetailOpenStateRefreshTimer);
     collectionDetailOpenStateRefreshTimer = setTimeout(() => {
       refreshCollectionDetailOpenState();
     }, 250);
   }

   function createCollectionDetailTabs(tabs = [], sourceKey = "collection") {
     return tabs
       .map((tab, index) => ({
         key: `${sourceKey}-${tab.id ?? "saved"}-${index}`,
         id: Number.isInteger(tab.id) ? tab.id : null,
         windowId: Number.isInteger(tab.windowId) ? tab.windowId : null,
         title: tab.title || tab.url || "",
         url: tab.url || "",
         favIconUrl: tab.favIconUrl || getTabFavicon(tab.url || "", 16)
       }))
       .filter((tab) => tab.url);
   }

   function getKnownCollectionLiveTab(detail, item) {
     if (!detail || !item) {
       return null;
     }

     if (detail.kind === "live-group") {
       return detail.liveGroup?.tabs?.find((tab) => tab.id === item.id) || null;
     }

     if (!detail.liveGroup) {
       return null;
     }

     const normalizedUrl = normalizeOpenTabUrl(item.url);

     return detail.liveGroup.tabs.find(
       (tab) => normalizeOpenTabUrl(tab.url) === normalizedUrl
     ) || null;
   }

   function getCollectionDetailElements() {
     return {
       overlay: document.getElementById("collectionDetailOverlay"),
       panel: document.querySelector(".collection-detail-panel"),
       source: document.getElementById("collectionDetailSource"),
       title: document.getElementById("collectionDetailTitle"),
       meta: document.getElementById("collectionDetailMeta"),
       notice: document.getElementById("collectionDetailNotice"),
       groupCopyHint: document.getElementById("collectionDetailGroupCopyHint"),
       tabs: document.getElementById("collectionDetailTabs"),
       selection: document.getElementById("collectionDetailSelection"),
       openGroup: document.getElementById("collectionDetailOpenGroup"),
       openAll: document.getElementById("collectionDetailOpenAll"),
       openSelected: document.getElementById("collectionDetailOpenSelected")
     };
   }

   function getCollectionDetailSourceLabel(detail) {
     if (detail.kind === "session") {
       return t("collectionDetailSession");
     }

     if (detail.kind === "protected-group") {
       return t("collectionDetailSavedGroup");
     }

     return t("collectionDetailLiveGroup");
   }

   function getCollectionDetailTabsLabel(detail) {
     const count = detail.tabs.length;

     if (detail.kind === "session") {
       return plural(count, "sessionTabCount", "sessionTabsCount");
     }

     return plural(count, "chromeGroupTabCount", "chromeGroupTabsCount");
   }

   function getCollectionDetailOpenAllLabel(detail) {
     if (detail.kind === "session") {
       return t("collectionDetailOpenAll");
     }

     if (detail.kind === "protected-group" && !detail.liveGroup) {
       return t("collectionDetailRestoreGroup");
     }

     return t("collectionDetailOpenAllGroup");
   }

   function updateCollectionDetailSelectionUi() {
     const detail = collectionDetailState;
     const elements = getCollectionDetailElements();

     if (!detail || !elements.overlay || elements.overlay.hidden) {
       return;
     }

     const selectedCount = detail.selectedKeys.size;
     const openableCount = detail.tabs.filter((tab) => !tab.existingTab).length;

     if (elements.selection) {
       elements.selection.textContent = t("collectionDetailSelected", {
         count: selectedCount
       });
     }

     if (elements.openSelected) {
       elements.openSelected.textContent = selectedCount
         ? t("collectionDetailOpenSelectedCount", { count: selectedCount })
         : t("collectionDetailOpenSelected");
       elements.openSelected.disabled = detail.busy || selectedCount === 0;
     }

     if (elements.openAll) {
       elements.openAll.disabled = detail.busy ||
         detail.tabs.length === 0 ||
         (detail.kind === "session" && openableCount === 0);
     }

     if (elements.openGroup) {
       elements.openGroup.disabled = detail.busy || detail.tabs.length === 0;
     }

     elements.overlay
       .querySelectorAll(
         '[data-action="open-collection-tab-and-switch"], ' +
         '[data-action="select-all-collection-tabs"], ' +
         '[data-action="clear-collection-tabs"]'
       )
       .forEach((control) => {
         if (control.dataset.action === "select-all-collection-tabs") {
           control.disabled = detail.busy || openableCount === 0;
           return;
         }

         if (control.dataset.action === "clear-collection-tabs") {
           control.disabled = detail.busy || selectedCount === 0;
           return;
         }

         control.disabled = detail.busy;
       });

     elements.overlay
       .querySelectorAll("input[data-collection-tab-key]")
       .forEach((checkbox) => {
         checkbox.disabled = detail.busy ||
           checkbox.dataset.alreadyOpen === "true";
       });

     if (elements.panel) {
       elements.panel.setAttribute("aria-busy", String(detail.busy));
     }
   }

   function renderCollectionDetail() {
     const detail = collectionDetailState;
     const elements = getCollectionDetailElements();

     if (!detail || !elements.overlay || !elements.tabs) {
       return;
     }

     const validKeys = new Set(detail.tabs.map((tab) => tab.key));
     detail.selectedKeys.forEach((key) => {
       if (!validKeys.has(key)) {
         detail.selectedKeys.delete(key);
       }
     });

     elements.source.textContent = getCollectionDetailSourceLabel(detail);
     elements.title.textContent = detail.title;
     elements.meta.textContent = [
       getCollectionDetailTabsLabel(detail),
       detail.statusLabel || ""
     ].filter(Boolean).join(" · ");

     if (detail.noticeKey) {
       elements.notice.hidden = false;
       elements.notice.textContent = t(detail.noticeKey);
     } else {
       elements.notice.hidden = true;
       elements.notice.textContent = "";
     }

     if (elements.groupCopyHint) {
       elements.groupCopyHint.hidden = detail.kind === "session";
       elements.groupCopyHint.textContent = detail.kind === "session"
         ? ""
         : t("collectionDetailGroupCopyHint");
     }

     const allSessionTabsOpen = detail.kind === "session" &&
       detail.tabs.length > 0 &&
       detail.tabs.every((tab) => tab.existingTab);

     elements.openAll.textContent = allSessionTabsOpen
       ? t("collectionDetailAllAlreadyOpen")
       : getCollectionDetailOpenAllLabel(detail);

     if (elements.openGroup) {
       elements.openGroup.hidden = detail.kind !== "session";
       elements.openGroup.textContent = detail.liveGroup
         ? t("showOpenGroup")
         : t("openAsGroup");
     }

     elements.tabs.innerHTML = "";

     detail.tabs.forEach((item) => {
       const row = document.createElement("div");
       row.className = "collection-detail-tab-row";
       row.dataset.tabUrl = item.url;
       row.setAttribute("role", "listitem");

       if (item.existingTab) {
         row.classList.add("is-already-open");
       }

       const selectLabel = document.createElement("label");
       selectLabel.className = "collection-detail-tab-select";

       const checkbox = document.createElement("input");
       checkbox.type = "checkbox";
       checkbox.checked = detail.selectedKeys.has(item.key);
       checkbox.dataset.collectionTabKey = item.key;
       checkbox.dataset.alreadyOpen = String(Boolean(item.existingTab));

       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = item.favIconUrl || getTabFavicon(item.url, 16);
       favicon.addEventListener("error", () => {
         favicon.hidden = true;
       }, { once: true });

       const info = document.createElement("span");
       info.className = "collection-detail-tab-info";

       const tabTitle = document.createElement("span");
       tabTitle.className = "collection-detail-tab-title";
       tabTitle.textContent = item.title || item.url;

       const tabDomain = document.createElement("span");
       tabDomain.className = "collection-detail-tab-domain";
       tabDomain.textContent = getTabDomain(item.url) || item.url;

       info.appendChild(tabTitle);
       info.appendChild(tabDomain);

       if (item.existingTab) {
         const openBadge = document.createElement("span");
         openBadge.className = "collection-detail-open-badge";
         openBadge.textContent = t("collectionDetailAlreadyOpen");
         info.appendChild(openBadge);
       }

       selectLabel.appendChild(checkbox);
       selectLabel.appendChild(favicon);
       selectLabel.appendChild(info);

       const switchButton = document.createElement("button");
       switchButton.type = "button";
       switchButton.className = "collection-detail-switch";
       switchButton.dataset.action = "open-collection-tab-and-switch";
       switchButton.dataset.tabKey = item.key;
       switchButton.textContent = (
         getKnownCollectionLiveTab(detail, item) ||
         item.existingTab
       )
         ? t("collectionDetailSwitchToTab")
         : t("collectionDetailOpenAndSwitch");

       row.appendChild(selectLabel);
       row.appendChild(switchButton);
       elements.tabs.appendChild(row);
     });

     updateCollectionDetailSelectionUi();
   }

   async function reloadCollectionDetailSource() {
     const detail = collectionDetailState;

     if (!detail) {
       return false;
     }

     if (detail.kind === "session") {
       const [sessions, liveGroups] = await Promise.all([
         getSavedSessions(),
         getCurrentChromeGroups()
       ]);
       const session = sessions.find((item) => item.id === detail.id);

       if (!session) {
         return false;
       }

       detail.title = session.name;
       detail.session = session;
       detail.tabs = createCollectionDetailTabs(session.tabs, session.id);
       detail.liveGroup = findLiveGroupForSession(session, liveGroups);
       detail.statusLabel =
         getSessionGroupStatus(session, detail.liveGroup)?.label || "";
     } else if (detail.kind === "protected-group") {
       const [protectedGroups, liveGroups] = await Promise.all([
         getProtectedGroups(),
         getCurrentChromeGroups()
       ]);
       const snapshot = protectedGroups.find((group) => group.id === detail.id);

       if (!snapshot) {
         return false;
       }

       const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);
       const diff = diffProtectedGroup(snapshot, liveGroup);
       const status = getProtectedGroupStatus(snapshot, liveGroup, diff);

       detail.title = snapshot.title;
       detail.color = snapshot.color;
       detail.snapshot = snapshot;
       detail.liveGroup = liveGroup;
       detail.tabs = createCollectionDetailTabs(snapshot.tabs, snapshot.id);
       detail.statusLabel = status.label;
       detail.noticeKey = diff.missing
         ? "collectionDetailClosedNotice"
         : diff.changed && !diff.ignored
           ? "collectionDetailChangedNotice"
           : "";
     } else {
       const liveGroups = await getCurrentChromeGroups();
       const liveGroup = liveGroups.find(
         (group) => String(group.chromeGroupId) === String(detail.id)
       );

       if (!liveGroup) {
         return false;
       }

       detail.title = liveGroup.title;
       detail.color = liveGroup.color;
       detail.liveGroup = liveGroup;
       detail.tabs = createCollectionDetailTabs(
         liveGroup.tabs,
         `live-group-${liveGroup.chromeGroupId}`
       );
     }

     await refreshCollectionDetailOpenState();
     await renderSavedSessions();
     return true;
   }

   async function showCollectionDetail(detail, originElement = null) {
     const elements = getCollectionDetailElements();

     if (!elements.overlay) {
       return;
     }

     const openState = await getCurrentWindowTabsByUrl();

     collectionDetailReturnFocus = originElement instanceof HTMLElement
       ? originElement
       : document.activeElement;
     collectionDetailScrollY = window.scrollY;
     collectionDetailState = {
       ...detail,
       selectedKeys: new Set(),
       busy: false
     };
     applyCollectionDetailOpenState(collectionDetailState, openState);

     closeProtectedGroupMenus();
     elements.overlay.hidden = false;
     document.body.classList.add("collection-detail-is-open");
     renderCollectionDetail();

     requestAnimationFrame(() => {
       elements.overlay
         .querySelector('[data-action="close-collection-detail"]')
         ?.focus();
     });
   }

   function closeCollectionDetail() {
     const elements = getCollectionDetailElements();
     const returnFocus = collectionDetailReturnFocus;
     const returnScrollY = collectionDetailScrollY;
     const detail = collectionDetailState;

     if (!elements.overlay || elements.overlay.hidden) {
       return;
     }

     elements.overlay.hidden = true;
     document.body.classList.remove("collection-detail-is-open");
     clearTimeout(collectionDetailOpenStateRefreshTimer);
     collectionDetailState = null;
     collectionDetailReturnFocus = null;
     window.scrollTo(0, returnScrollY);

     requestAnimationFrame(() => {
       if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
         returnFocus.focus();
         return;
       }

       const selector = detail?.kind === "session"
         ? `[data-action="view-saved-session"][data-session-id="${CSS.escape(detail.id)}"]`
         : detail?.kind === "live-group"
           ? `[data-action="view-live-chrome-group"][data-group-id="${CSS.escape(detail.id)}"]`
           : detail?.kind === "protected-group"
             ? `[data-action="view-protected-group"][data-snapshot-id="${CSS.escape(detail.id)}"]`
             : "";

       if (selector) {
         document.querySelector(selector)?.focus();
       }
     });
   }

   async function showSavedSessionDetail(sessionId, originElement = null) {
     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSession(session, liveGroups);
     const status = getSessionGroupStatus(session, liveGroup);

     await showCollectionDetail({
       kind: "session",
       id: session.id,
       title: session.name,
       tabs: createCollectionDetailTabs(session.tabs, session.id),
       statusLabel: status?.label || "",
       noticeKey: "",
       session,
       liveGroup
     }, originElement);
   }

   async function showLiveChromeGroupDetail(chromeGroupId, originElement = null) {
     const liveGroups = await getCurrentChromeGroups();
     const liveGroup = liveGroups.find(
       (group) => String(group.chromeGroupId) === String(chromeGroupId)
     );

     if (!liveGroup) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     await showCollectionDetail({
       kind: "live-group",
       id: String(liveGroup.chromeGroupId),
       title: liveGroup.title,
       color: liveGroup.color,
       tabs: createCollectionDetailTabs(
         liveGroup.tabs,
         `live-group-${liveGroup.chromeGroupId}`
       ),
       statusLabel: t("chromeGroupUnprotected"),
       noticeKey: "",
       liveGroup
     }, originElement);
   }

   async function showProtectedGroupDetail(snapshotId, originElement = null) {
     const [protectedGroups, liveGroups] = await Promise.all([
       getProtectedGroups(),
       getCurrentChromeGroups()
     ]);
     const snapshot = protectedGroups.find((group) => group.id === snapshotId);

     if (!snapshot) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSnapshot(snapshot, liveGroups);
     const diff = diffProtectedGroup(snapshot, liveGroup);
     const status = getProtectedGroupStatus(snapshot, liveGroup, diff);

     await showCollectionDetail({
       kind: "protected-group",
       id: snapshot.id,
       title: snapshot.title,
       color: snapshot.color,
       tabs: createCollectionDetailTabs(snapshot.tabs, snapshot.id),
       statusLabel: status.label,
       noticeKey: diff.missing
         ? "collectionDetailClosedNotice"
         : diff.changed && !diff.ignored
           ? "collectionDetailChangedNotice"
           : "",
       snapshot,
       liveGroup
     }, originElement);
   }

   async function getCollectionTargetWindowId() {
     const currentTab = await chrome.tabs.getCurrent();

     if (Number.isInteger(currentTab?.windowId)) {
       return currentTab.windowId;
     }

     const [activeTab] = await queryTabsWithMetadata({
       active: true,
       currentWindow: true
     });

     return Number.isInteger(activeTab?.windowId) ? activeTab.windowId : null;
   }

   async function createCollectionTabs(
     items,
     { active = false, allowDuplicates = false } = {}
   ) {
     const successes = [];
     const failures = [];
     const skipped = [];
     const windowId = await getCollectionTargetWindowId();
     const openState = allowDuplicates
       ? null
       : await getCurrentWindowTabsByUrl(windowId);

     for (const item of items) {
       const normalizedUrl = normalizeOpenTabUrl(item.url);
       const existingTab = openState?.byUrl.get(normalizedUrl);

       if (existingTab) {
         skipped.push({ item, tab: existingTab });
         continue;
       }

       try {
         const createdTab = await chrome.tabs.create({
           url: item.url,
           active,
           ...(Number.isInteger(windowId) ? { windowId } : {})
         });

         successes.push({ item, tab: createdTab });

         if (openState && normalizedUrl) {
           openState.byUrl.set(normalizedUrl, createdTab);
         }
       } catch (error) {
         console.warn("[tab-out] tab creation failed:", item.url, error);
         failures.push({ item, error });
       }
     }

     return { successes, failures, skipped, windowId };
   }

   async function createNativeCollectionGroup(items, options = {}) {
     const {
       title = t("untitledChromeGroup"),
       color = "grey",
       focusAfterOpen = false
     } = options;
     const result = await createCollectionTabs(items, {
       allowDuplicates: true
     });
     const tabIds = result.successes
       .map(({ tab }) => tab?.id)
       .filter(Number.isInteger);

     if (!tabIds.length) {
       return { ...result, chromeGroupId: null, groupError: null };
     }

     let chromeGroupId = null;
     let groupError = null;

     try {
       chromeGroupId = await chrome.tabs.group({ tabIds });
       await chrome.tabGroups.update(chromeGroupId, {
         title,
         color,
         collapsed: false
       });
     } catch (error) {
       console.warn("[tab-out] group creation failed:", error);
       groupError = error;
     }

     if (focusAfterOpen && tabIds[0]) {
       const firstTab = await chrome.tabs.update(tabIds[0], { active: true });

       if (Number.isInteger(firstTab?.windowId)) {
         await chrome.windows.update(firstTab.windowId, { focused: true });
       }
     }

     return { ...result, chromeGroupId, groupError };
   }

   async function updateProtectedGroupReference(snapshotId, chromeGroupId) {
     const protectedGroups = await getProtectedGroups();
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

   function showCollectionOpenResult(result, { grouped = false } = {}) {
     const opened = result.successes.length;
     const skipped = result.skipped?.length || 0;
     const failed = result.failures.length + (result.groupError ? 1 : 0);

     if (!opened && skipped && !failed) {
       showToast(t("collectionDetailSelectedAlreadyOpen"));
       return;
     }

     if (!opened && failed) {
       showToast(t("collectionDetailOpenFailed"));
       return;
     }

     if (skipped || failed) {
       showToast(t(failed
         ? "collectionDetailOpenSummaryFailed"
         : "collectionDetailOpenSummary", {
         opened,
         skipped,
         failed
       }));
       return;
     }

     if (grouped) {
       showToast(t("collectionDetailOpenedGroup", { count: opened }));
       return;
     }

     showToast(t(opened === 1
       ? "collectionDetailOpenedOne"
       : "collectionDetailOpenedMany", { count: opened }));
   }

   async function resolveCurrentCollectionTab(detail, item) {
     if (!detail) {
       return null;
     }

     let liveGroup = null;

     if (detail.liveGroup || detail.kind !== "session") {
       const liveGroups = await getCurrentChromeGroups();

       if (detail.kind === "session") {
         liveGroup = findLiveGroupForSession(detail.session, liveGroups);
       } else if (detail.kind === "live-group") {
         liveGroup = liveGroups.find(
           (group) => String(group.chromeGroupId) === String(detail.id)
         );
       } else {
         liveGroup = findLiveGroupForSnapshot(detail.snapshot, liveGroups);
       }

       if (liveGroup) {
         if (detail.kind === "live-group" && Number.isInteger(item.id)) {
           const exactTab = liveGroup.tabs.find((tab) => tab.id === item.id);

           if (exactTab) {
             return exactTab;
           }
         }

         const normalizedGroupItemUrl = normalizeOpenTabUrl(item.url);
         const matchingGroupTab = liveGroup.tabs.find(
           (tab) => normalizeOpenTabUrl(tab.url) === normalizedGroupItemUrl
         );

         if (matchingGroupTab) {
           return matchingGroupTab;
         }
       }
     }

     const openState = await getCurrentWindowTabsByUrl(detail.targetWindowId);

     return openState.byUrl.get(normalizeOpenTabUrl(item.url)) || null;
   }

   async function openCollectionTabAndSwitch(tabKey) {
     const detail = collectionDetailState;
     const item = detail?.tabs.find((tab) => tab.key === tabKey);

     if (!detail || !item || detail.busy) {
       return;
     }

     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       const existingTab = await resolveCurrentCollectionTab(detail, item);

       if (existingTab?.id) {
         await chrome.tabs.update(existingTab.id, { active: true });

         if (Number.isInteger(existingTab.windowId)) {
           await chrome.windows.update(existingTab.windowId, { focused: true });
         }
         return;
       }

       const result = await createCollectionTabs([item], { active: true });

       if (result.skipped.length) {
         const existingTab = result.skipped[0].tab;

         await chrome.tabs.update(existingTab.id, { active: true });

         if (Number.isInteger(existingTab.windowId)) {
           await chrome.windows.update(existingTab.windowId, { focused: true });
         }
         return;
       }

       if (!result.successes.length) {
         showToast(t("collectionDetailOpenFailed"));
       }
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   async function openSelectedCollectionTabs() {
     const detail = collectionDetailState;

     if (!detail || detail.busy || !detail.selectedKeys.size) {
       return;
     }

     const items = detail.tabs.filter((tab) => detail.selectedKeys.has(tab.key));
     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       const result = await createCollectionTabs(items);

       result.successes.forEach(({ item }) => {
         detail.selectedKeys.delete(item.key);
       });
       result.skipped.forEach(({ item }) => {
         detail.selectedKeys.delete(item.key);
       });

       await refreshCollectionDetailOpenState();
       showCollectionOpenResult(result);
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   async function openAllCollectionTabs() {
     const detail = collectionDetailState;

     if (!detail || detail.busy || !detail.tabs.length) {
       return;
     }

     detail.busy = true;
     updateCollectionDetailSelectionUi();

     try {
       if (detail.kind === "session") {
         const result = await createCollectionTabs(detail.tabs);
         detail.selectedKeys.clear();
         await refreshCollectionDetailOpenState();
         showCollectionOpenResult(result);
         return;
       }

       let liveGroup = detail.liveGroup;

       if (detail.kind === "protected-group") {
         const currentGroups = await getCurrentChromeGroups();
         liveGroup = findLiveGroupForSnapshot(detail.snapshot, currentGroups);
       }

       const result = await createNativeCollectionGroup(detail.tabs, {
         title: detail.title,
         color: detail.color
       });

       if (
         detail.kind === "protected-group" &&
         !liveGroup &&
         Number.isInteger(result.chromeGroupId)
       ) {
         await updateProtectedGroupReference(detail.id, result.chromeGroupId);
         const refreshedGroups = await getCurrentChromeGroups();
         detail.liveGroup = findLiveGroupForSnapshot(
           detail.snapshot,
           refreshedGroups
         );
         const refreshedDiff = diffProtectedGroup(
           detail.snapshot,
           detail.liveGroup
         );
         const refreshedStatus = getProtectedGroupStatus(
           detail.snapshot,
           detail.liveGroup,
           refreshedDiff
         );

         detail.statusLabel = refreshedStatus.label;
         detail.noticeKey = refreshedDiff.missing
           ? "collectionDetailClosedNotice"
           : refreshedDiff.changed && !refreshedDiff.ignored
             ? "collectionDetailChangedNotice"
             : "";
         await renderSavedSessions();
       }

       detail.selectedKeys.clear();
       await refreshCollectionDetailOpenState();
       showCollectionOpenResult(result, {
         grouped: Number.isInteger(result.chromeGroupId)
       });
     } finally {
       if (collectionDetailState === detail) {
         detail.busy = false;
         updateCollectionDetailSelectionUi();
       }
     }
   }

   function trapCollectionDetailFocus(event) {
     const elements = getCollectionDetailElements();

     if (!elements.overlay || elements.overlay.hidden) {
       return;
     }

     const focusable = Array.from(
       elements.overlay.querySelectorAll(
         'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
       )
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   function setupCollectionDetail() {
     const overlay = document.getElementById("collectionDetailOverlay");

     if (!overlay) {
       return;
     }

     overlay.addEventListener("click", (event) => {
       if (event.target === overlay) {
         closeCollectionDetail();
       }
     });
   }

   document.addEventListener("DOMContentLoaded", setupCollectionDetail);

   let draggedSavedSessionId = null;
   let suppressSavedSessionOpenUntil = 0;
   let savedSessionDragState = null;
   let savedSessionRowDragState = null;
   let openTabAssignmentDragState = null;
   let savedSessionTabDragState = null;
   let savedLaterDragState = null;
   let suppressedSessionRowCustomize = null;
   let suppressedOpenTabFocusClick = null;
   let suppressedSavedLaterLinkClick = null;
   let provisionalSessionState = null;
   let inlineSessionRenameState = null;
   let deferCollectionStorageRefreshUntil = 0;
   const expandedSessionIds = new Set();

   const SAVED_SESSION_DRAG_THRESHOLD = 7;
   const SAVED_SESSION_ROW_DRAG_THRESHOLD = 7;
   const OPEN_TAB_DRAG_THRESHOLD = 7;
   const SAVED_SESSION_TAB_DRAG_THRESHOLD = 7;
   const SAVED_LATER_DRAG_THRESHOLD = 7;

   function createSessionDescriptorFromOpenTab(tab) {
     return {
       title: getTabDisplayTitle(tab) || tab.title || tab.url,
       url: tab.url,
       favIconUrl: tab.favIconUrl || getTabFavicon(tab.url, 16)
     };
   }

   function getOpenTabFromDragElement(element) {
     const tabId = Number(element?.dataset.tabId);
     const normalizedUrl = normalizeOpenTabUrl(element?.dataset.tabUrl);

     return unassignedOpenTabs.find(
       (tab) =>
         (Number.isInteger(tabId) && tab.id === tabId) ||
         normalizeOpenTabUrl(tab.url) === normalizedUrl
     ) || null;
   }

   function suppressNextOpenTabFocusClick(state) {
     const suppression = {
       sourceElement: state.sourceElement,
       tabId: String(state.tab?.id ?? ""),
       normalizedUrl: normalizeOpenTabUrl(state.tab?.url)
     };

     suppressedOpenTabFocusClick = suppression;
     setTimeout(() => {
       if (suppressedOpenTabFocusClick === suppression) {
         suppressedOpenTabFocusClick = null;
       }
     }, 250);
   }

   function consumeSuppressedOpenTabFocusClick(element) {
     const suppression = suppressedOpenTabFocusClick;

     if (!suppression) {
       return false;
     }

     const matches =
       element === suppression.sourceElement ||
       (
         suppression.tabId &&
         element?.dataset.tabId === suppression.tabId
       ) ||
       (
         suppression.normalizedUrl &&
         normalizeOpenTabUrl(element?.dataset.tabUrl) ===
           suppression.normalizedUrl
       );

     if (matches) {
       suppressedOpenTabFocusClick = null;
     }

     return matches;
   }

   function getSuggestedPairSessionName(tabs) {
     const domains = tabs.map((tab) => getTabDomain(tab.url)).filter(Boolean);

     if (domains.length === 2 && domains[0] === domains[1]) {
       return friendlyDomain(domains[0]) || t("newSessionDefaultName");
     }

     const labels = domains
       .map((domain) => friendlyDomain(domain))
       .filter(Boolean);

     return labels.length === 2
       ? `${labels[0]} + ${labels[1]}`
       : t("newSessionDefaultName");
   }

   function clearOpenTabDropTarget(state) {
     state?.target?.element?.classList.remove(
       "is-open-tab-drop-target",
       "is-open-tab-pair-target"
     );
     state?.target?.element?.removeAttribute("data-open-tab-drop-label");

     if (state) {
       state.target = null;
     }
   }

   function setOpenTabDropTarget(state, target) {
     if (
       state.target?.kind === target?.kind &&
       state.target?.element === target?.element
     ) {
       return;
     }

     clearOpenTabDropTarget(state);
     state.target = target;

     if (!target) {
       return;
     }

     const isSession = target.kind === "session";
     target.element.classList.add(
       isSession ? "is-open-tab-drop-target" : "is-open-tab-pair-target"
     );
     target.element.dataset.openTabDropLabel = t(
       isSession ? "dropAddToSession" : "dropCreatePair"
     );
   }

   function getOpenTabDropTarget(state, x, y) {
     const hovered = document.elementFromPoint(x, y);
     const sessionCard = hovered?.closest(
       '.saved-session-card[data-session-id]'
     );

     if (sessionCard) {
       return {
         kind: "session",
         element: sessionCard,
         sessionId: sessionCard.dataset.sessionId,
         sessionName: sessionCard.dataset.sessionName || ""
       };
     }

     const tabElement = hovered?.closest('[data-open-tab-draggable="true"]');

     if (!tabElement || tabElement === state.sourceElement) {
       return null;
     }

     const targetTab = getOpenTabFromDragElement(tabElement);

     if (
       !targetTab ||
       normalizeOpenTabUrl(targetTab.url) ===
         normalizeOpenTabUrl(state.tab.url)
     ) {
       return null;
     }

     return {
       kind: "tab",
       element: tabElement,
       tab: targetTab
     };
   }

   function createOpenTabDragGhost(tab) {
     const ghost = document.createElement("div");
     ghost.className = "open-tab-drag-ghost";

     const copy = document.createElement("span");
     copy.className = "open-tab-drag-copy";

     const label = document.createElement("small");
     label.textContent = t("assignTabDrag");

     const title = document.createElement("strong");
     title.textContent = getTabDisplayTitle(tab) || tab.url;

     copy.appendChild(label);
     copy.appendChild(title);
     const faviconUrl = tab.favIconUrl || getTabFavicon(tab.url, 16);

     if (faviconUrl) {
       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = faviconUrl;
       ghost.appendChild(favicon);
     }

     ghost.appendChild(copy);
     return ghost;
   }

   function startOpenTabPointerDrag(event, state) {
     const rect = state.sourceElement.getBoundingClientRect();

     state.dragging = true;
     state.offsetX = Math.min(event.clientX - rect.left, rect.width - 12);
     state.offsetY = Math.min(event.clientY - rect.top, rect.height - 12);
     state.ghost = createOpenTabDragGhost(state.tab);
     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (state.sourceElement.setPointerCapture) {
       try {
         state.sourceElement.setPointerCapture(event.pointerId);
       } catch {}
     }

     state.sourceElement.classList.add("is-open-tab-drag-source");
     document.body.classList.add("is-assigning-open-tab");
     document
       .querySelectorAll('.saved-session-card[data-session-id]')
       .forEach((card) => card.classList.add("is-open-tab-drop-zone"));
     document.body.appendChild(state.ghost);
     updateOpenTabPointerDrag(event);
   }

   function updateOpenTabPointerDrag(event) {
     const state = openTabAssignmentDragState;

     if (!state?.dragging) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const ghostWidth = state.ghost.offsetWidth;
     const ghostHeight = state.ghost.offsetHeight;
     const left = Math.max(
       8,
       Math.min(
         event.clientX - state.offsetX,
         window.innerWidth - ghostWidth - 8
       )
     );
     const top = Math.max(
       8,
       Math.min(
         event.clientY - state.offsetY,
         window.innerHeight - ghostHeight - 8
       )
     );

     state.ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
     setOpenTabDropTarget(
       state,
       getOpenTabDropTarget(state, event.clientX, event.clientY)
     );
   }

   function cleanupOpenTabPointerDrag(event, state) {
     clearOpenTabDropTarget(state);
     state.sourceElement?.classList.remove("is-open-tab-drag-source");
     state.ghost?.remove();
     document.body.classList.remove("is-assigning-open-tab");
     document
       .querySelectorAll(".saved-session-card.is-open-tab-drop-zone")
       .forEach((card) => card.classList.remove("is-open-tab-drop-zone"));

     if (state.sourceElement?.releasePointerCapture) {
       try {
         state.sourceElement.releasePointerCapture(event.pointerId);
       } catch {}
     }
   }

   async function refreshDashboardCollections() {
     await Promise.all([
       renderDashboard(),
       renderSavedSessions()
     ]);
   }

   async function assignOpenTabToSession(tab, target, sourceElement) {
     sourceElement?.classList.add("is-open-tab-assignment-pending");
     deferCollectionStorageRefreshUntil = Date.now() + 400;
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:addTabToSession",
       tabId: tab.id,
       sessionId: target.sessionId
     });

     if (!response.ok) {
       sourceElement?.classList.remove("is-open-tab-assignment-pending");
       showToast(t("tabAssignmentFailed"));
       await refreshDashboardCollections();
       return;
     }

     if (response.code === "already_added") {
       sourceElement?.classList.remove("is-open-tab-assignment-pending");
       showToast(t("tabAlreadyAssigned"));
     } else {
       target.element?.classList.add("is-open-tab-drop-success");
       showToast(t("tabAssignedToSession", {
         name: target.sessionName
       }));
       await new Promise((resolve) => setTimeout(resolve, 220));
     }

     await refreshDashboardCollections();
   }

   async function beginProvisionalPairSession(sourceTab, targetTab) {
     const tabs = [
       createSessionDescriptorFromOpenTab(sourceTab),
       createSessionDescriptorFromOpenTab(targetTab)
     ];
     const suggestedName = getSuggestedPairSessionName(tabs);

     inlineSessionRenameState = null;
     provisionalSessionState = {
       tabs,
       suggestedName,
       name: suggestedName,
       committing: false,
       focusRequested: true
     };
     await refreshDashboardCollections();
   }

   async function finishOpenTabPointerDrag(event, { cancelled = false } = {}) {
     const state = openTabAssignmentDragState;

     if (!state || state.pointerId !== event.pointerId) {
       return;
     }

     openTabAssignmentDragState = null;
     const target = state.target;
     const wasDragging = state.dragging;

     if (wasDragging && !cancelled) {
       suppressNextOpenTabFocusClick(state);
     }

     cleanupOpenTabPointerDrag(event, state);

     if (!wasDragging || cancelled || !target) {
       return;
     }

     if (target.kind === "session") {
       await assignOpenTabToSession(
         state.tab,
         target,
         state.sourceElement
       );
       return;
     }

     await beginProvisionalPairSession(state.tab, target.tab);
   }

   async function commitProvisionalSession() {
     const state = provisionalSessionState;

     if (!state || state.committing) {
       return;
     }

     state.committing = true;
     deferCollectionStorageRefreshUntil = Date.now() + 300;
     const input = document.querySelector(
       '.session-inline-name-input[data-session-name-mode="provisional"]'
     );

     if (input) {
       input.disabled = true;
     }

     const name = state.name.trim() || state.suggestedName;
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:createSessionFromTabs",
       name,
       tabs: state.tabs
     });

     if (provisionalSessionState !== state) {
       return;
     }

     if (!response.ok) {
       state.committing = false;
       if (input) {
         input.disabled = false;
         input.focus();
       }
       showToast(t("sessionCreationFailed"));
       return;
     }

     provisionalSessionState = null;
     showToast(t("sessionCreatedFromTabs"));
     await refreshDashboardCollections();
   }

   async function cancelProvisionalSession() {
     if (!provisionalSessionState) {
       return;
     }

     provisionalSessionState = null;
     await refreshDashboardCollections();
   }

   async function startInlineSessionRename(sessionId, currentName) {
     if (!sessionId || provisionalSessionState) {
       return;
     }

     inlineSessionRenameState = {
       sessionId,
       originalName: currentName,
       value: currentName,
       saving: false,
       focusRequested: true
     };
     closeProtectedGroupMenus();
     await renderSavedSessions();
   }

   async function commitInlineSessionRename() {
     const state = inlineSessionRenameState;

     if (!state || state.saving) {
       return;
     }

     const name = state.value.trim();

     if (!name) {
       inlineSessionRenameState = null;
       await renderSavedSessions();
       return;
     }

     if (name === state.originalName) {
       inlineSessionRenameState = null;
       await renderSavedSessions();
       return;
     }

     state.saving = true;
     deferCollectionStorageRefreshUntil = Date.now() + 250;
     const input = document.querySelector(
       `.session-inline-name-input[data-session-id="${CSS.escape(
         state.sessionId
       )}"]`
     );

     if (input) {
       input.disabled = true;
     }

     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:renameSession",
       sessionId: state.sessionId,
       name
     });

     if (inlineSessionRenameState !== state) {
       return;
     }

     if (!response.ok) {
       state.saving = false;
       if (input) {
         input.disabled = false;
         input.focus();
       }
       showToast(t("sessionRenameFailed"));
       return;
     }

     inlineSessionRenameState = null;
     showToast(t("sessionRenamed"));
     await renderSavedSessions();
   }

   async function cancelInlineSessionRename() {
     if (!inlineSessionRenameState) {
       return;
     }

     inlineSessionRenameState = null;
     await renderSavedSessions();
   }

   async function toggleSessionInlineTabs(sessionId) {
     if (!sessionId || !isDashboardBehaviorEnabled("expandSessionTabs")) {
       return;
     }

     if (expandedSessionIds.has(sessionId)) {
       expandedSessionIds.delete(sessionId);
     } else {
       expandedSessionIds.add(sessionId);
     }

     await renderSavedSessions();
     requestAnimationFrame(() => {
       document
         .querySelector(
           `.saved-session-expand[data-session-id="${CSS.escape(sessionId)}"]`
         )
         ?.focus({ preventScroll: true });
     });
   }

   async function openSessionInlineTab(url) {
     const normalizedUrl = normalizeOpenTabUrl(url);
     const browserTabs = await queryTabsWithMetadata({});
     const existingTab = browserTabs.find(
       (tab) =>
         normalizeOpenTabUrl(tab.pendingUrl || tab.url) === normalizedUrl
     );

     if (existingTab?.id) {
       await chrome.tabs.update(existingTab.id, { active: true });

       if (Number.isInteger(existingTab.windowId)) {
         await chrome.windows.update(existingTab.windowId, { focused: true });
       }

       return;
     }

     const windowId = await getCollectionTargetWindowId();
     const createProperties = {
       url,
       active: true
     };

     if (Number.isInteger(windowId)) {
       createProperties.windowId = windowId;
     }

     try {
       await chrome.tabs.create(createProperties);
     } catch {
       showToast(t("collectionDetailOpenFailed"));
     }
   }

   function clearSavedSessionTabDropTarget(state) {
     state?.target?.element?.classList.remove(
       "is-saved-session-tab-drop-target"
     );
     state?.target?.element?.removeAttribute("data-session-tab-drop-label");

     if (state) {
       state.target = null;
     }
   }

   function setSavedSessionTabDropTarget(state, target) {
     if (
       state.target?.kind === target?.kind &&
       state.target?.element === target?.element
     ) {
       return;
     }

     clearSavedSessionTabDropTarget(state);
     state.target = target;

     if (!target) {
       return;
     }

     target.element.classList.add("is-saved-session-tab-drop-target");
     target.element.dataset.sessionTabDropLabel = t(
       target.kind === "session"
         ? "dropMoveToSession"
         : "dropMoveToUnassigned"
     );
   }

   function getSavedSessionTabDropTarget(state, x, y) {
     const hovered = document.elementFromPoint(x, y);
     const sessionCard = hovered?.closest(
       '.saved-session-card[data-session-id]'
     );

     if (
       sessionCard &&
       sessionCard.dataset.sessionId !== state.sourceSessionId
     ) {
       return {
         kind: "session",
         element: sessionCard,
         sessionId: sessionCard.dataset.sessionId,
         sessionName: sessionCard.dataset.sessionName || ""
       };
     }

     const unassignedSection = hovered?.closest("#openTabsSection");

     if (unassignedSection) {
       return {
         kind: "unassigned",
         element: unassignedSection
       };
     }

     return null;
   }

   function createSavedSessionTabDragGhost(state) {
     const ghost = document.createElement("div");
     ghost.className = "saved-session-tab-drag-ghost";
     const favicon = state.sourceElement.querySelector("img");

     if (favicon?.src) {
       const image = document.createElement("img");
       image.alt = "";
       image.src = favicon.src;
       ghost.appendChild(image);
     }

     const copy = document.createElement("span");
     const label = document.createElement("small");
     label.textContent = t("moveSavedTabLabel");
     const title = document.createElement("strong");
     title.textContent = state.title || state.url;
     copy.append(label, title);
     ghost.appendChild(copy);
     return ghost;
   }

   function startSavedSessionTabPointerDrag(event, state) {
     const rect = state.sourceElement.getBoundingClientRect();

     state.dragging = true;
     state.offsetX = Math.min(event.clientX - rect.left, rect.width - 12);
     state.offsetY = Math.min(event.clientY - rect.top, rect.height - 12);
     state.ghost = createSavedSessionTabDragGhost(state);
     suppressSavedSessionOpenUntil = Date.now() + 600;

     if (state.handle.setPointerCapture) {
       try {
         state.handle.setPointerCapture(event.pointerId);
       } catch {}
     }

     state.sourceElement.classList.add("is-saved-session-tab-drag-source");
     document.body.classList.add("is-moving-saved-session-tab");
     document
       .querySelectorAll(
         `.saved-session-card[data-session-id]:not([data-session-id="${CSS.escape(
           state.sourceSessionId
         )}"])`
       )
       .forEach((card) => card.classList.add("is-saved-session-tab-drop-zone"));
     document
       .getElementById("openTabsSection")
       ?.classList.add("is-saved-session-tab-drop-zone");
     document.body.appendChild(state.ghost);
     updateSavedSessionTabPointerDrag(event);
   }

   function updateSavedSessionTabPointerDrag(event) {
     const state = savedSessionTabDragState;

     if (!state?.dragging) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const ghostWidth = state.ghost.offsetWidth;
     const ghostHeight = state.ghost.offsetHeight;
     const left = Math.max(
       8,
       Math.min(
         event.clientX - state.offsetX,
         window.innerWidth - ghostWidth - 8
       )
     );
     const top = Math.max(
       8,
       Math.min(
         event.clientY - state.offsetY,
         window.innerHeight - ghostHeight - 8
       )
     );

     state.ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
     setSavedSessionTabDropTarget(
       state,
       getSavedSessionTabDropTarget(state, event.clientX, event.clientY)
     );
   }

   function cleanupSavedSessionTabPointerDrag(event, state) {
     clearSavedSessionTabDropTarget(state);
     state.sourceElement?.classList.remove(
       "is-saved-session-tab-drag-source"
     );
     state.ghost?.remove();
     document.body.classList.remove("is-moving-saved-session-tab");
     document
       .querySelectorAll(".is-saved-session-tab-drop-zone")
       .forEach((element) =>
         element.classList.remove("is-saved-session-tab-drop-zone")
       );

     if (state.handle?.releasePointerCapture) {
       try {
         state.handle.releasePointerCapture(event.pointerId);
       } catch {}
     }
   }

   function focusSavedSessionTransferOrigin(sessionId, url = "") {
     requestAnimationFrame(() => {
       const sessionSelector = CSS.escape(sessionId);
       const urlSelector = url ? CSS.escape(url) : "";
       const row = url
         ? document.querySelector(
             `.saved-session-inline-tab[data-session-id="${sessionSelector}"][data-tab-url="${urlSelector}"]`
           )
         : null;
       const target =
         row?.querySelector(".saved-session-tab-drag") ||
         document.querySelector(
           `.saved-session-expand[data-session-id="${sessionSelector}"]:not(:disabled)`
         ) ||
         document.querySelector(
           `.saved-session-open[data-session-id="${sessionSelector}"]`
         );

       target?.focus({ preventScroll: true });
     });
   }

   async function runSavedSessionTabTransfer(
     state,
     target,
     { removeFromAll = false } = {}
   ) {
     deferCollectionStorageRefreshUntil = Date.now() + 450;
     const runtimeTarget = target.kind === "session"
       ? {
           kind: "session",
           sessionId: target.sessionId
         }
       : {
           kind: "unassigned",
           removeFromAll,
           windowId: await getCollectionTargetWindowId()
         };
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:transferSessionTab",
       sourceSessionId: state.sourceSessionId,
       url: state.url,
       target: runtimeTarget
     });

     if (!response.ok) {
       showToast(
         t(
           response.code === "tab_creation_failed"
             ? "sessionTabBackgroundOpenFailed"
             : "sessionTabMoveFailed"
         )
       );
       await refreshDashboardCollections();
       focusSavedSessionTransferOrigin(state.sourceSessionId, state.url);
       return;
     }

     if (response.code === "confirmation_required") {
       showToast(
         t("unassignSharedTabConfirm", {
           count: response.assignedSessionCount
         }),
         {
           actionLabel: t("unassignFromAll"),
           cancelLabel: t("cancel"),
           duration: 0,
           onAction: async () => {
             await runSavedSessionTabTransfer(state, target, {
               removeFromAll: true
             });
           },
           onCancel: () => {
             focusSavedSessionTransferOrigin(
               state.sourceSessionId,
               state.url
             );
           }
         }
       );
       requestAnimationFrame(() => {
         document.getElementById("toastAction")?.focus();
       });
       return;
     }

     if (
       target.kind === "session" &&
       isDashboardBehaviorEnabled("expandSessionTabs")
     ) {
       expandedSessionIds.add(target.sessionId);
     }

     await refreshDashboardCollections();

     if (response.code === "already_moved") {
       showToast(t("sessionTabAlreadyMoved"));
     } else if (response.code === "already_in_target") {
       showToast(t("sessionTabRemovedFromSource"));
     } else if (response.code === "unassigned") {
       showToast(t("sessionTabMovedToUnassigned"));
     } else {
       showToast(t("sessionTabMoved", {
         name: target.sessionName || ""
       }));
     }

     focusSavedSessionTransferOrigin(
       target.kind === "session" ? target.sessionId : state.sourceSessionId,
       target.kind === "session" ? state.url : ""
     );
   }

   async function finishSavedSessionTabPointerDrag(
     event,
     { cancelled = false } = {}
   ) {
     const state = savedSessionTabDragState;

     if (!state || state.pointerId !== event.pointerId) {
       return;
     }

     savedSessionTabDragState = null;
     const target = state.target;
     const wasDragging = state.dragging;
     cleanupSavedSessionTabPointerDrag(event, state);

     if (!wasDragging || cancelled || !target) {
       return;
     }

     await runSavedSessionTabTransfer(state, target);
   }

   function suppressNextSavedLaterLinkClick(state) {
     const suppression = {
       sourceElement: state.sourceElement,
       deferredId: String(state.deferredId || "")
     };

     suppressedSavedLaterLinkClick = suppression;
     setTimeout(() => {
       if (suppressedSavedLaterLinkClick === suppression) {
         suppressedSavedLaterLinkClick = null;
       }
     }, 300);
   }

   function consumeSuppressedSavedLaterLinkClick(element) {
     const suppression = suppressedSavedLaterLinkClick;

     if (!suppression) {
       return false;
     }

     const matches =
       element?.closest?.(".deferred-item") ===
         suppression.sourceElement ||
       (
         suppression.deferredId &&
         element?.dataset.savedLaterLinkId ===
           suppression.deferredId
       );

     if (matches) {
       suppressedSavedLaterLinkClick = null;
     }

     return matches;
   }

   function clearSavedLaterDropTarget(state) {
     state?.target?.element?.classList.remove(
       "is-saved-session-tab-drop-target"
     );
     state?.target?.element?.removeAttribute(
       "data-session-tab-drop-label"
     );

     if (state) {
       state.target = null;
     }
   }

   function setSavedLaterDropTarget(state, target) {
     if (
       state.target?.kind === target?.kind &&
       state.target?.element === target?.element
     ) {
       return;
     }

     clearSavedLaterDropTarget(state);
     state.target = target;

     if (!target) {
       return;
     }

     target.element.classList.add(
       "is-saved-session-tab-drop-target"
     );
     target.element.dataset.sessionTabDropLabel = t(
       target.kind === "session"
         ? "dropSavedLaterToSession"
         : "dropSavedLaterToUnassigned"
     );
   }

   function getSavedLaterDropTarget(x, y) {
     const hovered = document.elementFromPoint(x, y);
     const sessionCard = hovered?.closest(
       '.saved-session-card[data-session-id]'
     );

     if (sessionCard) {
       return {
         kind: "session",
         element: sessionCard,
         sessionId: sessionCard.dataset.sessionId,
         sessionName: sessionCard.dataset.sessionName || ""
       };
     }

     const unassignedSection = hovered?.closest("#openTabsSection");

     if (unassignedSection) {
       return {
         kind: "unassigned",
         element: unassignedSection
       };
     }

     return null;
   }

   function createSavedLaterDragGhost(state) {
     const ghost = document.createElement("div");
     ghost.className = "saved-later-drag-ghost";
     const favicon = state.sourceElement.querySelector(
       ".deferred-title img"
     );

     if (favicon?.src) {
       const image = document.createElement("img");
       image.alt = "";
       image.src = favicon.src;
       ghost.appendChild(image);
     }

     const copy = document.createElement("span");
     const label = document.createElement("small");
     label.textContent = t("moveSavedLaterLinkLabel");
     const title = document.createElement("strong");
     title.textContent = state.title || state.url;
     copy.append(label, title);
     ghost.appendChild(copy);
     return ghost;
   }

   function startSavedLaterPointerDrag(event, state) {
     const rect = state.sourceElement.getBoundingClientRect();

     state.dragging = true;
     state.offsetX = Math.min(
       event.clientX - rect.left,
       rect.width - 12
     );
     state.offsetY = Math.min(
       event.clientY - rect.top,
       rect.height - 12
     );
     state.ghost = createSavedLaterDragGhost(state);

     if (state.sourceElement.setPointerCapture) {
       try {
         state.sourceElement.setPointerCapture(event.pointerId);
       } catch {}
     }

     state.sourceElement.classList.add(
       "is-saved-later-drag-source"
     );
     document.body.classList.add("is-moving-saved-later-link");
     document
       .querySelectorAll('.saved-session-card[data-session-id]')
       .forEach((card) =>
         card.classList.add("is-saved-session-tab-drop-zone")
       );
     document
       .getElementById("openTabsSection")
       ?.classList.add("is-saved-session-tab-drop-zone");
     document.body.appendChild(state.ghost);
     updateSavedLaterPointerDrag(event);
   }

   function updateSavedLaterPointerDrag(event) {
     const state = savedLaterDragState;

     if (!state?.dragging) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const ghostWidth = state.ghost.offsetWidth;
     const ghostHeight = state.ghost.offsetHeight;
     const left = Math.max(
       8,
       Math.min(
         event.clientX - state.offsetX,
         window.innerWidth - ghostWidth - 8
       )
     );
     const top = Math.max(
       8,
       Math.min(
         event.clientY - state.offsetY,
         window.innerHeight - ghostHeight - 8
       )
     );

     state.ghost.style.transform =
       `translate3d(${left}px, ${top}px, 0)`;
     setSavedLaterDropTarget(
       state,
       getSavedLaterDropTarget(event.clientX, event.clientY)
     );
   }

   function cleanupSavedLaterPointerDrag(event, state) {
     clearSavedLaterDropTarget(state);
     state.sourceElement?.classList.remove(
       "is-saved-later-drag-source"
     );
     state.ghost?.remove();
     document.body.classList.remove("is-moving-saved-later-link");
     document
       .querySelectorAll(".is-saved-session-tab-drop-zone")
       .forEach((element) =>
         element.classList.remove("is-saved-session-tab-drop-zone")
       );

     if (state.sourceElement?.releasePointerCapture) {
       try {
         state.sourceElement.releasePointerCapture(event.pointerId);
       } catch {}
     }
   }

   async function runSavedLaterTransfer(state, target) {
     deferCollectionStorageRefreshUntil = Date.now() + 450;
     const runtimeTarget = target.kind === "session"
       ? {
           kind: "session",
           sessionId: target.sessionId
         }
       : {
           kind: "unassigned",
           windowId: await getCollectionTargetWindowId()
         };
     const response = await sendCollectionRuntimeMessage({
       type: "tabOut:moveDeferredTab",
       deferredId: state.deferredId,
       target: runtimeTarget
     });

     if (!response.ok) {
       showToast(
         t(
           response.code === "tab_creation_failed"
             ? "savedLaterBackgroundOpenFailed"
             : "savedLaterMoveFailed"
         )
       );
       await refreshDashboardCollections();
       return;
     }

     if (response.code === "already_assigned") {
       showToast(t("savedLaterAlreadyAssigned"));
       return;
     }

     if (
       target.kind === "session" &&
       isDashboardBehaviorEnabled("expandSessionTabs")
     ) {
       expandedSessionIds.add(target.sessionId);
     }

     await refreshDashboardCollections();

     if (response.code === "already_moved") {
       return;
     }

     if (response.code === "already_added") {
       showToast(t("savedLaterAlreadyInSession", {
         name: target.sessionName || ""
       }));
     } else if (response.code === "already_open") {
       showToast(t("savedLaterAlreadyOpen"));
     } else if (response.code === "opened_unassigned") {
       showToast(t("savedLaterOpenedUnassigned"));
     } else {
       showToast(t("savedLaterMovedToSession", {
         name: target.sessionName || ""
       }));
     }
   }

   async function finishSavedLaterPointerDrag(
     event,
     { cancelled = false } = {}
   ) {
     const state = savedLaterDragState;

     if (!state || state.pointerId !== event.pointerId) {
       return;
     }

     savedLaterDragState = null;
     const target = state.target;
     const wasDragging = state.dragging;

     if (wasDragging && !cancelled) {
       suppressNextSavedLaterLinkClick(state);
     }

     cleanupSavedLaterPointerDrag(event, state);

     if (!wasDragging || cancelled || !target) {
       return;
     }

     await runSavedLaterTransfer(state, target);
   }

   function focusPendingSessionNameInput() {
     const state = provisionalSessionState || inlineSessionRenameState;

     if (!state?.focusRequested) {
       return;
     }

     const input = document.querySelector(".session-inline-name-input");

     if (!input) {
       return;
     }

     state.focusRequested = false;
     requestAnimationFrame(() => {
       input.focus();
       input.select();
     });
   }

   function renderProvisionalSessionCard() {
     const state = provisionalSessionState;

     if (!state) {
       return null;
     }

     const card = document.createElement("div");
     card.className = "saved-session-card is-provisional-session";

     const body = document.createElement("div");
     body.className = "saved-session-open";

     const input = document.createElement("input");
     input.type = "text";
     input.className = "session-inline-name-input";
     input.value = state.name;
     input.disabled = state.committing;
     input.dataset.sessionNameMode = "provisional";
     input.setAttribute("aria-label", t("createSessionTitle"));

     const meta = document.createElement("span");
     meta.className = "saved-session-meta";
     meta.textContent = plural(
       state.tabs.length,
       "sessionTabCount",
       "sessionTabsCount"
     );

     const favicons = document.createElement("span");
     favicons.className = "saved-session-favicons";
     appendSessionFavicons(favicons, state.tabs);

     body.appendChild(input);
     body.appendChild(meta);
     body.appendChild(favicons);
     card.appendChild(body);
     return card;
   }

   function getSavedSessionCards(container) {
     return Array.from(
       container.querySelectorAll('.saved-session-card[data-session-draggable="true"]')
     ).filter((card) => !card.classList.contains('is-drag-source'));
   }

   function applySavedSessionRowAppearance(
     row,
     rowData,
     { updateDataset = true } = {}
   ) {
     const title = normalizeSavedSessionRowTitle(rowData?.title);
     const color = normalizeSavedSessionRowColor(rowData?.color);
     const accent = SAVED_SESSION_ROW_COLORS[color];

     row.classList.toggle("has-session-row-title", Boolean(title));
     row.classList.toggle("has-session-row-color", Boolean(color));

     if (updateDataset) {
       row.classList.toggle(
         "has-session-row-handle",
         Boolean(title || color)
       );
     }

     if (accent) {
       row.style.setProperty("--session-row-accent", accent);
     } else {
       row.style.removeProperty("--session-row-accent");
     }

     if (updateDataset) {
       row.dataset.sessionRowTitle = title;
       row.dataset.sessionRowColor = color;
     }
   }

   function createSavedSessionRowTools(rowData) {
     const tools = document.createElement("div");
     const title = normalizeSavedSessionRowTitle(rowData?.title);
     const color = normalizeSavedSessionRowColor(rowData?.color);
     const canReorder = isDashboardBehaviorEnabled(
       "reorderSessions"
     );

     tools.className = "saved-session-row-tools";

     if (title || color) {
       const label = document.createElement("button");
       const labelTitle = title
         ? `${title} · ${t("customizeSessionRow")}`
         : t("customizeSessionRow");

       label.type = "button";
       label.className = "saved-session-row-label";
       label.title = canReorder
         ? `${labelTitle} · ${t("reorderSessionRow")}`
         : labelTitle;
       label.setAttribute("aria-label", labelTitle);
       label.setAttribute("aria-expanded", "false");
       label.dataset.action = "customize-session-row";
       label.dataset.sessionRowId = rowData.id;

       if (canReorder) {
         label.setAttribute(
           "aria-description",
           t("reorderSessionRow")
         );
         label.dataset.sessionRowDragHandle = "true";
       }

       if (title) {
         label.textContent = title;
       } else {
         label.classList.add("is-untitled");
         label.innerHTML = `
           <svg viewBox="0 0 16 24" aria-hidden="true">
             <circle cx="5" cy="6" r="1.2"></circle>
             <circle cx="11" cy="6" r="1.2"></circle>
             <circle cx="5" cy="12" r="1.2"></circle>
             <circle cx="11" cy="12" r="1.2"></circle>
             <circle cx="5" cy="18" r="1.2"></circle>
             <circle cx="11" cy="18" r="1.2"></circle>
           </svg>
         `;
       }

       tools.appendChild(label);
     }

     const customize = document.createElement("button");

     customize.type = "button";
     customize.className = "saved-session-row-customize";
     customize.title = t("customizeSessionRow");
     customize.setAttribute("aria-label", customize.title);
     customize.setAttribute("aria-expanded", "false");
     customize.dataset.action = "customize-session-row";
     customize.dataset.sessionRowId = rowData.id;
     customize.innerHTML = `
       <svg viewBox="0 0 20 20" aria-hidden="true">
         <path d="M10 3.25a6.75 6.75 0 1 0 0 13.5h1.1a1.5 1.5 0 0 0 0-3h-.45a1.35 1.35 0 0 1 0-2.7h2.1A4 4 0 0 0 16.75 7 3.75 3.75 0 0 0 13 3.25H10Z"></path>
         <circle cx="6.7" cy="8.1" r=".7"></circle>
         <circle cx="8.8" cy="5.9" r=".7"></circle>
         <circle cx="5.9" cy="11.1" r=".7"></circle>
       </svg>
     `;
     tools.appendChild(customize);
     return tools;
   }

   function createSavedSessionRowEditor(rowData) {
     const editor = document.createElement("div");
     const heading = document.createElement("div");
     const title = document.createElement("strong");
     const close = document.createElement("button");
     const titleLabel = document.createElement("label");
     const titleLabelText = document.createElement("span");
     const input = document.createElement("input");
     const colorLabel = document.createElement("span");
     const colors = document.createElement("div");
     const actions = document.createElement("div");
     const reset = document.createElement("button");
     const save = document.createElement("button");

     editor.className = "saved-session-row-editor";
     editor.dataset.sessionRowEditor = rowData.id;
     editor.dataset.selectedColor = rowData.color;
     editor.setAttribute("role", "dialog");
     editor.setAttribute("aria-label", t("customizeSessionRow"));

     heading.className = "saved-session-row-editor-heading";
     title.textContent = t("customizeSessionRow");
     close.type = "button";
     close.className = "saved-session-row-editor-close";
     close.dataset.action = "close-session-row-editor";
     close.title = t("close");
     close.setAttribute("aria-label", close.title);
     close.textContent = "×";
     heading.append(title, close);

     titleLabel.className = "saved-session-row-editor-field";
     titleLabelText.textContent = t("sessionRowTitle");
     input.type = "text";
     input.maxLength = 80;
     input.value = rowData.title;
     input.placeholder = t("sessionRowTitlePlaceholder");
     input.dataset.sessionRowTitleInput = "true";
     titleLabel.append(titleLabelText, input);

     colorLabel.className = "saved-session-row-editor-label";
     colorLabel.textContent = t("sessionRowColor");
     colors.className = "saved-session-row-colors";
     colors.setAttribute("role", "group");
     colors.setAttribute("aria-label", t("sessionRowColor"));

     [
       ["", "sessionRowColorNeutral"],
       ["sage", "sessionRowColorSage"],
       ["sky", "sessionRowColorSky"],
       ["amber", "sessionRowColorAmber"],
       ["rose", "sessionRowColorRose"],
       ["violet", "sessionRowColorViolet"]
     ].forEach(([color, labelKey]) => {
       const swatch = document.createElement("button");

       swatch.type = "button";
       swatch.className = "saved-session-row-color";
       swatch.dataset.action = "select-session-row-color";
       swatch.dataset.sessionRowColor = color;
       swatch.title = t(labelKey);
       swatch.setAttribute("aria-label", swatch.title);
       swatch.setAttribute(
         "aria-pressed",
         String(color === rowData.color)
       );

       if (color) {
         swatch.style.setProperty(
           "--session-row-swatch",
           SAVED_SESSION_ROW_COLORS[color]
         );
       } else {
         swatch.classList.add("is-neutral");
       }

       colors.appendChild(swatch);
     });

     actions.className = "saved-session-row-editor-actions";
     reset.type = "button";
     reset.className = "saved-session-row-reset";
     reset.dataset.action = "reset-session-row-editor";
     reset.textContent = t("sessionRowReset");
     save.type = "button";
     save.className = "saved-session-row-save";
     save.dataset.action = "save-session-row-editor";
     save.dataset.sessionRowId = rowData.id;
     save.textContent = t("sessionRowDone");
     actions.append(reset, save);

     editor.append(
       heading,
       titleLabel,
       colorLabel,
       colors,
       actions
     );
     return editor;
   }

   function createSavedSessionRow(rowData = null, className = "") {
     const normalizedRow = rowData
       ? normalizeSavedSessionRowData(rowData)
       : null;
     const row = document.createElement("div");

     row.className = [
       "saved-session-row",
       className
     ].filter(Boolean).join(" ");

     if (normalizedRow) {
       row.dataset.sessionRowId = normalizedRow.id;
       applySavedSessionRowAppearance(row, normalizedRow);
       row.appendChild(createSavedSessionRowTools(normalizedRow));
     }

     return row;
   }

   function getOpenSavedSessionRowEditor() {
     return document.querySelector(".saved-session-row-editor");
   }

   function restoreSavedSessionRowAppearance(row) {
     if (!row) {
       return;
     }

     applySavedSessionRowAppearance(row, {
       title: row.dataset.sessionRowTitle,
       color: row.dataset.sessionRowColor
     }, {
       updateDataset: false
     });
   }

   function closeSavedSessionRowEditor() {
     const editor = getOpenSavedSessionRowEditor();

     if (!editor) {
       return false;
     }

     const row = editor.closest(".saved-session-row");

     restoreSavedSessionRowAppearance(row);
     row?.querySelectorAll(
       '[data-action="customize-session-row"]'
     ).forEach((button) => {
       button.setAttribute("aria-expanded", "false");
     });
     editor.remove();
     return true;
   }

   function toggleSavedSessionRowEditor(rowId) {
     const list = document.getElementById("savedSessionsList");
     const row = Array.from(getSavedSessionRowElements(list)).find(
       (item) => item.dataset.sessionRowId === String(rowId)
     );
     const currentEditor = getOpenSavedSessionRowEditor();

     if (!row) {
       return;
     }

     if (currentEditor?.dataset.sessionRowEditor === String(rowId)) {
       closeSavedSessionRowEditor();
       return;
     }

     closeSavedSessionRowEditor();

     const rowData = {
       id: row.dataset.sessionRowId,
       sessionIds: [],
       title: row.dataset.sessionRowTitle,
       color: row.dataset.sessionRowColor
     };
     const editor = createSavedSessionRowEditor(rowData);

     row.appendChild(editor);
     row.querySelectorAll(
       '[data-action="customize-session-row"]'
     ).forEach((button) => {
       button.setAttribute("aria-expanded", "true");
     });

     requestAnimationFrame(() => {
       editor.querySelector("[data-session-row-title-input]")?.focus();
     });
   }

   function selectSavedSessionRowEditorColor(color) {
     const editor = getOpenSavedSessionRowEditor();
     const row = editor?.closest(".saved-session-row");
     const normalizedColor = normalizeSavedSessionRowColor(color);

     if (!editor || !row) {
       return;
     }

     editor.dataset.selectedColor = normalizedColor;
     editor.querySelectorAll(".saved-session-row-color").forEach(
       (swatch) => {
         swatch.setAttribute(
           "aria-pressed",
           String(
             swatch.dataset.sessionRowColor === normalizedColor
           )
         );
       }
     );
     applySavedSessionRowAppearance(row, {
       title: row.dataset.sessionRowTitle,
       color: normalizedColor
     }, {
       updateDataset: false
     });
   }

   function resetSavedSessionRowEditor() {
     const editor = getOpenSavedSessionRowEditor();
     const input = editor?.querySelector(
       "[data-session-row-title-input]"
     );

     if (!editor || !input) {
       return;
     }

     input.value = "";
     selectSavedSessionRowEditorColor("");
     input.focus();
   }

   async function saveSavedSessionRowEditor(rowId) {
     const editor = getOpenSavedSessionRowEditor();
     const list = document.getElementById("savedSessionsList");
     const normalizedRowId = String(rowId || "");

     if (
       !editor ||
       editor.dataset.sessionRowEditor !== normalizedRowId ||
       !list
     ) {
       return;
     }

     const layout = getSavedSessionDomLayout(list);
     const rowData = layout.find(
       (row) => row.id === normalizedRowId
     );

     if (!rowData) {
       closeSavedSessionRowEditor();
       return;
     }

     rowData.title = normalizeSavedSessionRowTitle(
       editor.querySelector(
         "[data-session-row-title-input]"
       )?.value
     );
     rowData.color = normalizeSavedSessionRowColor(
       editor.dataset.selectedColor
     );

     try {
       deferCollectionStorageRefreshUntil = Date.now() + 300;
       await saveSavedSessionRows(layout);
       closeSavedSessionRowEditor();
       await renderSavedSessions();
       showToast(t("sessionRowSaved"));
     } catch (error) {
       console.warn(
         "[tab-out] session row customization failed:",
         error
       );
       showToast(t("sessionRowSaveFailed"));
     }
   }

   function getSavedSessionRowElements(list) {
     return Array.from(
       list?.querySelectorAll(
         ":scope > .saved-session-row:not(.saved-session-new-row-target):not(.saved-session-row-placeholder)"
       ) || []
     );
   }

   function suppressNextSessionRowCustomize(rowId) {
     suppressedSessionRowCustomize = {
       rowId: String(rowId || ""),
       until: Date.now() + 700
     };
   }

   function consumeSuppressedSessionRowCustomize(rowId) {
     const suppression = suppressedSessionRowCustomize;

     if (!suppression) {
       return false;
     }

     if (Date.now() > suppression.until) {
       suppressedSessionRowCustomize = null;
       return false;
     }

     if (suppression.rowId !== String(rowId || "")) {
       return false;
     }

     suppressedSessionRowCustomize = null;
     return true;
   }

   function getSavedSessionTargetRow(list, y) {
     const rows = getSavedSessionRowElements(list);

     if (!rows.length) {
       return null;
     }

     return rows.reduce((closest, row) => {
       const rect = row.getBoundingClientRect();
       const distance = y < rect.top
         ? rect.top - y
         : y > rect.bottom
           ? y - rect.bottom
           : 0;

       if (!closest || distance < closest.distance) {
         return { row, distance };
       }

       return closest;
     }, null)?.row || rows[rows.length - 1];
   }

   function getSavedSessionInsertBefore(row, x, y) {
     const cards = getSavedSessionCards(row);

     return cards.find((card) => {
       const rect = card.getBoundingClientRect();
       const isSameRow = y >= rect.top && y <= rect.bottom;

       if (isSameRow) {
         return x < rect.left + rect.width / 2;
       }

       return y < rect.top + rect.height / 2;
     }) || null;
   }

   function getSavedSessionDomLayout(list) {
     return getSavedSessionRowElements(list)
       .map((row) => {
         const sessionIds = Array.from(
           row.querySelectorAll(
             ':scope > .saved-session-card[data-session-draggable="true"]'
           )
         )
           .map((card) => card.dataset.sessionId)
           .filter(Boolean);

         if (!sessionIds.length) {
           return null;
         }

         if (!row.dataset.sessionRowId) {
           row.dataset.sessionRowId = createSavedSessionRowId();
         }

         return {
           id: row.dataset.sessionRowId,
           sessionIds,
           title: normalizeSavedSessionRowTitle(
             row.dataset.sessionRowTitle
           ),
           color: normalizeSavedSessionRowColor(
             row.dataset.sessionRowColor
           )
         };
       })
       .filter(Boolean);
   }

   function getSavedSessionDomRows(list) {
     return getSavedSessionDomLayout(list).map(
       (row) => row.sessionIds
     );
   }

   function getSavedSessionDomOrder(list) {
     return getSavedSessionDomLayout(list)
       .flatMap((row) => row.sessionIds);
   }

   function hasSavedSessionRowsChanged(before, after) {
     return JSON.stringify(before) !== JSON.stringify(after);
   }

   function getSavedSessionRowInsertBefore(list, y) {
     return getSavedSessionRowElements(list).find((row) => {
       const rect = row.getBoundingClientRect();
       return y < rect.top + rect.height / 2;
     }) || null;
   }

   function startSavedSessionRowPointerDrag(event, state) {
     const { handle, list, row } = state;

     closeSavedSessionRowEditor();

     const rect = row.getBoundingClientRect();
     const placeholder = document.createElement("div");
     const ghost = row.cloneNode(true);

     state.dragging = true;
     state.offsetX = event.clientX - rect.left;
     state.offsetY = event.clientY - rect.top;
     state.placeholder = placeholder;
     state.ghost = ghost;

     if (handle.setPointerCapture) {
       try { handle.setPointerCapture(event.pointerId); } catch {}
     }

     placeholder.className =
       "saved-session-row saved-session-row-placeholder";
     placeholder.style.height = `${rect.height}px`;

     ghost.classList.add("saved-session-row-drag-ghost");
     ghost.querySelector(".saved-session-row-editor")?.remove();
     ghost.querySelectorAll(".saved-session-card").forEach((card) => {
       card.classList.remove("is-expanded");
     });
     ghost.querySelectorAll(".saved-session-inline-tabs").forEach(
       (tabs) => tabs.remove()
     );
     ghost.querySelectorAll(".saved-session-expand").forEach(
       (button) => button.remove()
     );
     ghost.querySelectorAll("button, input, select, textarea").forEach(
       (control) => {
         control.tabIndex = -1;
       }
     );
     ghost.style.width = `${rect.width}px`;
     ghost.style.left = "0px";
     ghost.style.top = "0px";

     list.classList.add("is-row-reordering");
     list.insertBefore(placeholder, row);
     row.remove();
     document.body.appendChild(ghost);

     updateSavedSessionRowPointerDrag(event);
   }

   function updateSavedSessionRowPointerDrag(event) {
     const state = savedSessionRowDragState;

     if (!state?.dragging) {
       return;
     }

     const { ghost, list, offsetX, offsetY, placeholder } = state;

     ghost.style.transform = `translate3d(${event.clientX - offsetX}px, ${event.clientY - offsetY}px, 0)`;

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     const insertBefore = getSavedSessionRowInsertBefore(
       list,
       event.clientY
     );

     if (insertBefore) {
       list.insertBefore(placeholder, insertBefore);
     } else {
       list.appendChild(placeholder);
     }
   }

   async function finishSavedSessionRowPointerDrag(
     event,
     { cancelled = false } = {}
   ) {
     const state = savedSessionRowDragState;

     if (!state) {
       return;
     }

     const {
       dragging,
       ghost,
       handle,
       initialRows,
       list,
       placeholder,
       row,
       rowId
     } = state;

     savedSessionRowDragState = null;

     if (handle?.releasePointerCapture) {
       try { handle.releasePointerCapture(event.pointerId); } catch {}
     }

     if (!dragging) {
       return;
     }

     placeholder?.parentElement?.insertBefore(row, placeholder);
     placeholder?.remove();
     ghost?.remove();
     list?.classList.remove("is-row-reordering");

     if (cancelled) {
       await renderSavedSessions();
       return;
     }

     suppressNextSessionRowCustomize(rowId);

     const finalRows = getSavedSessionDomLayout(list);

     if (hasSavedSessionRowsChanged(initialRows, finalRows)) {
       await saveCurrentSavedSessionLayout();
       showToast(t("sessionsLayoutSaved"));
     }
   }

   function shouldUseNewSavedSessionRow(state, x, y) {
     const rows = getSavedSessionRowElements(state.list);
     const lastRow = rows[rows.length - 1];

     if (!lastRow) {
       return true;
     }

     const listRect = state.list.getBoundingClientRect();
     const lastRowRect = lastRow.getBoundingClientRect();
     const targetRect =
       state.newRowTarget.getBoundingClientRect();
     const withinHorizontalBounds =
       x >= listRect.left - 12 &&
       x <= listRect.right + 12;
     const activationTop = lastRowRect.bottom + 3;
     const activationBottom = Math.max(
       lastRowRect.bottom + 108,
       targetRect.bottom + 24
     );

     return (
       withinHorizontalBounds &&
       y >= activationTop &&
       y <= activationBottom
     );
   }

   function removeEmptySavedSessionRows(list) {
     getSavedSessionRowElements(list).forEach((row) => {
       if (
         !row.querySelector(
           '.saved-session-card[data-session-draggable="true"]'
         )
       ) {
         row.remove();
       }
     });
   }

   function startSavedSessionPointerDrag(event, state) {
     const { card, list } = state;
     const rect = card.getBoundingClientRect();
     const sourceRow = card.closest(".saved-session-row");

     closeSavedSessionRowEditor();
     state.dragging = true;
     draggedSavedSessionId = card.dataset.sessionId;
     suppressSavedSessionOpenUntil = Date.now() + 500;

     if (card.setPointerCapture) {
       try { card.setPointerCapture(event.pointerId); } catch {}
     }

     const placeholder = document.createElement('div');
     placeholder.className = 'saved-session-card saved-session-placeholder';
     placeholder.style.width = `${rect.width}px`;
     placeholder.style.height = `${rect.height}px`;

     const ghost = card.cloneNode(true);
     ghost.classList.add('saved-session-drag-ghost');
     ghost.classList.remove('is-expanded');
     ghost.querySelector('.saved-session-inline-tabs')?.remove();
     ghost.querySelector('.saved-session-expand')?.remove();
     ghost.style.width = `${rect.width}px`;
     ghost.style.height = `${card.querySelector('.saved-session-summary')?.offsetHeight || rect.height}px`;
     ghost.style.left = "0px";
     ghost.style.top = "0px";

     state.offsetX = event.clientX - rect.left;
     state.offsetY = event.clientY - rect.top;
     state.placeholder = placeholder;
     state.ghost = ghost;
     state.sourceRow = sourceRow;
     state.newRowTarget = createSavedSessionRow(
       null,
       "saved-session-new-row-target"
     );
     state.newRowTarget.dataset.newRowLabel = t(
       "dropCreateSessionRow"
     );
     state.newRowTarget.setAttribute("aria-hidden", "true");

     list.classList.add('is-reordering');
     card.classList.add('is-drag-source');
     sourceRow.insertBefore(placeholder, card);
     card.remove();
     list.appendChild(state.newRowTarget);
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

     if (!list || !placeholder || !state.newRowTarget) {
       return;
     }

     const edgeSize = 54;
     const scrollStep = 14;

     if (event.clientY < edgeSize) {
       window.scrollBy(0, -scrollStep);
     } else if (event.clientY > window.innerHeight - edgeSize) {
       window.scrollBy(0, scrollStep);
     }

     if (
       shouldUseNewSavedSessionRow(
         state,
         event.clientX,
         event.clientY
       )
     ) {
       state.newRowTarget.classList.add(
         "is-visible",
         "is-active"
       );
       state.newRowTarget.appendChild(placeholder);
       return;
     }

     state.newRowTarget.classList.remove(
       "is-visible",
       "is-active"
     );
     const targetRow = getSavedSessionTargetRow(
       list,
       event.clientY
     );

     if (!targetRow) {
       return;
     }

     const insertBefore = getSavedSessionInsertBefore(
       targetRow,
       event.clientX,
       event.clientY
     );

     if (insertBefore && insertBefore !== placeholder) {
       targetRow.insertBefore(placeholder, insertBefore);
     } else if (!insertBefore) {
       targetRow.appendChild(placeholder);
     }
   }

   async function finishSavedSessionPointerDrag(event) {
     const state = savedSessionDragState;

     if (!state) {
       return;
     }

     const {
       card,
       list,
       placeholder,
       ghost,
       initialRows,
       dragging,
       newRowTarget
     } = state;

     savedSessionDragState = null;

     if (card?.releasePointerCapture) {
       try { card.releasePointerCapture(event.pointerId); } catch {}
     }

     if (!dragging) {
       return;
     }

     suppressSavedSessionOpenUntil = Date.now() + 600;
     const createdNewRow =
       placeholder?.parentElement === newRowTarget;

     if (placeholder && list) {
       placeholder.parentElement?.insertBefore(card, placeholder);
       placeholder.remove();
     }

     if (createdNewRow && newRowTarget) {
       const newRowData = {
         id: createSavedSessionRowId(),
         sessionIds: [],
         title: "",
         color: ""
       };

       newRowTarget.classList.remove(
         "saved-session-new-row-target",
         "is-visible",
         "is-active"
       );
       newRowTarget.removeAttribute("data-new-row-label");
       newRowTarget.removeAttribute("aria-hidden");
       newRowTarget.dataset.sessionRowId = newRowData.id;
       applySavedSessionRowAppearance(newRowTarget, newRowData);
       newRowTarget.insertBefore(
         createSavedSessionRowTools(newRowData),
         newRowTarget.firstChild
       );
     } else {
       newRowTarget?.remove();
     }

     removeEmptySavedSessionRows(list);

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

     const finalRows = getSavedSessionDomLayout(list);

     if (hasSavedSessionRowsChanged(initialRows, finalRows)) {
       await saveCurrentSavedSessionLayout();
       showToast(t('sessionsLayoutSaved'));
     }
   }

   async function saveCurrentSavedSessionLayout() {
     const list = document.getElementById("savedSessionsList");

     if (!list || savedSessionsViewMode !== "sessions") {
       return;
     }

     const rows = getSavedSessionDomLayout(list);
     const orderedIds = rows.flatMap((row) => row.sessionIds);

     if (orderedIds.length === 0) {
       return;
     }

     await saveSavedSessionRows(rows);
   }

   let savedSessionsViewMode = "sessions";

   function findLiveGroupForSession(session, liveGroups) {
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
         getGroupSignature(group) === session.groupLink.lastReviewedSignature
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
         getUrlOverlapScore(comparableSession, group) >= 0.65
     );

     return safeMatches.length === 1 ? safeMatches[0] : null;
   }

   function getSessionGroupStatus(session, liveGroup) {
     if (!session.groupLink) {
       return null;
     }

     if (!liveGroup) {
       return {
         key: "closed",
         label: t("groupClosedStatus"),
         className: "is-group-closed"
       };
     }

     const liveSignature = getGroupSignature(liveGroup);
     const savedSignature = getGroupSignature({
       title: session.groupTemplate?.title || session.name || "",
       color: session.groupTemplate?.color || "grey",
       tabs: session.tabs || []
     });

     if (
       liveSignature !== session.groupLink.lastReviewedSignature ||
       liveSignature !== savedSignature
     ) {
       return {
         key: "changed",
         label: t("groupChangedStatus"),
         className: "is-group-changed"
       };
     }

     return {
       key: "open",
       label: t("groupOpenStatus"),
       className: "is-group-open"
     };
   }

   function appendSessionFavicons(container, tabs) {
     (tabs || []).slice(0, 4).forEach((tab) => {
       const favicon = tab.favIconUrl || getTabFavicon(tab.url, 16);

       if (!favicon) {
         return;
       }

       const image = document.createElement("img");
       image.alt = "";
       image.src = favicon;
       container.appendChild(image);
     });

     if ((tabs || []).length > 4) {
       const more = document.createElement("span");
       more.className = "saved-session-more";
       more.textContent = `+${tabs.length - 4}`;
       container.appendChild(more);
     }
   }

   function getOpenTabForSessionDescriptor(descriptor, browserTabs = []) {
     const normalizedUrl = normalizeOpenTabUrl(descriptor?.url);

     return browserTabs.find(
       (tab) =>
         normalizeOpenTabUrl(tab.pendingUrl || tab.url) === normalizedUrl
     ) || null;
   }

   function createSavedSessionInlineTabs(session, browserTabs = []) {
     const panel = document.createElement("div");
     const panelId = `saved-session-tabs-${session.id}`;
     const expanded = expandedSessionIds.has(session.id);

     panel.id = panelId;
     panel.className = "saved-session-inline-tabs";
     panel.dataset.sessionId = session.id;
     panel.setAttribute("role", "list");
     panel.setAttribute("aria-label", t("sessionTabsList", {
       name: session.name
     }));
     panel.hidden = !expanded;

     (session.tabs || []).forEach((tab) => {
       const existingTab = getOpenTabForSessionDescriptor(tab, browserTabs);
       const row = document.createElement("div");
       row.className = "saved-session-inline-tab";
       row.dataset.sessionId = session.id;
       row.dataset.tabUrl = tab.url;
       row.setAttribute("role", "listitem");

       if (existingTab) {
         row.classList.add("is-open");
       }

       if (isDashboardBehaviorEnabled("dragSessionTabs")) {
         row.classList.add("has-drag-handle");
         const dragHandle = document.createElement("button");
         dragHandle.type = "button";
         dragHandle.className = "saved-session-tab-drag";
         dragHandle.dataset.sessionTabDragHandle = "true";
         dragHandle.dataset.sessionId = session.id;
         dragHandle.dataset.sessionName = session.name;
         dragHandle.dataset.tabUrl = tab.url;
         dragHandle.title = t("moveSavedTab", {
           title: tab.title || tab.url
         });
         dragHandle.setAttribute("aria-label", dragHandle.title);
         dragHandle.innerHTML = "<span></span><span></span><span></span>";
         row.appendChild(dragHandle);
       }

       const openButton = document.createElement("button");
       openButton.type = "button";
       openButton.className = "saved-session-inline-tab-open";
       openButton.dataset.action = "open-session-inline-tab";
       openButton.dataset.tabUrl = tab.url;
       openButton.dataset.sessionId = session.id;
       openButton.title = existingTab
         ? t("collectionDetailSwitchToTab")
         : t("collectionDetailOpenAndSwitch");

       const favicon = document.createElement("img");
       favicon.alt = "";
       favicon.src = tab.favIconUrl || getTabFavicon(tab.url, 16);
       favicon.addEventListener("error", () => {
         favicon.hidden = true;
       }, { once: true });

       const information = document.createElement("span");
       information.className = "saved-session-inline-tab-info";
       const title = document.createElement("span");
       title.className = "saved-session-inline-tab-title";
       title.textContent = tab.title || tab.url;
       const domain = document.createElement("span");
       domain.className = "saved-session-inline-tab-domain";
       domain.textContent = getTabDomain(tab.url) || tab.url;
       information.append(title, domain);

       if (existingTab) {
         const badge = document.createElement("span");
         badge.className = "saved-session-inline-tab-badge";
         badge.textContent = t("collectionDetailAlreadyOpen");
         information.appendChild(badge);
       }

       openButton.append(favicon, information);
       row.appendChild(openButton);
       panel.appendChild(row);
     });

     return panel;
   }

   function renderUnifiedSessionCard(session, liveGroups, browserTabs = []) {
     const liveGroup = findLiveGroupForSession(session, liveGroups);
     const status = getSessionGroupStatus(session, liveGroup);
     const menuKey = `session-${session.id}`;
     const card = document.createElement("div");
     const expanded = expandedSessionIds.has(session.id);

     card.className = [
       "saved-session-card",
       expanded ? "is-expanded" : "",
       session.groupTemplate ? "has-group-template" : "",
       session.groupLink ? "has-group-link" : "",
       status?.className || ""
     ].filter(Boolean).join(" ");
     card.dataset.sessionId = session.id;
     card.dataset.sessionName = session.name;
     card.dataset.sessionDraggable = "true";
     card.draggable = false;

     const summary = document.createElement("div");
     summary.className = "saved-session-summary";

     const openButton = document.createElement("button");
     openButton.type = "button";
     openButton.className = "saved-session-open";
     openButton.dataset.action = "view-saved-session";
     openButton.dataset.sessionId = session.id;

     if (session.groupTemplate && session.groupLink) {
       const colorDot = document.createElement("span");
       colorDot.className = "chrome-group-color-dot";
       colorDot.style.setProperty(
         "--chrome-group-color",
         CHROME_GROUP_COLORS[session.groupTemplate.color] ||
           CHROME_GROUP_COLORS.grey
       );
       colorDot.title = t("chromeGroupNativeColor");
       openButton.appendChild(colorDot);
     }

     const title = document.createElement("span");
     title.className = "saved-session-title";
     title.textContent = session.name;
     title.dataset.action = "rename-session-inline";
     title.dataset.sessionId = session.id;
     title.dataset.sessionName = session.name;
     title.title = t("renameSession");

     const meta = document.createElement("span");
     meta.className = "saved-session-meta";
     meta.textContent = [
       plural(session.tabs.length, "sessionTabCount", "sessionTabsCount"),
       status?.label || ""
     ].filter(Boolean).join(" · ");

     const favicons = document.createElement("span");
     favicons.className = "saved-session-favicons";
     appendSessionFavicons(favicons, session.tabs);

     openButton.appendChild(title);
     openButton.appendChild(meta);
     openButton.appendChild(favicons);

     const menuButton = document.createElement("button");
     menuButton.type = "button";
     menuButton.className = "saved-session-edit";
     menuButton.textContent = "⋯";
     menuButton.title = t("sessionActions");
     menuButton.setAttribute("aria-label", t("sessionActions"));
     menuButton.dataset.action = "toggle-protected-group-menu";
     menuButton.dataset.menuKey = menuKey;

     const renameButton = document.createElement("button");
     renameButton.type = "button";
     renameButton.className = "saved-session-rename";
     renameButton.textContent = "✎";
     renameButton.title = t("renameSession");
     renameButton.setAttribute("aria-label", t("renameSession"));
     renameButton.dataset.action = "rename-session-inline";
     renameButton.dataset.sessionId = session.id;
     renameButton.dataset.sessionName = session.name;

     const menu = document.createElement("div");
     menu.className = "protected-group-menu";
     menu.dataset.menuKey = menuKey;
     menu.hidden = true;
     menu.appendChild(createProtectedMenuButton(
       t("editSession"),
       "edit-saved-session",
       { sessionId: session.id }
     ));
     menu.appendChild(createProtectedMenuButton(
       liveGroup ? t("showOpenGroup") : t("openAsGroup"),
       "open-session-as-group",
       { sessionId: session.id }
     ));
     menu.appendChild(createProtectedMenuButton(
       t("openGroupCopy"),
       "open-session-group-copy",
       { sessionId: session.id }
     ));

     if (liveGroup) {
       menu.appendChild(createProtectedMenuButton(
         t("reviewGroupChanges"),
         "review-session-group",
         { sessionId: session.id }
       ));
     }

     menu.appendChild(createProtectedMenuButton(
       session.groupLink ? t("changeGroup") : t("connectGroup"),
       "connect-session-group",
       { sessionId: session.id }
     ));

     if (session.groupLink) {
       menu.appendChild(createProtectedMenuButton(
         t("disconnectGroup"),
         "disconnect-session-group",
         { sessionId: session.id }
       ));
     }

     menu.appendChild(createProtectedMenuButton(
       t("delete"),
       "delete-saved-session-direct",
       { sessionId: session.id },
       "danger"
     ));

     summary.appendChild(openButton);
     const renameState = inlineSessionRenameState?.sessionId === session.id
       ? inlineSessionRenameState
       : null;

     if (renameState) {
       title.hidden = true;
       renameButton.hidden = true;
       card.classList.add("is-renaming-session");

       const input = document.createElement("input");
       input.type = "text";
       input.className = "session-inline-name-input";
       input.value = renameState.value;
       input.disabled = renameState.saving;
       input.dataset.sessionNameMode = "rename";
       input.dataset.sessionId = session.id;
       input.setAttribute("aria-label", t("renameSession"));
       summary.appendChild(input);
     }

     summary.appendChild(renameButton);
     summary.appendChild(menuButton);
     summary.appendChild(menu);

     if (isDashboardBehaviorEnabled("expandSessionTabs")) {
       const expandButton = document.createElement("button");
       const panelId = `saved-session-tabs-${session.id}`;

       expandButton.type = "button";
       expandButton.className = "saved-session-expand";
       expandButton.dataset.action = "toggle-session-inline-tabs";
       expandButton.dataset.sessionId = session.id;
       expandButton.disabled = session.tabs.length === 0;
       expandButton.setAttribute("aria-expanded", String(expanded));
       expandButton.setAttribute("aria-controls", panelId);
       expandButton.title = t(
         expanded ? "hideSessionTabs" : "showSessionTabs"
       );
       expandButton.setAttribute("aria-label", expandButton.title);
       expandButton.innerHTML = `
         <svg viewBox="0 0 20 20" aria-hidden="true">
           <path d="m5.5 7.5 4.5 4.5 4.5-4.5"></path>
         </svg>
       `;
       summary.appendChild(expandButton);
     }

     card.appendChild(summary);

     if (
       isDashboardBehaviorEnabled("expandSessionTabs") &&
       session.tabs.length > 0
     ) {
       card.appendChild(createSavedSessionInlineTabs(session, browserTabs));
     }

     return card;
   }

   async function renderSavedSessions() {
     const section = document.getElementById("savedSessionsSection");
     const list = document.getElementById("savedSessionsList");

     if (!section || !list) {
       return;
     }

     if (
       savedSessionRowDragState?.dragging ||
       openTabAssignmentDragState?.dragging ||
       savedSessionTabDragState?.dragging ||
       savedLaterDragState?.dragging
     ) {
       return;
     }

     if (
       document.activeElement?.classList.contains("session-inline-name-input") &&
       (provisionalSessionState || inlineSessionRenameState)
     ) {
       return;
     }

     section.hidden = false;
     savedSessionsViewMode = "sessions";

     const sessions = await getSavedSessions();
     const [liveGroups, browserTabs, sessionRows] = await Promise.all([
       getCurrentChromeGroups(),
       queryTabsWithMetadata({}),
       getSavedSessionRows(sessions)
     ]);

     const sessionIds = new Set(sessions.map((session) => session.id));
     expandedSessionIds.forEach((sessionId) => {
       if (!sessionIds.has(sessionId)) {
         expandedSessionIds.delete(sessionId);
       }
     });

     list.innerHTML = "";

     if (sessions.length === 0 && !provisionalSessionState) {
       list.innerHTML = `
         <div class="saved-sessions-empty">
           ${t("noSavedSession")}
         </div>
       `;
       return;
     }

     const sessionsById = new Map(
       sessions.map((session) => [String(session.id), session])
     );
     const renderedIds = new Set();

     sessionRows
       .map(normalizeSavedSessionRowData)
       .forEach((rowData) => {
       const row = createSavedSessionRow(rowData);

       rowData.sessionIds.forEach((sessionId) => {
         const normalizedId = String(sessionId);
         const session = sessionsById.get(normalizedId);

         if (!session || renderedIds.has(normalizedId)) {
           return;
         }

         renderedIds.add(normalizedId);
         row.appendChild(
           renderUnifiedSessionCard(
             session,
             liveGroups,
             browserTabs
           )
         );
       });

       if (
         row.querySelector(
           ':scope > .saved-session-card[data-session-draggable="true"]'
         )
       ) {
         list.appendChild(row);
       }
     });

     const missingSessions = sessions.filter(
       (session) => !renderedIds.has(String(session.id))
     );

     if (missingSessions.length > 0) {
       const targetRow =
         getSavedSessionRowElements(list).at(-1) ||
         createSavedSessionRow({
           id: createSavedSessionRowId(),
           sessionIds: [],
           title: "",
           color: ""
         });

       if (!targetRow.isConnected) {
         list.appendChild(targetRow);
       }

       missingSessions.forEach((session) => {
         targetRow.appendChild(
           renderUnifiedSessionCard(
             session,
             liveGroups,
             browserTabs
           )
         );
       });
     }

     const provisionalCard = renderProvisionalSessionCard();

     if (provisionalCard) {
       const targetRow =
         getSavedSessionRowElements(list).at(-1) ||
         createSavedSessionRow();

       if (!targetRow.isConnected) {
         list.appendChild(targetRow);
       }

       targetRow.appendChild(provisionalCard);
     }

     focusPendingSessionNameInput();
   }

   let groupImportState = null;
   let groupImportReturnFocus = null;

   function getGroupImportElements() {
     return {
       modal: document.getElementById("groupImportModal"),
       title: document.getElementById("groupImportTitle"),
       subtitle: document.getElementById("groupImportSubtitle"),
       body: document.getElementById("groupImportBody"),
       back: document.getElementById("groupImportBackBtn"),
       summary: document.getElementById("groupImportSummary"),
       save: document.getElementById("groupImportSaveBtn")
     };
   }

   function getSessionLinkedToGroup(group, sessions, liveGroups = [group]) {
     return sessions.find((session) => {
       const matchedGroup = findLiveGroupForSession(session, liveGroups);
       return matchedGroup?.chromeGroupId === group.chromeGroupId;
     }) || null;
   }

   function setGroupImportStep(step) {
     if (!groupImportState) {
       return;
     }

     if (groupImportState.step && groupImportState.step !== step) {
       groupImportState.history.push(groupImportState.step);
     }

     groupImportState.step = step;
     renderGroupImportModal();
   }

   function closeGroupImportModal() {
     const elements = getGroupImportElements();
     const returnFocus = groupImportReturnFocus;

     if (elements.modal) {
       elements.modal.hidden = true;
     }

     groupImportState = null;
     groupImportReturnFocus = null;

     requestAnimationFrame(() => {
       if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
         returnFocus.focus();
       }
     });
   }

   function createGroupImportChoice({
     title,
     meta = "",
     action,
     dataset = {},
     color = ""
   }) {
     const button = document.createElement("button");
     button.type = "button";
     button.className = "group-import-choice";
     button.dataset.action = action;

     Object.entries(dataset).forEach(([key, value]) => {
       button.dataset[key] = String(value);
     });

     if (color) {
       const dot = document.createElement("span");
       dot.className = "chrome-group-color-dot";
       dot.style.setProperty(
         "--chrome-group-color",
         CHROME_GROUP_COLORS[color] || CHROME_GROUP_COLORS.grey
       );
       button.appendChild(dot);
     }

     const copy = document.createElement("span");
     copy.className = "group-import-choice-copy";

     const heading = document.createElement("strong");
     heading.textContent = title;
     copy.appendChild(heading);

     if (meta) {
       const description = document.createElement("span");
       description.textContent = meta;
       copy.appendChild(description);
     }

     button.appendChild(copy);
     return button;
   }

   function buildGroupReviewTabs(session, group) {
     const tabsByUrl = new Map();

     (session?.tabs || []).forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.url);

       if (!normalizedUrl || tabsByUrl.has(normalizedUrl)) {
         return;
       }

       tabsByUrl.set(normalizedUrl, {
         key: normalizedUrl,
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || "",
         inSession: true,
         inGroup: false
       });
     });

     (group.tabs || []).forEach((tab) => {
       const normalizedUrl = normalizeOpenTabUrl(tab.url);

       if (!normalizedUrl) {
         return;
       }

       const existing = tabsByUrl.get(normalizedUrl);

       if (existing) {
         existing.inGroup = true;
         existing.favIconUrl = existing.favIconUrl || tab.favIconUrl || "";
         return;
       }

       tabsByUrl.set(normalizedUrl, {
         key: normalizedUrl,
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || "",
         inSession: false,
         inGroup: true
       });
     });

     return Array.from(tabsByUrl.values());
   }

   function updateGroupImportSummary() {
     const elements = getGroupImportElements();
     const state = groupImportState;

     if (!state || state.step !== "review") {
       return;
     }

     const selected = state.selectedKeys;
     const kept = state.reviewTabs.filter(
       (tab) => tab.inSession && selected.has(tab.key)
     ).length;
     const added = state.reviewTabs.filter(
       (tab) => !tab.inSession && selected.has(tab.key)
     ).length;
     const removed = state.reviewTabs.filter(
       (tab) => tab.inSession && !selected.has(tab.key)
     ).length;
     const nameInput = document.getElementById("groupImportNameInput");

     state.sessionName = nameInput?.value.trim() || state.sessionName || "";

     if (elements.summary) {
       elements.summary.textContent = t("groupReviewSummary", {
         kept,
         added,
         removed
       });
     }

     if (elements.save) {
       elements.save.disabled =
         !state.sessionName ||
         selected.size === 0;
     }
   }

   function prepareGroupReview(session, group) {
     if (!groupImportState) {
       return;
     }

     groupImportState.sessionId = session?.id || null;
     groupImportState.sessionName = session?.name || group.title;
     groupImportState.groupId = group.chromeGroupId;
     groupImportState.reviewTabs = buildGroupReviewTabs(session, group);
     groupImportState.selectedKeys = new Set(
       groupImportState.reviewTabs.map((tab) => tab.key)
     );
     setGroupImportStep("review");
   }

   function renderGroupImportGroupList(elements, state) {
     elements.subtitle.textContent = t("chooseGroupSubtitle");

     if (!state.liveGroups.length) {
       const empty = document.createElement("div");
       empty.className = "saved-sessions-empty";
       empty.textContent = t("noChromeGroupsForImport");
       elements.body.appendChild(empty);
       return;
     }

     state.liveGroups.forEach((group) => {
       const linkedSession = getSessionLinkedToGroup(
         group,
         state.sessions,
         state.liveGroups
       );
       const fixedSessionOwnsGroup =
         state.fixedSessionId &&
         linkedSession?.id === state.fixedSessionId;
       const groupMeta = [
         plural(
           group.tabs.length,
           "chromeGroupTabCount",
           "chromeGroupTabsCount"
         ),
         group.windowId === state.currentWindowId
           ? t("groupCurrentWindow")
           : t("groupOtherWindow"),
         linkedSession
           ? t("linkedToSession", { name: linkedSession.name })
           : ""
       ].filter(Boolean).join(" · ");
       const choice = createGroupImportChoice({
         title: group.title || t("untitledChromeGroup"),
         meta: groupMeta,
         action: linkedSession && !fixedSessionOwnsGroup
           ? "review-linked-session-group"
           : "select-group-import",
         dataset: {
           groupId: group.chromeGroupId,
           ...(linkedSession ? { sessionId: linkedSession.id } : {})
         },
         color: group.color
       });

       elements.body.appendChild(choice);
     });
   }

   function renderGroupImportMode(elements, state) {
     const group = state.liveGroups.find(
       (item) => item.chromeGroupId === state.groupId
     );

     elements.subtitle.textContent = t("chooseGroupModeSubtitle");
     elements.body.appendChild(createGroupImportChoice({
       title: t("importAsNewSession"),
       meta: group?.title || "",
       action: "create-session-from-group"
     }));
     elements.body.appendChild(createGroupImportChoice({
       title: t("updateExistingSession"),
       meta: plural(
         group?.tabs?.length || 0,
         "chromeGroupTabCount",
         "chromeGroupTabsCount"
       ),
       action: "choose-session-for-group"
     }));
   }

   function renderGroupImportSessionList(elements, state) {
     elements.subtitle.textContent = t("chooseSessionSubtitle");

     if (!state.sessions.length) {
       const empty = document.createElement("div");
       empty.className = "saved-sessions-empty";
       empty.textContent = t("noSavedSession");
       elements.body.appendChild(empty);
       return;
     }

     state.sessions.forEach((session) => {
       elements.body.appendChild(createGroupImportChoice({
         title: session.name,
         meta: plural(
           session.tabs.length,
           "sessionTabCount",
           "sessionTabsCount"
         ),
         action: "select-session-for-group",
         dataset: { sessionId: session.id },
         color: session.groupTemplate?.color || ""
       }));
     });
   }

   function renderGroupImportReview(elements, state) {
     elements.subtitle.textContent = t("reviewGroupSubtitle");

     const nameLabel = document.createElement("label");
     nameLabel.className = "session-name-label";

     const nameText = document.createElement("span");
     nameText.textContent = t("sessionNameLabel");

     const nameInput = document.createElement("input");
     nameInput.type = "text";
     nameInput.id = "groupImportNameInput";
     nameInput.value = state.sessionName;
     nameInput.autocomplete = "off";
     nameInput.addEventListener("input", updateGroupImportSummary);

     nameLabel.appendChild(nameText);
     nameLabel.appendChild(nameInput);
     elements.body.appendChild(nameLabel);

     const toolbar = document.createElement("div");
     toolbar.className = "session-tabs-toolbar";
     toolbar.appendChild(createProtectedMenuButton(
       t("selectAll"),
       "select-all-group-review"
     ));
     toolbar.appendChild(createProtectedMenuButton(
       t("clearAll"),
       "clear-group-review"
     ));
     elements.body.appendChild(toolbar);

     const list = document.createElement("div");
     list.className = "group-review-tabs";

     state.reviewTabs.forEach((tab) => {
       const row = document.createElement("label");
       row.className = "session-tab-row group-review-tab";
       row.dataset.tabUrl = tab.url;

       const checkbox = document.createElement("input");
       checkbox.type = "checkbox";
       checkbox.checked = state.selectedKeys.has(tab.key);
       checkbox.dataset.groupReviewKey = tab.key;

       const image = document.createElement("img");
       image.alt = "";
       image.src = tab.favIconUrl || getTabFavicon(tab.url, 16);

       const info = document.createElement("span");
       info.className = "session-tab-info";

       const title = document.createElement("span");
       title.className = "session-tab-title";
       title.textContent = tab.title || tab.url;

       const meta = document.createElement("span");
       meta.className = "session-tab-url";
       meta.textContent = tab.inSession && tab.inGroup
         ? t("groupTabInBoth")
         : tab.inGroup
           ? t("groupTabNew")
           : t("groupTabSessionOnly");

       info.appendChild(title);
       info.appendChild(meta);
       row.appendChild(checkbox);
       row.appendChild(image);
       row.appendChild(info);
       list.appendChild(row);
     });

     elements.body.appendChild(list);
     elements.save.hidden = false;
     updateGroupImportSummary();
   }

   function renderGroupImportModal() {
     const elements = getGroupImportElements();
     const state = groupImportState;

     if (!state || !elements.modal || !elements.body) {
       return;
     }

     elements.title.textContent = t("importGroupTitle");
     elements.body.innerHTML = "";
     elements.summary.textContent = "";
     elements.save.hidden = true;
     elements.back.hidden = state.history.length === 0;

     if (state.step === "groups") {
       renderGroupImportGroupList(elements, state);
     } else if (state.step === "mode") {
       renderGroupImportMode(elements, state);
     } else if (state.step === "sessions") {
       renderGroupImportSessionList(elements, state);
     } else if (state.step === "review") {
       renderGroupImportReview(elements, state);
     }
   }

   async function openGroupImportModal({ sessionId = null } = {}) {
     const elements = getGroupImportElements();

     if (!elements.modal) {
       return;
     }

     const [sessions, liveGroups, currentWindowId] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups(),
       getCollectionTargetWindowId()
     ]);

     groupImportState = {
       step: "groups",
       history: [],
       fixedSessionId: sessionId,
       sessions,
       liveGroups,
       currentWindowId,
       groupId: null,
       sessionId: sessionId,
       sessionName: "",
       reviewTabs: [],
       selectedKeys: new Set()
     };

     groupImportReturnFocus = document.activeElement;
     elements.modal.hidden = false;
     renderGroupImportModal();
     requestAnimationFrame(() => {
       elements.body.querySelector("button")?.focus();
     });
   }

   async function reviewSessionLinkedGroup(sessionId) {
     const [sessions, liveGroups, currentWindowId] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups(),
       getCollectionTargetWindowId()
     ]);
     const session = sessions.find((item) => item.id === sessionId);
     const group = session
       ? findLiveGroupForSession(session, liveGroups)
       : null;

     if (!session || !group) {
       await openGroupImportModal({ sessionId });
       return;
     }

     const elements = getGroupImportElements();
     if (elements.modal.hidden) {
       groupImportReturnFocus = document.activeElement;
     }
     groupImportState = {
       step: "",
       history: [],
       fixedSessionId: sessionId,
       sessions,
       liveGroups,
       currentWindowId,
       groupId: group.chromeGroupId,
       sessionId,
       sessionName: session.name,
       reviewTabs: [],
       selectedKeys: new Set()
     };
     elements.modal.hidden = false;
     prepareGroupReview(session, group);
   }

   function goBackInGroupImport() {
     if (!groupImportState?.history.length) {
       return;
     }

     groupImportState.step = groupImportState.history.pop();
     renderGroupImportModal();
   }

   function trapGroupImportFocus(event) {
     const elements = getGroupImportElements();
     const focusable = Array.from(
       elements.modal?.querySelectorAll(
         'button:not([disabled]):not([hidden]), input:not([disabled])'
       ) || []
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   async function saveGroupImportReview() {
     const state = groupImportState;

     if (!state || state.step !== "review") {
       return;
     }

     updateGroupImportSummary();

     if (!state.sessionName || !state.selectedKeys.size) {
       return;
     }

     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const group = liveGroups.find(
       (item) => item.chromeGroupId === state.groupId
     );

     if (!group) {
       closeGroupImportModal();
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const linkedOwner = getSessionLinkedToGroup(group, sessions, liveGroups);

     if (linkedOwner && linkedOwner.id !== state.sessionId) {
       closeGroupImportModal();
       showToast(t("linkedToSession", { name: linkedOwner.name }));
       return;
     }

     const selectedTabs = state.reviewTabs
       .filter((tab) => state.selectedKeys.has(tab.key))
       .map((tab) => ({
         title: tab.title || tab.url,
         url: tab.url,
         favIconUrl: tab.favIconUrl || ""
       }));
     const now = new Date().toISOString();
     const sessionIndex = state.sessionId
       ? sessions.findIndex((session) => session.id === state.sessionId)
       : -1;
     const existingSession = sessionIndex >= 0
       ? sessions[sessionIndex]
       : null;
     const updatedSession = {
       ...(existingSession || {}),
       id: existingSession?.id || createSessionId(),
       name: state.sessionName,
       tabs: selectedTabs,
       groupTemplate: {
         title: group.title || state.sessionName,
         color: group.color || "grey"
       },
       groupLink: {
         chromeGroupId: group.chromeGroupId,
         lastReviewedSignature: getGroupSignature(group),
         lastReviewedAt: now
       },
       createdAt: existingSession?.createdAt || now,
       updatedAt: now
     };

     if (sessionIndex >= 0) {
       sessions[sessionIndex] = updatedSession;
     } else {
       sessions.push(updatedSession);
     }

     await saveSavedSessions(sessions);
     closeGroupImportModal();
     await renderSavedSessions();
     showToast(t("groupReviewSaved"));
   }

   async function disconnectSessionGroup(sessionId) {
     const sessions = await getSavedSessions();
     const sessionIndex = sessions.findIndex(
       (session) => session.id === sessionId
     );

     if (sessionIndex < 0) {
       return;
     }

     const { groupLink, ...unlinkedSession } = sessions[sessionIndex];
     sessions[sessionIndex] = {
       ...unlinkedSession,
       updatedAt: new Date().toISOString()
     };

     await saveSavedSessions(sessions);
     await renderSavedSessions();
     showToast(t("groupDisconnected"));
   }

   async function deleteSavedSessionDirect(sessionId) {
     const sessions = await getSavedSessions();
     const updatedSessions = sessions.filter(
       (session) => session.id !== sessionId
     );

     if (updatedSessions.length === sessions.length) {
       return;
     }

     await saveSavedSessions(updatedSessions);
     await renderSavedSessions();
     showToast(t("sessionDeleted"));
   }

   async function focusLiveSessionGroup(group) {
     const tab = group?.tabs?.[0];

     if (!tab?.id) {
       return false;
     }

     await chrome.tabs.update(tab.id, { active: true });

     if (Number.isInteger(tab.windowId)) {
       await chrome.windows.update(tab.windowId, { focused: true });
     }

     return true;
   }

   async function connectSessionToLiveGroup(sessionId, group) {
     const sessions = await getSavedSessions();
     const sessionIndex = sessions.findIndex(
       (session) => session.id === sessionId
     );

     if (sessionIndex < 0) {
       return false;
     }

     const now = new Date().toISOString();
     sessions[sessionIndex] = {
       ...sessions[sessionIndex],
       groupTemplate: {
         title: group.title || sessions[sessionIndex].name,
         color: group.color || "grey"
       },
       groupLink: {
         chromeGroupId: group.chromeGroupId,
         lastReviewedSignature: getGroupSignature(group),
         lastReviewedAt: now
       },
       updatedAt: now
     };

     await saveSavedSessions(sessions);
     return true;
   }

   async function openSessionAsGroup(sessionId, { copy = false } = {}) {
     const [sessions, liveGroups] = await Promise.all([
       getSavedSessions(),
       getCurrentChromeGroups()
     ]);
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       showToast(t("collectionDetailUnavailable"));
       return;
     }

     const liveGroup = findLiveGroupForSession(session, liveGroups);

     if (!copy && liveGroup && await focusLiveSessionGroup(liveGroup)) {
       showToast(t("groupFocused"));
       return;
     }

     const result = await createNativeCollectionGroup(session.tabs || [], {
       title: copy
         ? t("groupCopyTitle", {
             name: session.groupTemplate?.title || session.name
           })
         : session.groupTemplate?.title || session.name,
       color: session.groupTemplate?.color || "grey",
       focusAfterOpen: true
     });

     if (!Number.isInteger(result.chromeGroupId)) {
       showCollectionOpenResult(result, { grouped: false });
       return;
     }

     if (!copy) {
       const refreshedGroups = await getCurrentChromeGroups();
       const createdGroup = refreshedGroups.find(
         (group) => group.chromeGroupId === result.chromeGroupId
       );

       if (createdGroup) {
         await connectSessionToLiveGroup(session.id, createdGroup);
       }

       await refreshDashboardCollections();
       showToast(t("groupOpenedLinked", { name: session.name }));
       return;
     }

     await renderDashboard();
     showCollectionOpenResult(result, { grouped: true });
   }

   async function openSavedSession(sessionId) {
     const sessions = await getSavedSessions();
     const session = sessions.find((item) => item.id === sessionId);

     if (!session) {
       return;
     }

     const result = await createCollectionTabs(session.tabs);

     await getLanguage();
     applyStaticTranslations();
     await renderDashboard();
     await renderSavedSessions();
     showCollectionOpenResult(result);
   }

   let sessionEditorState = null;
   let sessionEditorReturnFocus = null;

   function cloneSessionTabs(tabs = []) {
     return tabs.map((tab) => ({
       title: tab.title || tab.url || "",
       url: tab.url || "",
       favIconUrl: tab.favIconUrl || ""
     })).filter((tab) => tab.url);
   }

   function getSessionEditorTabKey(tabOrUrl) {
     const url = typeof tabOrUrl === "string"
       ? tabOrUrl
       : tabOrUrl?.url;
     return normalizeOpenTabUrl(url || "");
   }

   async function getCurrentSessionOpenTabs() {
     await fetchOpenTabs();
     const tabsByUrl = new Map();

     getRealTabs().forEach((tab) => {
       const key = getSessionEditorTabKey(tab);

       if (!key || tabsByUrl.has(key)) {
         return;
       }

       tabsByUrl.set(key, {
         title: getTabDisplayTitle(tab),
         url: tab.url,
         favIconUrl: tab.favIconUrl || getTabFavicon(tab.url, 16)
       });
     });

     return Array.from(tabsByUrl.values());
   }

   function getAvailableSessionEditorTabs() {
     if (!sessionEditorState) {
       return [];
     }

     const includedUrls = new Set(
       sessionEditorState.draftTabs.map(getSessionEditorTabKey)
     );

     return sessionEditorState.openTabs.filter(
       (tab) => !includedUrls.has(getSessionEditorTabKey(tab))
     );
   }

   function createSessionEditorTabRow(tab, action) {
     const row = document.createElement("div");
     row.className = "session-tab-row session-editor-tab-row";
     row.dataset.tabUrl = tab.url;

     const favicon = document.createElement("img");
     favicon.alt = "";
     favicon.src = tab.favIconUrl || getTabFavicon(tab.url, 16);
     favicon.addEventListener("error", () => {
       favicon.hidden = true;
     }, { once: true });

     const info = document.createElement("span");
     info.className = "session-tab-info";

     const title = document.createElement("span");
     title.className = "session-tab-title";
     title.textContent = tab.title || tab.url;

     const url = document.createElement("span");
     url.className = "session-tab-url";
     url.textContent = getTabDomain(tab.url) || tab.url;

     const button = document.createElement("button");
     button.type = "button";
     button.className = `session-tab-action is-${action}`;
     button.dataset.sessionTabAction = action;
     button.dataset.tabUrl = tab.url;
     button.textContent = t(action === "add" ? "addTab" : "removeTab");

     info.appendChild(title);
     info.appendChild(url);
     row.appendChild(favicon);
     row.appendChild(info);
     row.appendChild(button);

     return row;
   }

   function renderSessionEditorList(container, tabs, action, emptyKey) {
     container.innerHTML = "";

     if (!tabs.length) {
       const empty = document.createElement("div");
       empty.className = "session-editor-empty";
       empty.textContent = t(emptyKey);
       container.appendChild(empty);
       return;
     }

     tabs.forEach((tab) => {
       container.appendChild(createSessionEditorTabRow(tab, action));
     });
   }

   function renderSessionEditor() {
     if (!sessionEditorState) {
       return;
     }

     const includedList = document.getElementById("sessionTabsList");
     const availableList = document.getElementById("sessionAvailableTabsList");
     const includedCount = document.getElementById("sessionIncludedCount");
     const availableCount = document.getElementById("sessionAvailableCount");
     const removeAllButton = document.getElementById("removeAllSessionTabsBtn");
     const addAllButton = document.getElementById("addAllSessionTabsBtn");
     const undoButton = document.getElementById("undoSessionEditBtn");
     const availableTabs = getAvailableSessionEditorTabs();

     if (!includedList || !availableList) {
       return;
     }

     renderSessionEditorList(
       includedList,
       sessionEditorState.draftTabs,
       "remove",
       "noIncludedTabs"
     );
     renderSessionEditorList(
       availableList,
       availableTabs,
       "add",
       "noAvailableTabs"
     );

     if (includedCount) {
       includedCount.textContent = String(sessionEditorState.draftTabs.length);
     }

     if (availableCount) {
       availableCount.textContent = String(availableTabs.length);
     }

     if (removeAllButton) {
       removeAllButton.disabled = sessionEditorState.draftTabs.length === 0;
     }

     if (addAllButton) {
       addAllButton.disabled = availableTabs.length === 0;
     }

     if (undoButton) {
       undoButton.disabled = sessionEditorState.history.length === 0;
     }
   }

   function applySessionEditorMutation(mutator) {
     if (!sessionEditorState) {
       return;
     }

     const previousTabs = cloneSessionTabs(sessionEditorState.draftTabs);
     const nextTabs = cloneSessionTabs(mutator(previousTabs) || previousTabs);

     if (JSON.stringify(previousTabs) === JSON.stringify(nextTabs)) {
       return;
     }

     sessionEditorState.history.push(previousTabs);
     sessionEditorState.draftTabs = nextTabs;

     const conflict = document.getElementById("sessionEditorConflict");

     if (conflict) {
       conflict.hidden = true;
       conflict.textContent = "";
     }

     renderSessionEditor();
   }

   function removeTabFromSessionDraft(url) {
     const targetKey = getSessionEditorTabKey(url);

     applySessionEditorMutation((tabs) =>
       tabs.filter((tab) => getSessionEditorTabKey(tab) !== targetKey)
     );
   }

   function addOpenTabToSessionDraft(url) {
     const targetKey = getSessionEditorTabKey(url);
     const tab = sessionEditorState?.openTabs.find(
       (item) => getSessionEditorTabKey(item) === targetKey
     );

     if (!tab) {
       return;
     }

     applySessionEditorMutation((tabs) => [...tabs, tab]);
   }

   function undoSessionEditorMutation() {
     if (!sessionEditorState?.history.length) {
       return;
     }

     sessionEditorState.draftTabs =
       sessionEditorState.history.pop();
     const conflict = document.getElementById("sessionEditorConflict");

     if (conflict) {
       conflict.hidden = true;
       conflict.textContent = "";
     }
     renderSessionEditor();
   }

   function getSessionManualErrorMessage(code) {
     if (code === "invalid_url") {
       return t("collectionManualInvalidUrl");
     }

     if (code === "unsupported_url") {
       return t("collectionManualUnsupportedUrl");
     }

     if (code === "already_added") {
       return t("collectionManualAlreadyAdded");
     }

     return t("collectionManualAddFailed");
   }

   async function addManualTabToSessionDraft() {
     const editorState = sessionEditorState;
     const urlInput = document.getElementById("sessionManualUrlInput");
     const titleInput = document.getElementById("sessionManualTitleInput");
     const error = document.getElementById("sessionManualAddError");
     const submit = document.getElementById("sessionManualAddSubmit");

     if (!editorState || !urlInput || !titleInput || !error || !submit) {
       return;
     }

     if (!urlInput.value.trim()) {
       error.hidden = false;
       error.textContent = t("collectionManualInvalidUrl");
       urlInput.focus();
       return;
     }

     submit.disabled = true;
     error.hidden = true;
     error.textContent = "";

     try {
       const response = await sendCollectionRuntimeMessage({
         type: "tabOut:normalizeManualLink",
         link: {
           url: urlInput.value,
           title: titleInput.value
         }
       });

       if (sessionEditorState !== editorState) {
         return;
       }

       if (!response.ok) {
         error.hidden = false;
         error.textContent = getSessionManualErrorMessage(response.code);
         return;
       }

       const key = getSessionEditorTabKey(response.tab);
       const alreadyIncluded = editorState.draftTabs.some(
         (tab) => getSessionEditorTabKey(tab) === key
       );

       if (alreadyIncluded) {
         error.hidden = false;
         error.textContent = t("collectionManualAlreadyAdded");
         return;
       }

       applySessionEditorMutation((tabs) => [...tabs, response.tab]);
       urlInput.value = "";
       titleInput.value = "";
       urlInput.focus();
     } finally {
       if (!sessionEditorState || sessionEditorState === editorState) {
         submit.disabled = false;
       }
     }
   }

   async function openSessionModal(sessionId = null) {
     const returnFocus = document.activeElement;
     const modal = document.getElementById("sessionModal");
     const title = document.getElementById("sessionModalTitle");
     const nameInput = document.getElementById("sessionNameInput");
     const deleteButton = document.getElementById("deleteSessionBtn");

     if (!modal || !title || !nameInput || !deleteButton) {
       return;
     }

     const [sessions, openTabs] = await Promise.all([
       getSavedSessions(),
       getCurrentSessionOpenTabs()
     ]);
     const existingSession = sessionId
       ? sessions.find((session) => session.id === sessionId)
       : null;
     const draftTabs = existingSession
       ? cloneSessionTabs(existingSession.tabs)
       : cloneSessionTabs(openTabs);

     sessionEditorState = {
       sessionId: existingSession?.id || null,
       baseUpdatedAt: existingSession?.updatedAt || "",
       initialTabs: cloneSessionTabs(draftTabs),
       draftTabs,
       openTabs,
       history: []
     };
     sessionEditorReturnFocus = returnFocus instanceof HTMLElement
       ? returnFocus
       : null;

     title.textContent = existingSession
       ? t("editSessionTitle")
       : t("createSessionTitle");
     nameInput.value = existingSession ? existingSession.name : "";
     deleteButton.hidden = !existingSession;

     document.getElementById("sessionManualAddForm")?.reset();
     const manualSubmit = document.getElementById("sessionManualAddSubmit");

     if (manualSubmit) {
       manualSubmit.disabled = false;
     }

     [
       document.getElementById("sessionManualAddError"),
       document.getElementById("sessionEditorConflict")
     ].forEach((message) => {
       if (message) {
         message.hidden = true;
         message.textContent = "";
       }
     });

     renderSessionEditor();
     modal.hidden = false;
     nameInput.focus();
   }

   function closeSessionModal() {
     const modal = document.getElementById("sessionModal");
     const returnFocus = sessionEditorReturnFocus;

     if (!modal) {
       return;
     }

     sessionEditorState = null;
     sessionEditorReturnFocus = null;
     modal.hidden = true;

     requestAnimationFrame(() => {
       if (returnFocus?.isConnected) {
         returnFocus.focus();
       }
     });
   }

   function trapSessionEditorFocus(event) {
     const modal = document.getElementById("sessionModal");
     const focusable = Array.from(
       modal?.querySelectorAll(
         'button:not([disabled]):not([hidden]), input:not([disabled])'
       ) || []
     ).filter((element) => !element.hidden);

     if (!focusable.length) {
       return;
     }

     const first = focusable[0];
     const last = focusable[focusable.length - 1];

     if (event.shiftKey && document.activeElement === first) {
       event.preventDefault();
       last.focus();
     } else if (!event.shiftKey && document.activeElement === last) {
       event.preventDefault();
       first.focus();
     }
   }

   async function saveSessionFromModal() {
     const editorState = sessionEditorState;
     const nameInput = document.getElementById("sessionNameInput");
     const conflict = document.getElementById("sessionEditorConflict");

     if (!nameInput || !editorState) {
       return;
     }

     const name = nameInput.value.trim();

     if (!name) {
       alert(t("sessionNameRequired"));
       return;
     }

     const sessions = await getSavedSessions();
     const now = new Date().toISOString();

     if (sessionEditorState !== editorState) {
       return;
     }

     if (editorState.sessionId) {
       const index = sessions.findIndex(
         (session) => session.id === editorState.sessionId
       );

       if (index < 0) {
         if (conflict) {
           conflict.hidden = false;
           conflict.textContent = t("collectionDetailUnavailable");
         }
         return;
       }

       if (
         (sessions[index].updatedAt || "") !==
         editorState.baseUpdatedAt
       ) {
         if (conflict) {
           conflict.hidden = false;
           conflict.textContent = t("sessionChangedConflict");
         }
         return;
       }

       sessions[index] = {
         ...sessions[index],
         name,
         tabs: cloneSessionTabs(editorState.draftTabs),
         updatedAt: now
       };
     } else {
       sessions.push({
         id: createSessionId(),
         name,
         tabs: cloneSessionTabs(editorState.draftTabs),
         createdAt: now,
         updatedAt: now
       });
     }

     await saveSavedSessions(sessions);
     await renderSavedSessions();
     closeSessionModal();
     showToast(t("sessionSaved"));
   }

   async function deleteCurrentSession() {
     if (!sessionEditorState?.sessionId) {
       return;
     }

     const confirmed = confirm(t("deleteSessionConfirm"));

     if (!confirmed) {
       return;
     }

     const sessions = await getSavedSessions();
     const updatedSessions = sessions.filter(
       (session) => session.id !== sessionEditorState.sessionId
     );

     await saveSavedSessions(updatedSessions);
     await renderSavedSessions();
     closeSessionModal();
     showToast(t("sessionDeleted"));
   }

   function setupSessionManager() {
     const cancelButton = document.getElementById("cancelSessionBtn");
     const saveButton = document.getElementById("saveSessionBtn");
     const deleteButton = document.getElementById("deleteSessionBtn");
     const undoButton = document.getElementById("undoSessionEditBtn");
     const removeAllButton = document.getElementById("removeAllSessionTabsBtn");
     const addAllButton = document.getElementById("addAllSessionTabsBtn");
     const manualAddForm = document.getElementById("sessionManualAddForm");
     const modal = document.getElementById("sessionModal");
     const groupImportModal = document.getElementById("groupImportModal");

     cancelButton?.addEventListener("click", closeSessionModal);
     saveButton?.addEventListener("click", saveSessionFromModal);
     deleteButton?.addEventListener("click", deleteCurrentSession);
     undoButton?.addEventListener("click", undoSessionEditorMutation);

     removeAllButton?.addEventListener("click", () => {
       applySessionEditorMutation(() => []);
     });

     addAllButton?.addEventListener("click", () => {
       const availableTabs = getAvailableSessionEditorTabs();
       applySessionEditorMutation((tabs) => [...tabs, ...availableTabs]);
     });

     manualAddForm?.addEventListener("submit", (event) => {
       event.preventDefault();
       addManualTabToSessionDraft();
     });

     if (modal) {
       modal.addEventListener("click", (event) => {
         if (event.target === modal) {
           closeSessionModal();
           return;
         }

         const actionButton = event.target.closest(
           "button[data-session-tab-action]"
         );

         if (!actionButton) {
           return;
         }

         if (actionButton.dataset.sessionTabAction === "add") {
           addOpenTabToSessionDraft(actionButton.dataset.tabUrl);
         } else {
           removeTabFromSessionDraft(actionButton.dataset.tabUrl);
         }
       });
     }

     if (groupImportModal) {
       groupImportModal.addEventListener("click", (event) => {
         if (event.target === groupImportModal) {
           closeGroupImportModal();
         }
       });
     }

     renderSavedSessions();
     applyStaticTranslations();
   }

   document.addEventListener("DOMContentLoaded", setupSessionManager);
