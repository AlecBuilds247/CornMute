import { cleanDomain } from './domains.js';

const $ = (id) => document.getElementById(id);
const send = (msg) => chrome.runtime.sendMessage(msg);

function showMsg(text, isErr) {
  $('msg').textContent = text;
  $('msg').className = isErr ? 'err' : 'muted-text';
}

async function render() {
  const { builtin, custom } = await send({ type: 'getSites' });
  const ul = $('custom');
  ul.innerHTML = '';
  for (const d of custom) {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = d;
    const rm = document.createElement('button'); rm.textContent = 'Remove'; rm.setAttribute('aria-label', `Remove ${d}`);
    rm.addEventListener('click', async () => { await send({ type: 'removeSite', domain: d }); showMsg(`Removed ${d}.`); render(); });
    li.append(name, rm);
    ul.append(li);
  }
  $('empty').hidden = custom.length > 0;
  $('customCount').textContent = custom.length ? `(${custom.length})` : '';
  $('builtinCount').textContent = builtin.length;
  $('builtin').innerHTML = '';
  for (const d of builtin) { const div = document.createElement('div'); div.textContent = d; $('builtin').append(div); }
}

$('domain').addEventListener('input', () => {
  const raw = $('domain').value.trim();
  const clean = cleanDomain(raw);
  if (raw && clean && clean !== raw.toLowerCase()) showMsg(`Will add: ${clean}`);
  else if (!raw) showMsg('');
});

$('addForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await send({ type: 'addSite', domain: $('domain').value });
  if (!res.ok) return showMsg(res.error, true);
  showMsg(res.already === 'builtin' ? `${res.domain} is already on the built-in list.` : `Added ${res.domain}.`);
  $('domain').value = '';
  render();
});

chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c.customSites) render(); });
render();
