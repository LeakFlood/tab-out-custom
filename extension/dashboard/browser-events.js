'use strict';

(() => {
  const listeners = new Map();

  function subscribe(eventName, listener) {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    listeners.get(eventName).add(listener);

    return () => {
      listeners.get(eventName)?.delete(listener);
    };
  }

  function emit(eventName, ...args) {
    listeners.get(eventName)?.forEach((listener) => {
      listener(...args);
    });
  }

  chrome?.tabs?.onCreated?.addListener((tab) => {
    emit("tab-created", tab);
  });
  chrome?.tabs?.onRemoved?.addListener((tabId, removeInfo) => {
    emit("tab-removed", tabId, removeInfo);
  });
  chrome?.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    emit("tab-updated", tabId, changeInfo, tab);
  });
  chrome?.tabs?.onAttached?.addListener((tabId, attachInfo) => {
    emit("tab-attached", tabId, attachInfo);
  });
  chrome?.tabs?.onDetached?.addListener((tabId, detachInfo) => {
    emit("tab-detached", tabId, detachInfo);
  });
  chrome?.tabGroups?.onCreated?.addListener((group) => {
    emit("tab-group-created", group);
  });
  chrome?.tabGroups?.onUpdated?.addListener((group) => {
    emit("tab-group-updated", group);
  });
  chrome?.tabGroups?.onRemoved?.addListener((group) => {
    emit("tab-group-removed", group);
  });
  chrome?.storage?.onChanged?.addListener((changes, areaName) => {
    emit("storage-changed", changes, areaName);
  });

  globalThis.TabOutBrowserEvents = Object.freeze({
    subscribe
  });
})();
