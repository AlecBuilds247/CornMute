import { cleanDomain } from './domains.js';
import { statusCopy, incognitoHint } from './popup-copy.js';
import { LINKS, reviewUrl, shouldShowReview } from './config.js';

const $ = (id) => document.getElementById(id);
let tab = null;
let shortcut = '';
let reviewDismissed = false;

const send = (msg) => chrome.runtime.sendMessage(msg);

function render(info) {
  document.body.classList.toggle('off', !info.enabled);
  $('enabled').checked = info.enabled;
  $('count').textContent = info.count.toLocaleString('en-US');

  const copy = statusCopy(info, shortcut);
  $('status').textContent = (copy.icon ? copy.icon + ' ' : '') + copy.title;
  $('statusSub').textContent = copy.sub;

  $('toggleTab').textContent = info.muted ? 'Unmute this tab' : 'Mute this tab';
  $('toggleTab').disabled = !tab;

  const domain = info.host ? cleanDomain(info.host) : null;
  $('addLink').hidden = !(copy.addLink && domain);
  $('addLink').dataset.domain = domain || '';

  $('review').hidden = !shouldShowReview(info.count, reviewDismissed);
}

async function refresh() {
  render(await send({ type: 'getTabInfo', tabId: tab?.id, url: tab?.url }));
}

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  ({ reviewDismissed = false } = await chrome.storage.local.get('reviewDismissed'));

  chrome.extension.isAllowedIncognitoAccess((allowed) => {
    $('incogStatus').textContent = allowed ? 'On' : 'Off';
    $('incogStatus').className = 'pill ' + (allowed ? 'ok' : 'warn');
    $('incogFix').hidden = allowed;
    $('incogHint').textContent = incognitoHint(allowed);
    $('incogHint').hidden = allowed;
  });

  const cmds = await chrome.commands.getAll();
  shortcut = cmds.find((c) => c.name === 'toggle-mute-tab')?.shortcut || 'not set';
  $('shortcut').textContent = shortcut;

  $('privacyLink').href = LINKS.privacy;
  for (const a of document.querySelectorAll('.xLink')) a.href = LINKS.x;
  const rUrl = reviewUrl();
  if (rUrl) $('reviewLink').href = rUrl;

  $('enabled').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    setTimeout(refresh, 150);
  });
  $('toggleTab').addEventListener('click', async () => {
    render(await send({ type: 'toggleTab', tabId: tab.id, url: tab.url }));
  });
  $('addLink').addEventListener('click', (e) => {
    const d = e.currentTarget.dataset.domain;
    chrome.tabs.create({ url: chrome.runtime.getURL('sites.html') + (d ? `?add=${encodeURIComponent(d)}` : '') });
  });
  $('reviewDismiss').addEventListener('click', async () => {
    reviewDismissed = true;
    $('review').hidden = true;
    await chrome.storage.local.set({ reviewDismissed: true });
  });
  $('incogFix').addEventListener('click', () => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }));
  $('changeShortcut').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  $('openSites').addEventListener('click', () => chrome.runtime.openOptionsPage());

  await refresh();
}

init();
