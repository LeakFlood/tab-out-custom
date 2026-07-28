'use strict';

(() => {
  function send(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, code: "chrome_api_failed" });
          return;
        }

        resolve(response || { ok: false, code: "chrome_api_failed" });
      });
    });
  }

  async function request(message) {
    const response = await send(message);

    if (!response.ok) {
      throw new Error(response.code || "chrome_api_failed");
    }

    return response;
  }

  async function getSessions() {
    const response = await request({ type: "tabOut:getSessions" });
    return Array.isArray(response.sessions) ? response.sessions : [];
  }

  async function replaceSessions(sessions) {
    return request({
      type: "tabOut:replaceSessions",
      sessions
    });
  }

  async function getProtectedGroups() {
    const response = await request({ type: "tabOut:getProtectedGroups" });
    return Array.isArray(response.groups) ? response.groups : [];
  }

  async function replaceProtectedGroups(groups) {
    return request({
      type: "tabOut:replaceProtectedGroups",
      groups
    });
  }

  globalThis.TabOutCollectionClient = Object.freeze({
    getProtectedGroups,
    getSessions,
    replaceProtectedGroups,
    replaceSessions,
    send
  });
})();

function sendCollectionRuntimeMessage(message) {
  return globalThis.TabOutCollectionClient.send(message);
}
