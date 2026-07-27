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
  const previews = new Map();
  const expandedThreads = new Set();
  const pendingActions = new Set();
  const pendingAccountPreferenceUpdates = new Set();

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

  function createMessagePreview(message) {
    const article = document.createElement("article");
    article.className = "gmail-message-preview";
    const header = document.createElement("header");
    const sender = document.createElement("strong");
    sender.textContent = message.senderName || message.senderEmail || "Gmail";
    const date = document.createElement("time");
    date.dateTime = message.timestamp
      ? new Date(message.timestamp).toISOString()
      : "";
    date.textContent = formatGmailDate(message.timestamp);
    header.append(sender, date);

    const body = document.createElement("pre");
    body.className = "gmail-message-body";
    body.textContent = getMessageBodyText(message) || t("gmailNoBody");
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
      (preview?.messages || []).forEach((message) => {
        container.appendChild(createMessagePreview(message));
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
    pendingActions.add(key);
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

    await refreshState();
    render();
  }

  function createThreadActions(account, thread) {
    const actions = document.createElement("span");
    actions.className = "gmail-thread-actions";
    const pending = pendingActions.has(
      threadKey(account.accountId, thread.threadId)
    );
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

  function createThreadRow(account, thread) {
    const key = threadKey(account.accountId, thread.threadId);
    const article = document.createElement("article");
    article.className = "gmail-thread-row";
    article.classList.toggle("is-unread", Boolean(thread.unread));
    article.dataset.gmailThreadId = thread.threadId;
    article.setAttribute("role", "listitem");

    const summary = document.createElement("button");
    summary.type = "button";
    summary.className = "gmail-thread-summary";
    summary.setAttribute(
      "aria-expanded",
      String(expandedThreads.has(key))
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
    subject.className = "gmail-thread-subject";
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
    article.append(summary, createThreadActions(account, thread));

    if (expandedThreads.has(key)) {
      article.appendChild(
        createThreadPreview(account, thread, previews.get(key))
      );
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
    email.textContent = account.email;
    const accountMeta = document.createElement("span");
    accountMeta.textContent = [
      t("gmailUnreadCount", { count: account.unreadCount }),
      formatLastUpdated(account.lastSuccessfulPollAt)
    ].join(" · ");
    identity.append(email, accountMeta);

    const actions = document.createElement("div");
    actions.className = "gmail-account-actions";
    actions.append(
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
    const toggleLabel = t(
      expanded ? "gmailCollapseAccount" : "gmailExpandAccount"
    );
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
    toggleButton.addEventListener("click", () => {
      void setAccountExpanded(account.accountId, !expanded);
    });
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
        list.appendChild(createThreadRow(account, thread));
      });
    }

    if (result?.stale) {
      const stale = document.createElement("p");
      stale.className = "gmail-account-stale";
      stale.textContent = t("gmailWidgetStale");
      body.appendChild(stale);
    }

    body.appendChild(list);
    card.appendChild(body);
    return card;
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

    cards.replaceChildren();
    cards.hidden = true;
    state.hidden = true;
    state.replaceChildren();
    widget.dataset.gmailStatus = cachedState.status;
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
          (account) => Number(account.lastSuccessfulPollAt) || 0
        )
      );
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

  async function refreshState() {
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

    render();
    return response;
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

  function setupWidgetEvents() {
    document.getElementById("gmailRefreshBtn")?.addEventListener(
      "click",
      () => void refresh({ force: true })
    );
    document.addEventListener("keydown", (event) => {
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
        void refresh({ force: false });
      }
    });
    window.addEventListener("hashchange", focusHashTarget);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (
        changes[ACCOUNTS_KEY] ||
        changes[OAUTH_CLIENTS_KEY] ||
        changes[SETTINGS_KEY]
      ) {
        void refresh({ force: false });
      } else if (changes.tabOutLanguage) {
        render();
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "tabOutGmail:authCompleted") {
        void refresh({ force: false });
      }
      return undefined;
    });
  }

  async function initialize() {
    setupWidgetEvents();

    if (globalObject.TabOutDashboardRuntime?.ready) {
      await globalObject.TabOutDashboardRuntime.ready;
    }

    await checkReadiness();
    await refresh({ force: false });
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
    getCachedState: () => clone(cachedState)
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    void initialize();
  }
})(globalThis);
