// CornMute service worker: wires Chrome events to the core logic.
import { createCore } from './core.js';

const core = createCore(chrome);
globalThis.cornmute = core; // handy for debugging from the service-worker console

const isMainFrame = (d) => d.frameId === 0 && d.documentLifecycle !== 'prerender';

chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (isMainFrame(d)) core.onNavigate(d.tabId, d.url, 'start');
});
chrome.webNavigation.onCommitted.addListener((d) => {
  if (isMainFrame(d)) core.onNavigate(d.tabId, d.url, 'commit');
});
chrome.webNavigation.onErrorOccurred.addListener((d) => {
  if (isMainFrame(d)) core.onNavError(d.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.mutedInfo) core.onMutedChanged(tabId, change.mutedInfo);
  if (change.audible === true) core.onAudible(tabId);
});
chrome.tabs.onRemoved.addListener((tabId) => core.onTabRemoved(tabId));
chrome.tabs.onReplaced.addListener((_added, removed) => core.onTabRemoved(removed));

chrome.storage.onChanged.addListener((changes, area) => core.onStorageChanged(changes, area));

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  core.onMessage(msg).then(sendResponse, (e) => sendResponse({ ok: false, error: String(e) }));
  return true;
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-mute-tab' && tab?.id != null) core.toggleTab(tab.id, tab.url);
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});
