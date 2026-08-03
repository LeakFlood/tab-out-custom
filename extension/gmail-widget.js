(function setupTabOutGmailWidget(globalObject) {
  const ACCOUNTS_KEY = "tabOutGmailAccountsV3";
  const OAUTH_CLIENTS_KEY = "tabOutGmailOAuthClientsV1";
  const SETTINGS_KEY =
    globalObject.TabOutDashboardSettings?.STORAGE_KEY ||
    "tabOutDashboardSettings";
  const ACTION_INVERSES = Object.freeze({
    markRead: "markUnread",
    markUnread: "markRead",
    archive: "restoreInbox",
    restoreInbox: "archive",
    star: "unstar",
    unstar: "star",
    trash: "untrash",
    untrash: "trash"
  });
  let cachedState = {
    status: globalObject.TabOutGmailConfig?.isConfigured?.()
      ? "disconnected"
      : "unavailable",
    authStatus: globalObject.TabOutGmailConfig?.isConfigured?.()
      ? "unknown"
      : "unavailable",
    accounts: [],
    loading: false
  };
  const threadResults = new Map();
  const automaticCacheMissRefreshAttempts = new Set();
  const previews = new Map();
  const expandedThreads = new Set();
  const expandedMessageIds = new Set();
  const pendingActions = new Set();
  const pendingAccountPreferenceUpdates = new Set();
  const todoService = globalObject.TabOutTodoService;
  const todoTasksBySourceKey = new Map();
  const pendingTodoTaskKeys = new Set();
  const SPLIT_PANE_MIN_WIDTH = 760;
  let splitPaneAvailable = false;
  let widgetResizeObserver = null;
  let activeTodoComposer = null;
  let pendingAccountOrder = false;
  let accountDragState = null;
  let suppressedAccountExpansionId = "";
  let gmailSubjectTooltipTarget = null;
  let gmailRelativeTimeTimer = null;
  const ACCOUNT_DRAG_THRESHOLD = 7;
  const GMAIL_RELATIVE_TIME_INTERVAL_MS = 60 * 1000;

  function sendGmailMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            code: "chrome_api_failed",
            messageKey: "gmailWidgetError"
          });
          return;
        }

        resolve(response || {
          ok: false,
          code: "chrome_api_failed",
          messageKey: "gmailWidgetError"
        });
      });
    });
  }

  function waitForAuthResult(transactionId) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve({
          ok: false,
          code: "oauth_timeout",
          messageKey: "gmailOAuthTimeout"
        });
      }, 5 * 60 * 1000 + 5000);

      function listener(message) {
        if (
          message?.type !== "tabOutGmail:authCompleted" ||
          message.transactionId !== transactionId
        ) {
          return undefined;
        }

        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message);
        return undefined;
      }

      chrome.runtime.onMessage.addListener(listener);
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function threadKey(accountId, threadId) {
    return `${accountId}:${threadId}`;
  }

  function emitStateChange() {
    document.dispatchEvent(
      new CustomEvent("tabout:gmail-state-changed", {
        detail: clone(cachedState)
      })
    );
  }

  function setCachedState(updates) {
    cachedState = {
      ...cachedState,
      ...updates
    };
    emitStateChange();
  }

  function getWidget() {
    return document.getElementById("gmailWidget");
  }

  function getGmailSubjectTooltip() {
    let tooltip = document.getElementById("gmailSubjectTooltip");

    if (tooltip) {
      return tooltip;
    }

    tooltip = document.createElement("div");
    tooltip.id = "gmailSubjectTooltip";
    tooltip.className = "gmail-subject-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function isGmailSubjectTruncated(element) {
    return Boolean(
      element &&
      element.clientWidth > 0 &&
      (
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      )
    );
  }

  function positionGmailSubjectTooltip(tooltip, target) {
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const centeredLeft =
      targetRect.left +
      targetRect.width / 2 -
      tooltipRect.width / 2;
    const maximumLeft =
      window.innerWidth - tooltipRect.width - viewportPadding;
    const left = Math.min(
      Math.max(viewportPadding, centeredLeft),
      Math.max(viewportPadding, maximumLeft)
    );
    const preferredTop = targetRect.top - tooltipRect.height - gap;
    const top = preferredTop >= viewportPadding
      ? preferredTop
      : Math.min(
          window.innerHeight - tooltipRect.height - viewportPadding,
          targetRect.bottom + gap
        );

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.max(
      viewportPadding,
      Math.round(top)
    )}px`;
  }

  function hideGmailSubjectTooltip() {
    const tooltip = document.getElementById("gmailSubjectTooltip");

    if (gmailSubjectTooltipTarget) {
      gmailSubjectTooltipTarget.removeAttribute("aria-describedby");
      gmailSubjectTooltipTarget = null;
    }

    if (!tooltip) {
      return;
    }

    tooltip.hidden = true;
    tooltip.textContent = "";
  }

  function showGmailSubjectTooltip(target) {
    const subject = String(target?.textContent || "").trim();

    if (!subject || !isGmailSubjectTruncated(target)) {
      hideGmailSubjectTooltip();
      return;
    }

    const tooltip = getGmailSubjectTooltip();

    if (
      gmailSubjectTooltipTarget &&
      gmailSubjectTooltipTarget !== target
    ) {
      gmailSubjectTooltipTarget.removeAttribute("aria-describedby");
    }

    gmailSubjectTooltipTarget = target;
    target.setAttribute("aria-describedby", tooltip.id);
    tooltip.textContent = subject;
    tooltip.hidden = false;
    positionGmailSubjectTooltip(tooltip, target);
  }

  function handleGmailSubjectPointerOver(event) {
    const target = event.target.closest?.(
      ".gmail-subject-tooltip-target"
    );

    if (
      !target ||
      !getWidget()?.contains(target) ||
      target.contains(event.relatedTarget)
    ) {
      return;
    }

    showGmailSubjectTooltip(target);
  }

  function handleGmailSubjectPointerOut(event) {
    if (
      !gmailSubjectTooltipTarget ||
      !gmailSubjectTooltipTarget.contains(event.target) ||
      gmailSubjectTooltipTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    hideGmailSubjectTooltip();
  }

  function getGmailViewSettings() {
    return (
      globalObject.TabOutDashboardRuntime?.getEffectiveSettings?.()
        ?.views?.gmail ||
      globalObject.TabOutDashboardSettings?.DEFAULT_GMAIL_VIEW || {
        conversationDisplay: "inline"
      }
    );
  }

  function getTodoSettings() {
    return (
      globalObject.TabOutDashboardRuntime?.getEffectiveSettings?.().todo ||
      globalObject.TabOutDashboardSettings?.DEFAULT_TODO_SETTINGS || {
        emailTaskIntegrationEnabled: true
      }
    );
  }

  function createGmailTaskSource(account, thread) {
    return {
      type: "gmailThread",
      accountId: account.accountId,
      accountEmail: account.email,
      threadId: thread.threadId,
      latestMessageId: thread.latestMessageId,
      senderName: thread.senderName,
      senderEmail: thread.senderEmail,
      subject: thread.subject,
      capturedAt: new Date().toISOString()
    };
  }

  function getGmailTaskKey(account, thread) {
    return todoService?.getTaskSourceKey?.(
      createGmailTaskSource(account, thread)
    ) || "";
  }

  async function refreshTodoTaskLinks({ renderAfter = true } = {}) {
    if (!todoService) {
      return;
    }

    try {
      const todoSnapshot = await todoService.getSnapshot();
      todoTasksBySourceKey.clear();

      todoSnapshot.state.tasks.forEach((task) => {
        const key = todoService.getTaskSourceKey(task.source);

        if (key) {
          todoTasksBySourceKey.set(key, task);
        }
      });
    } catch (error) {
      console.warn("[tab-out] Gmail task links could not be loaded:", error);
    }

    if (renderAfter) {
      render();
    }
  }

  function isSplitPaneActive() {
    return (
      getGmailViewSettings().conversationDisplay === "split" &&
      splitPaneAvailable
    );
  }

  function isWidgetVisible() {
    const widget = getWidget();
    const wrapper = widget?.closest('[data-dashboard-module="gmail"]');
    return Boolean(widget && !widget.hidden && (!wrapper || !wrapper.hidden));
  }

  function getPermissionOrigins() {
    const config = globalObject.TabOutGmailConfig;

    if (!config) {
      return [];
    }

    return [
      `${config.GMAIL_API_ORIGIN}/*`,
      `${config.OAUTH_API_ORIGIN}/*`
    ];
  }

  async function requestGmailPermissions() {
    const origins = getPermissionOrigins();

    if (!origins.length) {
      return {
        ok: false,
        code: "config_missing",
        messageKey: "gmailConfigMissing"
      };
    }

    try {
      const granted = await chrome.permissions.request({
        origins,
        permissions: ["notifications", "alarms"]
      });

      if (!granted) {
        return {
            ok: false,
            code: "permission_denied",
            messageKey: "gmailPermissionDenied"
          };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        code: "permission_denied",
        messageKey: "gmailPermissionDenied"
      };
    }
  }

  async function removeGmailPermissionsWhenUnused() {
    if (cachedState.accounts.length || !getPermissionOrigins().length) {
      return;
    }

    try {
      await chrome.permissions.remove({
        permissions: ["notifications", "alarms"],
        origins: getPermissionOrigins()
      });
    } catch {
      // Connection removal already succeeded; permission cleanup is best effort.
    }
  }

  function formatGmailDate(timestamp) {
    if (!timestamp) {
      return "";
    }

    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    return new Intl.DateTimeFormat(activeLocale(), sameDay
      ? { hour: "2-digit", minute: "2-digit" }
      : { month: "short", day: "numeric" }
    ).format(date);
  }

  function formatLastUpdated(timestamp) {
    if (!timestamp) {
      return t("gmailNeverUpdated");
    }

    const minutes = Math.max(
      0,
      Math.floor((Date.now() - Number(timestamp)) / 60000)
    );
    return minutes < 1
      ? t("gmailLastUpdatedNow")
      : t("gmailLastUpdatedMinutes", { count: minutes });
  }

  function getAccountThreadRefreshAt(accountId) {
    return Number(
      threadResults.get(String(accountId || ""))?.fetchedAt
    ) || 0;
  }

  function updateGmailRelativeTimeLabels() {
    const updated = document.getElementById("gmailWidgetUpdated");

    if (updated) {
      const timestamp = Number(
        updated.dataset.gmailLastUpdatedAt
      ) || 0;
      updated.textContent = timestamp
        ? formatLastUpdated(timestamp)
        : "";
    }

    document.querySelectorAll(
      "[data-gmail-account-relative-time]"
    ).forEach((element) => {
      const unreadCount = Number(
        element.dataset.gmailUnreadCount
      ) || 0;
      const timestamp = Number(
        element.dataset.gmailLastUpdatedAt
      ) || 0;

      element.textContent = [
        t("gmailUnreadCount", { count: unreadCount }),
        formatLastUpdated(timestamp)
      ].join(" · ");
    });
  }

  function scheduleGmailRelativeTimeUpdate() {
    window.clearTimeout(gmailRelativeTimeTimer);
    const delay =
      GMAIL_RELATIVE_TIME_INTERVAL_MS -
      (Date.now() % GMAIL_RELATIVE_TIME_INTERVAL_MS) +
      25;

    gmailRelativeTimeTimer = window.setTimeout(() => {
      updateGmailRelativeTimeLabels();
      scheduleGmailRelativeTimeUpdate();
    }, delay);
  }

  function senderInitial(senderName) {
    const firstCharacter = Array.from(String(senderName || "G").trim())[0];
    return (firstCharacter || "G").toLocaleUpperCase(activeLocale());
  }

  function htmlBodyToText(html) {
    const documentFragment = new DOMParser().parseFromString(
      String(html || ""),
      "text/html"
    );

    documentFragment
      .querySelectorAll(
        "script, style, iframe, object, embed, img, audio, video"
      )
      .forEach((element) => element.remove());
    return String(documentFragment.body?.textContent || "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getMessageBodyText(message) {
    const body = message?.body;

    if (!body?.content) {
      return "";
    }

    return body.kind === "html"
      ? htmlBodyToText(body.content)
      : String(body.content).trim();
  }

  function createButton({
    className = "",
    textKey,
    titleKey = textKey,
    action,
    disabled = false
  }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = t(textKey);
    button.title = t(titleKey);
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
  }

  function renderWidgetState(messageKey, action = null) {
    const state = document.getElementById("gmailWidgetState");

    if (!state) {
      return;
    }

    state.replaceChildren();
    const text = document.createElement("span");
    text.textContent = t(messageKey);
    state.appendChild(text);

    if (action) {
      state.appendChild(action);
    }

    state.hidden = false;
  }

  function createMessagePreview(
    message,
    { collapsible = false, expanded = true, onToggle = null } = {}
  ) {
    const article = document.createElement("article");
    article.className = "gmail-message-preview";
    article.classList.toggle("is-collapsed", collapsible && !expanded);
    const header = document.createElement("header");
    const sender = document.createElement("strong");
    sender.textContent = message.senderName || message.senderEmail || "Gmail";
    const date = document.createElement("time");
    date.dateTime = message.timestamp
      ? new Date(message.timestamp).toISOString()
      : "";
    date.textContent = formatGmailDate(message.timestamp);
    const body = document.createElement("pre");
    body.className = "gmail-message-body";
    body.textContent = getMessageBodyText(message) || t("gmailNoBody");

    if (collapsible) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "gmail-message-toggle";
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.title = t(
        expanded ? "gmailCollapseMessage" : "gmailExpandMessage"
      );
      toggle.setAttribute("aria-label", toggle.title);
      toggle.innerHTML = [
        '<svg viewBox="0 0 20 20" aria-hidden="true">',
        '<path d="m5.5 7.5 4.5 4.5 4.5-4.5"></path>',
        "</svg>"
      ].join("");
      toggle.prepend(sender, date);
      toggle.addEventListener("click", () => {
        const nextExpanded = onToggle?.();

        if (typeof nextExpanded !== "boolean") {
          return;
        }

        article.classList.toggle("is-collapsed", !nextExpanded);
        body.hidden = !nextExpanded;
        toggle.setAttribute("aria-expanded", String(nextExpanded));
        toggle.title = t(
          nextExpanded ? "gmailCollapseMessage" : "gmailExpandMessage"
        );
        toggle.setAttribute("aria-label", toggle.title);
      });
      header.appendChild(toggle);
      body.hidden = !expanded;
    } else {
      header.append(sender, date);
    }

    article.append(header, body);
    return article;
  }

  function createThreadPreview(account, thread, preview) {
    const key = threadKey(account.accountId, thread.threadId);
    const container = document.createElement("div");
    container.className = "gmail-thread-preview";

    if (preview?.loading) {
      const loading = document.createElement("p");
      loading.className = "gmail-preview-loading";
      loading.textContent = t(
        preview.mode === "thread"
          ? "gmailConversationLoading"
          : "gmailBodyLoading"
      );
      container.appendChild(loading);
      return container;
    }

    if (preview?.error) {
      const error = document.createElement("p");
      error.className = "gmail-preview-error";
      error.textContent = t(preview.messageKey || "gmailWidgetError");
      container.appendChild(error);
    } else {
      const messages = preview?.messages || [];
      messages.forEach((message, index) => {
        const messageKey = `${key}:${message.id || index}`;
        const collapsible =
          preview?.mode === "thread" && index < messages.length - 1;
        const expanded =
          !collapsible || expandedMessageIds.has(messageKey);
        container.appendChild(
          createMessagePreview(message, {
            collapsible,
            expanded,
            onToggle: () => {
              if (expandedMessageIds.has(messageKey)) {
                expandedMessageIds.delete(messageKey);
              } else {
                expandedMessageIds.add(messageKey);
              }
              return expandedMessageIds.has(messageKey);
            }
          })
        );
      });
    }

    const actions = document.createElement("div");
    actions.className = "gmail-preview-actions";

    if (
      thread.messageCount > 1 &&
      preview?.mode !== "thread" &&
      !preview?.loading
    ) {
      actions.appendChild(
        createButton({
          textKey: "gmailLoadConversation",
          action: (event) => {
            event.stopPropagation();
            void loadFullThread(account, thread);
          }
        })
      );
    }

    actions.append(
      createButton({
        className: "is-primary",
        textKey: "gmailOpenConversation",
        action: (event) => {
          event.stopPropagation();
          void openGmail(account.accountId, thread.threadId);
        }
      }),
      createButton({
        textKey: "gmailHidePreview",
        action: (event) => {
          event.stopPropagation();
          expandedThreads.delete(key);
          render();
        }
      })
    );
    container.appendChild(actions);
    return container;
  }

  function replaceThread(accountId, threadId, transform) {
    const result = threadResults.get(accountId);

    if (!result?.threads) {
      return;
    }

    result.threads = result.threads
      .map((thread) =>
        thread.threadId === threadId ? transform(thread) : thread
      )
      .filter(Boolean);
  }

  function optimisticThreadAction(accountId, threadId, action) {
    replaceThread(accountId, threadId, (thread) => {
      if (action === "markRead") {
        return { ...thread, unread: false };
      }

      if (action === "markUnread") {
        return { ...thread, unread: true };
      }

      if (action === "star") {
        return { ...thread, starred: true };
      }

      if (action === "unstar") {
        return { ...thread, starred: false };
      }

      if (["archive", "trash"].includes(action)) {
        return null;
      }

      return thread;
    });
  }

  async function performThreadAction(account, thread, action) {
    const key = threadKey(account.accountId, thread.threadId);

    if (pendingActions.has(key)) {
      return;
    }

    if (action === "trash" && !confirm(t("gmailTrashConfirm"))) {
      return;
    }

    const previousResult = clone(
      threadResults.get(account.accountId) || { threads: [] }
    );
    const wasExpanded = expandedThreads.has(key);
    pendingActions.add(key);

    if (["archive", "trash"].includes(action)) {
      expandedThreads.delete(key);
    }

    optimisticThreadAction(account.accountId, thread.threadId, action);
    render();
    const response = await sendGmailMessage({
      type: "tabOutGmail:action",
      accountId: account.accountId,
      threadId: thread.threadId,
      action
    });
    pendingActions.delete(key);

    if (!response.ok) {
      threadResults.set(account.accountId, previousResult);

      if (wasExpanded) {
        expandedThreads.add(key);
      }

      if (typeof showToast === "function") {
        showToast(t(response.messageKey || "gmailActionFailed"));
      }
      render();
      return;
    }

    const inverse = ACTION_INVERSES[action];

    if (inverse && typeof showToast === "function") {
      showToast(t("gmailActionComplete"), {
        actionLabel: t("undo"),
        onAction: async () => {
          await sendGmailMessage({
            type: "tabOutGmail:action",
            accountId: account.accountId,
            threadId: thread.threadId,
            action: inverse
          });
          await refreshAccount(account.accountId, { force: true });
        },
        duration: 5500
      });
    }

    if (response.threadCacheRefreshed === true) {
      await loadCachedThreads({
        accountId: account.accountId
      });
    } else {
      await refreshState({ renderAfter: false });
      const currentResult = threadResults.get(account.accountId);

      if (currentResult) {
        threadResults.set(account.accountId, {
          ...currentResult,
          stale: true
        });
      }

      render();
    }
  }

  async function viewTodoTask(task) {
    const focused = await globalObject.TabOutTodoWidget?.focusTask?.(
      task?.id
    );

    if (!focused && typeof showToast === "function") {
      showToast(t("todoEmailTaskWidgetHidden"));
    }
  }

  function toggleTodoComposer(account, thread, placement) {
    const key = getGmailTaskKey(account, thread);
    const effectivePlacement = isSplitPaneActive()
      ? "pane"
      : placement;

    if (!key) {
      return;
    }

    if (
      activeTodoComposer?.key === key &&
      activeTodoComposer?.placement === effectivePlacement
    ) {
      activeTodoComposer = null;
    } else {
      activeTodoComposer = {
        key,
        placement: effectivePlacement,
        title: thread.subject || t("gmailNoSubject"),
        notes: "",
        deadlineDate: "",
        deadlineTime: ""
      };
    }

    if (
      activeTodoComposer &&
      effectivePlacement === "pane" &&
      !expandedThreads.has(
        threadKey(account.accountId, thread.threadId)
      )
    ) {
      void toggleLatestPreview(account, thread);
    } else {
      render();
    }

    requestAnimationFrame(() => {
      document
        .querySelector(
          `[data-gmail-todo-composer="${CSS.escape(key)}"] ` +
          '[data-gmail-todo-field="title"]'
        )
        ?.focus();
    });
  }

  async function handleGmailTodoSubmit(event, account, thread) {
    event.preventDefault();
    const form = event.currentTarget;
    const key = getGmailTaskKey(account, thread);

    if (!todoService || !key || pendingTodoTaskKeys.has(key)) {
      return;
    }

    const title =
      form.querySelector('[data-gmail-todo-field="title"]')?.value || "";
    const notes =
      form.querySelector('[data-gmail-todo-field="notes"]')?.value || "";
    const deadlineDate =
      form.querySelector('[data-gmail-todo-field="deadlineDate"]')
        ?.value || "";
    const deadlineTime =
      form.querySelector('[data-gmail-todo-field="deadlineTime"]')
        ?.value || "";

    if (!title.trim()) {
      form
        .querySelector('[data-gmail-todo-field="title"]')
        ?.focus();
      return;
    }

    pendingTodoTaskKeys.add(key);
    render();

    try {
      const result = await todoService.addTask({
        title,
        notes,
        deadline: deadlineDate
          ? { date: deadlineDate, time: deadlineTime || null }
          : null,
        checklist: [],
        source: createGmailTaskSource(account, thread)
      });
      const task = result.task;

      if (task) {
        todoTasksBySourceKey.set(key, task);
      }

      activeTodoComposer = null;
      await globalObject.TabOutTodoWidget?.refresh?.();
      render();

      if (typeof showToast === "function") {
        if (result.changed) {
          showToast(t("todoEmailTaskAdded"), {
            actionLabel: t("todoEmailTaskView"),
            onAction: () => viewTodoTask(task),
            cancelLabel: t("todoUndo"),
            onCancel: async () => {
              await todoService.undo();
              await globalObject.TabOutTodoWidget?.refresh?.();
              await refreshTodoTaskLinks();
            },
            duration: 6500
          });
        } else if (result.reason === "duplicate") {
          showToast(t("todoEmailTaskAlreadyExists"), {
            actionLabel: t("todoEmailTaskView"),
            onAction: () => viewTodoTask(task),
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.warn("[tab-out] Gmail task could not be added:", error);

      if (typeof showToast === "function") {
        showToast(t("todoEmailTaskAddFailed"));
      }
    } finally {
      pendingTodoTaskKeys.delete(key);
      render();
    }
  }

  function createGmailTodoComposer(account, thread, placement) {
    const key = getGmailTaskKey(account, thread);
    const form = document.createElement("form");
    form.className = `gmail-todo-composer is-${placement}`;
    form.dataset.gmailTodoComposer = key;
    form.noValidate = true;
    const heading = document.createElement("strong");
    heading.className = "gmail-todo-composer-title";
    heading.textContent = t("todoEmailTaskComposerTitle");
    const titleLabel = document.createElement("label");
    titleLabel.className = "gmail-todo-field is-title";
    const titleText = document.createElement("span");
    titleText.textContent = t("todoEmailTaskTitleLabel");
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.maxLength = 200;
    titleInput.required = true;
    titleInput.value =
      activeTodoComposer?.key === key
        ? activeTodoComposer.title
        : thread.subject || t("gmailNoSubject");
    titleInput.dataset.gmailTodoField = "title";
    titleLabel.append(titleText, titleInput);
    const notesLabel = document.createElement("label");
    notesLabel.className = "gmail-todo-field is-notes";
    const notesText = document.createElement("span");
    notesText.textContent = t("todoEmailTaskCommentLabel");
    const notesInput = document.createElement("textarea");
    notesInput.rows = 2;
    notesInput.maxLength = 10000;
    notesInput.placeholder = t("todoEmailTaskCommentPlaceholder");
    notesInput.value =
      activeTodoComposer?.key === key
        ? activeTodoComposer.notes
        : "";
    notesInput.dataset.gmailTodoField = "notes";
    notesLabel.append(notesText, notesInput);
    const deadlineFields = document.createElement("div");
    deadlineFields.className = "gmail-todo-deadline-fields";
    const dateLabel = document.createElement("label");
    dateLabel.className = "gmail-todo-field";
    const dateText = document.createElement("span");
    dateText.textContent = t("todoEmailTaskDeadlineLabel");
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value =
      activeTodoComposer?.key === key
        ? activeTodoComposer.deadlineDate
        : "";
    dateInput.dataset.gmailTodoField = "deadlineDate";
    dateLabel.append(dateText, dateInput);
    const timeLabel = document.createElement("label");
    timeLabel.className = "gmail-todo-field";
    const timeText = document.createElement("span");
    timeText.textContent = t("todoEmailTaskDeadlineTimeLabel");
    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value =
      activeTodoComposer?.key === key
        ? activeTodoComposer.deadlineTime
        : "";
    timeInput.dataset.gmailTodoField = "deadlineTime";
    timeLabel.append(timeText, timeInput);
    deadlineFields.append(dateLabel, timeLabel);
    const actions = document.createElement("div");
    actions.className = "gmail-todo-composer-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "gmail-widget-text-btn";
    cancel.textContent = t("cancel");
    cancel.addEventListener("click", () => {
      activeTodoComposer = null;
      render();
    });
    const add = document.createElement("button");
    add.type = "submit";
    add.className = "gmail-widget-text-btn is-primary";
    add.textContent = t("todoEmailTaskAdd");
    add.disabled = pendingTodoTaskKeys.has(key);
    actions.append(cancel, add);
    form.append(
      heading,
      titleLabel,
      notesLabel,
      deadlineFields,
      actions
    );
    form.addEventListener("submit", (event) => {
      void handleGmailTodoSubmit(event, account, thread);
    });
    form.addEventListener("input", (event) => {
      const field = event.target.dataset.gmailTodoField;

      if (
        activeTodoComposer?.key === key &&
        ["title", "notes", "deadlineDate", "deadlineTime"].includes(
          field
        )
      ) {
        activeTodoComposer[field] = event.target.value;
      }
    });
    return form;
  }

  function createThreadActions(account, thread, placement = "row") {
    const actions = document.createElement("span");
    actions.className = "gmail-thread-actions";
    const todoKey = getGmailTaskKey(account, thread);
    const linkedTask = todoTasksBySourceKey.get(todoKey);
    const pending = pendingActions.has(
      threadKey(account.accountId, thread.threadId)
    );

    if (
      todoService &&
      getTodoSettings().emailTaskIntegrationEnabled !== false
    ) {
      const todoButton = document.createElement("button");
      todoButton.type = "button";
      todoButton.className = "gmail-thread-action is-todo";
      todoButton.classList.toggle("is-linked", Boolean(linkedTask));
      todoButton.classList.toggle(
        "is-active",
        activeTodoComposer?.key === todoKey
      );
      todoButton.innerHTML = linkedTask
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 12 4 4L19 6"/><path d="M5 20h14"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h10M4 12h7M4 18h6"/><path d="M18 11v8M14 15h8"/></svg>';
      todoButton.title = t(
        linkedTask ? "todoViewEmailTask" : "todoAddEmailTask"
      );
      todoButton.setAttribute("aria-label", todoButton.title);
      todoButton.disabled =
        pending || pendingTodoTaskKeys.has(todoKey);
      todoButton.addEventListener("click", (event) => {
        event.stopPropagation();

        if (linkedTask) {
          void viewTodoTask(linkedTask);
        } else {
          toggleTodoComposer(account, thread, placement);
        }
      });
      actions.appendChild(todoButton);
    }

    const actionDefinitions = [
      {
        action: thread.unread ? "markRead" : "markUnread",
        label: thread.unread ? "gmailMarkRead" : "gmailMarkUnread",
        symbol: thread.unread ? "○" : "●"
      },
      {
        action: thread.starred ? "unstar" : "star",
        label: thread.starred ? "gmailUnstar" : "gmailStar",
        symbol: thread.starred ? "★" : "☆"
      },
      {
        action: "archive",
        label: "gmailArchive",
        symbol: "↓"
      },
      {
        action: "trash",
        label: "gmailTrash",
        symbol: "×"
      }
    ];

    actionDefinitions.forEach((definition) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `gmail-thread-action is-${definition.action}`;
      button.textContent = definition.symbol;
      button.title = t(definition.label);
      button.setAttribute("aria-label", t(definition.label));
      button.disabled = pending;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        void performThreadAction(
          account,
          thread,
          definition.action
        );
      });
      actions.appendChild(button);
    });
    return actions;
  }

  function createReadingPane(account, thread) {
    const pane = document.createElement("section");
    pane.className = "gmail-reading-pane";
    pane.tabIndex = -1;
    pane.setAttribute("aria-label", t("gmailReadingPane"));

    if (!thread) {
      const empty = document.createElement("div");
      empty.className = "gmail-reading-pane-empty";
      const title = document.createElement("strong");
      title.textContent = t("gmailReadingPaneEmptyTitle");
      const hint = document.createElement("span");
      hint.textContent = t("gmailReadingPaneEmptyHint");
      empty.append(title, hint);
      pane.appendChild(empty);
      return pane;
    }

    const previewKey = threadKey(
      account.accountId,
      thread.threadId
    );
    const todoKey = getGmailTaskKey(account, thread);
    const header = document.createElement("header");
    header.className = "gmail-reading-pane-header";
    const identity = document.createElement("div");
    identity.className = "gmail-reading-pane-identity";
    const subject = document.createElement("strong");
    subject.className =
      "gmail-reading-pane-subject gmail-subject-tooltip-target";
    subject.textContent = thread.subject || t("gmailNoSubject");
    const sender = document.createElement("span");
    sender.textContent =
      thread.senderName || thread.senderEmail || "Gmail";
    const metadata = document.createElement("time");
    metadata.dateTime = thread.timestamp
      ? new Date(thread.timestamp).toISOString()
      : "";
    metadata.textContent = formatGmailDate(thread.timestamp);
    identity.append(subject, sender);
    header.append(
      identity,
      metadata,
      createThreadActions(account, thread, "pane")
    );

    const preview = createThreadPreview(
      account,
      thread,
      previews.get(previewKey)
    );
    preview.classList.add("is-reading-pane");
    pane.appendChild(header);

    if (
      activeTodoComposer?.key === todoKey &&
      activeTodoComposer.placement === "pane"
    ) {
      pane.appendChild(createGmailTodoComposer(account, thread, "pane"));
    }

    pane.appendChild(preview);
    return pane;
  }

  function getSplitPaneThread(accountId, threads) {
    const prefix = `${accountId}:`;
    const availableIds = new Set(
      (threads || []).map((thread) => thread.threadId)
    );
    const accountKeys = Array.from(expandedThreads).filter((key) =>
      key.startsWith(prefix)
    );
    const matchingKeys = accountKeys.filter((key) =>
      availableIds.has(key.slice(prefix.length))
    );
    const selectedKey = matchingKeys[matchingKeys.length - 1] || "";

    accountKeys.forEach((key) => {
      if (key !== selectedKey) {
        expandedThreads.delete(key);
      }
    });

    return (threads || []).find(
      (thread) => threadKey(accountId, thread.threadId) === selectedKey
    ) || null;
  }

  function createThreadRow(
    account,
    thread,
    { splitPane = false, selectedThreadId = "" } = {}
  ) {
    const key = threadKey(account.accountId, thread.threadId);
    const expanded = splitPane
      ? thread.threadId === selectedThreadId
      : expandedThreads.has(key);
    const article = document.createElement("article");
    article.className = "gmail-thread-row";
    article.classList.toggle("is-unread", Boolean(thread.unread));
    article.classList.toggle("is-selected", expanded);
    article.dataset.gmailThreadId = thread.threadId;
    article.setAttribute("role", "listitem");

    const header = document.createElement("div");
    header.className = "gmail-thread-header";
    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "gmail-thread-summary";
    summary.setAttribute(
      "aria-expanded",
      String(expanded)
    );

    const avatar = document.createElement("span");
    avatar.className = "gmail-sender-avatar";
    avatar.textContent = senderInitial(thread.senderName);

    const content = document.createElement("span");
    content.className = "gmail-thread-content";
    const primary = document.createElement("span");
    primary.className = "gmail-thread-primary";
    const sender = document.createElement("strong");
    sender.textContent = thread.senderName || thread.senderEmail || "Gmail";
    const subject = document.createElement("span");
    subject.className =
      "gmail-thread-subject gmail-subject-tooltip-target";
    subject.textContent = thread.subject;
    primary.append(sender, subject);

    const snippet = document.createElement("span");
    snippet.className = "gmail-thread-snippet";
    snippet.textContent = thread.snippet;
    content.append(primary, snippet);

    const metadata = document.createElement("span");
    metadata.className = "gmail-thread-metadata";
    const date = document.createElement("time");
    date.dateTime = thread.timestamp
      ? new Date(thread.timestamp).toISOString()
      : "";
    date.textContent = formatGmailDate(thread.timestamp);
    metadata.appendChild(date);

    if (thread.messageCount > 1) {
      const count = document.createElement("span");
      count.className = "gmail-thread-message-count";
      count.textContent = String(thread.messageCount);
      count.title = t("gmailConversationCount", {
        count: thread.messageCount
      });
      metadata.appendChild(count);
    }

    if (thread.unread) {
      const unread = document.createElement("span");
      unread.className = "gmail-unread-dot";
      unread.setAttribute("aria-label", t("gmailFilterUnread"));
      metadata.appendChild(unread);
    }

    summary.append(avatar, content, metadata);
    summary.addEventListener("click", () => {
      void toggleLatestPreview(account, thread);
    });
    header.append(summary, createThreadActions(account, thread));
    article.appendChild(header);

    if (expanded && !splitPane) {
      article.appendChild(
        createThreadPreview(account, thread, previews.get(key))
      );
    }

    if (
      activeTodoComposer?.key === getGmailTaskKey(account, thread) &&
      activeTodoComposer.placement === "row"
    ) {
      article.appendChild(createGmailTodoComposer(account, thread, "row"));
    }

    return article;
  }

  function createAccountCard(account) {
    const card = document.createElement("section");
    card.className = "gmail-account-card";
    card.dataset.gmailAccountId = account.accountId;
    const expanded = account.preferences?.expanded !== false;
    const bodyId = `gmail-account-body-${encodeURIComponent(
      account.accountId
    )}`;
    card.classList.toggle("is-collapsed", !expanded);

    const header = document.createElement("header");
    header.className = "gmail-account-header";
    const identity = document.createElement("div");
    identity.className = "gmail-account-identity";
    const email = document.createElement("strong");
    email.className = "gmail-account-email";
    email.textContent = account.email;
    const accountMeta = document.createElement("span");
    accountMeta.dataset.gmailAccountRelativeTime = "true";
    accountMeta.dataset.gmailUnreadCount = String(
      Number(account.unreadCount) || 0
    );
    const lastThreadRefreshAt = getAccountThreadRefreshAt(
      account.accountId
    );
    accountMeta.dataset.gmailLastUpdatedAt = String(
      lastThreadRefreshAt
    );
    accountMeta.textContent = [
      t("gmailUnreadCount", { count: account.unreadCount }),
      formatLastUpdated(lastThreadRefreshAt)
    ].join(" · ");
    identity.append(email, accountMeta);

    const actions = document.createElement("div");
    actions.className = "gmail-account-actions";
    const quickActions = document.createElement("div");
    quickActions.className = "gmail-account-quick-actions";
    quickActions.append(
      createButton({
        className: "gmail-account-action",
        textKey: "gmailRefresh",
        action: () => void refreshAccount(account.accountId, {
          force: true
        })
      }),
      createButton({
        className: "gmail-account-action",
        textKey: "gmailOpenInbox",
        action: () => void openGmail(account.accountId)
      })
    );
    actions.appendChild(quickActions);
    const toggleLabel = t(
      expanded ? "gmailCollapseAccount" : "gmailExpandAccount"
    );
    const toggleAccountExpansion = () => {
      if (!pendingAccountPreferenceUpdates.has(account.accountId)) {
        void setAccountExpanded(account.accountId, !expanded);
      }
    };
    identity.setAttribute("role", "button");
    identity.setAttribute("tabindex", "0");
    identity.setAttribute("aria-expanded", String(expanded));
    identity.setAttribute("aria-controls", bodyId);
    identity.setAttribute("aria-label", toggleLabel);
    const reorderable = getVisibleAccounts().length > 1;

    if (reorderable) {
      card.dataset.gmailAccountDraggable = "true";
      identity.classList.add("is-reorderable");
      identity.dataset.gmailAccountDragSource = "true";
      identity.dataset.gmailAccountId = account.accountId;
      identity.setAttribute(
        "aria-description",
        t("gmailReorderAccount")
      );
      identity.title =
        `${toggleLabel} · ${t("gmailReorderAccount")}`;
    } else {
      identity.title = toggleLabel;
    }

    identity.addEventListener("click", (event) => {
      if (suppressedAccountExpansionId === account.accountId) {
        suppressedAccountExpansionId = "";
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      toggleAccountExpansion();
    });
    identity.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      toggleAccountExpansion();
    });
    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className =
      "gmail-account-action gmail-account-expand";
    toggleButton.title = toggleLabel;
    toggleButton.setAttribute("aria-label", toggleLabel);
    toggleButton.setAttribute("aria-expanded", String(expanded));
    toggleButton.setAttribute("aria-controls", bodyId);
    toggleButton.disabled = pendingAccountPreferenceUpdates.has(
      account.accountId
    );
    toggleButton.innerHTML = [
      '<svg viewBox="0 0 24 24" aria-hidden="true">',
      '<path d="m7 10 5 5 5-5"></path>',
      "</svg>"
    ].join("");
    toggleButton.addEventListener("click", toggleAccountExpansion);
    actions.appendChild(toggleButton);
    header.append(identity, actions);
    card.appendChild(header);

    const body = document.createElement("div");
    body.id = bodyId;
    body.className = "gmail-account-body";
    body.hidden = !expanded;

    if (account.reconnectRequired) {
      const warning = document.createElement("div");
      warning.className = "gmail-account-warning";
      warning.textContent = t("gmailAuthorizationExpired");
      warning.appendChild(
        createButton({
          textKey: "gmailReconnect",
          action: () => void connect(account.accountId)
        })
      );
      body.appendChild(warning);
      card.appendChild(body);
      return card;
    }

    const result = threadResults.get(account.accountId);
    const splitPane = isSplitPaneActive();
    const selectedThread = splitPane
      ? getSplitPaneThread(account.accountId, result?.threads)
      : null;
    const list = document.createElement("div");
    list.className = "gmail-thread-list";
    list.setAttribute("role", "list");

    if (result?.loading && !result.threads?.length) {
      const loading = document.createElement("p");
      loading.className = "gmail-account-empty";
      loading.textContent = t("gmailWidgetLoading");
      list.appendChild(loading);
    } else if (result?.error && !result.threads?.length) {
      const error = document.createElement("p");
      error.className = "gmail-account-empty is-error";
      error.textContent = t(result.messageKey || "gmailWidgetError");
      list.appendChild(error);
    } else if (!result?.threads?.length) {
      const empty = document.createElement("p");
      empty.className = "gmail-account-empty";
      empty.textContent = t("gmailWidgetEmpty");
      list.appendChild(empty);
    } else {
      result.threads.forEach((thread) => {
        list.appendChild(
          createThreadRow(account, thread, {
            splitPane,
            selectedThreadId: selectedThread?.threadId || ""
          })
        );
      });
    }

    if (result?.stale) {
      const stale = document.createElement("p");
      stale.className = "gmail-account-stale";
      stale.textContent = t("gmailWidgetStale");
      body.appendChild(stale);
    }

    const content = document.createElement("div");
    content.className = "gmail-account-content";
    content.classList.toggle("is-split", splitPane);
    content.appendChild(list);

    if (splitPane) {
      content.appendChild(createReadingPane(account, selectedThread));
    }

    body.appendChild(content);
    card.appendChild(body);
    return card;
  }

  function getGmailAccountCards(list) {
    return Array.from(
      list?.querySelectorAll(
        '.gmail-account-card[data-gmail-account-id]'
      ) || []
    ).filter((card) => !card.classList.contains("is-drag-source"));
  }

  function getGmailAccountDomOrder(list) {
    return getGmailAccountCards(list)
      .map((card) => card.dataset.gmailAccountId)
      .filter(Boolean);
  }

  function getGmailAccountInsertBefore(list, clientY) {
    return (
      getGmailAccountCards(list).find((card) => {
        const rect =
          card
            .querySelector(".gmail-account-header")
            ?.getBoundingClientRect() ||
          card.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      }) || null
    );
  }

  function hasAccountOrderChanged(beforeOrder, afterOrder) {
    return (
      beforeOrder.length !== afterOrder.length ||
      beforeOrder.some(
        (accountId, index) => accountId !== afterOrder[index]
      )
    );
  }

  function buildFullAccountOrder(visibleAccountIds) {
    const visibleAccounts = getVisibleAccounts();
    const accountsById = new Map(
      visibleAccounts.map((account) => [account.accountId, account])
    );

    if (
      visibleAccountIds.length !== visibleAccounts.length ||
      new Set(visibleAccountIds).size !== visibleAccounts.length ||
      visibleAccountIds.some((accountId) => !accountsById.has(accountId))
    ) {
      return null;
    }

    let visibleIndex = 0;
    return cachedState.accounts.map((account) => {
      if (account.preferences?.visible === false) {
        return account;
      }

      const nextAccount = accountsById.get(
        visibleAccountIds[visibleIndex]
      );
      visibleIndex += 1;
      return nextAccount;
    });
  }

  function startAccountPointerDrag(event, state) {
    const { card, identity, list } = state;
    const rect = card.getBoundingClientRect();
    const headerHeight =
      card.querySelector(".gmail-account-header")?.offsetHeight ||
      Math.min(rect.height, 54);
    const placeholder = document.createElement("section");
    placeholder.className =
      "gmail-account-card gmail-account-placeholder";
    placeholder.style.height = `${headerHeight}px`;
    const ghost = card.cloneNode(true);
    ghost.classList.add("gmail-account-drag-ghost");
    ghost.classList.remove("is-collapsed");
    ghost.querySelector(".gmail-account-body")?.remove();
    ghost.querySelector(".gmail-account-quick-actions")?.remove();
    ghost
      .querySelectorAll("button, [role='button']")
      .forEach((control) => control.setAttribute("tabindex", "-1"));
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${headerHeight}px`;

    state.dragging = true;
    state.offsetX = event.clientX - rect.left;
    state.offsetY = event.clientY - rect.top;
    state.placeholder = placeholder;
    state.ghost = ghost;

    if (identity.setPointerCapture) {
      try {
        identity.setPointerCapture(event.pointerId);
      } catch {}
    }

    list.classList.add("is-reordering");
    card.classList.add("is-drag-source");
    list.insertBefore(placeholder, card);
    card.remove();
    document.body.appendChild(ghost);
    updateAccountPointerDrag(event);
  }

  function updateAccountPointerDrag(event) {
    const state = accountDragState;

    if (!state?.dragging) {
      return;
    }

    if (state.ghost) {
      state.ghost.style.transform =
        `translate3d(${event.clientX - state.offsetX}px, ` +
        `${event.clientY - state.offsetY}px, 0)`;
    }

    const insertBefore = getGmailAccountInsertBefore(
      state.list,
      event.clientY
    );

    if (insertBefore) {
      state.list.insertBefore(state.placeholder, insertBefore);
    } else {
      state.list.appendChild(state.placeholder);
    }
  }

  function suppressNextAccountExpansion(accountId) {
    suppressedAccountExpansionId = accountId;
    window.setTimeout(() => {
      if (suppressedAccountExpansionId === accountId) {
        suppressedAccountExpansionId = "";
      }
    }, 500);
  }

  async function finishAccountPointerDrag(
    event,
    { cancelled = false } = {}
  ) {
    const state = accountDragState;

    if (!state) {
      return;
    }

    accountDragState = null;

    if (state.identity?.releasePointerCapture) {
      try {
        state.identity.releasePointerCapture(event.pointerId);
      } catch {}
    }

    if (!state.dragging) {
      return;
    }

    if (state.placeholder && state.list) {
      state.list.insertBefore(state.card, state.placeholder);
      state.placeholder.remove();
    }

    state.ghost?.remove();
    state.card?.classList.remove("is-drag-source");
    state.list?.classList.remove("is-reordering");

    if (cancelled) {
      render();
      return;
    }

    suppressNextAccountExpansion(state.accountId);
    const finalOrder = getGmailAccountDomOrder(state.list);

    if (!hasAccountOrderChanged(state.initialOrder, finalOrder)) {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      render();
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await persistGmailAccountOrder(finalOrder);
  }

  async function persistGmailAccountOrder(visibleAccountIds) {
    if (pendingAccountOrder) {
      return;
    }

    const previousAccounts = [...cachedState.accounts];
    const nextAccounts = buildFullAccountOrder(visibleAccountIds);

    if (!nextAccounts) {
      render();
      return;
    }

    pendingAccountOrder = true;
    setCachedState({ accounts: nextAccounts });
    render();

    const response = await sendGmailMessage({
      type: "tabOutGmail:reorderAccounts",
      accountIds: nextAccounts.map((account) => account.accountId)
    });

    if (response.ok && Array.isArray(response.accounts)) {
      setCachedState({
        status: response.status || cachedState.status,
        accounts: response.accounts,
        authStatus:
          response.authReadiness?.status || cachedState.authStatus
      });
    } else {
      setCachedState({ accounts: previousAccounts });
      globalObject.showToast?.(t("gmailAccountOrderFailed"));
    }

    pendingAccountOrder = false;
    render();
  }

  function handleAccountPointerDown(event) {
    if (!(event.target instanceof Element)) {
      return;
    }

    const identity = event.target.closest(
      '[data-gmail-account-drag-source="true"]'
    );

    if (
      !identity ||
      pendingAccountOrder ||
      accountDragState ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }

    const card = identity.closest(
      '.gmail-account-card[data-gmail-account-draggable="true"]'
    );
    const list = card?.closest("#gmailAccountCards");

    if (!card || !list) {
      return;
    }

    accountDragState = {
      accountId: card.dataset.gmailAccountId,
      card,
      identity,
      list,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      initialOrder: getGmailAccountDomOrder(list),
      placeholder: null,
      ghost: null
    };
  }

  function handleAccountPointerMove(event) {
    const state = accountDragState;

    if (!state || state.pointerId !== event.pointerId) {
      return;
    }

    const distanceX = Math.abs(event.clientX - state.startX);
    const distanceY = Math.abs(event.clientY - state.startY);

    if (!state.dragging) {
      if (
        Math.max(distanceX, distanceY) < ACCOUNT_DRAG_THRESHOLD
      ) {
        return;
      }

      event.preventDefault();
      startAccountPointerDrag(event, state);
      return;
    }

    event.preventDefault();
    updateAccountPointerDrag(event);
  }

  function handleAccountPointerUp(event) {
    if (accountDragState?.pointerId === event.pointerId) {
      void finishAccountPointerDrag(event);
    }
  }

  function handleAccountPointerCancel(event) {
    if (accountDragState?.pointerId === event.pointerId) {
      void finishAccountPointerDrag(event, { cancelled: true });
    }
  }

  function getVisibleAccounts() {
    return cachedState.accounts.filter(
      (account) => account.preferences?.visible !== false
    );
  }

  async function setAccountExpanded(accountId, expanded) {
    const account = cachedState.accounts.find(
      (candidate) => candidate.accountId === accountId
    );
    const settingsApi = globalObject.TabOutDashboardSettings;

    if (
      !account ||
      !settingsApi ||
      pendingAccountPreferenceUpdates.has(accountId)
    ) {
      return;
    }

    const previousExpanded = account.preferences?.expanded !== false;
    account.preferences = {
      ...account.preferences,
      expanded: Boolean(expanded)
    };
    pendingAccountPreferenceUpdates.add(accountId);
    render();

    try {
      const stored = await chrome.storage.local.get(SETTINGS_KEY);
      const settings = settingsApi.normalizeSettings(
        stored[SETTINGS_KEY]
      );
      const gmailSettings = settings.integrations.gmail;
      const currentPreferences =
        gmailSettings.accountPreferences[accountId] ||
        gmailSettings.accountDefaults;
      gmailSettings.accountPreferences[accountId] = {
        ...settingsApi.clone(currentPreferences),
        expanded: Boolean(expanded)
      };
      await chrome.storage.local.set({
        [SETTINGS_KEY]: settingsApi.normalizeSettings(settings)
      });
    } catch (error) {
      const currentAccount = cachedState.accounts.find(
        (candidate) => candidate.accountId === accountId
      );

      if (currentAccount) {
        currentAccount.preferences = {
          ...currentAccount.preferences,
          expanded: previousExpanded
        };
      }
    } finally {
      pendingAccountPreferenceUpdates.delete(accountId);
      render();
    }
  }

  function captureThreadListViewports(cards) {
    const viewports = new Map();

    cards
      .querySelectorAll(".gmail-account-card[data-gmail-account-id]")
      .forEach((card) => {
        const accountId = card.dataset.gmailAccountId;
        const list = card.querySelector(".gmail-thread-list");

        if (!accountId || !list) {
          return;
        }

        const listRect = list.getBoundingClientRect();
        const anchor = Array.from(
          list.querySelectorAll(".gmail-thread-row[data-gmail-thread-id]")
        ).find((row) =>
          row.getBoundingClientRect().bottom > listRect.top + 1
        );

        viewports.set(accountId, {
          scrollTop: list.scrollTop,
          anchorThreadId: anchor?.dataset.gmailThreadId || "",
          anchorOffset: anchor
            ? anchor.getBoundingClientRect().top - listRect.top
            : 0
        });
      });

    return viewports;
  }

  function restoreThreadListViewports(cards, viewports) {
    cards
      .querySelectorAll(".gmail-account-card[data-gmail-account-id]")
      .forEach((card) => {
        const viewport = viewports.get(card.dataset.gmailAccountId);
        const list = card.querySelector(".gmail-thread-list");

        if (!viewport || !list) {
          return;
        }

        list.scrollTop = viewport.scrollTop;

        if (!viewport.anchorThreadId) {
          return;
        }

        const anchor = Array.from(
          list.querySelectorAll(".gmail-thread-row[data-gmail-thread-id]")
        ).find(
          (row) =>
            row.dataset.gmailThreadId === viewport.anchorThreadId
        );

        if (!anchor) {
          return;
        }

        const nextOffset =
          anchor.getBoundingClientRect().top -
          list.getBoundingClientRect().top;
        list.scrollTop += nextOffset - viewport.anchorOffset;
      });
  }

  function render() {
    const widget = getWidget();
    const state = document.getElementById("gmailWidgetState");
    const cards = document.getElementById("gmailAccountCards");
    const count = document.getElementById("gmailWidgetCount");
    const updated = document.getElementById("gmailWidgetUpdated");
    const refreshButton = document.getElementById("gmailRefreshBtn");

    if (!widget || !state || !cards) {
      return;
    }

    if (accountDragState) {
      return;
    }

    hideGmailSubjectTooltip();
    const pageScroll = {
      left: window.scrollX,
      top: window.scrollY
    };
    const threadListViewports = captureThreadListViewports(cards);
    cards.replaceChildren();
    cards.hidden = true;
    state.hidden = true;
    state.replaceChildren();
    widget.dataset.gmailStatus = cachedState.status;
    widget.dataset.gmailEffectiveDisplay =
      isSplitPaneActive() ? "split" : "inline";
    const visibleAccounts = getVisibleAccounts();

    if (count) {
      const totalUnread = visibleAccounts.reduce(
        (total, account) => total + Number(account.unreadCount || 0),
        0
      );
      count.textContent = visibleAccounts.length
        ? t("gmailAccountCount", {
            count: visibleAccounts.length
          })
        : "";
      count.title = t("gmailUnreadCount", { count: totalUnread });
    }

    if (updated) {
      const latest = Math.max(
        0,
        ...visibleAccounts.map(
          (account) =>
            getAccountThreadRefreshAt(account.accountId)
        )
      );
      updated.dataset.gmailLastUpdatedAt = String(latest);
      updated.textContent = latest ? formatLastUpdated(latest) : "";
    }

    if (refreshButton) {
      refreshButton.disabled =
        !visibleAccounts.length || cachedState.loading;
    }

    if (cachedState.status === "unavailable") {
      renderWidgetState("gmailWidgetUnavailable");
      return;
    }

    if (!cachedState.accounts.length) {
      renderWidgetState(
        "gmailWidgetDisconnected",
        createButton({
          className: "gmail-state-action",
          textKey: "gmailConnect",
          action: () => void connect()
        })
      );
      return;
    }

    if (!visibleAccounts.length) {
      renderWidgetState("gmailWidgetAccountsHidden");
      return;
    }

    visibleAccounts.forEach((account) => {
      cards.appendChild(createAccountCard(account));
    });
    cards.hidden = false;
    restoreThreadListViewports(cards, threadListViewports);
    window.scrollTo(pageScroll.left, pageScroll.top);
  }

  async function checkReadiness() {
    const response = await sendGmailMessage({
      type: "tabOutGmail:getAuthReadiness"
    });
    setCachedState({
      authStatus: response.ok ? "ready" : response.status || "error",
      authCode: response.code || "",
      authMessageKey: response.messageKey || "",
      pendingAuth: response.pending || null
    });
    return response;
  }

  async function refreshState({ renderAfter = true } = {}) {
    const response = await sendGmailMessage({
      type: "tabOutGmail:getState"
    });

    if (response.ok) {
      setCachedState({
        status: response.status,
        accounts: Array.isArray(response.accounts)
          ? response.accounts
          : [],
        authStatus: response.authReadiness?.status || "ready",
        authCode: response.authReadiness?.code || "",
        authMessageKey:
          response.authReadiness?.messageKey || "",
        pendingAuth: response.pendingAuth || null,
        error: false,
        messageKey: ""
      });
    } else {
      setCachedState({
        status: "error",
        error: true,
        messageKey: response.messageKey || "gmailWidgetError"
      });
    }

    if (renderAfter) {
      render();
    }

    return response;
  }

  async function loadCachedAccount(
    accountId,
    { markStale = false } = {}
  ) {
    const previous = threadResults.get(accountId) || {
      threads: []
    };
    const response = await sendGmailMessage({
      type: "tabOutGmail:getCachedThreads",
      accountId
    });

    threadResults.set(accountId, response.ok
      ? {
          threads: Array.isArray(response.threads)
            ? response.threads
            : [],
          loading: false,
          error: false,
          stale: markStale || response.stale === true,
          fetchedAt: response.fetchedAt || 0
        }
      : {
          ...previous,
          loading: false,
          error: true,
          stale: false,
          messageKey: response.messageKey || "gmailWidgetError"
        }
    );
    return response;
  }

  async function loadCachedThreads({
    accountId = "",
    staleAccountId = "",
    refreshMissing = false
  } = {}) {
    await refreshState({ renderAfter: false });
    const visibleAccounts = getVisibleAccounts().filter(
      (account) =>
        (!accountId || account.accountId === accountId)
    );

    const loadedAccounts = await Promise.all(
      visibleAccounts.map(async (account) => ({
        account,
        response: await loadCachedAccount(account.accountId, {
          markStale:
            account.accountId === staleAccountId
        })
      }))
    );
    const accountsToRefresh = [];

    if (refreshMissing) {
      loadedAccounts.forEach(({ account, response }) => {
        const attemptKey = [
          account.accountId,
          String(response.signature || "")
        ].join(":");
        const shouldRefresh =
          response.ok &&
          response.cacheMiss === true &&
          account.preferences?.expanded !== false &&
          account.preferences?.pollingEnabled !== false &&
          !automaticCacheMissRefreshAttempts.has(attemptKey);

        if (!shouldRefresh) {
          return;
        }

        automaticCacheMissRefreshAttempts.add(attemptKey);
        accountsToRefresh.push(account);
      });
    }

    if (accountsToRefresh.length) {
      await Promise.all(
        accountsToRefresh.map((account) =>
          refreshAccount(account.accountId, { force: true })
        )
      );
    }

    setCachedState({ loading: false });
    render();
    return {
      ok: true,
      status: cachedState.status,
      refreshedMissingAccounts: accountsToRefresh.map(
        (account) => account.accountId
      )
    };
  }

  async function refreshAccount(accountId, { force = false } = {}) {
    const previous = threadResults.get(accountId) || {
      threads: []
    };
    threadResults.set(accountId, {
      ...previous,
      loading: true,
      error: false
    });
    render();
    const response = await sendGmailMessage({
      type: "tabOutGmail:listThreads",
      accountId,
      force
    });

    threadResults.set(accountId, response.ok
      ? {
          threads: Array.isArray(response.threads) ? response.threads : [],
          loading: false,
          error: false,
          stale: response.stale === true,
          fetchedAt: response.fetchedAt || 0
        }
      : {
          ...previous,
          loading: false,
          error: true,
          stale: false,
          messageKey: response.messageKey || "gmailWidgetError"
        }
    );
    render();
    return response;
  }

  async function refresh({ force = false } = {}) {
    await refreshState();
    const visibleAccounts = getVisibleAccounts();

    if (!isWidgetVisible() || !visibleAccounts.length) {
      render();
      return { ok: true, status: cachedState.status };
    }

    setCachedState({ loading: true });
    await Promise.all(
      visibleAccounts
        .filter((account) => account.preferences?.expanded !== false)
        .map((account) =>
          refreshAccount(account.accountId, { force })
        )
    );
    await sendGmailMessage({
      type: "tabOutGmail:poll",
      notify: false
    });
    await refreshState();
    setCachedState({ loading: false });
    render();
    focusHashTarget();
    return { ok: true, status: cachedState.status };
  }

  async function connect(options = {}) {
    const request =
      typeof options === "string"
        ? { replaceAccountId: options }
        : options || {};
    setCachedState({
      status: "connecting",
      error: false,
      messageKey: ""
    });
    render();
    const permission = await requestGmailPermissions();

    if (!permission.ok) {
      await refreshState();
      setCachedState({
        error: true,
        messageKey: permission.messageKey
      });
      render();
      return permission;
    }

    const started = await sendGmailMessage({
      type: "tabOutGmail:beginConnect",
      replaceAccountId: String(request.replaceAccountId || ""),
      credentialSource:
        request.credentialSource === "dedicated"
          ? "dedicated"
          : request.credentialSource === "shared"
            ? "shared"
            : "",
      oauthClient:
        request.oauthClient &&
        typeof request.oauthClient === "object"
          ? request.oauthClient
          : null
    });
    const response =
      started.ok && started.transactionId
        ? await waitForAuthResult(started.transactionId)
        : started;

    if (response.ok) {
      await refreshState();
      await refreshAccount(response.account.accountId, { force: true });
      await sendGmailMessage({
        type: "tabOutGmail:syncAlarms"
      });
    } else {
      await refreshState();
      setCachedState({
        error: response.code !== "cancelled",
        messageKey: response.messageKey || "gmailConnectFailed"
      });
      render();
    }

    return response;
  }

  async function cancelConnect() {
    const response = await sendGmailMessage({
      type: "tabOutGmail:cancelConnect",
      transactionId: cachedState.pendingAuth?.transactionId || ""
    });
    await refreshState();
    return response;
  }

  async function disconnect(accountId) {
    const response = await sendGmailMessage({
      type: "tabOutGmail:disconnect",
      accountId
    });

    if (response.ok) {
      threadResults.delete(accountId);
      Array.from(previews.keys())
        .filter((key) => key.startsWith(`${accountId}:`))
        .forEach((key) => previews.delete(key));
      await refreshState();
      await removeGmailPermissionsWhenUnused();
    }

    return response;
  }

  async function getOAuthSettings() {
    return sendGmailMessage({
      type: "tabOutGmail:getOAuthSettings"
    });
  }

  async function saveSharedOAuthClient(
    { clientId, clientSecret, replaceConnected = false }
  ) {
    const response = await sendGmailMessage({
      type: "tabOutGmail:saveSharedOAuthClient",
      clientId,
      clientSecret,
      replaceConnected
    });
    await refreshState();
    return response;
  }

  async function removeSharedOAuthClient({
    replaceConnected = false
  } = {}) {
    const response = await sendGmailMessage({
      type: "tabOutGmail:removeSharedOAuthClient",
      replaceConnected
    });
    await refreshState();
    return response;
  }

  async function toggleLatestPreview(account, thread) {
    const key = threadKey(account.accountId, thread.threadId);

    if (expandedThreads.has(key)) {
      expandedThreads.delete(key);
      render();
      return;
    }

    if (isSplitPaneActive()) {
      const prefix = `${account.accountId}:`;

      Array.from(expandedThreads)
        .filter((candidate) => candidate.startsWith(prefix))
        .forEach((candidate) => expandedThreads.delete(candidate));
    }

    expandedThreads.add(key);

    if (previews.has(key)) {
      render();
      return;
    }

    previews.set(key, {
      mode: "latest",
      loading: true,
      messages: []
    });
    render();
    const response = await sendGmailMessage({
      type: "tabOutGmail:getLatestMessage",
      accountId: account.accountId,
      messageId: thread.latestMessageId
    });
    previews.set(key, response.ok
      ? {
          mode: "latest",
          loading: false,
          messages: [response.message]
        }
      : {
          mode: "latest",
          loading: false,
          messages: [],
          error: true,
          messageKey: response.messageKey
        }
    );
    render();
  }

  async function loadFullThread(account, thread) {
    const key = threadKey(account.accountId, thread.threadId);
    previews.set(key, {
      mode: "thread",
      loading: true,
      messages: []
    });
    render();
    const response = await sendGmailMessage({
      type: "tabOutGmail:getThread",
      accountId: account.accountId,
      threadId: thread.threadId
    });
    previews.set(key, response.ok
      ? {
          mode: "thread",
          loading: false,
          messages: response.thread.messages || []
        }
      : {
          mode: "thread",
          loading: false,
          messages: [],
          error: true,
          messageKey: response.messageKey
        }
    );
    render();
  }

  async function openGmail(accountId, threadId = "") {
    return sendGmailMessage({
      type: "tabOutGmail:open",
      accountId,
      threadId
    });
  }

  function findAccountForLinkedThread(source) {
    const accountEmail = String(source?.accountEmail || "")
      .trim()
      .toLowerCase();

    return (
      cachedState.accounts.find(
        (account) =>
          accountEmail &&
          String(account.email || "").toLowerCase() === accountEmail
      ) ||
      cachedState.accounts.find(
        (account) => account.accountId === source?.accountId
      ) ||
      null
    );
  }

  function createLinkedThreadSummary(
    account,
    source,
    messages = [],
    currentThread = null
  ) {
    const latestMessage = messages[messages.length - 1] || null;

    return {
      accountId: account.accountId,
      threadId: source.threadId,
      latestMessageId:
        latestMessage?.id ||
        source.latestMessageId ||
        currentThread?.latestMessageId ||
        "",
      senderName:
        latestMessage?.senderName ||
        source.senderName ||
        currentThread?.senderName ||
        "",
      senderEmail:
        latestMessage?.senderEmail ||
        source.senderEmail ||
        currentThread?.senderEmail ||
        "",
      subject:
        latestMessage?.subject ||
        source.subject ||
        currentThread?.subject ||
        t("gmailNoSubject"),
      snippet: currentThread?.snippet || "",
      timestamp:
        latestMessage?.timestamp ||
        currentThread?.timestamp ||
        Date.parse(source.capturedAt || "") ||
        0,
      unread: messages.length
        ? messages.some((message) => message.unread)
        : Boolean(currentThread?.unread),
      starred: latestMessage
        ? latestMessage.starred === true
        : Boolean(currentThread?.starred),
      inbox: latestMessage
        ? latestMessage.inbox === true
        : Boolean(currentThread?.inbox),
      messageCount: Math.max(
        1,
        messages.length,
        Number(currentThread?.messageCount) || 0
      )
    };
  }

  function upsertLinkedThread(accountId, thread) {
    const currentResult = threadResults.get(accountId) || {
      threads: [],
      loading: false,
      error: false,
      stale: false
    };
    const currentThreads = Array.isArray(currentResult.threads)
      ? currentResult.threads
      : [];
    const existingIndex = currentThreads.findIndex(
      (candidate) => candidate.threadId === thread.threadId
    );
    const nextThreads = [...currentThreads];

    if (existingIndex >= 0) {
      nextThreads[existingIndex] = thread;
    } else {
      nextThreads.unshift(thread);
    }

    threadResults.set(accountId, {
      ...currentResult,
      threads: nextThreads,
      loading: false,
      error: false
    });
  }

  async function focusDisplayedThread(accountId, threadId) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const accountCard = document.querySelector(
      `[data-gmail-account-id="${CSS.escape(accountId)}"]`
    );

    if (!accountCard) {
      return false;
    }

    const target = isSplitPaneActive()
      ? accountCard.querySelector(".gmail-reading-pane")
      : accountCard.querySelector(
          `[data-gmail-thread-id="${CSS.escape(threadId)}"]`
        );

    if (!target) {
      return false;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-targeted");
    (
      target.matches(".gmail-reading-pane")
        ? target
        : target.querySelector(".gmail-thread-summary")
    )?.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove("is-targeted"), 1800);
    return true;
  }

  async function showLinkedThread(source) {
    if (!isWidgetVisible()) {
      return {
        ok: false,
        reason: "widget_hidden",
        messageKey: "todoEmailTaskShowWidgetHidden"
      };
    }

    const account = findAccountForLinkedThread(source);

    if (!account) {
      return {
        ok: false,
        reason: "account_disconnected",
        messageKey: "todoEmailTaskShowDisconnected"
      };
    }

    if (account.preferences?.visible === false) {
      return {
        ok: false,
        reason: "account_hidden",
        messageKey: "todoEmailTaskShowAccountHidden"
      };
    }

    if (account.reconnectRequired) {
      return {
        ok: false,
        reason: "reconnect_required",
        messageKey: "todoEmailTaskShowReconnect"
      };
    }

    const threadId = String(source?.threadId || "");

    if (!threadId) {
      return {
        ok: false,
        reason: "thread_missing",
        messageKey: "todoEmailTaskShowFailed"
      };
    }

    account.preferences = {
      ...account.preferences,
      expanded: true
    };
    const currentThread =
      threadResults
        .get(account.accountId)
        ?.threads?.find((thread) => thread.threadId === threadId) ||
      null;
    const thread = createLinkedThreadSummary(
      account,
      source,
      [],
      currentThread
    );
    const key = threadKey(account.accountId, threadId);
    const cachedPreview = previews.get(key);
    upsertLinkedThread(account.accountId, thread);

    if (isSplitPaneActive()) {
      const prefix = `${account.accountId}:`;

      Array.from(expandedThreads)
        .filter((candidate) => candidate.startsWith(prefix))
        .forEach((candidate) => expandedThreads.delete(candidate));
    }

    expandedThreads.add(key);

    if (
      cachedPreview?.mode === "thread" &&
      !cachedPreview.loading &&
      !cachedPreview.error
    ) {
      render();
      await focusDisplayedThread(account.accountId, threadId);
      return {
        ok: true,
        accountId: account.accountId,
        threadId,
        cached: true
      };
    }

    previews.set(key, {
      mode: "thread",
      loading: true,
      messages: []
    });
    render();
    await focusDisplayedThread(account.accountId, threadId);
    const response = await sendGmailMessage({
      type: "tabOutGmail:getThread",
      accountId: account.accountId,
      threadId
    });

    if (!response.ok) {
      previews.set(key, {
        mode: "thread",
        loading: false,
        messages: [],
        error: true,
        messageKey: response.messageKey
      });
      render();
      await focusDisplayedThread(account.accountId, threadId);
      return {
        ok: false,
        displayed: true,
        reason: response.code || "thread_load_failed",
        messageKey: "todoEmailTaskShowFailed"
      };
    }

    const messages = Array.isArray(response.thread?.messages)
      ? response.thread.messages
      : [];
    upsertLinkedThread(
      account.accountId,
      createLinkedThreadSummary(account, source, messages, thread)
    );
    previews.set(key, {
      mode: "thread",
      loading: false,
      messages
    });
    render();
    await focusDisplayedThread(account.accountId, threadId);
    return {
      ok: true,
      accountId: account.accountId,
      threadId,
      cached: false
    };
  }

  function focusHashTarget() {
    const match = location.hash.match(/^#gmail=([^&]+)/);

    if (!match) {
      return;
    }

    const accountId = decodeURIComponent(match[1]);
    const card = document.querySelector(
      `[data-gmail-account-id="${CSS.escape(accountId)}"]`
    );
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    card?.classList.add("is-targeted");
    setTimeout(() => card?.classList.remove("is-targeted"), 1800);
  }

  function setupResponsiveReadingPane() {
    const widget = getWidget();

    if (!widget) {
      return;
    }

    splitPaneAvailable = widget.clientWidth >= SPLIT_PANE_MIN_WIDTH;

    if (typeof ResizeObserver !== "function") {
      return;
    }

    widgetResizeObserver?.disconnect();
    widgetResizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width || widget.clientWidth;
      const nextAvailable = width >= SPLIT_PANE_MIN_WIDTH;

      if (nextAvailable === splitPaneAvailable) {
        return;
      }

      splitPaneAvailable = nextAvailable;
      render();
    });
    widgetResizeObserver.observe(widget);
  }

  function setupWidgetEvents() {
    const widget = getWidget();

    widget?.addEventListener(
      "pointerdown",
      handleAccountPointerDown
    );
    widget?.addEventListener(
      "pointerover",
      handleGmailSubjectPointerOver
    );
    widget?.addEventListener(
      "pointerout",
      handleGmailSubjectPointerOut
    );
    document.addEventListener(
      "pointermove",
      handleAccountPointerMove
    );
    document.addEventListener("pointerup", handleAccountPointerUp);
    document.addEventListener(
      "pointercancel",
      handleAccountPointerCancel
    );
    document.getElementById("gmailRefreshBtn")?.addEventListener(
      "click",
      () => void refresh({ force: true })
    );
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        activeTodoComposer &&
        event.target instanceof Element &&
        event.target.closest("#gmailWidget")
      ) {
        activeTodoComposer = null;
        render();
        return;
      }

      if (
        event.key === "Escape" &&
        expandedThreads.size &&
        event.target instanceof Element &&
        event.target.closest("#gmailWidget")
      ) {
        expandedThreads.clear();
        render();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        updateGmailRelativeTimeLabels();
        void loadCachedThreads({ refreshMissing: true });
      } else {
        hideGmailSubjectTooltip();
      }
    });
    window.addEventListener(
      "scroll",
      hideGmailSubjectTooltip,
      true
    );
    window.addEventListener("resize", hideGmailSubjectTooltip);
    window.addEventListener("hashchange", focusHashTarget);
    document.addEventListener("tabout:settings-applied", () => {
      if (getTodoSettings().emailTaskIntegrationEnabled === false) {
        activeTodoComposer = null;
      }

      render();
    });
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (
        changes[ACCOUNTS_KEY] ||
        changes[OAUTH_CLIENTS_KEY] ||
        changes[SETTINGS_KEY]
      ) {
        void loadCachedThreads({ refreshMissing: true });
      } else if (
        todoService &&
        changes[todoService.STORAGE_KEY]
      ) {
        void refreshTodoTaskLinks();
      } else if (changes.tabOutLanguage) {
        render();
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "tabOutGmail:authCompleted") {
        void refresh({ force: false });
      } else if (
        message?.type === "tabOutGmail:scheduledRefreshCompleted"
      ) {
        void loadCachedThreads({
          accountId: String(message.accountId || ""),
          staleAccountId:
            message.threadCacheRefreshed === true
              ? ""
              : String(message.accountId || "")
        });
      }
      return undefined;
    });
  }

  async function initialize() {
    setupWidgetEvents();
    setupResponsiveReadingPane();

    if (globalObject.TabOutDashboardRuntime?.ready) {
      await globalObject.TabOutDashboardRuntime.ready;
    }

    await refreshTodoTaskLinks({ renderAfter: false });
    await checkReadiness();
    await loadCachedThreads({ refreshMissing: true });
    scheduleGmailRelativeTimeUpdate();
  }

  globalObject.TabOutGmailWidget = Object.freeze({
    checkReadiness,
    connect,
    cancelConnect,
    disconnect,
    getOAuthSettings,
    saveSharedOAuthClient,
    removeSharedOAuthClient,
    refresh,
    refreshState,
    render,
    performThreadAction,
    showLinkedThread,
    getCachedState: () => clone(cachedState)
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    void initialize();
  }
})(globalThis);
