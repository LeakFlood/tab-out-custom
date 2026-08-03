const messages = {
  account_exists:
    "This Gmail account is already connected in Tab Out.",
  callback_failed:
    "Google did not return a usable authorization response.",
  cancelled: "The Gmail authorization request was cancelled.",
  network_error:
    "Google could not be reached. Check your connection and try again.",
  gmail_api_not_enabled:
    "Enable the Gmail API in the Google Cloud project that owns this OAuth client, then try again.",
  oauth_authorization_code_rejected:
    "Google rejected the one-time authorization code. Reload Tab Out and start a new connection.",
  oauth_client_secret_missing:
    "This Google Desktop OAuth client requires its issued client secret. Add it to the extension OAuth credentials and reload Tab Out.",
  oauth_invalid_client:
    "Google rejected the Desktop OAuth client ID or client secret. Copy both values from the same active Desktop app client.",
  oauth_invalid_request:
    "Google rejected the token request as malformed. Reload the extension and try again.",
  oauth_redirect_uri_mismatch:
    "Google rejected the local loopback callback for this OAuth client.",
  oauth_scope_not_granted:
    "The required Gmail permission was not granted or is not configured for this OAuth app.",
  oauth_unauthorized_client:
    "This OAuth client is not authorized to use the Desktop application flow.",
  oauth_timeout:
    "The authorization request expired. Return to Tab Out and try again.",
  reconnect_account_mismatch:
    "Select the same Gmail account that you are trying to reconnect.",
  refresh_token_missing:
    "Google did not issue offline access. Revoke the previous grant and try again.",
  state_mismatch:
    "The authorization response could not be verified safely.",
  token_exchange_failed:
    "Google could not complete the authorization-code exchange."
};
const code = new URLSearchParams(location.search).get("code") || "";
const message = document.getElementById("oauthResultMessage");

if (message) {
  message.textContent =
    messages[code] || "Return to Tab Out and try again.";
}

document.getElementById("oauthResultClose")?.addEventListener(
  "click",
  () => window.close()
);
