// Text for the popup's status card. Pure function so it can be unit tested.
// info: result of the background 'getTabInfo' message. shortcut: e.g. "⌥⇧M" or "Alt+Shift+M".
// Returns { title, sub, addLink, showButton }.
export function statusCopy(info, shortcut) {
  const unmuteHow = shortcut && shortcut !== 'not set'
    ? `Unmute anytime with the button or ${shortcut}.`
    : 'Unmute anytime with the button.';
  const count = Number(info.builtinCount || 0).toLocaleString('en-US');
  const s = (title, sub, extra = {}) => ({ title, sub, addLink: false, showButton: true, ...extra });

  if (!info.enabled) return s('CornMute is off', 'Turn it on to mute adult sites the moment they load.');
  if (info.mutedByCornMute) return s(info.builtin ? 'Muted: adult site' : 'Muted: on your list', unmuteHow);
  if (info.unmutedByUser) return s('Unmuted by you', 'It stays unmuted while this tab is on this site.');
  if (info.muted) return s('This tab is muted', 'You muted it, so CornMute won’t undo that.');
  if (info.site) return s(info.builtin ? 'Adult site on CornMute’s list' : 'On your list', 'It will start muted next time it loads.');
  if (!info.host) return s('Nothing to mute here', 'CornMute works on websites. Open any site to use it.', { showButton: false });
  return s('This site plays normally', `It’s not one of the ${count} adult sites CornMute mutes.`, { addLink: true });
}

export function incognitoHint(allowed) {
  return allowed ? '' : '*Click “Fix” to let CornMute work in Incognito windows.';
}
