(function setupTabOutGmailApi(globalObject) {
  function createError(code, message = code) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  async function requestWithToken(
    token,
    path,
    { method = "GET", body } = {}
  ) {
    const config = globalObject.TabOutGmailConfig;
    let response;

    try {
      response = await fetch(`${config.GMAIL_API_ORIGIN}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json" })
        },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw createError("network_error");
    }

    let payload = {};

    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      if (response.status === 400) {
        throw createError("invalid_query");
      }

      if (response.status === 401 || response.status === 403) {
        throw createError("reconnect_required");
      }

      if (response.status === 429 || response.status >= 500) {
        throw createError("network_error");
      }

      throw createError("gmail_api_failed");
    }

    return payload;
  }

  async function request(
    accountId,
    path,
    options = {},
    retryAuthorization = true
  ) {
    const auth = globalObject.TabOutGmailAuth;
    const token = await auth.getAccessToken(accountId);

    try {
      return await requestWithToken(token, path, options);
    } catch (error) {
      if (
        error.code !== "reconnect_required" ||
        !retryAuthorization
      ) {
        throw error;
      }

      await auth.invalidateAccessToken(accountId);

      try {
        const refreshedToken = await auth.getAccessToken(accountId, {
          forceRefresh: true
        });
        return await requestWithToken(
          refreshedToken,
          path,
          options
        );
      } catch (retryError) {
        if (retryError.code === "reconnect_required") {
          await auth.markReconnectRequired(accountId);
        }

        throw retryError;
      }
    }
  }

  globalObject.TabOutGmailApi = Object.freeze({
    request,
    requestWithToken
  });
})(globalThis);
