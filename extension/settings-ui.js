(function setupTabOutDashboardSettings() {
  const settingsApi = globalThis.TabOutDashboardSettings;

  if (!settingsApi) {
    return;
  }

  const MODULE_LABEL_KEYS = {
    greeting: "moduleGreeting",
    time: "moduleTime",
    date: "moduleDate",
    weather: "moduleWeather",
    shortcuts: "moduleShortcuts",
    language: "moduleLanguage",
    sessions: "moduleSessions",
    unassigned: "moduleUnassigned",
    savedLater: "moduleSavedLater",
    stats: "moduleStats"
  };

  const MODULE_NODE_IDS = {
    greeting: "greeting",
    time: "timeDisplay",
    date: "dateDisplay",
    weather: "weatherWidget",
    shortcuts: null,
    language: "languageToggleBtn",
    sessions: "savedSessionsSection",
    unassigned: "openTabsSection",
    savedLater: "deferredColumn",
    stats: "footerStats"
  };

  const KEYBOARD_LABEL_KEYS = {
    openSettings: "keyboardOpenSettings",
    searchUnassigned: "keyboardSearchUnassigned",
    focusShortcuts: "keyboardFocusShortcuts",
    focusSessions: "keyboardFocusSessions",
    focusUnassigned: "keyboardFocusUnassigned",
    focusSavedLater: "keyboardFocusSavedLater",
    createSession: "keyboardCreateSession",
    addShortcut: "keyboardAddShortcut"
  };

  const POPUP_COMMAND_NAME = "_execute_action";

  const PRESET_META = {
    original: {
      label: "presetOriginal",
      hint: "presetOriginalHint"
    },
    focus: {
      label: "presetFocus",
      hint: "presetFocusHint"
    },
    compact: {
      label: "presetCompact",
      hint: "presetCompactHint"
    }
  };

  const VIEW_META = {
    shortcuts: {
      options: [
        ["tiles", "styleTiles"],
        ["compact", "styleCompact"]
      ]
    },
    sessions: {
      options: [
        ["cards", "styleCards"],
        ["list", "styleList"]
      ]
    },
    unassigned: {
      options: [
        ["domainGrid", "styleDomainGrid"],
        ["compactList", "styleCompactList"]
      ]
    },
    savedLater: {
      options: [
        ["panel", "stylePanel"],
        ["list", "styleList"]
      ]
    }
  };

  const MODULE_ACTION_MAP = {
    focusShortcuts: "shortcuts",
    focusSessions: "sessions",
    focusUnassigned: "unassigned",
    focusSavedLater: "savedLater"
  };

  const moduleWrappers = new Map();
  const moduleAnchors = new Map();
  let runtimeHeaderGrid = null;
  let runtimeContentGrid = null;
  let persistedSettings = settingsApi.getDefaultSettings();
  let persistedLanguage = "fr";
  let settingsDraft = null;
  let settingsDraftLanguage = "fr";
  let settingsReturnFocus = null;
  let recordingKeyboardAction = null;
  let savingSettings = false;
  let writingMigration = false;
  let activePreviewMode = "desktop";
  let layoutDragState = null;
  let layoutResizeState = null;
  let popupCommandShortcut = "";
  let readyResolve;

  const settingsReady = new Promise((resolve) => {
    readyResolve = resolve;
  });

  function clone(value) {
    return settingsApi.clone(value);
  }

  function isDrawerOpen() {
    const overlay = document.getElementById("settingsDrawerOverlay");
    return Boolean(overlay && !overlay.hidden);
  }

  function getEffectiveSettings() {
    return settingsApi.normalizeSettings(settingsDraft || persistedSettings);
  }

  function isModuleVisible(moduleId) {
    return getEffectiveSettings().layout.visibility[moduleId] !== false;
  }

  function getModuleNode(moduleId) {
    if (moduleId === "shortcuts") {
      return document.querySelector(".dashboard-header .quick-links");
    }

    return document.getElementById(MODULE_NODE_IDS[moduleId]);
  }

  function createModuleWrapper(moduleId, node) {
    if (!node) {
      return null;
    }

    const existing = node.closest(`[data-dashboard-module="${moduleId}"]`);

    if (existing) {
      moduleWrappers.set(moduleId, existing);
      return existing;
    }

    const parent = node.parentNode;
    const marker = document.createComment(`tab-out-module-${moduleId}`);
    const wrapper = document.createElement("div");
    wrapper.className = `dashboard-module dashboard-module-${moduleId}`;
    wrapper.dataset.dashboardModule = moduleId;
    wrapper.tabIndex = -1;
    parent.insertBefore(marker, node);
    parent.insertBefore(wrapper, node);
    wrapper.appendChild(node);
    moduleAnchors.set(moduleId, { parent, marker });
    moduleWrappers.set(moduleId, wrapper);
    return wrapper;
  }

  function ensureDashboardModuleStructure() {
    settingsApi.MODULE_IDS.forEach((moduleId) => {
      createModuleWrapper(moduleId, getModuleNode(moduleId));
    });

    const header = document.querySelector(".dashboard-header");
    const container = document.querySelector(".container");
    const dashboardColumns = document.getElementById("dashboardColumns");

    runtimeHeaderGrid = document.getElementById("dashboardRuntimeHeaderGrid");

    if (!runtimeHeaderGrid && header) {
      runtimeHeaderGrid = document.createElement("div");
      runtimeHeaderGrid.id = "dashboardRuntimeHeaderGrid";
      runtimeHeaderGrid.className = "dashboard-runtime-grid dashboard-runtime-header-grid";
      runtimeHeaderGrid.hidden = true;
      header.appendChild(runtimeHeaderGrid);
    }

    runtimeContentGrid = document.getElementById("dashboardRuntimeContentGrid");

    if (!runtimeContentGrid && container && dashboardColumns) {
      runtimeContentGrid = document.createElement("div");
      runtimeContentGrid.id = "dashboardRuntimeContentGrid";
      runtimeContentGrid.className = "dashboard-runtime-grid dashboard-runtime-content-grid";
      runtimeContentGrid.hidden = true;
      container.insertBefore(runtimeContentGrid, dashboardColumns);
    }
  }

  function restoreOriginalAnchors() {
    settingsApi.MODULE_IDS.forEach((moduleId) => {
      const wrapper = moduleWrappers.get(moduleId);
      const anchor = moduleAnchors.get(moduleId);

      if (wrapper && anchor?.marker?.parentNode === anchor.parent) {
        anchor.parent.insertBefore(wrapper, anchor.marker.nextSibling);
      }
    });

    runtimeHeaderGrid?.replaceChildren();
    runtimeContentGrid?.replaceChildren();
  }

  function createRuntimeStack(placement) {
    const stack = document.createElement("div");
    stack.className = "dashboard-runtime-stack";
    stack.style.gridColumn = `${placement.column + 1} / span ${placement.columnSpan}`;
    stack.style.gridRowStart = String(placement.row + 1);
    return stack;
  }

  function getAdaptiveRuntimePlacements(settings, region) {
    const moduleIds = settingsApi.MODULE_IDS
      .filter((moduleId) => {
        const placement = settings.layout.placements[moduleId];
        return (
          settings.layout.visibility[moduleId] !== false &&
          placement.region === region
        );
      })
      .sort((firstId, secondId) => {
        const first = settings.layout.placements[firstId];
        const second = settings.layout.placements[secondId];
        return (
          first.row - second.row ||
          first.column - second.column ||
          first.order - second.order ||
          settingsApi.MODULE_IDS.indexOf(firstId) -
            settingsApi.MODULE_IDS.indexOf(secondId)
        );
      });

    if (window.innerWidth <= 720) {
      return Object.fromEntries(
        moduleIds.map((moduleId, index) => [
          moduleId,
          {
            ...settings.layout.placements[moduleId],
            column: 0,
            row: index,
            columnSpan: 1,
            order: 0
          }
        ])
      );
    }

    if (window.innerWidth <= 1100) {
      const placements = {};

      moduleIds.forEach((moduleId) => {
        const source = settings.layout.placements[moduleId];
        const placement = {
          ...source,
          column: Math.min(5, Math.floor(source.column / 2)),
          columnSpan: Math.min(6, Math.max(1, Math.ceil(source.columnSpan / 2)))
        };
        placement.column = Math.min(
          placement.column,
          6 - placement.columnSpan
        );

        while (
          Object.values(placements).some((candidate) =>
            candidate.row === placement.row &&
            candidate.column < placement.column + placement.columnSpan &&
            placement.column < candidate.column + candidate.columnSpan &&
            !(
              candidate.column === placement.column &&
              candidate.columnSpan === placement.columnSpan
            )
          )
        ) {
          placement.row += 1;
        }

        placements[moduleId] = placement;
      });

      return placements;
    }

    return Object.fromEntries(
      moduleIds.map((moduleId) => [
        moduleId,
        settings.layout.placements[moduleId]
      ])
    );
  }

  function renderGridLayout(settings) {
    restoreOriginalAnchors();
    runtimeHeaderGrid.hidden = false;
    runtimeContentGrid.hidden = false;
    const groupedPlacements = new Map();
    const adaptivePlacements = {
      header: getAdaptiveRuntimePlacements(settings, "header"),
      content: getAdaptiveRuntimePlacements(settings, "content")
    };
    const runtimeColumns =
      window.innerWidth <= 720 ? 1 : window.innerWidth <= 1100 ? 6 : 12;
    runtimeHeaderGrid.style.setProperty(
      "--dashboard-grid-columns",
      runtimeColumns
    );
    runtimeContentGrid.style.setProperty(
      "--dashboard-grid-columns",
      runtimeColumns
    );

    settingsApi.MODULE_IDS.forEach((moduleId) => {
      const sourcePlacement = settings.layout.placements[moduleId];

      if (
        settings.layout.visibility[moduleId] === false ||
        sourcePlacement.region === "floating"
      ) {
        return;
      }

      const placement = adaptivePlacements[sourcePlacement.region][moduleId];
      const key = [
        placement.region,
        placement.row,
        placement.column,
        placement.columnSpan
      ].join(":");

      if (!groupedPlacements.has(key)) {
        groupedPlacements.set(key, {
          placement,
          modules: []
        });
      }

      groupedPlacements.get(key).modules.push(moduleId);
    });

    Array.from(groupedPlacements.values())
      .sort((first, second) =>
        first.placement.row - second.placement.row ||
        first.placement.column - second.placement.column
      )
      .forEach(({ placement, modules }) => {
        const stack = createRuntimeStack(placement);
        const grid =
          placement.region === "header"
            ? runtimeHeaderGrid
            : runtimeContentGrid;

        modules
          .sort((firstId, secondId) =>
            adaptivePlacements[placement.region][firstId].order -
              adaptivePlacements[placement.region][secondId].order ||
            settingsApi.MODULE_IDS.indexOf(firstId) -
              settingsApi.MODULE_IDS.indexOf(secondId)
          )
          .forEach((moduleId) => {
            const wrapper = moduleWrappers.get(moduleId);

            if (wrapper) {
              stack.appendChild(wrapper);
            }
          });

        grid?.appendChild(stack);
      });

    document
      .querySelector(".dashboard-header")
      ?.classList.toggle(
        "is-custom-grid-empty",
        runtimeHeaderGrid.childElementCount === 0
      );
    runtimeContentGrid.classList.toggle(
      "is-custom-grid-empty",
      runtimeContentGrid.childElementCount === 0
    );
  }

  function renderOriginalLayout() {
    restoreOriginalAnchors();
    document
      .querySelector(".dashboard-header")
      ?.classList.remove("is-custom-grid-empty");
    runtimeContentGrid?.classList.remove("is-custom-grid-empty");

    if (runtimeHeaderGrid) {
      runtimeHeaderGrid.hidden = true;
    }

    if (runtimeContentGrid) {
      runtimeContentGrid.hidden = true;
    }
  }

  async function syncWeatherModule(visible) {
    if (!visible) {
      if (typeof stopWeatherAutoRefresh === "function") {
        stopWeatherAutoRefresh();
      }
      return;
    }

    if (typeof loadWeather !== "function") {
      return;
    }

    const enabled = await loadWeather({ force: false });

    if (enabled && typeof startWeatherAutoRefresh === "function") {
      startWeatherAutoRefresh();
    } else if (typeof stopWeatherAutoRefresh === "function") {
      stopWeatherAutoRefresh();
    }
  }

  function applyDashboardSettings(value, { syncWeather = true } = {}) {
    const settings = settingsApi.normalizeSettings(value);
    const layoutMode = settings.layout.mode;
    const languagePlacement = settings.layout.placements.language;
    const compactDensity =
      settings.views.shortcuts === "compact" &&
      settings.views.sessions === "list";

    document.documentElement.dataset.dashboardLayoutMode = layoutMode;
    document.documentElement.dataset.dashboardDensity =
      compactDensity ? "compact" : "standard";
    document.documentElement.dataset.languageDock =
      languagePlacement.region === "floating"
        ? languagePlacement.dock
        : "inline";
    document.documentElement.dataset.languageVisible = String(
      settings.layout.visibility.language !== false
    );
    document.documentElement.dataset.statsVisible = String(
      settings.layout.visibility.stats !== false
    );
    document.documentElement.dataset.unassignedTabDragEnabled = String(
      settings.behavior.dragUnassignedTabs !== false
    );
    document.documentElement.dataset.sessionReorderEnabled = String(
      settings.behavior.reorderSessions !== false
    );

    if (layoutMode === "original") {
      renderOriginalLayout();
    } else {
      renderGridLayout(settings);
    }

    settingsApi.MODULE_IDS.forEach((moduleId) => {
      const wrapper = moduleWrappers.get(moduleId);

      if (wrapper) {
        wrapper.hidden = settings.layout.visibility[moduleId] === false;
      }
    });

    document.documentElement.dataset.shortcutsView = settings.views.shortcuts;
    document.documentElement.dataset.sessionsView = settings.views.sessions;
    document.documentElement.dataset.unassignedView = settings.views.unassigned;
    document.documentElement.dataset.savedLaterView = settings.views.savedLater;

    if (
      typeof updateTimeDisplay === "function" &&
      settings.layout.visibility.time
    ) {
      updateTimeDisplay();
    }

    const dateElement = document.getElementById("dateDisplay");

    if (
      dateElement &&
      settings.layout.visibility.date &&
      typeof getDateDisplay === "function"
    ) {
      dateElement.textContent = getDateDisplay();
    }

    if (typeof syncDashboardClockVisibility === "function") {
      syncDashboardClockVisibility();
    }

    if (syncWeather) {
      syncWeatherModule(settings.layout.visibility.weather);
    }

    return settings;
  }

  function getPrimaryKeyLabel() {
    const platform = navigator.userAgentData?.platform || navigator.platform || "";
    return /mac/i.test(platform) ? "⌘" : "Ctrl";
  }

  function getModuleLabel(moduleId) {
    return t(MODULE_LABEL_KEYS[moduleId] || moduleId);
  }

  function getKeyboardActionLabel(actionId) {
    return t(KEYBOARD_LABEL_KEYS[actionId] || actionId);
  }

  async function refreshPopupCommandShortcut({ render = false } = {}) {
    try {
      const commands = await chrome.commands.getAll();
      popupCommandShortcut =
        commands.find((command) => command.name === POPUP_COMMAND_NAME)
          ?.shortcut || "";
    } catch {
      popupCommandShortcut = "";
    }

    if (render && settingsDraft) {
      renderKeyboardList();
    }
  }

  async function openBrowserShortcutManager() {
    let shortcutUrl = "chrome://extensions/shortcuts";

    try {
      if (await navigator.brave?.isBrave?.()) {
        shortcutUrl = "brave://extensions/shortcuts";
      }
    } catch {}

    try {
      await chrome.tabs.create({ url: shortcutUrl });
    } catch {
      try {
        await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      } catch {
        setSettingsStatus(t("keyboardManagerOpenFailed"), "error");
      }
    }
  }

  function setSettingsStatus(message = "", kind = "") {
    const status = document.getElementById("settingsStatus");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.kind = kind;
  }

  function isDraftDirty() {
    if (!settingsDraft) {
      return false;
    }

    return (
      JSON.stringify(settingsApi.normalizeSettings(settingsDraft)) !==
        JSON.stringify(settingsApi.normalizeSettings(persistedSettings)) ||
      settingsDraftLanguage !== persistedLanguage
    );
  }

  function updateDraftStatus() {
    const dirty = isDraftDirty();
    setSettingsStatus(dirty ? t("settingsUnsaved") : "", dirty ? "pending" : "");
  }

  function getPlacementDescription(moduleId) {
    const placement = settingsDraft.layout.placements[moduleId];

    if (placement.region === "floating") {
      return t("placementFloating", {
        position: t(
          `dock${placement.dock
            .split("-")
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join("")}`
        )
      });
    }

    return t("placementGrid", {
      region: t(
        placement.region === "header"
          ? "settingsHeaderModules"
          : "settingsContentModules"
      ),
      column: placement.column + 1,
      width: placement.columnSpan
    });
  }

  function createViewSelect(moduleId) {
    const viewMeta = VIEW_META[moduleId];

    if (!viewMeta) {
      return null;
    }

    const select = document.createElement("select");
    select.className = "settings-module-view-select";
    select.dataset.settingsView = moduleId;
    select.setAttribute(
      "aria-label",
      `${t("moduleView")} ${getModuleLabel(moduleId)}`
    );

    viewMeta.options.forEach(([value, labelKey]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = t(labelKey);
      option.selected = settingsDraft.views[moduleId] === value;
      select.appendChild(option);
    });

    return select;
  }

  function createVisibilitySwitch(moduleId) {
    const label = document.createElement("label");
    label.className = "settings-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = settingsDraft.layout.visibility[moduleId] !== false;
    input.dataset.settingsVisibility = moduleId;
    const track = document.createElement("span");
    track.className = "settings-switch-track";
    const text = document.createElement("span");
    text.className = "sr-only";
    text.textContent = `${t("moduleVisible")} ${getModuleLabel(moduleId)}`;
    label.append(input, track, text);
    return label;
  }

  function createLayoutControlButton(action, moduleId, value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "settings-layout-control-btn";
    button.dataset.action = action;
    button.dataset.moduleId = moduleId;

    if (action === "nudge-layout-module") {
      button.dataset.direction = value;
    } else {
      button.dataset.delta = String(value);
    }

    button.title = label;
    button.setAttribute("aria-label", `${label} ${getModuleLabel(moduleId)}`);
    button.textContent =
      value === "left"
        ? "←"
        : value === "right"
          ? "→"
          : value === "up"
            ? "↑"
            : value === "down"
              ? "↓"
              : value < 0
                ? "−"
                : "+";
    return button;
  }

  function createModulePaletteCard(moduleId) {
    const placement = settingsDraft.layout.placements[moduleId];
    const card = document.createElement("article");
    card.className = "settings-module-card";
    card.dataset.settingsModule = moduleId;
    card.classList.toggle(
      "is-hidden",
      settingsDraft.layout.visibility[moduleId] === false
    );

    const dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "settings-module-card-drag";
    dragHandle.dataset.layoutDragHandle = "true";
    dragHandle.setAttribute(
      "aria-label",
      `${t("settingsDragModule")} ${getModuleLabel(moduleId)}`
    );
    dragHandle.innerHTML = "<span></span><span></span><span></span>";

    const main = document.createElement("div");
    main.className = "settings-module-card-main";
    const heading = document.createElement("div");
    heading.className = "settings-module-card-heading";
    const name = document.createElement("strong");
    name.textContent = getModuleLabel(moduleId);
    heading.append(name, createVisibilitySwitch(moduleId));

    const placementText = document.createElement("span");
    placementText.className = "settings-module-placement";
    placementText.textContent = getPlacementDescription(moduleId);
    main.append(heading, placementText);

    const controls = document.createElement("div");
    controls.className = "settings-module-card-controls";
    const viewSelect = createViewSelect(moduleId);

    if (viewSelect) {
      controls.appendChild(viewSelect);
    }

    if (placement.region !== "floating") {
      controls.append(
        createLayoutControlButton(
          "nudge-layout-module",
          moduleId,
          "left",
          t("moveLeft")
        ),
        createLayoutControlButton(
          "nudge-layout-module",
          moduleId,
          "right",
          t("moveRight")
        ),
        createLayoutControlButton(
          "nudge-layout-module",
          moduleId,
          "up",
          t("moveUp")
        ),
        createLayoutControlButton(
          "nudge-layout-module",
          moduleId,
          "down",
          t("moveDown")
        ),
        createLayoutControlButton(
          "resize-layout-module",
          moduleId,
          -1,
          t("makeNarrower")
        ),
        createLayoutControlButton(
          "resize-layout-module",
          moduleId,
          1,
          t("makeWider")
        )
      );
    }

    card.append(dragHandle, main, controls);
    return card;
  }

  function renderModulePalette() {
    const visibleContainer = document.getElementById("settingsModulePalette");
    const hiddenContainer = document.getElementById("settingsHiddenModules");

    if (!visibleContainer || !hiddenContainer || !settingsDraft) {
      return;
    }

    visibleContainer.replaceChildren();
    hiddenContainer.replaceChildren();

    settingsApi.MODULE_IDS.forEach((moduleId) => {
      const card = createModulePaletteCard(moduleId);
      const visible = settingsDraft.layout.visibility[moduleId] !== false;
      (visible ? visibleContainer : hiddenContainer).appendChild(card);
    });

    hiddenContainer.classList.toggle(
      "is-empty",
      hiddenContainer.childElementCount === 0
    );

    if (!hiddenContainer.childElementCount) {
      const empty = document.createElement("span");
      empty.className = "settings-hidden-empty";
      empty.textContent = t("settingsNothingHidden");
      hiddenContainer.appendChild(empty);
    }
  }

  function renderPresetList() {
    const container = document.getElementById("settingsPresetList");

    if (!container || !settingsDraft) {
      return;
    }

    container.replaceChildren();

    Object.entries(PRESET_META).forEach(([presetId, meta]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "settings-preset-card";
      button.dataset.action = "apply-dashboard-preset";
      button.dataset.presetId = presetId;
      button.classList.toggle("is-active", settingsDraft.preset === presetId);
      const name = document.createElement("strong");
      name.textContent = t(meta.label);
      const hint = document.createElement("span");
      hint.textContent = t(meta.hint);
      button.append(name, hint);
      container.appendChild(button);
    });

    if (settingsDraft.preset === "custom") {
      const customIndicator = document.createElement("div");
      customIndicator.className = "settings-custom-preset";
      customIndicator.textContent = t("presetCustom");
      container.appendChild(customIndicator);
    }
  }

  function getPreviewColumns() {
    return activePreviewMode === "desktop"
      ? 12
      : activePreviewMode === "tablet"
        ? 6
        : 1;
  }

  function getPreviewPlacements(region) {
    const visibleModules = settingsApi.MODULE_IDS
      .filter((moduleId) => {
        const placement = settingsDraft.layout.placements[moduleId];
        return (
          settingsDraft.layout.visibility[moduleId] !== false &&
          placement.region === region
        );
      })
      .sort((firstId, secondId) => {
        const first = settingsDraft.layout.placements[firstId];
        const second = settingsDraft.layout.placements[secondId];
        return (
          first.row - second.row ||
          first.column - second.column ||
          first.order - second.order ||
          settingsApi.MODULE_IDS.indexOf(firstId) -
            settingsApi.MODULE_IDS.indexOf(secondId)
        );
      });

    if (activePreviewMode === "mobile") {
      return Object.fromEntries(
        visibleModules.map((moduleId, index) => [
          moduleId,
          {
            ...settingsDraft.layout.placements[moduleId],
            column: 0,
            row: index,
            columnSpan: 1,
            order: 0
          }
        ])
      );
    }

    if (activePreviewMode === "tablet") {
      const placements = {};

      visibleModules.forEach((moduleId) => {
        const source = settingsDraft.layout.placements[moduleId];
        const placement = {
          ...source,
          column: Math.min(5, Math.floor(source.column / 2)),
          columnSpan: Math.min(6, Math.max(1, Math.ceil(source.columnSpan / 2)))
        };
        placement.column = Math.min(
          placement.column,
          6 - placement.columnSpan
        );

        while (
          Object.values(placements).some((candidate) =>
            candidate.row === placement.row &&
            candidate.column < placement.column + placement.columnSpan &&
            placement.column < candidate.column + candidate.columnSpan &&
            !(
              candidate.column === placement.column &&
              candidate.columnSpan === placement.columnSpan
            )
          )
        ) {
          placement.row += 1;
        }

        placements[moduleId] = placement;
      });

      return placements;
    }

    return Object.fromEntries(
      visibleModules.map((moduleId) => [
        moduleId,
        settingsDraft.layout.placements[moduleId]
      ])
    );
  }

  function createPreviewTile(moduleId) {
    const tile = document.createElement("article");
    tile.className = "settings-grid-tile";
    tile.dataset.settingsModule = moduleId;
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "settings-grid-tile-handle";
    handle.dataset.layoutDragHandle = "true";
    handle.setAttribute(
      "aria-label",
      `${t("settingsDragModule")} ${getModuleLabel(moduleId)}`
    );
    handle.innerHTML = "<span></span><span></span><span></span>";
    const name = document.createElement("strong");
    name.textContent = getModuleLabel(moduleId);
    const size = document.createElement("span");
    size.className = "settings-grid-tile-size";
    size.textContent = t("moduleColumns", {
      count: settingsDraft.layout.placements[moduleId].columnSpan
    });
    const resize = document.createElement("button");
    resize.type = "button";
    resize.className = "settings-grid-resize-handle";
    resize.dataset.layoutResizeHandle = "true";
    resize.setAttribute(
      "aria-label",
      `${t("resizeModule")} ${getModuleLabel(moduleId)}`
    );
    tile.append(handle, name, size, resize);
    return tile;
  }

  function renderPreviewRegion(region) {
    const grid = document.querySelector(`[data-settings-grid="${region}"]`);

    if (!grid) {
      return;
    }

    const placements = getPreviewPlacements(region);
    const groups = new Map();
    grid.replaceChildren();
    grid.style.setProperty("--settings-grid-columns", getPreviewColumns());

    Object.entries(placements).forEach(([moduleId, placement]) => {
      const key = [
        placement.row,
        placement.column,
        placement.columnSpan
      ].join(":");

      if (!groups.has(key)) {
        groups.set(key, {
          placement,
          modules: []
        });
      }

      groups.get(key).modules.push(moduleId);
    });

    Array.from(groups.values())
      .sort((first, second) =>
        first.placement.row - second.placement.row ||
        first.placement.column - second.placement.column
      )
      .forEach(({ placement, modules }) => {
        const stack = document.createElement("div");
        stack.className = "settings-grid-stack";
        stack.style.gridColumn =
          `${placement.column + 1} / span ${placement.columnSpan}`;
        stack.style.gridRowStart = String(placement.row + 1);
        modules
          .sort((firstId, secondId) =>
            placements[firstId].order - placements[secondId].order
          )
          .forEach((moduleId) => {
            stack.appendChild(createPreviewTile(moduleId));
          });
        grid.appendChild(stack);
      });
  }

  function renderLanguageDockTargets() {
    const placement = settingsDraft.layout.placements.language;

    document.querySelectorAll("[data-language-dock-target]").forEach((button) => {
      const active =
        placement.region === "floating" &&
        placement.dock === button.dataset.languageDockTarget &&
        settingsDraft.layout.visibility.language;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.querySelector("span").textContent =
        settingsDraftLanguage.toUpperCase();
    });
  }

  function renderLayoutPreview() {
    const canvas = document.getElementById("settingsLayoutCanvas");

    if (!canvas || !settingsDraft) {
      return;
    }

    canvas.dataset.previewMode = activePreviewMode;
    document.querySelectorAll("[data-preview-mode]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.previewMode === activePreviewMode
      );
    });
    renderPreviewRegion("header");
    renderPreviewRegion("content");
    renderLanguageDockTargets();
  }

  function renderKeyboardList() {
    const container = document.getElementById("settingsKeyboardList");

    if (!container || !settingsDraft) {
      return;
    }

    container.replaceChildren();

    settingsApi.KEYBOARD_ACTIONS.forEach((actionId) => {
      const binding = settingsDraft.keyboard[actionId];
      const row = document.createElement("div");
      row.className = "settings-keyboard-row";
      row.dataset.keyboardAction = actionId;
      const label = document.createElement("span");
      label.className = "settings-keyboard-label";
      label.textContent = getKeyboardActionLabel(actionId);
      const bindingButton = document.createElement("button");
      bindingButton.type = "button";
      bindingButton.className = "settings-binding-btn";
      bindingButton.dataset.action = "record-keyboard-binding";
      bindingButton.dataset.keyboardAction = actionId;
      bindingButton.classList.toggle(
        "is-recording",
        recordingKeyboardAction === actionId
      );

      if (recordingKeyboardAction === actionId) {
        bindingButton.textContent = t("keyboardPressKeys");
      } else if (binding) {
        const key = document.createElement("kbd");
        key.textContent = settingsApi.formatBinding(
          binding,
          getPrimaryKeyLabel()
        );
        bindingButton.appendChild(key);
      } else {
        bindingButton.textContent = t("keyboardUnassigned");
      }

      const clearButton = document.createElement("button");
      clearButton.type = "button";
      clearButton.className = "settings-clear-binding-btn";
      clearButton.dataset.action = "clear-keyboard-binding";
      clearButton.dataset.keyboardAction = actionId;
      clearButton.textContent = t("keyboardClear");
      clearButton.disabled = !binding;
      row.append(label, bindingButton, clearButton);
      container.appendChild(row);
    });

    const popupRow = document.createElement("div");
    popupRow.className = "settings-keyboard-row is-browser-managed";
    popupRow.dataset.keyboardAction = "openPopup";
    const popupLabel = document.createElement("span");
    popupLabel.className = "settings-keyboard-label";
    popupLabel.textContent = t("keyboardOpenPopup");
    const popupBindingButton = document.createElement("button");
    popupBindingButton.type = "button";
    popupBindingButton.className = "settings-binding-btn";
    popupBindingButton.dataset.action = "manage-popup-shortcut";
    popupBindingButton.title = t("keyboardManagedByBrowser");

    if (popupCommandShortcut) {
      const key = document.createElement("kbd");
      key.textContent = popupCommandShortcut;
      popupBindingButton.appendChild(key);
    } else {
      popupBindingButton.textContent = t("keyboardUnassigned");
    }

    const manageButton = document.createElement("button");
    manageButton.type = "button";
    manageButton.className = "settings-manage-binding-btn";
    manageButton.dataset.action = "manage-popup-shortcut";
    manageButton.textContent = t("keyboardManage");
    manageButton.title = t("keyboardManagedByBrowser");
    popupRow.append(popupLabel, popupBindingButton, manageButton);
    container.appendChild(popupRow);
  }

  function renderSettingsDrawer() {
    if (!settingsDraft) {
      return;
    }

    renderPresetList();
    renderModulePalette();
    renderLayoutPreview();
    renderKeyboardList();

    const languageSelect = document.getElementById("settingsLanguageSelect");

    if (languageSelect) {
      languageSelect.value = settingsDraftLanguage;
    }

    document
      .querySelectorAll("[data-settings-behavior]")
      .forEach((input) => {
        input.checked =
          settingsDraft.behavior[input.dataset.settingsBehavior] !== false;
      });

    const floatingTargets = document.getElementById("settingsFloatingTargets");

    if (floatingTargets) {
      floatingTargets.setAttribute("aria-label", t("settingsLanguagePosition"));
    }

    updateDraftStatus();
  }

  function applyDraftPreview({ render = true } = {}) {
    if (!settingsDraft) {
      return;
    }

    settingsDraft = applyDashboardSettings(settingsDraft);

    if (render) {
      renderSettingsDrawer();
    } else {
      updateDraftStatus();
    }
  }

  async function refreshLocalizedDashboard() {
    applyStaticTranslations();

    if (typeof updateLanguageButton === "function") {
      updateLanguageButton();
    }

    if (typeof renderShortcuts === "function") {
      renderShortcuts();
    }

    await Promise.all([
      typeof renderDashboard === "function" ? renderDashboard() : null,
      typeof renderSavedSessions === "function" ? renderSavedSessions() : null
    ]);

    if (isModuleVisible("weather")) {
      await syncWeatherModule(true);
    }
  }

  function setActiveSettingsTab(tabId) {
    document.querySelectorAll("[data-settings-tab]").forEach((button) => {
      const active = button.dataset.settingsTab === tabId;
      button.setAttribute("aria-selected", String(active));
      button.classList.toggle("is-active", active);
    });

    document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
      const active = panel.dataset.settingsPanel === tabId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    document
      .getElementById("settingsDrawer")
      ?.classList.toggle("is-layout-workspace", tabId === "layout");
  }

  function getDrawerFocusableElements() {
    const drawer = document.getElementById("settingsDrawer");

    if (!drawer) {
      return [];
    }

    return Array.from(
      drawer.querySelectorAll(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.closest("[hidden]"));
  }

  function trapSettingsFocus(event) {
    const focusable = getDrawerFocusableElements();

    if (!focusable.length) {
      event.preventDefault();
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

  function openDashboardSettings(originElement = null) {
    if (isDrawerOpen()) {
      return;
    }

    settingsReturnFocus =
      originElement instanceof HTMLElement
        ? originElement
        : document.activeElement;
    settingsDraft = clone(persistedSettings);
    settingsDraftLanguage = persistedLanguage;
    recordingKeyboardAction = null;
    activePreviewMode = "desktop";
    renderSettingsDrawer();
    refreshPopupCommandShortcut({ render: true });
    setActiveSettingsTab("layout");

    const overlay = document.getElementById("settingsDrawerOverlay");

    if (!overlay) {
      return;
    }

    overlay.hidden = false;
    document.body.classList.add("settings-drawer-open");
    overlay.getBoundingClientRect();
    overlay.classList.add("is-open");
    requestAnimationFrame(() => {
      document.querySelector('[data-settings-tab="layout"]')?.focus();
    });
  }

  async function restorePersistedPreview() {
    const languageChanged = currentLanguage !== persistedLanguage;
    currentLanguage = persistedLanguage;
    applyDashboardSettings(persistedSettings);

    if (languageChanged) {
      await refreshLocalizedDashboard();
    } else {
      applyStaticTranslations();
    }
  }

  function finishClosingSettings() {
    const overlay = document.getElementById("settingsDrawerOverlay");

    if (overlay) {
      overlay.classList.remove("is-open");
      overlay.hidden = true;
    }

    document.body.classList.remove("settings-drawer-open");
    document.getElementById("settingsDrawer")?.classList.remove("is-layout-workspace");
    settingsDraft = null;
    recordingKeyboardAction = null;
    setSettingsStatus();

    if (
      settingsReturnFocus instanceof HTMLElement &&
      settingsReturnFocus.isConnected
    ) {
      settingsReturnFocus.focus();
    }

    settingsReturnFocus = null;
  }

  async function cancelDashboardSettings() {
    if (!isDrawerOpen()) {
      return;
    }

    cancelLayoutPointerAction();
    await restorePersistedPreview();
    finishClosingSettings();
  }

  async function saveDashboardSettings() {
    if (!settingsDraft || savingSettings) {
      return;
    }

    savingSettings = true;
    const nextSettings = settingsApi.normalizeSettings(settingsDraft);
    const nextLanguage = I18N[settingsDraftLanguage]
      ? settingsDraftLanguage
      : persistedLanguage;

    try {
      await chrome.storage.local.set({
        [settingsApi.STORAGE_KEY]: nextSettings,
        tabOutLanguage: nextLanguage
      });
      persistedSettings = nextSettings;
      persistedLanguage = nextLanguage;
      currentLanguage = nextLanguage;
      applyDashboardSettings(persistedSettings);
      await refreshLocalizedDashboard();
      finishClosingSettings();
      showToast(t("settingsSaved"));
    } catch (error) {
      console.warn("[tab-out] could not save dashboard settings:", error);
      setSettingsStatus(t("settingsSaveFailed"), "error");
    } finally {
      savingSettings = false;
    }
  }

  function beginKeyboardRecording(actionId) {
    recordingKeyboardAction = actionId;
    setSettingsStatus(t("keyboardPressKeys"), "recording");
    renderKeyboardList();
    document
      .querySelector(
        `[data-action="record-keyboard-binding"][data-keyboard-action="${actionId}"]`
      )
      ?.focus();
  }

  function bindingFromKeyboardEvent(event) {
    return {
      key: event.key,
      primary: Boolean(event.ctrlKey || event.metaKey),
      alt: Boolean(event.altKey),
      shift: Boolean(event.shiftKey)
    };
  }

  function recordKeyboardBinding(event) {
    if (!recordingKeyboardAction || !settingsDraft) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === "Escape") {
      recordingKeyboardAction = null;
      renderKeyboardList();
      updateDraftStatus();
      return true;
    }

    if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
      return true;
    }

    const candidate = bindingFromKeyboardEvent(event);
    const validation = settingsApi.validateBinding(candidate);

    if (!validation.ok) {
      setSettingsStatus(
        t(
          validation.reason === "structural"
            ? "keyboardStructural"
            : "keyboardReserved"
        ),
        "error"
      );
      return true;
    }

    const conflict = settingsApi.findBindingConflict(
      settingsDraft.keyboard,
      recordingKeyboardAction,
      validation.binding
    );

    if (conflict) {
      setSettingsStatus(
        t("keyboardConflict", {
          action: getKeyboardActionLabel(conflict)
        }),
        "error"
      );
      return true;
    }

    settingsDraft.keyboard[recordingKeyboardAction] = validation.binding;
    recordingKeyboardAction = null;
    renderKeyboardList();
    updateDraftStatus();
    return true;
  }

  function isTypingTarget(target) {
    return Boolean(
      target &&
      (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
    );
  }

  function hasOpenDashboardModal() {
    return [
      "sessionModal",
      "groupImportModal",
      "collectionDetailOverlay",
      "shortcutModal"
    ].some((id) => {
      const element = document.getElementById(id);
      return element && !element.hidden;
    });
  }

  function showHiddenModuleMessage(moduleId) {
    showToast(
      t("settingsModuleHidden", {
        module: getModuleLabel(moduleId)
      })
    );
  }

  function focusDashboardModule(moduleId) {
    if (!isModuleVisible(moduleId)) {
      showHiddenModuleMessage(moduleId);
      return;
    }

    const moduleElement = moduleWrappers.get(moduleId);

    if (!moduleElement || moduleElement.hidden) {
      showHiddenModuleMessage(moduleId);
      return;
    }

    moduleElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    moduleElement.focus({ preventScroll: true });
    moduleElement.classList.add("is-keyboard-focused");
    setTimeout(() => {
      moduleElement.classList.remove("is-keyboard-focused");
    }, 900);
  }

  function focusUnassignedSearch() {
    if (!isModuleVisible("unassigned")) {
      showHiddenModuleMessage("unassigned");
      return;
    }

    const openTabsSection = document.getElementById("openTabsSection");

    if (!openTabsSection || openTabsSection.style.display === "none") {
      return;
    }

    openTabsSearchVisible = true;
    const searchWrap = document.getElementById("openTabsSearchWrap");
    const toggle = document.querySelector(
      '[data-action="toggle-open-tabs-search"]'
    );
    const input = document.getElementById("openTabsFilterInput");
    searchWrap?.classList.add("is-visible");
    toggle?.setAttribute("aria-expanded", "true");
    input?.focus();
  }

  function executeKeyboardAction(actionId) {
    if (actionId === "openSettings") {
      openDashboardSettings();
      return;
    }

    if (actionId === "searchUnassigned") {
      focusUnassignedSearch();
      return;
    }

    if (MODULE_ACTION_MAP[actionId]) {
      focusDashboardModule(MODULE_ACTION_MAP[actionId]);
      return;
    }

    if (actionId === "createSession") {
      openSessionModal();
      return;
    }

    if (actionId === "addShortcut") {
      openShortcutModal();
    }
  }

  function handleDashboardKeyboard(event) {
    if (recordKeyboardBinding(event)) {
      return;
    }

    if (layoutDragState || layoutResizeState) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelLayoutPointerAction();
      }
      return;
    }

    if (isDrawerOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelDashboardSettings();
      } else if (event.key === "Tab") {
        trapSettingsFocus(event);
      }
      return;
    }

    if (
      isTypingTarget(event.target) ||
      hasOpenDashboardModal() ||
      event.repeat ||
      (
        typeof openTabAssignmentDragState !== "undefined" &&
        openTabAssignmentDragState?.dragging
      ) ||
      (
        typeof savedSessionDragState !== "undefined" &&
        savedSessionDragState?.dragging
      )
    ) {
      return;
    }

    const actionId = settingsApi.KEYBOARD_ACTIONS.find((candidateId) =>
      settingsApi.matchesBinding(
        event,
        persistedSettings.keyboard[candidateId]
      )
    );

    if (!actionId) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    executeKeyboardAction(actionId);
  }

  function clearLayoutDropTargets() {
    document
      .querySelectorAll(".is-layout-drop-target")
      .forEach((element) => element.classList.remove("is-layout-drop-target"));
  }

  function createLayoutDragGhost(moduleId) {
    const ghost = document.createElement("div");
    ghost.className = "settings-layout-drag-ghost";
    ghost.textContent = getModuleLabel(moduleId);
    document.body.appendChild(ghost);
    return ghost;
  }

  function updateLayoutDragTarget(clientX, clientY) {
    if (!layoutDragState) {
      return;
    }

    layoutDragState.ghost.style.transform =
      `translate3d(${clientX + 14}px, ${clientY + 14}px, 0)`;
    clearLayoutDropTargets();
    const target = document.elementFromPoint(clientX, clientY);
    const dockTarget = target?.closest("[data-language-dock-target]");
    const gridTarget = target?.closest("[data-settings-grid]");

    layoutDragState.target = null;

    if (dockTarget && layoutDragState.moduleId === "language") {
      dockTarget.classList.add("is-layout-drop-target");
      layoutDragState.target = {
        type: "dock",
        dock: dockTarget.dataset.languageDockTarget
      };
      return;
    }

    if (gridTarget) {
      gridTarget.classList.add("is-layout-drop-target");
      layoutDragState.target = {
        type: "grid",
        grid: gridTarget,
        clientX,
        clientY,
        hoveredModuleId:
          target.closest("[data-settings-module]")?.dataset.settingsModule || null
      };
    }
  }

  function beginLayoutDrag(event, handle) {
    if (!settingsDraft || activePreviewMode !== "desktop") {
      return;
    }

    const moduleElement = handle.closest("[data-settings-module]");
    const moduleId = moduleElement?.dataset.settingsModule;

    if (!moduleId) {
      return;
    }

    event.preventDefault();
    const ghost = createLayoutDragGhost(moduleId);
    layoutDragState = {
      moduleId,
      pointerId: event.pointerId,
      ghost,
      target: null
    };
    document.body.classList.add("settings-layout-dragging");
    moduleElement.classList.add("is-layout-dragging");
    updateLayoutDragTarget(event.clientX, event.clientY);
  }

  function applyLayoutDrop() {
    if (!layoutDragState?.target || !settingsDraft) {
      return;
    }

    const { moduleId, target } = layoutDragState;

    if (target.type === "dock") {
      settingsDraft = settingsApi.updateModulePlacement(
        settingsDraft,
        moduleId,
        {
          region: "floating",
          dock: target.dock
        }
      );
    } else {
      const gridRect = target.grid.getBoundingClientRect();
      const currentPlacement = settingsDraft.layout.placements[moduleId];
      let columnSpan = currentPlacement.columnSpan;
      let column = Math.floor(
        ((target.clientX - gridRect.left) / gridRect.width) *
          settingsApi.GRID_COLUMNS
      );
      let row = Math.max(
        0,
        Math.floor((target.clientY - gridRect.top) / 72)
      );
      let order = 0;

      if (
        target.hoveredModuleId &&
        target.hoveredModuleId !== moduleId
      ) {
        const hovered =
          settingsDraft.layout.placements[target.hoveredModuleId];
        column = hovered.column;
        row = hovered.row;
        columnSpan = hovered.columnSpan;
        order = hovered.order + 1;
      }

      column = Math.max(
        0,
        Math.min(
          settingsApi.GRID_COLUMNS - columnSpan,
          column
        )
      );
      settingsDraft = settingsApi.updateModulePlacement(
        settingsDraft,
        moduleId,
        {
          region: target.grid.dataset.settingsGrid,
          column,
          row,
          columnSpan,
          order
        }
      );
    }

    settingsDraft = settingsApi.setModuleVisibility(
      settingsDraft,
      moduleId,
      true
    );
    applyDraftPreview();
  }

  function finishLayoutDrag(applyDrop) {
    if (!layoutDragState) {
      return;
    }

    if (applyDrop) {
      applyLayoutDrop();
    }

    layoutDragState.ghost.remove();
    document
      .querySelectorAll(".is-layout-dragging")
      .forEach((element) => element.classList.remove("is-layout-dragging"));
    document.body.classList.remove("settings-layout-dragging");
    clearLayoutDropTargets();
    layoutDragState = null;
  }

  function beginLayoutResize(event, handle) {
    if (!settingsDraft || activePreviewMode !== "desktop") {
      return;
    }

    const tile = handle.closest("[data-settings-module]");
    const moduleId = tile?.dataset.settingsModule;
    const grid = handle.closest("[data-settings-grid]");

    if (!moduleId || !grid) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const placement = settingsDraft.layout.placements[moduleId];
    layoutResizeState = {
      moduleId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startSpan: placement.columnSpan,
      nextSpan: placement.columnSpan,
      columnWidth:
        grid.getBoundingClientRect().width / settingsApi.GRID_COLUMNS,
      tile
    };
    tile.classList.add("is-layout-resizing");
    document.body.classList.add("settings-layout-resizing");
  }

  function updateLayoutResize(clientX) {
    if (!layoutResizeState) {
      return;
    }

    const minimum = settingsApi.MODULE_MIN_SPANS[layoutResizeState.moduleId];
    const delta = Math.round(
      (clientX - layoutResizeState.startX) /
        layoutResizeState.columnWidth
    );
    const nextSpan = Math.min(
      settingsApi.GRID_COLUMNS,
      Math.max(minimum, layoutResizeState.startSpan + delta)
    );
    layoutResizeState.nextSpan = nextSpan;
    const sizeLabel =
      layoutResizeState.tile.querySelector(".settings-grid-tile-size");

    if (sizeLabel) {
      sizeLabel.textContent = t("moduleColumns", { count: nextSpan });
    }

    setSettingsStatus(
      t("resizeStatus", {
        module: getModuleLabel(layoutResizeState.moduleId),
        count: nextSpan
      }),
      "recording"
    );
  }

  function finishLayoutResize(applyResize) {
    if (!layoutResizeState) {
      return;
    }

    if (applyResize) {
      settingsDraft = settingsApi.resizeModule(
        settingsDraft,
        layoutResizeState.moduleId,
        layoutResizeState.nextSpan
      );
      applyDraftPreview();
    }

    layoutResizeState.tile.classList.remove("is-layout-resizing");
    document.body.classList.remove("settings-layout-resizing");
    layoutResizeState = null;
    updateDraftStatus();
  }

  function cancelLayoutPointerAction() {
    finishLayoutDrag(false);
    finishLayoutResize(false);
  }

  function handleLayoutPointerDown(event) {
    const resizeHandle = event.target.closest("[data-layout-resize-handle]");

    if (resizeHandle) {
      beginLayoutResize(event, resizeHandle);
      return;
    }

    const dragHandle = event.target.closest("[data-layout-drag-handle]");

    if (dragHandle) {
      beginLayoutDrag(event, dragHandle);
    }
  }

  function handleGlobalPointerMove(event) {
    if (layoutDragState?.pointerId === event.pointerId) {
      event.preventDefault();
      updateLayoutDragTarget(event.clientX, event.clientY);
    } else if (layoutResizeState?.pointerId === event.pointerId) {
      event.preventDefault();
      updateLayoutResize(event.clientX);
    }
  }

  function handleGlobalPointerUp(event) {
    if (layoutDragState?.pointerId === event.pointerId) {
      updateLayoutDragTarget(event.clientX, event.clientY);
      finishLayoutDrag(true);
    } else if (layoutResizeState?.pointerId === event.pointerId) {
      finishLayoutResize(true);
    }
  }

  function handleDrawerClick(event) {
    const tabButton = event.target.closest("[data-settings-tab]");

    if (tabButton) {
      setActiveSettingsTab(tabButton.dataset.settingsTab);
      return;
    }

    const dockTarget = event.target.closest("[data-language-dock-target]");

    if (dockTarget && settingsDraft) {
      const placement = settingsDraft.layout.placements.language;
      const isActive =
        settingsDraft.layout.visibility.language !== false &&
        placement.region === "floating" &&
        placement.dock === dockTarget.dataset.languageDockTarget;

      if (isActive) {
        settingsDraft = settingsApi.setModuleVisibility(
          settingsDraft,
          "language",
          false
        );
        applyDraftPreview();
        return;
      }

      settingsDraft = settingsApi.updateModulePlacement(
        settingsDraft,
        "language",
        {
          region: "floating",
          dock: dockTarget.dataset.languageDockTarget
        }
      );
      settingsDraft = settingsApi.setModuleVisibility(
        settingsDraft,
        "language",
        true
      );
      applyDraftPreview();
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;

    if (action === "cancel-dashboard-settings") {
      cancelDashboardSettings();
      return;
    }

    if (action === "save-dashboard-settings") {
      saveDashboardSettings();
      return;
    }

    if (action === "apply-dashboard-preset") {
      settingsDraft = settingsApi.applyPreset(
        settingsDraft,
        actionButton.dataset.presetId
      );
      applyDraftPreview();
      return;
    }

    if (action === "set-layout-preview") {
      activePreviewMode = actionButton.dataset.previewMode;
      renderLayoutPreview();
      return;
    }

    if (action === "nudge-layout-module") {
      settingsDraft = settingsApi.nudgeModule(
        settingsDraft,
        actionButton.dataset.moduleId,
        actionButton.dataset.direction
      );
      applyDraftPreview();
      return;
    }

    if (action === "resize-layout-module") {
      const moduleId = actionButton.dataset.moduleId;
      const placement = settingsDraft.layout.placements[moduleId];
      settingsDraft = settingsApi.resizeModule(
        settingsDraft,
        moduleId,
        placement.columnSpan + Number(actionButton.dataset.delta)
      );
      applyDraftPreview();
      return;
    }

    if (action === "manage-popup-shortcut") {
      void openBrowserShortcutManager();
      return;
    }

    if (action === "record-keyboard-binding") {
      beginKeyboardRecording(actionButton.dataset.keyboardAction);
      return;
    }

    if (action === "clear-keyboard-binding") {
      settingsDraft.keyboard[actionButton.dataset.keyboardAction] = null;
      recordingKeyboardAction = null;
      renderKeyboardList();
      updateDraftStatus();
      return;
    }

    if (action === "reset-keyboard-settings") {
      settingsDraft.keyboard = clone(settingsApi.DEFAULT_KEYBOARD);
      recordingKeyboardAction = null;
      renderKeyboardList();
      updateDraftStatus();
      return;
    }

    if (action === "reset-dashboard-settings") {
      settingsDraft = settingsApi.getDefaultSettings();
      recordingKeyboardAction = null;
      applyDraftPreview();
    }
  }

  async function handleDrawerChange(event) {
    const behaviorInput = event.target.closest("[data-settings-behavior]");

    if (behaviorInput && settingsDraft) {
      settingsDraft.behavior[behaviorInput.dataset.settingsBehavior] =
        behaviorInput.checked;
      settingsDraft = settingsApi.normalizeSettings(settingsDraft);
      updateDraftStatus();
      return;
    }

    const visibilityInput = event.target.closest("[data-settings-visibility]");

    if (visibilityInput && settingsDraft) {
      settingsDraft = settingsApi.setModuleVisibility(
        settingsDraft,
        visibilityInput.dataset.settingsVisibility,
        visibilityInput.checked
      );
      applyDraftPreview();
      return;
    }

    const viewSelect = event.target.closest("[data-settings-view]");

    if (viewSelect && settingsDraft) {
      settingsDraft.views[viewSelect.dataset.settingsView] = viewSelect.value;
      settingsDraft.preset = "custom";
      applyDraftPreview();
      return;
    }

    if (event.target.id === "settingsLanguageSelect") {
      settingsDraftLanguage = event.target.value;
      currentLanguage = settingsDraftLanguage;
      await refreshLocalizedDashboard();
      renderSettingsDrawer();
    }
  }

  function setupSettingsInteractions() {
    const openButton = document.getElementById("settingsDrawerBtn");
    const overlay = document.getElementById("settingsDrawerOverlay");
    const drawer = document.getElementById("settingsDrawer");

    openButton?.addEventListener("click", () => {
      openDashboardSettings(openButton);
    });

    overlay?.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cancelDashboardSettings();
      }
    });

    drawer?.addEventListener("click", handleDrawerClick);
    drawer?.addEventListener("change", handleDrawerChange);
    drawer?.addEventListener("pointerdown", handleLayoutPointerDown);
    document.addEventListener("pointermove", handleGlobalPointerMove, {
      passive: false
    });
    document.addEventListener("pointerup", handleGlobalPointerUp);
    document.addEventListener("pointercancel", cancelLayoutPointerAction);
    document.addEventListener("keydown", handleDashboardKeyboard, true);
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const settings = getEffectiveSettings();

        if (settings.layout.mode === "grid") {
          applyDashboardSettings(settings, { syncWeather: false });
        }
      }, 120);
    });
    window.addEventListener("focus", () => {
      if (isDrawerOpen()) {
        refreshPopupCommandShortcut({ render: true });
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && isDrawerOpen()) {
        refreshPopupCommandShortcut({ render: true });
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (
        areaName !== "local" ||
        savingSettings ||
        writingMigration
      ) {
        return;
      }

      if (changes[settingsApi.STORAGE_KEY]) {
        const rawSettings = changes[settingsApi.STORAGE_KEY].newValue;
        persistedSettings = settingsApi.normalizeSettings(rawSettings);

        if (settingsApi.requiresMigration(rawSettings)) {
          writingMigration = true;
          chrome.storage.local
            .set({ [settingsApi.STORAGE_KEY]: persistedSettings })
            .finally(() => {
              writingMigration = false;
            });
        }

        if (isDrawerOpen()) {
          setSettingsStatus(t("settingsExternalChange"), "pending");
        } else {
          applyDashboardSettings(persistedSettings);
        }
      }

      if (changes.tabOutLanguage) {
        const nextLanguage = I18N[changes.tabOutLanguage.newValue]
          ? changes.tabOutLanguage.newValue
          : "fr";
        persistedLanguage = nextLanguage;

        if (isDrawerOpen()) {
          setSettingsStatus(t("settingsExternalChange"), "pending");
        } else if (currentLanguage !== nextLanguage) {
          currentLanguage = nextLanguage;
          refreshLocalizedDashboard();
        }
      }
    });
  }

  async function initializeSettings() {
    document.documentElement.dataset.dashboardSettingsReady = "false";

    try {
      ensureDashboardModuleStructure();
      applyDashboardSettings(persistedSettings, { syncWeather: false });
      setupSettingsInteractions();
      const stored = await chrome.storage.local.get([
        settingsApi.STORAGE_KEY,
        "tabOutLanguage"
      ]);
      const rawSettings = stored[settingsApi.STORAGE_KEY];
      persistedSettings = settingsApi.normalizeSettings(rawSettings);
      persistedLanguage = I18N[stored.tabOutLanguage]
        ? stored.tabOutLanguage
        : currentLanguage;
      applyDashboardSettings(persistedSettings, { syncWeather: false });

      if (settingsApi.requiresMigration(rawSettings)) {
        writingMigration = true;
        await chrome.storage.local.set({
          [settingsApi.STORAGE_KEY]: persistedSettings
        });
        writingMigration = false;
      }
    } catch (error) {
      writingMigration = false;
      console.warn("[tab-out] could not load dashboard settings:", error);
    } finally {
      document.documentElement.dataset.dashboardSettingsReady = "true";
      readyResolve(persistedSettings);
    }
  }

  globalThis.TabOutDashboardRuntime = Object.freeze({
    ready: settingsReady,
    getSettings: () => clone(persistedSettings),
    getEffectiveSettings: () => clone(getEffectiveSettings()),
    isModuleVisible,
    openSettings: openDashboardSettings,
    applySettings: applyDashboardSettings
  });

  initializeSettings();
})();
