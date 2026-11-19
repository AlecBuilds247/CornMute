import { cleanDomain } from './domains.js';

const $ = (id) => document.getElementById(id);
let tab = null;

const send = (msg) => chrome.runtime.sendMessage(msg);

function render(info) {
  document.body.classList.toggle('off', !info.enabled);
  $('enabled').checked = info.enabled;
  $('count').textContent = info.count.toLocaleString();

  const status = $('status');
  const note = $('siteNote');
  let icon, text;
  if (!info.enabled) { icon = '⏸'; text = 'CornMute is off'; }
  else if (info.mutedByCornMute) { icon = '🔇'; text = 'Muted by CornMute'; }
  else if (info.unmutedByUser) { icon = '🔈'; text = 'Unmuted by you — stays unmuted while this tab is on this site'; }
  else if (info.muted) { icon = '🔇'; text = 'This tab is muted'; }
  else if (info.site) { icon = '🌽'; text = 'This site is on your list'; }
  else { icon = '🌽'; text = 'Not on your list — CornMute won’t touch this tab'; }
  status.innerHTML = '';
  const dot = document.createElement('span'); dot.className = 'dot'; dot.textContent = icon;
  const label = document.createElement('span'); label.textContent = text;
  status.append(dot, label);

  $('toggleTab').textContent = info.muted ? 'Unmute this tab' : 'Mute this tab';
  $('toggleTab').disabled = !tab;

  const add = $('addSite');
  const candidate = info.host ? cleanDomain(info.host) : null;
  add.hidden = !!info.site || !candidate;
  add.dataset.domain = candidate || '';
  if (info.site) note.textContent = info.builtin ? 'Built-in site — always muted on arrival.' : `On your list: ${info.site}`;
  else if (candidate) note.textContent = `Add ${candidate} to mute it on arrival.`;
  else note.textContent = '';
}

async function refresh() {
  render(await send({ type: 'getTabInfo', tabId: tab?.id, url: tab?.url }));
}

async function init() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.extension.isAllowedIncognitoAccess((allowed) => {
    $('incogStatus').textContent = allowed ? 'On' : 'Off';
    $('incogStatus').className = 'pill ' + (allowed ? 'ok' : 'warn');
    $('incogFix').hidden = allowed;
  });

  const cmds = await chrome.commands.getAll();
  const cmd = cmds.find((c) => c.name === 'toggle-mute-tab');
  $('shortcut').textContent = cmd?.shortcut || 'not set';

  $('enabled').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ enabled: e.target.checked });
    setTimeout(refresh, 150);
  });
  $('toggleTab').addEventListener('click', async () => {
    render(await send({ type: 'toggleTab', tabId: tab.id, url: tab.url }));
  });
  $('addSite').addEventListener('click', async (e) => {
    const res = await send({ type: 'addSite', domain: e.target.dataset.domain, tabId: tab?.id, url: tab?.url });
    if (!res.ok) $('siteNote').textContent = res.error;
    await refresh();
  });
  $('incogFix').addEventListener('click', () => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }));
  $('changeShortcut').addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  $('openSites').addEventListener('click', () => chrome.runtime.openOptionsPage());

  await refresh();
}

init();
