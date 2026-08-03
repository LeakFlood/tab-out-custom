(function exposeTabOutDashboardSettings(globalObject) {
  const SETTINGS_VERSION = 10;
  const STORAGE_KEY = "tabOutDashboardSettings";
  const GRID_COLUMNS = 12;
  const DEFAULT_CONTAINER_PADDING = 64;
  const MIN_CONTAINER_PADDING = 0;
  const MAX_CONTAINER_PADDING = 120;

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
    "todo",
    "gmail",
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
    todo: 4,
    gmail: 4,
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
    Object.fromEntries(
      MODULE_IDS.map((moduleId) => [
        moduleId,
        !["gmail", "todo"].includes(moduleId)
      ])
    )
  );

  const DEFAULT_UNASSIGNED_VIEW = Object.freeze({
    density: "comfortable",
    columns: "responsive",
    minColumnWidth: 290,
    visibleTabCount: 2
  });

  const DEFAULT_APPEARANCE = Object.freeze({
    theme: "dark"
  });

  const GMAIL_VIEW_PRESETS = Object.freeze({
    scan: Object.freeze({
      preset: "scan",
      density: "compact",
      textSize: "small",
      snippetLines: 1,
      unreadEmphasis: "strong",
      conversationDisplay: "inline",
      readingWidth: "normal",
      messageSpacing: "compact"
    }),
    balanced: Object.freeze({
      preset: "balanced",
      density: "comfortable",
      textSize: "medium",
      snippetLines: 2,
      unreadEmphasis: "strong",
      conversationDisplay: "split",
      readingWidth: "normal",
      messageSpacing: "comfortable"
    }),
    reading: Object.freeze({
      preset: "reading",
      density: "spacious",
      textSize: "large",
      snippetLines: 3,
      unreadEmphasis: "strong",
      conversationDisplay: "split",
      readingWidth: "focused",
      messageSpacing: "spacious"
    })
  });

  const DEFAULT_GMAIL_VIEW = GMAIL_VIEW_PRESETS.balanced;

  const DEFAULT_VIEWS = Object.freeze({
    shortcuts: "tiles",
    sessions: "cards",
    unassigned: DEFAULT_UNASSIGNED_VIEW,
    savedLater: "panel",
    todo: "comfortable",
    gmail: DEFAULT_GMAIL_VIEW
  });

  const DEFAULT_TODO_COLORS = Object.freeze({
    overdue: "#dc2626",
    today: "#f97316",
    soon: "#d97706",
    future: "#2563eb"
  });

  const DEFAULT_TODO_SETTINGS = Object.freeze({
    completionAction: "archive",
    emailTaskIntegrationEnabled: true,
    emailCompletionAction: "keep",
    showFullTitles: false,
    deadlineColorsEnabled: true,
    dueSoonDays: 3,
    colors: DEFAULT_TODO_COLORS
  });

  const GMAIL_POLL_INTERVALS = Object.freeze([5, 15, 30, 60]);
  const GMAIL_BADGE_MODES = Object.freeze([
    "openTabs",
    "gmailUnread",
    "combined",
    "hidden"
  ]);
  const GMAIL_NOTIFICATION_PREVIEWS = Object.freeze([
    "private",
    "senderSubject",
    "full"
  ]);

  const DEFAULT_GMAIL_ACCOUNT_PREFERENCES = Object.freeze({
    visible: true,
    expanded: true,
    filters: Object.freeze({
      inbox: true,
      unread: true,
      starred: false,
      important: false
    }),
    advancedQuery: "",
    maxResults: 10,
    pollingEnabled: true,
    pollingIntervalMinutes: 5,
    notificationsEnabled: true,
    notificationPreview: "full"
  });

  const DEFAULT_GMAIL_INTEGRATION = Object.freeze({
    badgeMode: "openTabs",
    maskAccountAddresses: false,
    accountDefaults: DEFAULT_GMAIL_ACCOUNT_PREFERENCES,
    accountPreferences: Object.freeze({})
  });

  const DEFAULT_INTEGRATIONS = Object.freeze({
    gmail: DEFAULT_GMAIL_INTEGRATION
  });

  const DEFAULT_BEHAVIOR = Object.freeze({
    includeSuspendedTabs: true,
    copyTabLinksOnRightClick: true,
    dragUnassignedTabs: true,
    expandSessionTabs: true,
    dragSessionTabs: true,
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
    gmail: Object.freeze({
      region: "content",
      column: 3,
      row: 2,
      columnSpan: 9,
      order: 0
    }),
    todo: Object.freeze({
      region: "content",
      column: 0,
      row: 3,
      columnSpan: 12,
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
          gmail: Object.freeze({
            region: "content",
            column: 4,
            row: 2,
            columnSpan: 8,
            order: 0
          }),
          todo: Object.freeze({
            region: "content",
            column: 0,
            row: 3,
            columnSpan: 12,
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
        unassigned: Object.freeze({
          density: "compact",
          columns: "single",
          minColumnWidth: 290,
          visibleTabCount: 2
        }),
        savedLater: "list",
        todo: "compact",
        gmail: GMAIL_VIEW_PRESETS.scan
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

  function normalizeContainerPadding(value) {
    const requested = Number(value);
    const padding = Number.isFinite(requested)
      ? requested
      : DEFAULT_CONTAINER_PADDING;
    return clamp(
      Math.round(padding / 2) * 2,
      MIN_CONTAINER_PADDING,
      MAX_CONTAINER_PADDING
    );
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

  function normalizeUnassignedView(value, fallback = DEFAULT_UNASSIGNED_VIEW) {
    const fallbackView =
      fallback && typeof fallback === "object"
        ? fallback
        : DEFAULT_UNASSIGNED_VIEW;

    if (value === "compactList") {
      return {
        density: "compact",
        columns: "single",
        minColumnWidth: 290,
        visibleTabCount: 2
      };
    }

    if (value === "domainGrid") {
      return clone(DEFAULT_UNASSIGNED_VIEW);
    }

    const requestedWidth = Number(value?.minColumnWidth);
    const fallbackWidth = Number(fallbackView.minColumnWidth);
    const normalizedWidth = Number.isFinite(requestedWidth)
      ? requestedWidth
      : fallbackWidth;
    const requestedVisibleCount = value?.visibleTabCount;
    const fallbackVisibleCount = [2, 4, "all"].includes(
      fallbackView.visibleTabCount
    )
      ? fallbackView.visibleTabCount
      : DEFAULT_UNASSIGNED_VIEW.visibleTabCount;

    return {
      density: normalizeChoice(
        value?.density,
        ["comfortable", "compact"],
        fallbackView.density
      ),
      columns: normalizeChoice(
        value?.columns,
        ["single", "responsive"],
        fallbackView.columns
      ),
      minColumnWidth:
        Math.round(clamp(normalizedWidth, 220, 420) / 10) * 10,
      visibleTabCount: [2, 4, "all"].includes(requestedVisibleCount)
        ? requestedVisibleCount
        : fallbackVisibleCount
    };
  }

  function normalizeGmailView(value, fallback = DEFAULT_GMAIL_VIEW) {
    if (value === "compact") {
      return clone(GMAIL_VIEW_PRESETS.scan);
    }

    if (value === "comfortable") {
      return clone(GMAIL_VIEW_PRESETS.balanced);
    }

    if (!value || typeof value !== "object") {
      return clone(
        fallback && typeof fallback === "object"
          ? fallback
          : DEFAULT_GMAIL_VIEW
      );
    }

    const presetId = String(value?.preset || "");

    if (Object.prototype.hasOwnProperty.call(GMAIL_VIEW_PRESETS, presetId)) {
      return clone(GMAIL_VIEW_PRESETS[presetId]);
    }

    const fallbackView =
      fallback && typeof fallback === "object"
        ? fallback
        : DEFAULT_GMAIL_VIEW;
    const requestedSnippetLines = Number(value?.snippetLines);

    return {
      preset: "custom",
      density: normalizeChoice(
        value?.density,
        ["compact", "comfortable", "spacious"],
        fallbackView.density
      ),
      textSize: normalizeChoice(
        value?.textSize,
        ["small", "medium", "large"],
        fallbackView.textSize
      ),
      snippetLines: [0, 1, 2, 3].includes(requestedSnippetLines)
        ? requestedSnippetLines
        : fallbackView.snippetLines,
      unreadEmphasis: normalizeChoice(
        value?.unreadEmphasis,
        ["subtle", "strong"],
        fallbackView.unreadEmphasis
      ),
      conversationDisplay: normalizeChoice(
        value?.conversationDisplay,
        ["inline", "split"],
        fallbackView.conversationDisplay
      ),
      readingWidth: normalizeChoice(
        value?.readingWidth,
        ["focused", "normal", "wide"],
        fallbackView.readingWidth
      ),
      messageSpacing: normalizeChoice(
        value?.messageSpacing,
        ["compact", "comfortable", "spacious"],
        fallbackView.messageSpacing
      )
    };
  }

  function normalizeAppearance(value, fallback = DEFAULT_APPEARANCE) {
    return {
      theme: normalizeChoice(
        value?.theme,
        ["dark", "light"],
        fallback?.theme || DEFAULT_APPEARANCE.theme
      )
    };
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
      unassigned: normalizeUnassignedView(
        value?.unassigned,
        fallback.unassigned
      ),
      savedLater: normalizeChoice(
        value?.savedLater,
        ["panel", "list"],
        fallback.savedLater
      ),
      todo: normalizeChoice(
        value?.todo,
        ["comfortable", "compact"],
        fallback.todo || DEFAULT_VIEWS.todo
      ),
      gmail: normalizeGmailView(
        value?.gmail,
        fallback.gmail || DEFAULT_VIEWS.gmail
      )
    };
  }

  function normalizeGmailAccountPreferences(
    value,
    fallback = DEFAULT_GMAIL_ACCOUNT_PREFERENCES
  ) {
    const requestedMaxResults = Number(value?.maxResults);
    const fallbackMaxResults = [5, 10, 15, 20, 25].includes(
      Number(fallback?.maxResults)
    )
      ? Number(fallback.maxResults)
      : DEFAULT_GMAIL_ACCOUNT_PREFERENCES.maxResults;
    const requestedPollingInterval = Number(
      value?.pollingIntervalMinutes
    );
    const fallbackPollingInterval = GMAIL_POLL_INTERVALS.includes(
      Number(fallback?.pollingIntervalMinutes)
    )
      ? Number(fallback.pollingIntervalMinutes)
      : DEFAULT_GMAIL_ACCOUNT_PREFERENCES.pollingIntervalMinutes;

    return {
      visible:
        typeof value?.visible === "boolean"
          ? value.visible
          : fallback.visible !== false,
      expanded:
        typeof value?.expanded === "boolean"
          ? value.expanded
          : fallback.expanded !== false,
      filters: {
        inbox:
          typeof value?.filters?.inbox === "boolean"
            ? value.filters.inbox
            : fallback.filters.inbox,
        unread:
          typeof value?.filters?.unread === "boolean"
            ? value.filters.unread
            : fallback.filters.unread,
        starred:
          typeof value?.filters?.starred === "boolean"
            ? value.filters.starred
            : fallback.filters.starred,
        important:
          typeof value?.filters?.important === "boolean"
            ? value.filters.important
            : fallback.filters.important
      },
      advancedQuery: String(
        typeof value?.advancedQuery === "string"
          ? value.advancedQuery
          : fallback.advancedQuery || ""
      ).trim().slice(0, 500),
      maxResults: [5, 10, 15, 20, 25].includes(requestedMaxResults)
        ? requestedMaxResults
        : fallbackMaxResults,
      pollingEnabled:
        typeof value?.pollingEnabled === "boolean"
          ? value.pollingEnabled
          : fallback.pollingEnabled !== false,
      pollingIntervalMinutes: GMAIL_POLL_INTERVALS.includes(
        requestedPollingInterval
      )
        ? requestedPollingInterval
        : fallbackPollingInterval,
      notificationsEnabled:
        typeof value?.notificationsEnabled === "boolean"
          ? value.notificationsEnabled
          : fallback.notificationsEnabled !== false,
      notificationPreview: normalizeChoice(
        value?.notificationPreview,
        GMAIL_NOTIFICATION_PREVIEWS,
        fallback.notificationPreview ||
          DEFAULT_GMAIL_ACCOUNT_PREFERENCES.notificationPreview
      )
    };
  }

  function normalizeGmailIntegration(
    value,
    fallback = DEFAULT_GMAIL_INTEGRATION
  ) {
    const legacyPreferences =
      value?.accountDefaults ||
      (
        value?.filters ||
        value?.advancedQuery !== undefined ||
        value?.maxResults !== undefined
          ? value
          : null
      );
    const fallbackDefaults =
      fallback?.accountDefaults ||
      DEFAULT_GMAIL_ACCOUNT_PREFERENCES;
    const rawAccountPreferences =
      value?.accountPreferences &&
      typeof value.accountPreferences === "object"
        ? value.accountPreferences
        : {};
    const accountPreferences = {};

    Object.entries(rawAccountPreferences)
      .slice(0, 50)
      .forEach(([accountId, preferences]) => {
        if (!/^[a-zA-Z0-9_-]{8,128}$/.test(accountId)) {
          return;
        }

        accountPreferences[accountId] =
          normalizeGmailAccountPreferences(
            preferences,
            fallbackDefaults
          );
      });

    return {
      badgeMode: normalizeChoice(
        value?.badgeMode,
        GMAIL_BADGE_MODES,
        fallback?.badgeMode || DEFAULT_GMAIL_INTEGRATION.badgeMode
      ),
      maskAccountAddresses:
        typeof value?.maskAccountAddresses === "boolean"
          ? value.maskAccountAddresses
          : fallback?.maskAccountAddresses === true,
      accountDefaults: normalizeGmailAccountPreferences(
        legacyPreferences,
        fallbackDefaults
      ),
      accountPreferences
    };
  }

  function normalizeIntegrations(value, fallback = DEFAULT_INTEGRATIONS) {
    return {
      gmail: normalizeGmailIntegration(
        value?.gmail,
        fallback.gmail || DEFAULT_GMAIL_INTEGRATION
      )
    };
  }

  function normalizeTodoColor(value, fallback) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color)
      ? color.toLowerCase()
      : fallback;
  }

  function normalizeTodoSettings(value, fallback = DEFAULT_TODO_SETTINGS) {
    const requestedDueSoonDays = Number(value?.dueSoonDays);
    const dueSoonDays = Number.isFinite(requestedDueSoonDays)
      ? Math.round(clamp(requestedDueSoonDays, 1, 30))
      : fallback.dueSoonDays;

    return {
      completionAction: normalizeChoice(
        value?.completionAction,
        ["archive", "keepCompleted", "delete"],
        fallback.completionAction
      ),
      emailTaskIntegrationEnabled:
        value?.emailTaskIntegrationEnabled !== false,
      emailCompletionAction: normalizeChoice(
        value?.emailCompletionAction,
        ["keep", "markRead", "archive"],
        fallback.emailCompletionAction ||
          DEFAULT_TODO_SETTINGS.emailCompletionAction
      ),
      showFullTitles:
        typeof value?.showFullTitles === "boolean"
          ? value.showFullTitles
          : fallback.showFullTitles,
      deadlineColorsEnabled:
        value?.deadlineColorsEnabled !== false,
      dueSoonDays,
      colors: Object.fromEntries(
        Object.keys(DEFAULT_TODO_COLORS).map((colorId) => [
          colorId,
          normalizeTodoColor(
            value?.colors?.[colorId],
            fallback.colors?.[colorId] || DEFAULT_TODO_COLORS[colorId]
          )
        ])
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
      appearance: clone(DEFAULT_APPEARANCE),
      layout: {
        mode: preset.layout.mode,
        containerPadding: DEFAULT_CONTAINER_PADDING,
        visibility: clone(preset.layout.visibility),
        placements: clone(preset.layout.placements)
      },
      views: clone(preset.views),
      behavior: clone(DEFAULT_BEHAVIOR),
      integrations: clone(DEFAULT_INTEGRATIONS),
      todo: clone(DEFAULT_TODO_SETTINGS),
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
      appearance: clone(DEFAULT_APPEARANCE),
      layout: {
        mode: "original",
        containerPadding: DEFAULT_CONTAINER_PADDING,
        visibility,
        placements: clone(ORIGINAL_PLACEMENTS)
      },
      views,
      behavior: clone(DEFAULT_BEHAVIOR),
      integrations: clone(DEFAULT_INTEGRATIONS),
      todo: clone(DEFAULT_TODO_SETTINGS),
      keyboard: normalizeKeyboard(value?.keyboard)
    };
  }

  function normalizeCurrentSettings(value) {
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
      appearance: normalizeAppearance(value?.appearance),
      layout: {
        mode: normalizeChoice(
          value?.layout?.mode,
          ["original", "grid"],
          fallbackPreset.layout.mode
        ),
        containerPadding: normalizeContainerPadding(
          value?.layout?.containerPadding
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
      integrations: normalizeIntegrations(value?.integrations),
      todo: normalizeTodoSettings(value?.todo),
      behavior: {
        includeSuspendedTabs:
          value?.behavior?.includeSuspendedTabs !== false,
        copyTabLinksOnRightClick:
          value?.behavior?.copyTabLinksOnRightClick !== false,
        dragUnassignedTabs:
          value?.behavior?.dragUnassignedTabs !== false,
        expandSessionTabs:
          value?.behavior?.expandSessionTabs !== false,
        dragSessionTabs:
          value?.behavior?.dragSessionTabs !== false,
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

  function migrateVersionTwoSettings(value) {
    return normalizeCurrentSettings({
      ...value,
      version: SETTINGS_VERSION
    });
  }

  function requiresMigration(value) {
    return Boolean(value) && Number(value.version) !== SETTINGS_VERSION;
  }

  function normalizeSettings(value) {
    if (!value || typeof value !== "object") {
      return getDefaultSettings();
    }

    if ([2, 3, 4].includes(Number(value.version))) {
      return migrateVersionTwoSettings(value);
    }

    if (Number(value.version) !== SETTINGS_VERSION) {
      if (
        value.layout ||
        value.views ||
        value.appearance ||
        value.integrations ||
        value.behavior ||
        value.todo
      ) {
        return migrateVersionTwoSettings(value);
      }

      return migrateVersionOneSettings(value);
    }

    return normalizeCurrentSettings(value);
  }

  function applyPreset(value, presetId) {
    const current = normalizeSettings(value);
    const next = getPresetSettings(
      Object.prototype.hasOwnProperty.call(PRESETS, presetId)
        ? presetId
        : "original"
    );
    next.behavior = current.behavior;
    next.appearance = current.appearance;
    next.integrations = current.integrations;
    next.todo = current.todo;
    next.keyboard = current.keyboard;
    next.layout.containerPadding = current.layout.containerPadding;
    return normalizeSettings(next);
  }

  function applyGmailViewPreset(value, presetId) {
    const settings = normalizeSettings(value);
    const preset = GMAIL_VIEW_PRESETS[presetId] ||
      GMAIL_VIEW_PRESETS.balanced;
    settings.views.gmail = clone(preset);
    settings.preset = "custom";
    return normalizeSettings(settings);
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
    DEFAULT_CONTAINER_PADDING,
    MIN_CONTAINER_PADDING,
    MAX_CONTAINER_PADDING,
    MODULE_IDS,
    GRID_REGIONS,
    LANGUAGE_DOCKS,
    MODULE_MIN_SPANS,
    KEYBOARD_ACTIONS,
    PRESETS,
    DEFAULT_KEYBOARD,
    DEFAULT_VISIBILITY,
    DEFAULT_UNASSIGNED_VIEW,
    DEFAULT_APPEARANCE,
    GMAIL_VIEW_PRESETS,
    DEFAULT_GMAIL_VIEW,
    DEFAULT_VIEWS,
    DEFAULT_BEHAVIOR,
    GMAIL_POLL_INTERVALS,
    GMAIL_BADGE_MODES,
    GMAIL_NOTIFICATION_PREVIEWS,
    DEFAULT_GMAIL_ACCOUNT_PREFERENCES,
    DEFAULT_GMAIL_INTEGRATION,
    DEFAULT_INTEGRATIONS,
    DEFAULT_TODO_COLORS,
    DEFAULT_TODO_SETTINGS,
    ORIGINAL_PLACEMENTS,
    clone,
    normalizeBinding,
    normalizeSettings,
    normalizePlacements,
    getDefaultSettings,
    applyPreset,
    applyGmailViewPreset,
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
