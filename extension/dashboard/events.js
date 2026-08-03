'use strict';

/* ----------------------------------------------------------------
   LIVE TAB REFRESH
   Refresh Tab Out when Chrome tabs change.
   ---------------------------------------------------------------- */

let tabRefreshTimer = null;
let savedSessionsRefreshTimer = null;

function scheduleDashboardRefresh() {
  clearTimeout(tabRefreshTimer);

  tabRefreshTimer = setTimeout(async () => {
    if (
      savedSessionRowDragState?.dragging ||
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging ||
      savedLaterDragState?.dragging
    ) {
      scheduleDashboardRefresh();
      return;
    }

    await renderDashboard();
  }, 350);
}

globalThis.TabOutBrowserEvents.subscribe("tab-created", () => {
  scheduleDashboardRefresh();
  scheduleCollectionDetailOpenStateRefresh();
});

function scheduleSavedSessionsRefresh() {
  clearTimeout(savedSessionsRefreshTimer);
  const delay = Math.max(
    120,
    deferCollectionStorageRefreshUntil - Date.now()
  );

  savedSessionsRefreshTimer = setTimeout(async () => {
    if (Date.now() < deferCollectionStorageRefreshUntil) {
      scheduleSavedSessionsRefresh();
      return;
    }

    if (
      savedSessionRowDragState?.dragging ||
      openTabAssignmentDragState?.dragging ||
      savedSessionTabDragState?.dragging ||
      savedLaterDragState?.dragging
    ) {
      scheduleSavedSessionsRefresh();
      return;
    }

    await refreshDashboardCollections();
  }, delay);
}

globalThis.TabOutBrowserEvents.subscribe("storage-changed", (changes, areaName) => {
  if (
    areaName === "local" &&
    (
      changes.savedSessions ||
      changes[SAVED_SESSION_ROWS_STORAGE_KEY]
    )
  ) {
    scheduleSavedSessionsRefresh();
  }

  if (
    areaName === "local" &&
    changes[UNASSIGNED_REMOVAL_HISTORY_KEY]
  ) {
    unassignedRemovalHistory = normalizeUnassignedRemovalHistory(
      changes[UNASSIGNED_REMOVAL_HISTORY_KEY].newValue
    );
    updateUnassignedRemovalUndoControl();
  }
});

globalThis.TabOutBrowserEvents.subscribe("tab-removed", () => {
  scheduleDashboardRefresh();
  scheduleCollectionDetailOpenStateRefresh();
});

globalThis.TabOutBrowserEvents.subscribe("tab-updated", (tabId, changeInfo) => {
  if (
    changeInfo.status === "complete" ||
    changeInfo.url ||
    changeInfo.title
  ) {
    scheduleDashboardRefresh();
    scheduleCollectionDetailOpenStateRefresh();
  }
});

