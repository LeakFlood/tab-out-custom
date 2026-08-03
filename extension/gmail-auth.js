(function setupTabOutGmailAuth(globalObject) {
  const KEYS = Object.freeze({
    accounts: "tabOutGmailAccountsV3",
    credentials: "tabOutGmailCredentialsV1",
    oauthClients: "tabOutGmailOAuthClientsV1",
    accessTokens: "tabOutGmailAccessTokensV3",
    pendingAuth: "tabOutGmailPendingAuthV1",
    schemaVersion: "tabOutGmailAuthSchemaVersion"
  });
  const LEGACY_LOCAL_KEYS = Object.freeze([
    "tabOutGmailAccountsV2",
    "tabOutGmailConnectionV1",
    "tabOutGmailAccessTokensV2",
    "tabOutGmailThreadCacheV2",
    "tabOutGmailSyncStateV1",
    "tabOutGmailPopupTargetV1"
  ]);
  const LEGACY_SESSION_KEYS = Object.freeze([
    "tabOutGmailAccessTokensV2",
    "tabOutGmailThreadCacheV2",
    "tabOutGmailPopupTargetV1"
  ]);
  const GMAIL_ALARM_PREFIX = "tabOutGmailPoll:";
  const GMAIL_NOTIFICATION_PREFIX = "tabout-gmail:";
  const refreshRequests = new Map();
  const authorizationCallbacks = new Set();

  function createError(code, message = code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function messageKeyForCode(code) {
    const keys = {
      account_exists: "gmailAccountAlreadyConnected",
      account_not_found: "gmailAccountNotFound",
      browser_unsupported: "gmailBrowserUnsupported",
      callback_failed: "gmailOAuthCallbackFailed",
      cancelled: "gmailOAuthCancelled",
      config_missing: "gmailConfigMissing",
      gmail_api_not_enabled: "gmailApiNotEnabled",
      invalid_grant: "gmailAuthorizationExpired",
      network_error: "gmailNetworkError",
      oauth_authorization_code_rejected:
        "gmailOAuthAuthorizationCodeRejected",
      oauth_client_secret_missing: "gmailOAuthClientSecretMissing",
      oauth_invalid_client: "gmailOAuthInvalidClient",
      oauth_invalid_request: "gmailOAuthInvalidRequest",
      oauth_redirect_uri_mismatch: "gmailOAuthRedirectMismatch",
      oauth_scope_not_granted: "gmailOAuthScopeNotGranted",
      oauth_unauthorized_client: "gmailOAuthUnauthorizedClient",
      oauth_client_in_use: "gmailOAuthClientInUse",
      oauth_failed: "gmailConnectFailed",
      oauth_timeout: "gmailOAuthTimeout",
      permission_denied: "gmailPermissionDenied",
      reconnect_account_mismatch: "gmailReconnectAccountMismatch",
      reconnect_required: "gmailAuthorizationExpired",
      refresh_token_missing: "gmailRefreshTokenMissing",
      state_mismatch: "gmailOAuthStateMismatch",
      token_exchange_failed: "gmailTokenExchangeFailed"
    };
    return keys[code] || "gmailConnectFailed";
  }

  function getConfig() {
    return globalObject.TabOutGmailConfig;
  }

  function randomBase64Url(byteLength) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  async function createPkcePair() {
    const verifier = randomBase64Url(64);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier)
    );
    let binary = "";

    new Uint8Array(digest).forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return {
      verifier,
      challenge: btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "")
    };
  }

  function emptyAccountsStore() {
    return {
      version: 3,
      accounts: []
    };
  }

  function emptyOAuthClientsStore() {
    return {
      version: 1,
      shared: null,
      dedicatedByAccountId: {}
    };
  }

  function normalizeOAuthClient(candidate) {
    return getConfig().normalizeOAuthClient(candidate);
  }

  function isValidOAuthClient(candidate) {
    return getConfig().isValidOAuthClient(candidate);
  }

  function normalizeOAuthClientsStore(candidate) {
    const normalized = emptyOAuthClientsStore();

    if (isValidOAuthClient(candidate?.shared)) {
      normalized.shared = {
        ...normalizeOAuthClient(candidate.shared),
        updatedAt: String(
          candidate.shared.updatedAt || new Date().toISOString()
        )
      };
    }

    if (
      candidate?.dedicatedByAccountId &&
      typeof candidate.dedicatedByAccountId === "object"
    ) {
      Object.entries(candidate.dedicatedByAccountId).forEach(
        ([accountId, oauthClient]) => {
          if (
            typeof accountId === "string" &&
            isValidOAuthClient(oauthClient)
          ) {
            normalized.dedicatedByAccountId[accountId] = {
              ...normalizeOAuthClient(oauthClient),
              updatedAt: String(
                oauthClient.updatedAt || new Date().toISOString()
              )
            };
          }
        }
      );
    }

    return normalized;
  }

  async function rawAccountsStore() {
    const stored = await chrome.storage.local.get(KEYS.accounts);
    const candidate = stored[KEYS.accounts];

    if (!candidate || !Array.isArray(candidate.accounts)) {
      return emptyAccountsStore();
    }

    return {
      version: 3,
      accounts: candidate.accounts
        .filter((account) =>
          typeof account?.accountId === "string" &&
          typeof account?.email === "string"
        )
        .slice(0, 50)
        .map((account) => ({
          accountId: account.accountId,
          email: account.email,
          connectedAt:
            typeof account.connectedAt === "string"
              ? account.connectedAt
              : new Date().toISOString(),
          scope: String(
            account.scope || getConfig()?.GMAIL_SCOPE || ""
          ),
          reconnectRequired: Boolean(account.reconnectRequired),
          credentialSource:
            account.credentialSource === "dedicated"
              ? "dedicated"
              : "shared"
        }))
    };
  }

  async function saveAccountsStore(store) {
    await chrome.storage.local.set({
      [KEYS.accounts]: {
        version: 3,
        accounts: Array.isArray(store?.accounts)
          ? store.accounts.slice(0, 50)
          : []
      }
    });
  }

  async function getCredentials() {
    const stored = await chrome.storage.local.get(KEYS.credentials);
    const credentials = stored[KEYS.credentials];
    return credentials && typeof credentials === "object"
      ? credentials
      : {};
  }

  async function saveCredentials(credentials) {
    await chrome.storage.local.set({
      [KEYS.credentials]: credentials
    });
  }

  async function getOAuthClientsStore() {
    const stored = await chrome.storage.local.get(KEYS.oauthClients);
    return normalizeOAuthClientsStore(stored[KEYS.oauthClients]);
  }

  async function saveOAuthClientsStore(store) {
    const normalized = normalizeOAuthClientsStore(store);
    await chrome.storage.local.set({
      [KEYS.oauthClients]: normalized
    });
    return normalized;
  }

  async function resolveOAuthClientForAccount(account) {
    const store = await getOAuthClientsStore();
    const oauthClient =
      account.credentialSource === "dedicated"
        ? store.dedicatedByAccountId[account.accountId]
        : store.shared;

    if (!isValidOAuthClient(oauthClient)) {
      throw createError("config_missing");
    }

    return normalizeOAuthClient(oauthClient);
  }

  async function getOAuthSettingsSummary() {
    await initialized;
    const [store, accountsStore] = await Promise.all([
      getOAuthClientsStore(),
      rawAccountsStore()
    ]);

    return {
      shared: {
        configured: isValidOAuthClient(store.shared),
        clientId: String(store.shared?.clientId || "")
      },
      accounts: accountsStore.accounts.map((account) => {
        const oauthClient =
          account.credentialSource === "dedicated"
            ? store.dedicatedByAccountId[account.accountId]
            : store.shared;
        return {
          accountId: account.accountId,
          credentialSource: account.credentialSource,
          configured: isValidOAuthClient(oauthClient),
          clientId: String(oauthClient?.clientId || "")
        };
      })
    };
  }

  async function getAccessTokens() {
    const stored = await chrome.storage.session.get(KEYS.accessTokens);
    const tokens = stored[KEYS.accessTokens];
    return tokens && typeof tokens === "object" ? tokens : {};
  }

  async function saveAccessTokens(tokens) {
    await chrome.storage.session.set({
      [KEYS.accessTokens]: tokens
    });
  }

  async function storeAccessToken(accountId, token, expiresAt) {
    const tokens = await getAccessTokens();
    tokens[accountId] = {
      token,
      expiresAt: Number(expiresAt) || Date.now() + 55 * 60 * 1000
    };
    await saveAccessTokens(tokens);
  }

  async function invalidateAccessToken(accountId) {
    const tokens = await getAccessTokens();

    if (tokens[accountId]) {
      delete tokens[accountId];
      await saveAccessTokens(tokens);
    }
  }

  async function getPendingAuth() {
    const stored = await chrome.storage.session.get(KEYS.pendingAuth);
    const pending = stored[KEYS.pendingAuth];
    return pending && typeof pending === "object" ? pending : null;
  }

  async function setPendingAuth(pending) {
    await chrome.storage.session.set({
      [KEYS.pendingAuth]: pending
    });
  }

  async function clearPendingAuth() {
    await chrome.storage.session.remove(KEYS.pendingAuth);
  }

  function isPendingExpired(pending) {
    return (
      !Number.isFinite(Number(pending?.createdAt)) ||
      Date.now() - Number(pending.createdAt) >
        getConfig().AUTH_TRANSACTION_MAX_AGE_MS
    );
  }

  function publicAccount(account) {
    return {
      accountId: account.accountId,
      email: account.email,
      connectedAt: account.connectedAt,
      scope: account.scope,
      reconnectRequired: Boolean(account.reconnectRequired),
      credentialSource:
        account.credentialSource === "dedicated"
          ? "dedicated"
          : "shared"
    };
  }

  async function getAccountsStore() {
    await initialized;
    return rawAccountsStore();
  }

  async function getAccount(accountId) {
    const store = await getAccountsStore();
    const account = store.accounts.find(
      (candidate) => candidate.accountId === accountId
    );

    if (!account) {
      throw createError("account_not_found");
    }

    return account;
  }

  async function updateAccount(accountId, updates) {
    const store = await getAccountsStore();
    const index = store.accounts.findIndex(
      (candidate) => candidate.accountId === accountId
    );

    if (index < 0) {
      throw createError("account_not_found");
    }

    store.accounts[index] = {
      ...store.accounts[index],
      ...updates,
      accountId
    };
    await saveAccountsStore(store);
    return store.accounts[index];
  }

  async function markReconnectRequired(accountId) {
    try {
      await updateAccount(accountId, {
        reconnectRequired: true
      });
    } finally {
      await invalidateAccessToken(accountId);
    }
  }

  async function parseJsonResponse(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      getConfig().OAUTH_REQUEST_TIMEOUT_MS
    );

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  function tokenEndpointErrorCode(payload) {
    const error = String(payload?.error || "");
    const description = String(
      payload?.error_description || ""
    ).toLocaleLowerCase();

    if (
      error === "invalid_request" &&
      description.includes("client_secret")
    ) {
      return "oauth_client_secret_missing";
    }

    const codes = {
      invalid_client: "oauth_invalid_client",
      invalid_request: "oauth_invalid_request",
      invalid_scope: "oauth_scope_not_granted",
      redirect_uri_mismatch: "oauth_redirect_uri_mismatch",
      unauthorized_client: "oauth_unauthorized_client",
      unsupported_grant_type: "oauth_invalid_request"
    };
    return error === "invalid_grant"
      ? "invalid_grant"
      : codes[error] || "token_exchange_failed";
  }

  async function requestTokens(parameters) {
    let response;

    try {
      response = await fetchWithTimeout(
        getConfig().GOOGLE_TOKEN_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json"
          },
          body: parameters
        }
      );
    } catch {
      throw createError("network_error");
    }

    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) {
        throw createError("network_error");
      }

      throw createError(tokenEndpointErrorCode(payload));
    }

    return payload;
  }

  async function exchangeAuthorizationCode(pending) {
    let payload;
    const oauthClient = normalizeOAuthClient(pending.oauthClient);

    if (!isValidOAuthClient(oauthClient)) {
      throw createError("config_missing");
    }

    try {
      payload = await requestTokens(
        new URLSearchParams({
          client_id: oauthClient.clientId,
          client_secret: oauthClient.clientSecret,
          code: pending.code,
          code_verifier: pending.verifier,
          redirect_uri: pending.redirectUri,
          grant_type: "authorization_code"
        })
      );
    } catch (error) {
      if (error.code === "invalid_grant") {
        throw createError("oauth_authorization_code_rejected");
      }

      throw error;
    }

    if (!payload.access_token) {
      throw createError("token_exchange_failed");
    }

    if (!payload.refresh_token) {
      throw createError("refresh_token_missing");
    }

    const grantedScopes = String(payload.scope || "")
      .split(/\s+/)
      .filter(Boolean);

    if (
      grantedScopes.length &&
      !grantedScopes.includes(getConfig().GMAIL_SCOPE)
    ) {
      throw createError("oauth_scope_not_granted");
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt:
        Date.now() +
        Math.max(60, Number(payload.expires_in) || 3600) * 1000
    };
  }

  async function refreshAccessToken(
    accountId,
    refreshToken,
    oauthClient
  ) {
    const payload = await requestTokens(
      new URLSearchParams({
        client_id: oauthClient.clientId,
        client_secret: oauthClient.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      })
    );

    if (!payload.access_token) {
      throw createError("token_exchange_failed");
    }

    if (payload.refresh_token) {
      const credentials = await getCredentials();
      credentials[accountId] = {
        refreshToken: payload.refresh_token
      };
      await saveCredentials(credentials);
    }

    const token = {
      token: payload.access_token,
      expiresAt:
        Date.now() +
        Math.max(60, Number(payload.expires_in) || 3600) * 1000
    };
    await storeAccessToken(accountId, token.token, token.expiresAt);
    return token.token;
  }

  async function getAccessToken(
    accountId,
    { forceRefresh = false } = {}
  ) {
    const account = await getAccount(accountId);

    if (account.reconnectRequired) {
      throw createError("reconnect_required");
    }

    const oauthClient = await resolveOAuthClientForAccount(account);

    if (!forceRefresh) {
      const tokens = await getAccessTokens();
      const cached = tokens[accountId];

      if (
        cached?.token &&
        Number(cached.expiresAt) >
          Date.now() + getConfig().ACCESS_TOKEN_SKEW_MS
      ) {
        return cached.token;
      }
    }

    if (refreshRequests.has(accountId)) {
      return refreshRequests.get(accountId);
    }

    const refreshRequest = (async () => {
      const credentials = await getCredentials();
      const refreshToken = credentials[accountId]?.refreshToken;

      if (!refreshToken) {
        await markReconnectRequired(accountId);
        throw createError("reconnect_required");
      }

      try {
        return await refreshAccessToken(
          accountId,
          refreshToken,
          oauthClient
        );
      } catch (error) {
        if (error.code === "invalid_grant") {
          await markReconnectRequired(accountId);
          throw createError("reconnect_required");
        }

        throw error;
      }
    })();

    refreshRequests.set(accountId, refreshRequest);

    try {
      return await refreshRequest;
    } finally {
      refreshRequests.delete(accountId);
    }
  }

  async function revokeToken(token) {
    if (!token) {
      return false;
    }

    try {
      const response = await fetchWithTimeout(
        getConfig().GOOGLE_REVOCATION_ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({ token })
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async function fetchProfile(accessToken) {
    let response;

    try {
      response = await fetchWithTimeout(
        `${getConfig().GMAIL_API_ORIGIN}/gmail/v1/users/me/profile`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json"
          }
        }
      );
    } catch {
      throw createError("network_error");
    }

    const profile = await parseJsonResponse(response);

    if (!response.ok) {
      if (response.status === 401) {
        throw createError("reconnect_required");
      }

      if (response.status === 403) {
        const details = JSON.stringify(profile).toLocaleLowerCase();

        if (
          details.includes("rate_limit") ||
          details.includes("quota_exceeded") ||
          details.includes("resource_exhausted")
        ) {
          throw createError("network_error");
        }

        throw createError(
          details.includes("service_disabled") ||
            details.includes("accessnotconfigured") ||
            details.includes("has not been used") ||
            details.includes("is disabled")
            ? "gmail_api_not_enabled"
            : "oauth_scope_not_granted"
        );
      }

      throw createError("oauth_failed");
    }

    const email = String(profile.emailAddress || "").trim();

    if (!email) {
      throw createError("oauth_failed");
    }

    return { email };
  }

  function newAccountId() {
    return `gmail_${randomBase64Url(18)}`;
  }

  async function saveConnectedAccount(pending, tokens, profile) {
    const store = await rawAccountsStore();
    const credentials = await getCredentials();
    const oauthClients = await getOAuthClientsStore();
    const requestedReplacement = pending.replaceAccountId
      ? store.accounts.find(
          (account) => account.accountId === pending.replaceAccountId
        )
      : null;
    const duplicate = store.accounts.find(
      (account) =>
        account.email.toLocaleLowerCase() ===
          profile.email.toLocaleLowerCase() &&
        account.accountId !== pending.replaceAccountId
    );

    if (pending.replaceAccountId && !requestedReplacement) {
      throw createError("account_not_found");
    }

    if (duplicate && !requestedReplacement) {
      throw createError("account_exists");
    }

    if (
      requestedReplacement &&
      requestedReplacement.email.toLocaleLowerCase() !==
        profile.email.toLocaleLowerCase()
    ) {
      throw createError("reconnect_account_mismatch");
    }

    const replacement = requestedReplacement;
    const accountId = replacement?.accountId || newAccountId();
    const credentialSource =
      pending.credentialSource === "dedicated"
        ? "dedicated"
        : "shared";
    const account = {
      accountId,
      email: profile.email,
      connectedAt:
        replacement?.connectedAt || new Date().toISOString(),
      scope: getConfig().GMAIL_SCOPE,
      reconnectRequired: false,
      credentialSource
    };

    if (replacement) {
      const index = store.accounts.findIndex(
        (candidate) => candidate.accountId === accountId
      );
      store.accounts[index] = account;
    } else {
      store.accounts.push(account);
    }

    const previousRefreshToken =
      credentials[accountId]?.refreshToken || "";
    credentials[accountId] = {
      refreshToken: tokens.refreshToken
    };

    if (credentialSource === "dedicated") {
      oauthClients.dedicatedByAccountId[accountId] = {
        ...normalizeOAuthClient(pending.oauthClient),
        updatedAt: new Date().toISOString()
      };
    } else {
      delete oauthClients.dedicatedByAccountId[accountId];
    }

    const updates = {
      [KEYS.accounts]: store,
      [KEYS.credentials]: credentials,
      [KEYS.oauthClients]: oauthClients
    };
    const settingsApi = globalThis.TabOutDashboardSettings;

    if (settingsApi) {
      const storedSettings = await chrome.storage.local.get(
        settingsApi.STORAGE_KEY
      );
      const settings = settingsApi.normalizeSettings(
        storedSettings[settingsApi.STORAGE_KEY]
      );

      if (!settings.integrations.gmail.accountPreferences[accountId]) {
        settings.integrations.gmail.accountPreferences[accountId] =
          settingsApi.clone(settings.integrations.gmail.accountDefaults);
      }

      settings.layout.visibility.gmail = true;
      settings.preset = "custom";
      updates[settingsApi.STORAGE_KEY] = settings;
    }

    await chrome.storage.local.set(updates);
    await storeAccessToken(
      accountId,
      tokens.accessToken,
      tokens.expiresAt
    );

    if (
      previousRefreshToken &&
      previousRefreshToken !== tokens.refreshToken
    ) {
      await revokeToken(previousRefreshToken);
    }

    return publicAccount(account);
  }

  function broadcastAuthResult(result) {
    try {
      chrome.runtime.sendMessage(
        {
          type: "tabOutGmail:authCompleted",
          ...result
        },
        () => void chrome.runtime.lastError
      );
    } catch {
      return;
    }
  }

  async function showFailurePage(tabId, code) {
    if (!Number.isInteger(tabId)) {
      return;
    }

    try {
      await chrome.tabs.update(tabId, {
        url: chrome.runtime.getURL(
          `gmail-oauth-result.html?status=error&code=${encodeURIComponent(
            code
          )}`
        )
      });
    } catch {
      return;
    }
  }

  async function failPendingAuth(pending, code) {
    await clearPendingAuth();
    await showFailurePage(pending?.tabId, code);
    const result = {
      ok: false,
      transactionId: String(pending?.transactionId || ""),
      code,
      messageKey: messageKeyForCode(code)
    };
    broadcastAuthResult(result);
    return result;
  }

  async function completePendingAuth(pending) {
    let tokens;

    try {
      tokens = await exchangeAuthorizationCode(pending);
      const profile = await fetchProfile(tokens.accessToken);

      const account = await saveConnectedAccount(
        pending,
        tokens,
        profile
      );
      await clearPendingAuth();

      if (Number.isInteger(pending.tabId)) {
        try {
          await chrome.tabs.remove(pending.tabId);
        } catch {
          undefined;
        }
      }

      const result = {
        ok: true,
        transactionId: pending.transactionId,
        account
      };
      broadcastAuthResult(result);
      return result;
    } catch (error) {
      if (tokens?.refreshToken) {
        await revokeToken(tokens.refreshToken);
      }

      return failPendingAuth(
        pending,
        error?.code || "token_exchange_failed"
      );
    }
  }

  function callbackMatches(pending, callbackUrl) {
    try {
      const expected = new URL(pending.redirectUri);
      return (
        callbackUrl.origin === expected.origin &&
        callbackUrl.pathname === expected.pathname
      );
    } catch {
      return false;
    }
  }

  function authorizationResponseParameters(callbackUrl) {
    const query = new URLSearchParams(callbackUrl.search);

    if (
      query.has("code") ||
      query.has("error") ||
      query.has("state")
    ) {
      return query;
    }

    return new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
  }

  function authorizationEndpointErrorCode(error) {
    const codes = {
      access_denied: "cancelled",
      invalid_request: "oauth_invalid_request",
      invalid_scope: "oauth_scope_not_granted",
      server_error: "network_error",
      temporarily_unavailable: "network_error",
      unauthorized_client: "oauth_unauthorized_client"
    };
    return codes[error] || "oauth_failed";
  }

  async function handleAuthorizationNavigation(tabId, rawUrl) {
    await initialized;
    const pending = await getPendingAuth();

    if (
      !pending ||
      pending.tabId !== tabId ||
      pending.phase !== "waiting"
    ) {
      return;
    }

    let callbackUrl;

    try {
      callbackUrl = new URL(rawUrl);
    } catch {
      return;
    }

    if (!callbackMatches(pending, callbackUrl)) {
      return;
    }

    if (authorizationCallbacks.has(pending.transactionId)) {
      return;
    }

    authorizationCallbacks.add(pending.transactionId);

    try {
      const responseParameters =
        authorizationResponseParameters(callbackUrl);

      if (isPendingExpired(pending)) {
        await failPendingAuth(pending, "oauth_timeout");
        return;
      }

      if (responseParameters.get("state") !== pending.state) {
        await failPendingAuth(pending, "state_mismatch");
        return;
      }

      const authorizationError = String(
        responseParameters.get("error") || ""
      );

      if (authorizationError) {
        await failPendingAuth(
          pending,
          authorizationEndpointErrorCode(authorizationError)
        );
        return;
      }

      const code = String(responseParameters.get("code") || "");

      if (!code) {
        await failPendingAuth(pending, "callback_failed");
        return;
      }

      const exchanging = {
        ...pending,
        code,
        phase: "exchanging"
      };
      await setPendingAuth(exchanging);
      await completePendingAuth(exchanging);
    } finally {
      authorizationCallbacks.delete(pending.transactionId);
    }
  }

  async function focusPendingTab(pending) {
    if (!Number.isInteger(pending?.tabId)) {
      return false;
    }

    try {
      const tab = await chrome.tabs.get(pending.tabId);
      await chrome.tabs.update(pending.tabId, { active: true });

      if (Number.isInteger(tab.windowId)) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }

      return true;
    } catch {
      return false;
    }
  }

  function authorizationUrlFor(pending, challenge) {
    return `${
      getConfig().GOOGLE_AUTHORIZATION_ENDPOINT
    }?${new URLSearchParams({
      client_id: pending.oauthClient.clientId,
      redirect_uri: pending.redirectUri,
      response_type: "code",
      scope: getConfig().GMAIL_SCOPE,
      access_type: "offline",
      prompt: "consent select_account",
      state: pending.state,
      code_challenge: challenge,
      code_challenge_method: "S256"
    }).toString()}`;
  }

  async function beginConnect(options = {}) {
    await initialized;
    const request =
      typeof options === "string"
        ? { replaceAccountId: options }
        : options || {};
    const replaceAccountId = String(
      request.replaceAccountId || ""
    );

    const current = await getPendingAuth();

    if (current && !isPendingExpired(current)) {
      await focusPendingTab(current);
      return {
        pending: true,
        reused: true,
        transactionId: current.transactionId
      };
    }

    if (current) {
      await clearPendingAuth();
    }

    const replacement = replaceAccountId
      ? await getAccount(replaceAccountId)
      : null;
    const credentialSource =
      request.credentialSource === "dedicated"
        ? "dedicated"
        : request.credentialSource === "shared"
          ? "shared"
          : replacement?.credentialSource === "dedicated"
            ? "dedicated"
            : "shared";
    let oauthClient;

    if (
      credentialSource === "dedicated" &&
      isValidOAuthClient(request.oauthClient)
    ) {
      oauthClient = normalizeOAuthClient(request.oauthClient);
    } else if (replacement) {
      oauthClient = await resolveOAuthClientForAccount({
        ...replacement,
        credentialSource
      });
    } else {
      const oauthClients = await getOAuthClientsStore();
      oauthClient =
        credentialSource === "shared"
          ? normalizeOAuthClient(oauthClients.shared)
          : null;
    }

    if (!isValidOAuthClient(oauthClient)) {
      throw createError("config_missing");
    }

    const pkce = await createPkcePair();
    const port = 49152 + crypto.getRandomValues(
      new Uint16Array(1)
    )[0] % 16384;
    const pending = {
      transactionId: `oauth_${randomBase64Url(18)}`,
      replaceAccountId,
      credentialSource,
      oauthClient,
      redirectUri: `http://127.0.0.1:${port}`,
      verifier: pkce.verifier,
      state: randomBase64Url(32),
      createdAt: Date.now(),
      phase: "waiting",
      tabId: null
    };
    await setPendingAuth(pending);

    let tab;

    try {
      tab = await chrome.tabs.create({
        url: authorizationUrlFor(pending, pkce.challenge),
        active: true
      });
    } catch {
      await clearPendingAuth();
      throw createError("browser_unsupported");
    }

    const stored = {
      ...pending,
      tabId: tab.id
    };
    await setPendingAuth(stored);
    return {
      pending: true,
      reused: false,
      transactionId: stored.transactionId
    };
  }

  async function cancelConnect(transactionId = "") {
    await initialized;
    const pending = await getPendingAuth();

    if (
      !pending ||
      (transactionId && pending.transactionId !== transactionId)
    ) {
      return { cancelled: false };
    }

    await clearPendingAuth();

    if (Number.isInteger(pending.tabId)) {
      try {
        await chrome.tabs.remove(pending.tabId);
      } catch {
        undefined;
      }
    }

    const result = {
      ok: false,
      transactionId: pending.transactionId,
      code: "cancelled",
      messageKey: messageKeyForCode("cancelled")
    };
    broadcastAuthResult(result);
    return { cancelled: true };
  }

  async function resetSharedAccountsForClientChange(
    accounts,
    oauthClients
  ) {
    const affectedAccounts = accounts.filter(
      (account) => account.credentialSource !== "dedicated"
    );

    if (!affectedAccounts.length) {
      return [];
    }

    const credentials = await getCredentials();
    const accessTokens = await getAccessTokens();

    await Promise.all(
      affectedAccounts.map((account) =>
        revokeToken(credentials[account.accountId]?.refreshToken || "")
      )
    );

    affectedAccounts.forEach((account) => {
      delete credentials[account.accountId];
      delete accessTokens[account.accountId];
      account.reconnectRequired = true;
      delete oauthClients.dedicatedByAccountId[account.accountId];
    });

    await Promise.all([
      saveCredentials(credentials),
      saveAccessTokens(accessTokens)
    ]);
    return affectedAccounts.map(publicAccount);
  }

  async function saveSharedOAuthClient(
    candidate,
    { replaceConnected = false } = {}
  ) {
    await initialized;
    const oauthClients = await getOAuthClientsStore();
    const existing = oauthClients.shared;
    const normalizedCandidate = normalizeOAuthClient(candidate);
    const nextClient = {
      clientId: normalizedCandidate.clientId,
      clientSecret:
        normalizedCandidate.clientSecret ||
        (existing?.clientId === normalizedCandidate.clientId
          ? existing.clientSecret
          : "")
    };

    if (!isValidOAuthClient(nextClient)) {
      throw createError("config_missing");
    }

    const changed =
      !existing ||
      existing.clientId !== nextClient.clientId ||
      existing.clientSecret !== nextClient.clientSecret;
    const accountsStore = await rawAccountsStore();
    const affected = changed
      ? accountsStore.accounts.filter(
          (account) => account.credentialSource !== "dedicated"
        )
      : [];

    if (affected.length && !replaceConnected) {
      throw createError("oauth_client_in_use");
    }

    const pending = await getPendingAuth();

    if (
      changed &&
      pending &&
      pending.credentialSource !== "dedicated"
    ) {
      await cancelConnect(pending.transactionId);
    }

    const resetAccounts = changed
      ? await resetSharedAccountsForClientChange(
          accountsStore.accounts,
          oauthClients
        )
      : [];
    oauthClients.shared = {
      ...nextClient,
      updatedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({
      [KEYS.accounts]: accountsStore,
      [KEYS.oauthClients]: oauthClients
    });

    return {
      shared: {
        configured: true,
        clientId: nextClient.clientId
      },
      affectedAccounts: resetAccounts
    };
  }

  async function removeSharedOAuthClient({
    replaceConnected = false
  } = {}) {
    await initialized;
    const [oauthClients, accountsStore] = await Promise.all([
      getOAuthClientsStore(),
      rawAccountsStore()
    ]);
    const affected = accountsStore.accounts.filter(
      (account) => account.credentialSource !== "dedicated"
    );

    if (affected.length && !replaceConnected) {
      throw createError("oauth_client_in_use");
    }

    const pending = await getPendingAuth();

    if (pending && pending.credentialSource !== "dedicated") {
      await cancelConnect(pending.transactionId);
    }

    const resetAccounts =
      await resetSharedAccountsForClientChange(
        accountsStore.accounts,
        oauthClients
      );
    oauthClients.shared = null;
    await chrome.storage.local.set({
      [KEYS.accounts]: accountsStore,
      [KEYS.oauthClients]: oauthClients
    });

    return {
      shared: {
        configured: false,
        clientId: ""
      },
      affectedAccounts: resetAccounts
    };
  }

  async function disconnect(accountId) {
    await initialized;
    const store = await rawAccountsStore();
    const account = store.accounts.find(
      (candidate) => candidate.accountId === accountId
    );

    if (!account) {
      throw createError("account_not_found");
    }

    const credentials = await getCredentials();
    const oauthClients = await getOAuthClientsStore();
    const refreshToken = credentials[accountId]?.refreshToken || "";
    const revoked = await revokeToken(refreshToken);
    store.accounts = store.accounts.filter(
      (candidate) => candidate.accountId !== accountId
    );
    delete credentials[accountId];
    delete oauthClients.dedicatedByAccountId[accountId];
    await chrome.storage.local.set({
      [KEYS.accounts]: store,
      [KEYS.credentials]: credentials,
      [KEYS.oauthClients]: oauthClients
    });
    await invalidateAccessToken(accountId);
    return { revoked };
  }

  async function getReadiness() {
    await initialized;
    const [oauthClients, accountsStore] = await Promise.all([
      getOAuthClientsStore(),
      rawAccountsStore()
    ]);
    const configured =
      isValidOAuthClient(oauthClients.shared) ||
      accountsStore.accounts.some((account) =>
        isValidOAuthClient(
          account.credentialSource === "dedicated"
            ? oauthClients.dedicatedByAccountId[account.accountId]
            : oauthClients.shared
        )
      );
    const pending = await getPendingAuth();
    return {
      ready: configured,
      status: configured ? "ready" : "unavailable",
      code: configured ? "" : "config_missing",
      messageKey: configured ? "" : "gmailConfigMissing",
      pending: pending && !isPendingExpired(pending)
        ? {
            transactionId: pending.transactionId,
            createdAt: pending.createdAt,
            phase: pending.phase
          }
        : null
    };
  }

  async function clearLegacyGmailAlarms() {
    if (!chrome.alarms?.getAll) {
      return;
    }

    const alarms = await chrome.alarms.getAll();
    await Promise.all(
      alarms
        .filter((alarm) => alarm.name.startsWith(GMAIL_ALARM_PREFIX))
        .map((alarm) => chrome.alarms.clear(alarm.name))
    );
  }

  async function clearLegacyGmailNotifications() {
    if (!chrome.notifications?.getAll) {
      return;
    }

    const notifications = await chrome.notifications.getAll();
    await Promise.all(
      Object.keys(notifications)
        .filter((id) => id.startsWith(GMAIL_NOTIFICATION_PREFIX))
        .map((id) => chrome.notifications.clear(id))
    );
  }

  async function resetGmailSettings() {
    const settingsApi = globalObject.TabOutDashboardSettings;

    if (!settingsApi) {
      return;
    }

    const stored = await chrome.storage.local.get(
      settingsApi.STORAGE_KEY
    );

    if (!stored[settingsApi.STORAGE_KEY]) {
      return;
    }

    const settings = settingsApi.normalizeSettings(
      stored[settingsApi.STORAGE_KEY]
    );
    const defaults = settingsApi.getDefaultSettings();
    settings.integrations.gmail = defaults.integrations.gmail;
    settings.layout.visibility.gmail = false;
    settings.preset = "custom";
    await chrome.storage.local.set({
      [settingsApi.STORAGE_KEY]: settings
    });
  }

  async function migrateOAuthClientStorage() {
    const stored = await chrome.storage.local.get(KEYS.oauthClients);

    if (stored[KEYS.oauthClients]) {
      await saveOAuthClientsStore(stored[KEYS.oauthClients]);
      return;
    }

    const legacyClient = getConfig().getLegacyOAuthClient?.();
    const oauthClients = emptyOAuthClientsStore();

    if (isValidOAuthClient(legacyClient)) {
      oauthClients.shared = {
        ...normalizeOAuthClient(legacyClient),
        updatedAt: new Date().toISOString()
      };
    }

    await saveOAuthClientsStore(oauthClients);
  }

  async function reconcileAccountOAuthState() {
    const [accountsStore, oauthClients] = await Promise.all([
      rawAccountsStore(),
      getOAuthClientsStore()
    ]);
    let changed = false;

    accountsStore.accounts.forEach((account) => {
      const oauthClient =
        account.credentialSource === "dedicated"
          ? oauthClients.dedicatedByAccountId[account.accountId]
          : oauthClients.shared;

      if (!isValidOAuthClient(oauthClient) && !account.reconnectRequired) {
        account.reconnectRequired = true;
        changed = true;
      }
    });

    if (changed) {
      await saveAccountsStore(accountsStore);
    }
  }

  async function initializeStorage() {
    try {
      await chrome.storage.local.setAccessLevel?.({
        accessLevel: "TRUSTED_CONTEXTS"
      });
      await chrome.storage.session.setAccessLevel?.({
        accessLevel: "TRUSTED_CONTEXTS"
      });
    } catch {
      undefined;
    }

    const stored = await chrome.storage.local.get(KEYS.schemaVersion);

    if (stored[KEYS.schemaVersion] !== 1) {
      await resetGmailSettings();
      await chrome.storage.local.remove(LEGACY_LOCAL_KEYS);
      await chrome.storage.local.set({
        [KEYS.accounts]: emptyAccountsStore(),
        [KEYS.credentials]: {},
        [KEYS.schemaVersion]: 1
      });
      await chrome.storage.session.remove(LEGACY_SESSION_KEYS);
      await clearLegacyGmailAlarms();
      await clearLegacyGmailNotifications();
    }

    await migrateOAuthClientStorage();
    const normalizedAccounts = await rawAccountsStore();
    await saveAccountsStore(normalizedAccounts);
    await reconcileAccountOAuthState();

    const pending = await getPendingAuth();

    if (!pending) {
      return;
    }

    if (isPendingExpired(pending)) {
      await failPendingAuth(pending, "oauth_timeout");
      return;
    }

    if (pending.phase === "exchanging" && pending.code) {
      await completePendingAuth(pending);
    }
  }

  const initialized = initializeStorage();

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url) {
      handleAuthorizationNavigation(tabId, changeInfo.url).catch(
        () => undefined
      );
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    initialized
      .then(getPendingAuth)
      .then(async (pending) => {
        if (
          pending?.tabId === tabId &&
          pending.phase === "waiting"
        ) {
          await clearPendingAuth();
          broadcastAuthResult({
            ok: false,
            transactionId: pending.transactionId,
            code: "cancelled",
            messageKey: messageKeyForCode("cancelled")
          });
        }
      })
      .catch(() => undefined);
  });

  globalObject.TabOutGmailAuth = Object.freeze({
    KEYS,
    initialized,
    beginConnect,
    cancelConnect,
    disconnect,
    getAccessToken,
    invalidateAccessToken,
    getAccountsStore,
    saveAccountsStore,
    getAccount,
    updateAccount,
    markReconnectRequired,
    getReadiness,
    getOAuthSettingsSummary,
    saveSharedOAuthClient,
    removeSharedOAuthClient,
    getPendingAuth,
    messageKeyForCode,
    createError
  });
})(globalThis);
