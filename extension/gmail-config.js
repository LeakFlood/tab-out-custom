(function exposeTabOutGmailConfig(globalObject) {
  const clientId = String(
    globalObject.TAB_OUT_GMAIL_DESKTOP_CLIENT_ID || ""
  ).trim();
  const clientSecret = String(
    globalObject.TAB_OUT_GMAIL_DESKTOP_CLIENT_SECRET || ""
  ).trim();
  const CLIENT_ID_PATTERN =
    /^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/;

  function normalizeOAuthClient(candidate) {
    return {
      clientId: String(candidate?.clientId || "").trim(),
      clientSecret: String(candidate?.clientSecret || "").trim()
    };
  }

  function isValidOAuthClient(candidate) {
    const normalized = normalizeOAuthClient(candidate);
    return (
      CLIENT_ID_PATTERN.test(normalized.clientId) &&
      normalized.clientSecret.length > 0
    );
  }

  globalObject.TabOutGmailConfig = Object.freeze({
    CLIENT_ID_PATTERN,
    GMAIL_SCOPE: "https://www.googleapis.com/auth/gmail.modify",
    GOOGLE_AUTHORIZATION_ENDPOINT:
      "https://accounts.google.com/o/oauth2/v2/auth",
    GOOGLE_TOKEN_ENDPOINT: "https://oauth2.googleapis.com/token",
    GOOGLE_REVOCATION_ENDPOINT:
      "https://oauth2.googleapis.com/revoke",
    OAUTH_API_ORIGIN: "https://oauth2.googleapis.com",
    GMAIL_API_ORIGIN: "https://gmail.googleapis.com",
    AUTH_TRANSACTION_MAX_AGE_MS: 5 * 60 * 1000,
    OAUTH_REQUEST_TIMEOUT_MS: 30 * 1000,
    CACHE_MAX_AGE_MS: 5 * 60 * 1000,
    ACCESS_TOKEN_SKEW_MS: 60 * 1000,
    MAX_RENDERED_BODY_BYTES: 512 * 1024,
    normalizeOAuthClient,
    isValidOAuthClient,
    getLegacyOAuthClient() {
      return normalizeOAuthClient({
        clientId,
        clientSecret
      });
    },
    isConfigured() {
      return isValidOAuthClient({
        clientId,
        clientSecret
      });
    }
  });
})(globalThis);