globalThis.TabOutBrowserEvents.subscribe(
  "tab-attached",
  scheduleCollectionDetailOpenStateRefresh
);
globalThis.TabOutBrowserEvents.subscribe(
  "tab-detached",
  scheduleCollectionDetailOpenStateRefresh
);

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
  const savedLaterSource = e.target.closest?.(
    '[data-saved-later-draggable="true"]'
  );

  if (
    savedLaterSource &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !e.target.closest?.("[data-action]") &&
    !savedSessionRowDragState &&
    !openTabAssignmentDragState &&
    !savedSessionDragState &&
    !savedSessionTabDragState &&
    !savedLaterDragState &&
    !provisionalSessionState &&
    !inlineSessionRenameState
  ) {
    savedLaterDragState = {
      sourceElement: savedLaterSource,
      deferredId: savedLaterSource.dataset.deferredId,
      url: savedLaterSource.dataset.deferredUrl,
      title:
        savedLaterSource.dataset.deferredTitle ||
        savedLaterSource.dataset.deferredUrl,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      ghost: null,
      target: null
    };
    return;
  }

  const sessionTabDragHandle = e.target.closest?.(
    '[data-session-tab-drag-handle="true"]'
  );

  if (
    sessionTabDragHandle &&
    isDashboardBehaviorEnabled("dragSessionTabs") &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !savedSessionRowDragState &&
    !openTabAssignmentDragState &&
    !savedSessionDragState &&
    !savedLaterDragState &&
    !provisionalSessionState &&
    !inlineSessionRenameState
  ) {
    const sourceElement = sessionTabDragHandle.closest(
      ".saved-session-inline-tab"
    );

    if (sourceElement) {
      savedSessionTabDragState = {
        handle: sessionTabDragHandle,
        sourceElement,
        sourceSessionId: sourceElement.dataset.sessionId,
        sourceSessionName:
          sessionTabDragHandle.dataset.sessionName || "",
        url: sourceElement.dataset.tabUrl,
        title:
          sourceElement.querySelector(".saved-session-inline-tab-title")
            ?.textContent || sourceElement.dataset.tabUrl,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        ghost: null,
        target: null
      };
      return;
    }
  }

  const openTabSource = e.target.closest?.(
    '[data-open-tab-draggable="true"]'
  );

  if (
    openTabSource &&
    isDashboardBehaviorEnabled("dragUnassignedTabs") &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !savedSessionRowDragState &&
    !savedSessionTabDragState &&
    !savedLaterDragState &&
    !provisionalSessionState &&
    !inlineSessionRenameState &&
    !e.target.closest(".chip-actions")
  ) {
    const tab = getOpenTabFromDragElement(openTabSource);

    if (tab) {
      openTabAssignmentDragState = {
        sourceElement: openTabSource,
        tab,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        ghost: null,
        target: null
      };
      return;
    }
  }

  const sessionRowDragHandle = e.target.closest?.(
    '[data-session-row-drag-handle="true"]'
  );

  if (
    sessionRowDragHandle &&
    isDashboardBehaviorEnabled("reorderSessions") &&
    e.button === 0 &&
    e.isPrimary !== false &&
    !savedSessionRowDragState &&
    !openTabAssignmentDragState &&
    !savedSessionDragState &&
    !savedSessionTabDragState &&
    !savedLaterDragState &&
    !provisionalSessionState &&
    !inlineSessionRenameState &&
    savedSessionsViewMode === "sessions"
  ) {
    const row = sessionRowDragHandle.closest(".saved-session-row");
    const list = row?.closest("#savedSessionsList");

    if (row && list) {
      savedSessionRowDragState = {
        row,
        handle: sessionRowDragHandle,
        list,
        rowId: row.dataset.sessionRowId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: 0,
        offsetY: 0,
        dragging: false,
        initialRows: getSavedSessionDomLayout(list),
        placeholder: null,
        ghost: null
      };
      return;
    }
  }

  const card = e.target.closest('.saved-session-card[data-session-draggable="true"]');

  if (
    !card ||
    !isDashboardBehaviorEnabled("reorderSessions") ||
    savedSessionRowDragState ||
    openTabAssignmentDragState ||
    savedSessionTabDragState ||
    savedLaterDragState ||
    provisionalSessionState ||
    inlineSessionRenameState ||
    savedSessionsViewMode !== "sessions"
  ) {
    return;
  }

  if (
    e.button !== 0 ||
    e.target.closest('.saved-session-edit') ||
    e.target.closest('.saved-session-rename') ||
    e.target.closest('.saved-session-title') ||
    e.target.closest('.session-inline-name-input') ||
    e.target.closest('.saved-session-expand') ||
    e.target.closest('.saved-session-inline-tabs') ||
    e.target.closest('.protected-group-menu')
  ) {
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
    initialRows: getSavedSessionDomLayout(list),
    placeholder: null,
    ghost: null,
    sourceRow: null,
    newRowTarget: null
  };

  // Do not capture the pointer on simple click.
  // Capturing here makes Chrome retarget the following click to the card,
  // so the inner open button no longer receives the click action.
  // Pointer capture is applied only after the drag threshold is crossed.
});

