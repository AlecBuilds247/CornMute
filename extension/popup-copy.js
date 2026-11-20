// Text for the popup's status card. Pure function so it can be unit tested.
// info: result of the background 'getTabInfo' message. shortcut: e.g. "⌥⇧M" or "Alt+Shift+M".
export function statusCopy(info, shortcut) {
  const unmuteHow = shortcut && shortcut !== 'not set' ? `Unmute with the button below or ${shortcut}.` : 'Unmute with the button below.';
  const watching = `✓ Watching ${Number(info.builtinCount || 0).toLocaleString('en-US')} adult sites`;
  if (!info.enabled) {
    return { icon: '⏸', title: 'CornMute is off', sub: 'Turn it on to mute adult sites the moment they load.', addLink: false };
  }
  if (info.mutedByCornMute) {
    return info.builtin
      ? { icon: '🔇', title: 'Muted: adult site on CornMute’s list', sub: unmuteHow, addLink: false }
      : { icon: '🔇', title: 'Muted: this site is on your list', sub: unmuteHow, addLink: false };
  }
  if (info.unmutedByUser) {
    return { icon: '🔈', title: 'Unmuted by you', sub: 'It stays unmuted while this tab is on this site.', addLink: false };
  }
  if (info.muted) {
    return { icon: '🔇', title: 'This tab is muted', sub: 'You muted it, so CornMute won’t undo that.', addLink: false };
  }
  if (info.site) {
    return info.builtin
      ? { icon: '🌽', title: 'Adult site on CornMute’s list', sub: 'It will start muted next time it loads.', addLink: false }
      : { icon: '🌽', title: 'This site is on your list', sub: 'It will start muted next time it loads.', addLink: false };
  }
  if (!info.host) {
    return { icon: '', title: watching, sub: 'CornMute only works on websites, not on this page.', addLink: false };
  }
  return { icon: '', title: watching, sub: 'This site isn’t one of them, so it plays normally.', addLink: true };
}

export function incognitoHint(allowed) {
  return allowed ? '' : '*Click “Fix” to let CornMute work in Incognito windows.';
}
