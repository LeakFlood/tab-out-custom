(function exposeTabOutDashboardSettings(globalObject) {
  const SETTINGS_VERSION = 2;
  const STORAGE_KEY = "tabOutDashboardSettings";
  const GRID_COLUMNS = 12;

  const MODULE_IDS = Object.freeze([
    "greeting",
    "time",
    "date",
    "weather",
    "shortcuts",
    "language",
    "sessions",
    "unassigned",
    "savedLater",
    "stats"
  ]);

  const GRID_REGIONS = Object.freeze(["header", "content"]);
  const LANGUAGE_DOCKS = Object.freeze([
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right"
  ]);

  const MODULE_MIN_SPANS = Object.freeze({
    greeting: 2,
    time: 2,
    date: 2,
    weather: 3,
    shortcuts: 4,
    language: 2,
    sessions: 4,
    unassigned: 4,
    savedLater: 3,
    stats: 2
  });

  const KEYBOARD_ACTIONS = Object.freeze([
    "openSettings",
    "searchUnassigned",
    "focusShortcuts",
    "focusSessions",
    "focusUnassigned",
    "focusSavedLater",
    "createSession",
    "addShortcut"
  ]);

  const DEFAULT_KEYBOARD = Object.freeze({
    openSettings: Object.freeze({
      key: ",",
      primary: true,
      alt: false,
      shift: false
    }),
    searchUnassigned: Object.freeze({
      key: "/",
      primary: false,
      alt: false,
      shift: null
    }),
    focusShortcuts: null,
    focusSessions: null,
    focusUnassigned: null,
    focusSavedLater: null,
    createSession: null,
    addShortcut: null
  });

  const DEFAULT_VISIBILITY = Object.freeze(
    Object.fromEntries(MODULE_IDS.map((moduleId) => [moduleId, true]))
  );

  const DEFAULT_VIEWS = Object.freeze({
    shortcuts: "tiles",
    sessions: "cards",
    unassigned: "domainGrid",
    savedLater: "panel"
  });

  const DEFAULT_BEHAVIOR = Object.freeze({
    includeSuspendedTabs: true,
    copyTabLinksOnRightClick: true,
    dragUnassignedTabs: true,
    reorderSessions: true
  });

  const ORIGINAL_PLACEMENTS = Object.freeze({
    greeting: Object.freeze({
      region: "header",
      column: 0,
      row: 0,
      columnSpan: 3,
      order: 0
    }),
    time: Object.freeze({
      region: "header",
      column: 0,
      row: 0,
      columnSpan: 3,
      order: 1
    }),
    date: Object.freeze({
      region: "header",
      column: 0,
      row: 0,
      columnSpan: 3,
      order: 2
    }),
    weather: Object.freeze({
      region: "header",
      column: 0,
      row: 0,
      columnSpan: 3,
      order: 3
    }),
    shortcuts: Object.freeze({
      region: "header",
      column: 3,
      row: 0,
      columnSpan: 9,
      order: 0
    }),
    language: Object.freeze({
      region: "floating",
      column: 10,
      row: 0,
      columnSpan: 2,
      order: 0,
      dock: "bottom-right"
    }),
    sessions: Object.freeze({
      region: "content",
      column: 0,
      row: 0,
      columnSpan: 12,
      order: 0
    }),
    unassigned: Object.freeze({
      region: "content",
      column: 0,
      row: 1,
      columnSpan: 9,
      order: 0
    }),
    savedLater: Object.freeze({
      region: "content",
      column: 9,
      row: 1,
      columnSpan: 3,
      order: 0
    }),
    stats: Object.freeze({
      region: "content",
      column: 0,
      row: 2,
      columnSpan: 3,
      order: 0
    })
  });

  const PRESETS = Object.freeze({
    original: Object.freeze({
      layout: Object.freeze({
        mode: "original",
        visibility: DEFAULT_VISIBILITY,
        placements: ORIGINAL_PLACEMENTS
      }),
      views: DEFAULT_VIEWS
    }),
    focus: Object.freeze({
      layout: Object.freeze({
        mode: "grid",
        visibility: Object.freeze({
          greeting: true,
          time: true,
          date: true,
          weather: false,
          shortcuts: false,
          language: false,
          sessions: true,
          unassigned: true,
          savedLater: false,
          stats: false
        }),
        placements: Object.freeze({
          ...ORIGINAL_PLACEMENTS,
          greeting: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 0
          }),
          time: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 1
          }),
          date: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 2
          }),
          sessions: Object.freeze({
            region: "content",
            column: 0,
            row: 0,
            columnSpan: 12,
            order: 0
          }),
          unassigned: Object.freeze({
            region: "content",
            column: 0,
            row: 1,
            columnSpan: 12,
            order: 0
          })
        })
      }),
      views: DEFAULT_VIEWS
    }),
    compact: Object.freeze({
      layout: Object.freeze({
        mode: "grid",
        visibility: DEFAULT_VISIBILITY,
        placements: Object.freeze({
          greeting: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 0
          }),
          time: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 1
          }),
          date: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 2
          }),
          weather: Object.freeze({
            region: "header",
            column: 0,
            row: 0,
            columnSpan: 4,
            order: 3
          }),
          shortcuts: Object.freeze({
            region: "header",
            column: 4,
            row: 0,
            columnSpan: 8,
            order: 0
          }),
          language: Object.freeze({
            region: "floating",
            column: 10,
            row: 0,
            columnSpan: 2,
            order: 0,
            dock: "top-right"
          }),
          sessions: Object.freeze({
            region: "content",
            column: 0,
            row: 0,
            columnSpan: 12,
            order: 0
          }),
          unassigned: Object.freeze({
            region: "content",
            column: 0,
            row: 1,
            columnSpan: 8,
            order: 0
          }),
          savedLater: Object.freeze({
            region: "content",
            column: 8,
            row: 1,
            columnSpan: 4,
            order: 0
          }),
          stats: Object.freeze({
            region: "content",
            column: 0,
            row: 2,
            columnSpan: 4,
            order: 0
          })
        })
      }),
      views: Object.freeze({
        shortcuts: "compact",
        sessions: "list",
        unassigned: "compactList",
        savedLater: "list"
      })
    })
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function normalizeKey(value) {
    const key = String(value || "");
    return key.length === 1 ? key.toLocaleLowerCase() : key;
  }

  function normalizeChoice(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function normalizeBinding(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const key = normalizeKey(value.key);

    if (!key) {
      return null;
    }

    return {
      key,
      primary: Boolean(value.primary),
      alt: Boolean(value.alt),
      shift: value.shift === null ? null : Boolean(value.shift)
    };
  }

  function normalizeKeyboard(value, fallback = DEFAULT_KEYBOARD) {
    return Object.fromEntries(
      KEYBOARD_ACTIONS.map((actionId) => [
        actionId,
        normalizeBinding(
          value &&
          Object.prototype.hasOwnProperty.call(value, actionId)
            ? value[actionId]
            : fallback[actionId]
        )
      ])
    );
  }

  function normalizeVisibility(value, fallback = DEFAULT_VISIBILITY) {
    return Object.fromEntries(
      MODULE_IDS.map((moduleId) => [
        moduleId,
        typeof value?.[moduleId] === "boolean"
          ? value[moduleId]
          : Boolean(fallback[moduleId])
      ])
    );
  }

  function normalizePlacement(moduleId, value, fallback) {
    const source = value && typeof value === "object" ? value : fallback;
    const minimumSpan = MODULE_MIN_SPANS[moduleId];
    const columnSpan = clamp(
      source?.columnSpan || fallback.columnSpan,
      minimumSpan,
      GRID_COLUMNS
    );
    const region =
      moduleId === "language" && source?.region === "floating"
        ? "floating"
        : normalizeChoice(
            source?.region,
            GRID_REGIONS,
            fallback.region === "floating" ? "header" : fallback.region
          );

    const placement = {
      region,
      column: clamp(
        source?.column,
        0,
        Math.max(0, GRID_COLUMNS - columnSpan)
      ),
      row: Math.max(0, Math.floor(Number(source?.row) || 0)),
      columnSpan,
      order: Math.max(0, Math.floor(Number(source?.order) || 0))
    };

    if (moduleId === "language" && region === "floating") {
      placement.dock = normalizeChoice(
        source?.dock,
        LANGUAGE_DOCKS,
        fallback.dock || "bottom-right"
      );
    }

    return placement;
  }

  function placementsOverlap(first, second) {
    if (
      first.region === "floating" ||
      second.region === "floating" ||
      first.region !== second.region ||
      first.row !== second.row
    ) {
      return false;
    }

    const sameStack =
      first.column === second.column &&
      first.columnSpan === second.columnSpan;

    if (sameStack) {
      return false;
    }

    return (
      first.column < second.column + second.columnSpan &&
      second.column < first.column + first.columnSpan
    );
  }

  function resolvePlacementCollisions(value, anchoredModuleId = null) {
    const placements = clone(value);
    const orderedModules = MODULE_IDS
      .filter((moduleId) => placements[moduleId])
      .sort((firstId, secondId) => {
        if (firstId === anchoredModuleId) {
          return -1;
        }

        if (secondId === anchoredModuleId) {
          return 1;
        }

        const first = placements[firstId];
        const second = placements[secondId];
        const regionDelta =
          GRID_REGIONS.indexOf(first.region) -
          GRID_REGIONS.indexOf(second.region);

        return (
          regionDelta ||
          first.row - second.row ||
          first.column - second.column ||
          first.order - second.order ||
          MODULE_IDS.indexOf(firstId) - MODULE_IDS.indexOf(secondId)
        );
      });
    const placed = [];

    orderedModules.forEach((moduleId) => {
      const placement = placements[moduleId];

      while (
        placed.some((candidateId) =>
          placementsOverlap(placement, placements[candidateId])
        )
      ) {
        placement.row += 1;
      }

      placed.push(moduleId);
    });

    return placements;
  }

  function normalizePlacements(value, fallback = ORIGINAL_PLACEMENTS) {
    const placements = Object.fromEntries(
      MODULE_IDS.map((moduleId) => [
        moduleId,
        normalizePlacement(
          moduleId,
          value?.[moduleId],
          fallback[moduleId] || ORIGINAL_PLACEMENTS[moduleId]
        )
      ])
    );

    return resolvePlacementCollisions(placements);
  }

  function normalizeViews(value, fallback = DEFAULT_VIEWS) {
    return {
      shortcuts: normalizeChoice(
        value?.shortcuts,
        ["tiles", "compact"],
        fallback.shortcuts
      ),
      sessions: normalizeChoice(
        value?.sessions,
        ["cards", "list"],
        fallback.sessions
      ),
      unassigned: normalizeChoice(
        value?.unassigned,
        ["domainGrid", "compactList"],
        fallback.unassigned
      ),
      savedLater: normalizeChoice(
        value?.savedLater,
        ["panel", "list"],
        fallback.savedLater
      )
    };
  }

  function hasCompactDensity(settings) {
    return (
      settings.layout.mode === "grid" &&
      settings.views.shortcuts === "compact" &&
      settings.views.sessions === "list"
    );
  }

  function horizontalOverlap(first, second) {
    return Math.max(
      0,
      Math.min(first.column + first.columnSpan, second.column + second.columnSpan) -
        Math.max(first.column, second.column)
    );
  }

  function stabilizeCompactLanguagePlacement(
    settings,
    { repairDisplacedRows = false } = {}
  ) {
    if (!hasCompactDensity(settings)) {
      return settings;
    }

    const placements = settings.layout.placements;
    const language = placements.language;

    if (!language || language.region !== "header") {
      return settings;
    }

    if (
      repairDisplacedRows &&
      placements.shortcuts.region === "header" &&
      placements.shortcuts.column === 4 &&
      placements.shortcuts.columnSpan === 8 &&
      placements.shortcuts.row > 0
    ) {
      placements.shortcuts.row = 0;
    }

    const informationModules = ["greeting", "time", "date", "weather"];
    const displacedInformationStack = repairDisplacedRows &&
      informationModules.every((moduleId) => {
        const placement = placements[moduleId];
        return (
          placement.region === "header" &&
          placement.column === 0 &&
          placement.columnSpan === 4 &&
          placement.row > 0
        );
      });

    if (displacedInformationStack) {
      informationModules.forEach((moduleId) => {
        placements[moduleId].row = 0;
      });
    }

    language.row = 0;

    const targetEntry = MODULE_IDS
      .filter((moduleId) => moduleId !== "language")
      .map((moduleId) => [moduleId, placements[moduleId]])
      .filter(([, placement]) =>
        placement.region === "header" &&
        placement.row === language.row &&
        horizontalOverlap(language, placement) > 0
      )
      .sort((first, second) =>
        horizontalOverlap(language, second[1]) -
          horizontalOverlap(language, first[1]) ||
        MODULE_IDS.indexOf(first[0]) - MODULE_IDS.indexOf(second[0])
      )[0];

    if (!targetEntry) {
      return settings;
    }

    const target = targetEntry[1];
    const stackOrders = MODULE_IDS
      .filter((moduleId) => moduleId !== "language")
      .map((moduleId) => placements[moduleId])
      .filter((placement) =>
        placement.region === target.region &&
        placement.row === target.row &&
        placement.column === target.column &&
        placement.columnSpan === target.columnSpan
      )
      .map((placement) => placement.order);

    language.column = target.column;
    language.columnSpan = target.columnSpan;
    language.order = Math.max(...stackOrders, 0) + 1;
    return settings;
  }

  function getPresetSettings(presetId) {
    const preset = PRESETS[presetId] || PRESETS.original;

    return {
      version: SETTINGS_VERSION,
      preset: PRESETS[presetId] ? presetId : "original",
      layout: {
        mode: preset.layout.mode,
        visibility: clone(preset.layout.visibility),
        placements: clone(preset.layout.placements)
      },
      views: clone(preset.views),
      behavior: clone(DEFAULT_BEHAVIOR),
      keyboard: clone(DEFAULT_KEYBOARD)
    };
  }

  function getDefaultSettings() {
    return getPresetSettings("original");
  }

  function migrateVersionOneSettings(value) {
    const visibility = normalizeVisibility({
      greeting: true,
      time: value?.header?.visibility?.time,
      date: value?.header?.visibility?.date,
      weather: value?.header?.visibility?.weather,
      shortcuts: value?.header?.visibility?.shortcuts,
      language: value?.header?.visibility?.language,
      sessions: value?.content?.visibility?.sessions,
      unassigned: value?.content?.visibility?.unassigned,
      savedLater: value?.content?.visibility?.savedLater,
      stats: true
    });
    const views = normalizeViews({
      shortcuts: value?.header?.shortcutsView,
      sessions: value?.content?.sessionsView,
      unassigned: value?.content?.unassignedView,
      savedLater: value?.content?.savedLaterView
    });
    const originalOptions =
      JSON.stringify(visibility) === JSON.stringify(DEFAULT_VISIBILITY) &&
      JSON.stringify(views) === JSON.stringify(DEFAULT_VIEWS);

    return {
      version: SETTINGS_VERSION,
      preset: originalOptions ? "original" : "custom",
      layout: {
        mode: "original",
        visibility,
        placements: clone(ORIGINAL_PLACEMENTS)
      },
      views,
      behavior: clone(DEFAULT_BEHAVIOR),
      keyboard: normalizeKeyboard(value?.keyboard)
    };
  }

  function requiresMigration(value) {
    return Boolean(value) && Number(value.version) !== SETTINGS_VERSION;
  }

  function normalizeSettings(value) {
    if (!value || typeof value !== "object") {
      return getDefaultSettings();
    }

    if (Number(value.version) !== SETTINGS_VERSION) {
      return migrateVersionOneSettings(value);
    }

    const fallbackPreset = PRESETS[value.preset]
      ? PRESETS[value.preset]
      : PRESETS.original;
    const requestedPreset = PRESETS[value.preset]
      ? value.preset
      : "custom";
    const placementValue = requestedPreset === "compact"
      ? fallbackPreset.layout.placements
      : value?.layout?.placements;

    const settings = {
      version: SETTINGS_VERSION,
      preset: requestedPreset,
      layout: {
        mode: normalizeChoice(
          value?.layout?.mode,
          ["original", "grid"],
          fallbackPreset.layout.mode
        ),
        visibility: normalizeVisibility(
          value?.layout?.visibility,
          fallbackPreset.layout.visibility
        ),
        placements: normalizePlacements(
          placementValue,
          fallbackPreset.layout.placements
        )
      },
      views: normalizeViews(value?.views, fallbackPreset.views),
      behavior: {
        includeSuspendedTabs:
          value?.behavior?.includeSuspendedTabs !== false,
        copyTabLinksOnRightClick:
          value?.behavior?.copyTabLinksOnRightClick !== false,
        dragUnassignedTabs:
          value?.behavior?.dragUnassignedTabs !== false,
        reorderSessions:
          value?.behavior?.reorderSessions !== false
      },
      keyboard: normalizeKeyboard(value?.keyboard)
    };

    stabilizeCompactLanguagePlacement(settings, {
      repairDisplacedRows: true
    });
    settings.layout.placements = resolvePlacementCollisions(
      settings.layout.placements,
      "language"
    );
    return settings;
  }

  function applyPreset(value, presetId) {
    const current = normalizeSettings(value);
    const next = getPresetSettings(
      Object.prototype.hasOwnProperty.call(PRESETS, presetId)
        ? presetId
        : "original"
    );
    next.behavior = current.behavior;
    next.keyboard = current.keyboard;
    return normalizeSettings(next);
  }

  function updateModulePlacement(value, moduleId, updates) {
    const settings = normalizeSettings(value);

    if (!MODULE_IDS.includes(moduleId)) {
      return settings;
    }

    const current = settings.layout.placements[moduleId];
    const candidate = {
      ...current,
      ...updates
    };

    if (candidate.region === "floating" && moduleId !== "language") {
      candidate.region = current.region === "floating" ? "header" : current.region;
    }

    if (candidate.region !== "floating") {
      delete candidate.dock;
    }

    settings.layout.mode = "grid";
    settings.layout.placements[moduleId] = normalizePlacement(
      moduleId,
      candidate,
      ORIGINAL_PLACEMENTS[moduleId]
    );
    stabilizeCompactLanguagePlacement(settings);
    settings.layout.placements = resolvePlacementCollisions(
      settings.layout.placements,
      moduleId
    );
    settings.preset = "custom";
    return settings;
  }

  function resizeModule(value, moduleId, columnSpan) {
    return updateModulePlacement(value, moduleId, { columnSpan });
  }

  function nudgeModule(value, moduleId, direction) {
    const settings = normalizeSettings(value);
    const placement = settings.layout.placements[moduleId];

    if (!placement || placement.region === "floating") {
      return settings;
    }

    const updates = {};

    if (direction === "left") {
      updates.column = placement.column - 1;
    } else if (direction === "right") {
      updates.column = placement.column + 1;
    } else if (direction === "up") {
      updates.row = placement.row - 1;
    } else if (direction === "down") {
      updates.row = placement.row + 1;
    }

    return updateModulePlacement(settings, moduleId, updates);
  }

  function setModuleVisibility(value, moduleId, visible) {
    const settings = normalizeSettings(value);

    if (!MODULE_IDS.includes(moduleId)) {
      return settings;
    }

    settings.layout.visibility[moduleId] = Boolean(visible);
    settings.preset = "custom";
    return settings;
  }

  function bindingSignature(value) {
    const binding = normalizeBinding(value);

    if (!binding) {
      return "";
    }

    return [
      binding.primary ? "primary" : "",
      binding.alt ? "alt" : "",
      binding.shift === true ? "shift" : binding.shift === null ? "shift-any" : "",
      binding.key
    ].join("+");
  }

  function findBindingConflict(keyboard, actionId, value) {
    const binding = normalizeBinding(value);

    if (!binding) {
      return null;
    }

    return KEYBOARD_ACTIONS.find((candidateId) => {
      if (candidateId === actionId) {
        return false;
      }

      const candidate = normalizeBinding(keyboard?.[candidateId]);

      if (!candidate) {
        return false;
      }

      const shiftOverlaps =
        binding.shift === null ||
        candidate.shift === null ||
        binding.shift === candidate.shift;

      return (
        binding.key === candidate.key &&
        binding.primary === candidate.primary &&
        binding.alt === candidate.alt &&
        shiftOverlaps
      );
    }) || null;
  }

  function validateBinding(value) {
    const binding = normalizeBinding(value);

    if (!binding) {
      return { ok: false, reason: "missing" };
    }

    if (
      [
        "Escape",
        "Tab",
        "Enter",
        " ",
        "Control",
        "Alt",
        "Shift",
        "Meta"
      ].includes(binding.key)
    ) {
      return { ok: false, reason: "structural" };
    }

    if (
      binding.primary &&
      ["l", "t", "w", "n", "r"].includes(binding.key)
    ) {
      return { ok: false, reason: "browser" };
    }

    if (binding.alt && binding.key === "F4") {
      return { ok: false, reason: "browser" };
    }

    return { ok: true, binding };
  }

  function matchesBinding(event, value) {
    const binding = normalizeBinding(value);

    if (!binding) {
      return false;
    }

    const primaryPressed = Boolean(event.ctrlKey || event.metaKey);

    return (
      normalizeKey(event.key) === binding.key &&
      primaryPressed === binding.primary &&
      Boolean(event.altKey) === binding.alt &&
      (
        binding.shift === null ||
        Boolean(event.shiftKey) === binding.shift
      )
    );
  }

  function formatBinding(value, primaryLabel = "Ctrl") {
    const binding = normalizeBinding(value);

    if (!binding) {
      return "";
    }

    const parts = [];

    if (binding.primary) {
      parts.push(primaryLabel);
    }

    if (binding.alt) {
      parts.push("Alt");
    }

    if (binding.shift === true) {
      parts.push("Shift");
    }

    const keyLabels = {
      " ": "Space",
      ",": ",",
      "/": "/"
    };

    parts.push(keyLabels[binding.key] || binding.key.toLocaleUpperCase());
    return parts.join("+");
  }

  globalObject.TabOutDashboardSettings = Object.freeze({
    SETTINGS_VERSION,
    STORAGE_KEY,
    GRID_COLUMNS,
    MODULE_IDS,
    GRID_REGIONS,
    LANGUAGE_DOCKS,
    MODULE_MIN_SPANS,
    KEYBOARD_ACTIONS,
    PRESETS,
    DEFAULT_KEYBOARD,
    DEFAULT_VISIBILITY,
    DEFAULT_VIEWS,
    DEFAULT_BEHAVIOR,
    ORIGINAL_PLACEMENTS,
    clone,
    normalizeBinding,
    normalizeSettings,
    normalizePlacements,
    getDefaultSettings,
    applyPreset,
    updateModulePlacement,
    resizeModule,
    nudgeModule,
    setModuleVisibility,
    resolvePlacementCollisions,
    requiresMigration,
    bindingSignature,
    findBindingConflict,
    validateBinding,
    matchesBinding,
    formatBinding
  });
})(globalThis);