document.addEventListener("pointermove", (e) => {
  const rowState = savedSessionRowDragState;

  if (rowState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - rowState.startX);
    const distanceY = Math.abs(e.clientY - rowState.startY);

    if (!rowState.dragging) {
      if (
        Math.max(distanceX, distanceY) <
        SAVED_SESSION_ROW_DRAG_THRESHOLD
      ) {
        return;
      }

      e.preventDefault();
      startSavedSessionRowPointerDrag(e, rowState);
      return;
    }

    e.preventDefault();
    updateSavedSessionRowPointerDrag(e);
    return;
  }

  const savedLaterState = savedLaterDragState;

  if (savedLaterState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - savedLaterState.startX);
    const distanceY = Math.abs(e.clientY - savedLaterState.startY);

    if (!savedLaterState.dragging) {
      if (
        Math.max(distanceX, distanceY) <
        SAVED_LATER_DRAG_THRESHOLD
      ) {
        return;
      }

      e.preventDefault();
      startSavedLaterPointerDrag(e, savedLaterState);
      return;
    }

    e.preventDefault();
    updateSavedLaterPointerDrag(e);
    return;
  }

  const savedTabState = savedSessionTabDragState;

  if (savedTabState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - savedTabState.startX);
    const distanceY = Math.abs(e.clientY - savedTabState.startY);

    if (!savedTabState.dragging) {
      if (
        Math.max(distanceX, distanceY) <
        SAVED_SESSION_TAB_DRAG_THRESHOLD
      ) {
        return;
      }

      e.preventDefault();
      startSavedSessionTabPointerDrag(e, savedTabState);
      return;
    }

    e.preventDefault();
    updateSavedSessionTabPointerDrag(e);
    return;
  }

  const openTabState = openTabAssignmentDragState;

  if (openTabState?.pointerId === e.pointerId) {
    const distanceX = Math.abs(e.clientX - openTabState.startX);
    const distanceY = Math.abs(e.clientY - openTabState.startY);

    if (!openTabState.dragging) {
      if (Math.max(distanceX, distanceY) < OPEN_TAB_DRAG_THRESHOLD) {
        return;
      }

      e.preventDefault();
      startOpenTabPointerDrag(e, openTabState);
      return;
    }

    e.preventDefault();
    updateOpenTabPointerDrag(e);
    return;
  }

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
  if (savedSessionRowDragState?.pointerId === e.pointerId) {
    await finishSavedSessionRowPointerDrag(e);
    return;
  }

  if (savedLaterDragState?.pointerId === e.pointerId) {
    await finishSavedLaterPointerDrag(e);
    return;
  }

  if (savedSessionTabDragState?.pointerId === e.pointerId) {
    await finishSavedSessionTabPointerDrag(e);
    return;
  }

  if (openTabAssignmentDragState?.pointerId === e.pointerId) {
    await finishOpenTabPointerDrag(e);
    return;
  }

  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("pointercancel", async (e) => {
  if (savedSessionRowDragState?.pointerId === e.pointerId) {
    await finishSavedSessionRowPointerDrag(e, { cancelled: true });
    return;
  }

  if (savedLaterDragState?.pointerId === e.pointerId) {
    await finishSavedLaterPointerDrag(e, { cancelled: true });
    return;
  }

  if (savedSessionTabDragState?.pointerId === e.pointerId) {
    await finishSavedSessionTabPointerDrag(e, { cancelled: true });
    return;
  }

  if (openTabAssignmentDragState?.pointerId === e.pointerId) {
    await finishOpenTabPointerDrag(e, { cancelled: true });
    return;
  }

  if (!savedSessionDragState || savedSessionDragState.pointerId !== e.pointerId) {
    return;
  }

  await finishSavedSessionPointerDrag(e);
});

