'use strict';

(() => {
  const catalog = {
    MODULE_LABEL_KEYS: {
      greeting: "moduleGreeting",
      time: "moduleTime",
      date: "moduleDate",
      weather: "moduleWeather",
      shortcuts: "moduleShortcuts",
      language: "moduleLanguage",
      sessions: "moduleSessions",
      unassigned: "moduleUnassigned",
      savedLater: "moduleSavedLater",
      todo: "moduleTodo",
      gmail: "moduleGmail",
      stats: "moduleStats"
    },
    MODULE_NODE_IDS: {
      greeting: "greeting",
      time: "timeDisplay",
      date: "dateDisplay",
      weather: "weatherWidget",
      shortcuts: null,
      language: "languageToggleBtn",
      sessions: "savedSessionsSection",
      unassigned: "openTabsSection",
      savedLater: "deferredColumn",
      todo: "todoWidget",
      gmail: "gmailWidget",
      stats: "footerStats"
    },
    KEYBOARD_LABEL_KEYS: {
      openSettings: "keyboardOpenSettings",
      searchUnassigned: "keyboardSearchUnassigned",
      focusShortcuts: "keyboardFocusShortcuts",
      focusSessions: "keyboardFocusSessions",
      focusUnassigned: "keyboardFocusUnassigned",
      focusSavedLater: "keyboardFocusSavedLater",
      createSession: "keyboardCreateSession",
      addShortcut: "keyboardAddShortcut"
    },
    POPUP_COMMAND_NAME: "_execute_action",
    PRESET_META: {
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
    },
    VIEW_META: {
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
      savedLater: {
        options: [
          ["panel", "stylePanel"],
          ["list", "styleList"]
        ]
      },
      todo: {
        options: [
          ["comfortable", "densityComfortable"],
          ["compact", "styleCompact"]
        ]
      }
    },
    MODULE_ACTION_MAP: {
      focusShortcuts: "shortcuts",
      focusSessions: "sessions",
      focusUnassigned: "unassigned",
      focusSavedLater: "savedLater"
    }
  };

  globalThis.TabOutSettingsCatalog = Object.freeze(catalog);
})();
