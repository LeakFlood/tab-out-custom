(function exposeTabOutTabMetadata(globalObject) {
  const SUSPENDED_PAGE_PATH = "/suspended.html";

  function decodeValue(value = "") {
    try {
      return decodeURIComponent(value);
    } catch {
      return String(value || "");
    }
  }

  function getHashValue(hash, key, consumeRest = false) {
    const normalizedHash = String(hash || "").replace(/^#+/, "");
    const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = consumeRest
      ? new RegExp(`(?:^|&)${escapedKey}=(.*)$`)
      : new RegExp(`(?:^|&)${escapedKey}=([^&]*)`);
    return normalizedHash.match(pattern)?.[1] || "";
  }

  function getOriginalSuspendedUrl(hash) {
    const rawUri = getHashValue(hash, "uri", true);

    if (rawUri) {
      try {
        new URL(rawUri);
        return rawUri;
      } catch {
        const decodedUri = decodeValue(rawUri);

        try {
          new URL(decodedUri);
          return decodedUri;
        } catch {
          return "";
        }
      }
    }

    const legacyUrl = decodeValue(getHashValue(hash, "url"));

    try {
      if (legacyUrl) {
        new URL(legacyUrl);
      }

      return legacyUrl;
    } catch {
      return "";
    }
  }

  function parseMarvellousSuspenderUrl(value = "") {
    let parsed;

    try {
      parsed = new URL(String(value || ""));
    } catch {
      return null;
    }

    if (
      parsed.protocol !== "chrome-extension:" ||
      parsed.pathname.toLocaleLowerCase() !== SUSPENDED_PAGE_PATH
    ) {
      return null;
    }

    const originalUrl = getOriginalSuspendedUrl(parsed.hash);

    if (!originalUrl) {
      return null;
    }

    return {
      originalUrl,
      originalTitle: decodeValue(getHashValue(parsed.hash, "ttl"))
    };
  }

  function normalizeBrowserTab(
    tab,
    { includeSuspendedTabs = true } = {}
  ) {
    const rawUrl = tab?.pendingUrl || tab?.url || "";

    if (!includeSuspendedTabs) {
      return { ...tab };
    }

    const suspendedMetadata = parseMarvellousSuspenderUrl(rawUrl);

    if (!suspendedMetadata) {
      return { ...tab };
    }

    return {
      ...tab,
      url: suspendedMetadata.originalUrl,
      pendingUrl: suspendedMetadata.originalUrl,
      title:
        suspendedMetadata.originalTitle ||
        tab?.title ||
        suspendedMetadata.originalUrl,
      browserUrl: rawUrl,
      browserTitle: tab?.title || "",
      isSuspendedTab: true,
      suspendedTabSource: "the-marvellous-suspender"
    };
  }

  function normalizeStoredTab(
    tab,
    { includeSuspendedTabs = true } = {}
  ) {
    const normalizedTab = normalizeBrowserTab(tab, {
      includeSuspendedTabs
    });

    return {
      ...tab,
      title: normalizedTab.title || normalizedTab.url || "",
      url: normalizedTab.pendingUrl || normalizedTab.url || ""
    };
  }

  function normalizeSavedSession(
    session,
    { includeSuspendedTabs = true } = {}
  ) {
    return {
      ...session,
      tabs: (session?.tabs || [])
        .map((tab) => normalizeStoredTab(tab, { includeSuspendedTabs }))
        .filter((tab) => tab.url)
    };
  }

  globalObject.TabOutTabMetadata = Object.freeze({
    parseMarvellousSuspenderUrl,
    normalizeBrowserTab,
    normalizeStoredTab,
    normalizeSavedSession
  });
})(globalThis);