document.addEventListener("input", (event) => {
  if (event.target?.classList.contains("session-inline-name-input")) {
    if (
      event.target.dataset.sessionNameMode === "provisional" &&
      provisionalSessionState
    ) {
      provisionalSessionState.name = event.target.value;
    } else if (
      event.target.dataset.sessionNameMode === "rename" &&
      inlineSessionRenameState?.sessionId === event.target.dataset.sessionId
    ) {
      inlineSessionRenameState.value = event.target.value;
    }

    return;
  }

  if (event.target?.id !== "openTabsFilterInput") {
    return;
  }

  openTabsFilterQuery = event.target.value || "";
  renderFilteredOpenTabs();
});

document.addEventListener("dragstart", (e) => {
  if (
    e.target.closest?.('[data-open-tab-draggable="true"]') ||
    e.target.closest?.('[data-session-tab-drag-handle="true"]') ||
    e.target.closest?.('[data-saved-later-draggable="true"]')
  ) {
    e.preventDefault();
  }
});

document.addEventListener("focusout", (event) => {
  if (!event.target?.classList.contains("session-inline-name-input")) {
    return;
  }

  if (event.target.dataset.sessionNameMode === "provisional") {
    commitProvisionalSession();
  } else {
    commitInlineSessionRename();
  }
});

