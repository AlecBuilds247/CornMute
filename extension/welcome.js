const $ = (id) => document.getElementById(id);

function check() {
  chrome.extension.isAllowedIncognitoAccess((allowed) => {
    document.body.classList.toggle('allowed', allowed);
    $('incog').textContent = allowed ? 'Allowed ✓' : 'Not allowed yet';
    $('incog').className = 'pill ' + (allowed ? 'ok' : 'warn');
  });
}

$('open').addEventListener('click', () => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` }));
$('sites').addEventListener('click', () => chrome.runtime.openOptionsPage());
chrome.commands.getAll().then((cmds) => {
  const c = cmds.find((x) => x.name === 'toggle-mute-tab');
  if (c?.shortcut) $('shortcut').textContent = c.shortcut;
});
check();
setInterval(check, 2000);
document.addEventListener('visibilitychange', check);