document.addEventListener("change", (event) => {
  const groupReviewCheckbox = event.target.closest?.(
    "input[data-group-review-key]"
  );

  if (groupReviewCheckbox && groupImportState?.step === "review") {
    const key = groupReviewCheckbox.dataset.groupReviewKey;

    if (groupReviewCheckbox.checked) {
      groupImportState.selectedKeys.add(key);
    } else {
      groupImportState.selectedKeys.delete(key);
    }

    updateGroupImportSummary();
    return;
  }

  const checkbox = event.target.closest?.("input[data-collection-tab-key]");

  if (!checkbox || !collectionDetailState) {
    return;
  }

  const tabKey = checkbox.dataset.collectionTabKey;

  if (checkbox.checked) {
    collectionDetailState.selectedKeys.add(tabKey);
  } else {
    collectionDetailState.selectedKeys.delete(tabKey);
  }

  updateCollectionDetailSelectionUi();
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target && (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );

  const collectionOverlay = document.getElementById("collectionDetailOverlay");
  const groupImportModal = document.getElementById("groupImportModal");
  const sessionModal = document.getElementById("sessionModal");

  if (target?.matches("[data-session-row-title-input]")) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      void saveSavedSessionRowEditor(
        target.closest("[data-session-row-editor]")
          ?.dataset.sessionRowEditor
      );
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSavedSessionRowEditor();
    }

    return;
  }

  if (event.key === "Escape" && getOpenSavedSessionRowEditor()) {
    event.preventDefault();
    closeSavedSessionRowEditor();
    return;
  }

  if (target?.classList.contains("session-inline-name-input")) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (target.dataset.sessionNameMode === "provisional") {
        commitProvisionalSession();
      } else {
        commitInlineSessionRename();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      if (target.dataset.sessionNameMode === "provisional") {
        cancelProvisionalSession();
      } else {
        cancelInlineSessionRename();
      }
    }

    return;
  }

  if (groupImportModal && !groupImportModal.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeGroupImportModal();
      return;
    }

    if (event.key === "Tab") {
      trapGroupImportFocus(event);
    }

    return;
  }

  if (sessionModal && !sessionModal.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSessionModal();
      return;
    }

    if (
      event.key === "Enter" &&
      !event.isComposing &&
      !event.repeat &&
      target?.id === "sessionNameInput"
    ) {
      event.preventDefault();
      event.stopPropagation();
      void saveSessionFromModal();
      return;
    }

    if (event.key === "Tab") {
      trapSessionEditorFocus(event);
    }

    return;
  }

  if (collectionOverlay && !collectionOverlay.hidden) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCollectionDetail();
      return;
    }

    if (event.key === "Tab") {
      trapCollectionDetailFocus(event);
    }

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
  const savedLaterLink = e.target.closest?.(
    "[data-saved-later-link-id]"
  );

  if (
    savedLaterLink &&
    consumeSuppressedSavedLaterLinkClick(savedLaterLink)
  ) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  if (
    !e.target.closest?.(".saved-session-row-editor") &&
    !e.target.closest?.('[data-action="customize-session-row"]')
  ) {
    closeSavedSessionRowEditor();
  }

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

    if (action === "close-collection-detail") {
      e.preventDefault();
      e.stopPropagation();

      closeCollectionDetail();
      return;
    }

    if (action === "select-all-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      if (!collectionDetailState || collectionDetailState.busy) {
        return;
      }

      collectionDetailState.tabs.forEach((tab) => {
        if (!tab.existingTab) {
          collectionDetailState.selectedKeys.add(tab.key);
        }
      });
      document
        .querySelectorAll("#collectionDetailTabs input[data-collection-tab-key]")
        .forEach((checkbox) => {
          checkbox.checked = checkbox.dataset.alreadyOpen !== "true";
        });
      updateCollectionDetailSelectionUi();
      return;
    }

    if (action === "clear-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      if (!collectionDetailState || collectionDetailState.busy) {
        return;
      }

      collectionDetailState.selectedKeys.clear();
      document
        .querySelectorAll("#collectionDetailTabs input[data-collection-tab-key]")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });
      updateCollectionDetailSelectionUi();
      return;
    }

    if (action === "open-selected-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      await openSelectedCollectionTabs();
      return;
    }

    if (action === "open-all-collection-tabs") {
      e.preventDefault();
      e.stopPropagation();

      await openAllCollectionTabs();
      return;
    }

    if (action === "open-collection-tab-and-switch") {
      e.preventDefault();
      e.stopPropagation();

      await openCollectionTabAndSwitch(actionEl.dataset.tabKey);
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
    if (action === "customize-session-row") {
      e.preventDefault();
      e.stopPropagation();

      if (
        consumeSuppressedSessionRowCustomize(
          actionEl.dataset.sessionRowId
        )
      ) {
        return;
      }

      toggleSavedSessionRowEditor(actionEl.dataset.sessionRowId);
      return;
    }

    if (action === "close-session-row-editor") {
      e.preventDefault();
      e.stopPropagation();
      closeSavedSessionRowEditor();
      return;
    }

    if (action === "select-session-row-color") {
      e.preventDefault();
      e.stopPropagation();
      selectSavedSessionRowEditorColor(
        actionEl.dataset.sessionRowColor
      );
      return;
    }

    if (action === "reset-session-row-editor") {
      e.preventDefault();
      e.stopPropagation();
      resetSavedSessionRowEditor();
      return;
    }

    if (action === "save-session-row-editor") {
      e.preventDefault();
      e.stopPropagation();
      await saveSavedSessionRowEditor(
        actionEl.dataset.sessionRowId
      );
      return;
    }

    if (action === "rename-session-inline") {
      e.preventDefault();
      e.stopPropagation();

      await startInlineSessionRename(
        actionEl.dataset.sessionId,
        actionEl.dataset.sessionName || ""
      );
      return;
    }

    if (action === "create-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      await openSessionModal(null);
      return;
    }

    if (action === "open-group-import") {
      e.preventDefault();
      e.stopPropagation();

      await openGroupImportModal();
      return;
    }

    if (action === "close-group-import") {
      e.preventDefault();
      e.stopPropagation();

      closeGroupImportModal();
      return;
    }

    if (action === "group-import-back") {
      e.preventDefault();
      e.stopPropagation();

      goBackInGroupImport();
      return;
    }

    if (action === "select-group-import") {
      e.preventDefault();
      e.stopPropagation();

      if (!groupImportState) {
        return;
      }

      const group = groupImportState.liveGroups.find(
        (item) => String(item.chromeGroupId) === actionEl.dataset.groupId
      );

      if (!group) {
        return;
      }

      groupImportState.groupId = group.chromeGroupId;

      if (groupImportState.fixedSessionId) {
        const session = groupImportState.sessions.find(
          (item) => item.id === groupImportState.fixedSessionId
        );
        prepareGroupReview(session, group);
      } else {
        setGroupImportStep("mode");
      }
      return;
    }

    if (action === "review-linked-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await reviewSessionLinkedGroup(actionEl.dataset.sessionId);
      return;
    }

    if (action === "create-session-from-group") {
      e.preventDefault();
      e.stopPropagation();

      const group = groupImportState?.liveGroups.find(
        (item) => item.chromeGroupId === groupImportState.groupId
      );

      if (group) {
        prepareGroupReview(null, group);
      }
      return;
    }

    if (action === "choose-session-for-group") {
      e.preventDefault();
      e.stopPropagation();

      setGroupImportStep("sessions");
      return;
    }

    if (action === "select-session-for-group") {
      e.preventDefault();
      e.stopPropagation();

      const session = groupImportState?.sessions.find(
        (item) => item.id === actionEl.dataset.sessionId
      );
      const group = groupImportState?.liveGroups.find(
        (item) => item.chromeGroupId === groupImportState.groupId
      );

      if (session && group) {
        prepareGroupReview(session, group);
      }
      return;
    }

    if (action === "save-group-import") {
      e.preventDefault();
      e.stopPropagation();

      await saveGroupImportReview();
      return;
    }

    if (
      action === "select-all-group-review" ||
      action === "clear-group-review"
    ) {
      e.preventDefault();
      e.stopPropagation();

      if (groupImportState?.step !== "review") {
        return;
      }

      const shouldSelect = action === "select-all-group-review";
      groupImportState.selectedKeys = new Set(
        shouldSelect
          ? groupImportState.reviewTabs.map((tab) => tab.key)
          : []
      );
      document
        .querySelectorAll("#groupImportBody input[data-group-review-key]")
        .forEach((checkbox) => {
          checkbox.checked = shouldSelect;
        });
      updateGroupImportSummary();
      return;
    }

    if (action === "edit-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      await openSessionModal(actionEl.dataset.sessionId);
      return;
    }

    if (action === "open-session-as-group") {
      e.preventDefault();
      e.stopPropagation();

      const sessionId =
        actionEl.dataset.sessionId || collectionDetailState?.id;

      if (sessionId) {
        await openSessionAsGroup(sessionId);
        await reloadCollectionDetailSource();
      }
      return;
    }

    if (action === "open-session-group-copy") {
      e.preventDefault();
      e.stopPropagation();

      await openSessionAsGroup(actionEl.dataset.sessionId, { copy: true });
      return;
    }

    if (action === "review-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await reviewSessionLinkedGroup(actionEl.dataset.sessionId);
      return;
    }

    if (action === "connect-session-group") {
      e.preventDefault();
      e.stopPropagation();

      await openGroupImportModal({
        sessionId: actionEl.dataset.sessionId
      });
      return;
    }

    if (action === "disconnect-session-group") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("disconnectGroupConfirm"))) {
        await disconnectSessionGroup(actionEl.dataset.sessionId);
      }
      return;
    }

    if (action === "delete-saved-session-direct") {
      e.preventDefault();
      e.stopPropagation();

      if (confirm(t("deleteSessionConfirm"))) {
        await deleteSavedSessionDirect(actionEl.dataset.sessionId);
      }
      return;
    }

    if (action === "toggle-session-inline-tabs") {
      e.preventDefault();
      e.stopPropagation();
      await toggleSessionInlineTabs(actionEl.dataset.sessionId);
      return;
    }

    if (action === "open-session-inline-tab") {
      e.preventDefault();
      e.stopPropagation();
      await openSessionInlineTab(actionEl.dataset.tabUrl);
      return;
    }

    if (action === "view-saved-session") {
      e.preventDefault();
      e.stopPropagation();

      if (Date.now() < suppressSavedSessionOpenUntil) {
        return;
      }

      await showSavedSessionDetail(actionEl.dataset.sessionId, actionEl);
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

    if (action === "view-protected-group") {
      e.preventDefault();
      e.stopPropagation();

      await showProtectedGroupDetail(actionEl.dataset.snapshotId, actionEl);
      return;
    }

    if (action === "view-live-chrome-group") {
      e.preventDefault();
      e.stopPropagation();

      await showLiveChromeGroupDetail(actionEl.dataset.groupId, actionEl);
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

  if (action === "undo-unassigned-removal") {
    e.preventDefault();
    e.stopPropagation();

    if (unassignedRemovalUndoBusy) {
      return;
    }

    unassignedRemovalUndoBusy = true;
    updateUnassignedRemovalUndoControl();

    try {
      const result = await restoreLatestUnassignedRemoval();
      await renderDashboard();

      if (result.empty) {
        showToast(t("unassignedUndoRemovalEmpty"));
      } else if (result.failed > 0 && result.restored > 0) {
        showToast(t("unassignedRemovalRestorePartial", {
          restored: result.restored,
          failed: result.failed
        }));
      } else if (result.failed > 0) {
        showToast(t("unassignedRemovalRestoreFailed"));
      } else if (result.restored > 0) {
        showToast(t("unassignedRemovalRestored", {
          count: result.restored
        }));
      } else {
        showToast(t("unassignedRemovalAlreadyRestored"));
      }
    } catch (error) {
      console.warn(
        "[tab-out] Failed to undo unassigned tab removal:",
        error
      );
      showToast(t("unassignedRemovalRestoreFailed"));
    } finally {
      unassignedRemovalUndoBusy = false;
      updateUnassignedRemovalUndoControl();
    }

    return;
  }

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
    if (consumeSuppressedOpenTabFocusClick(actionEl)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const tabUrl = actionEl.dataset.tabUrl;
    if (tabUrl) await focusTab(tabUrl);
    return;
  }

  // ---- Close a single tab ----
  if (action === 'close-single-tab') {
    e.stopPropagation(); // don't trigger parent chip's focus-tab
    const chip = actionEl.closest('.page-chip');
    const tabId = Number.parseInt(chip?.dataset.tabId, 10);

    if (!Number.isInteger(tabId)) {
      return;
    }

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        [tabId],
        "single"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close an unassigned tab:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();

    // Animate the chip row out
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
    const allTabs = await queryTabsWithMetadata({});
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

  if (action === 'restore-archived-tab') {
    e.preventDefault();
    e.stopPropagation();
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    try {
      const restored = await restoreArchivedSavedTab(id);
      if (!restored) return;

      await renderDeferredColumn();
      showToast(t("archivedTabRestored"));
    } catch (error) {
      console.warn('[tab-out] Failed to restore archived tab:', error);
      showToast(t("archivedTabActionFailed"));
    }
    return;
  }

  if (action === 'delete-archived-tab') {
    e.preventDefault();
    e.stopPropagation();
    const id = actionEl.dataset.deferredId;
    if (!id) return;

    try {
      const deletion = await deleteArchivedSavedTab(id);
      if (!deletion) return;

      await renderDeferredColumn();
      showToast(t("archivedTabDeleted"), {
        actionLabel: t("undoDelete"),
        duration: 5000,
        onAction: async () => {
          try {
            const reinserted = await reinsertArchivedSavedTab(
              deletion.item,
              deletion.index
            );

            if (!reinserted) {
              return;
            }

            await renderDeferredColumn();
            showToast(t("archivedTabDeleteUndone"));
          } catch (error) {
            console.warn('[tab-out] Failed to undo archived tab deletion:', error);
            showToast(t("archivedTabActionFailed"));
          }
        }
      });
    } catch (error) {
      console.warn('[tab-out] Failed to delete archived tab:', error);
      showToast(t("archivedTabActionFailed"));
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

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        group.tabs.map((tab) => tab.id),
        "domain"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close an unassigned domain:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    const closedCount = removal.closedTabs.length;
    const fullyClosed = closedCount === group.tabs.length;

    if (card && fullyClosed) {
      playCloseSound();
      animateCardOut(card);
    } else {
      playCloseSound();
      scheduleDashboardRefresh();
    }

    if (fullyClosed) {
      const idx = domainGroups.indexOf(group);
      if (idx !== -1) domainGroups.splice(idx, 1);
    }

    const groupLabel = group.domain === '__landing-pages__' ? t('homepages') : (group.label || friendlyDomain(group.domain));
    showToast(t(closedCount === 1 ? "closedTabsFrom" : "closedTabsFromPlural", { count: closedCount, name: groupLabel }));

    const statTabs = document.getElementById('statTabs');
    if (statTabs) statTabs.textContent = openTabs.length;
    return;
  }

  // ---- Close duplicates, keep one copy ----
  if (action === 'dedup-keep-one') {
    const urlsEncoded = actionEl.dataset.dupeUrls || '';
    const urls = urlsEncoded.split(',').map(u => decodeURIComponent(u)).filter(Boolean);
    if (urls.length === 0) return;

    const tabsToClose = [];

    urls.forEach((url) => {
      const matchingTabs = unassignedOpenTabs.filter(
        (tab) => tab.url === url
      );
      const keep = matchingTabs.find((tab) => tab.active) ||
        matchingTabs[0];

      matchingTabs.forEach((tab) => {
        if (tab.id !== keep?.id) {
          tabsToClose.push(tab.id);
        }
      });
    });

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        tabsToClose,
        "duplicates"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close unassigned duplicates:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();
    const fullyDeduplicated =
      removal.closedTabs.length === tabsToClose.length;

    if (!fullyDeduplicated) {
      scheduleDashboardRefresh();
      showToast(t("unassignedDuplicatesClosedPartial"));
      return;
    }

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

    showToast(t("unassignedDuplicatesClosed"));
    return;
  }

  // ---- Close ALL open tabs ----
  if (action === 'close-all-open-tabs') {
    const allTabIds = unassignedOpenTabs
      .map((tab) => tab.id)
      .filter(Number.isInteger);

    if (!allTabIds.length) {
      return;
    }

    let removal;

    try {
      removal = await closeUnassignedTabsWithUndo(
        allTabIds,
        "all"
      );
    } catch (error) {
      console.warn(
        "[tab-out] Failed to close all unassigned tabs:",
        error
      );
      showToast(t("unassignedRemovalCloseFailed"));
      return;
    }

    if (!removal) {
      return;
    }

    playCloseSound();
    const fullyClosed =
      removal.closedTabs.length === allTabIds.length;

    if (fullyClosed) {
      document.querySelectorAll('#openTabsMissions .mission-card').forEach(c => {
        shootConfetti(
          c.getBoundingClientRect().left + c.offsetWidth / 2,
          c.getBoundingClientRect().top  + c.offsetHeight / 2
        );
        animateCardOut(c);
      });
    } else {
      scheduleDashboardRefresh();
    }

    showToast(t(
      fullyClosed
        ? "unassignedTabsClosed"
        : "unassignedTabsClosedPartial",
      { count: removal.closedTabs.length }
    ));
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

  try {
    const { archived } = await getSavedTabs();
    renderArchiveItems(archived);
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
