// Minimal in-memory stand-in for the chrome.* APIs CornMute uses.
export function fakeChrome({ local = {} } = {}) {
  const store = { local: { ...local }, session: {} };
  const tabs = new Map();
  const listeners = [];
  const area = (name) => ({
    async get(keys) {
      const s = store[name];
      if (keys == null) return { ...s };
      const out = {};
      for (const k of [].concat(keys)) if (k in s) out[k] = s[k];
      return out;
    },
    async set(obj) { Object.assign(store[name], structuredClone(obj)); },
    async remove(k) { for (const key of [].concat(k)) delete store[name][key]; },
  });
  const chrome = {
    runtime: { id: 'cornmute-test-id' },
    storage: { local: area('local'), session: area('session') },
    tabs: {
      async get(id) { const t = tabs.get(id); if (!t) throw new Error('No tab'); return structuredClone(t); },
      async update(id, { muted }) {
        const t = tabs.get(id); if (!t) throw new Error('No tab');
        t.mutedInfo = muted ? { muted: true, reason: 'extension', extensionId: 'cornmute-test-id' } : { muted: false, reason: 'extension', extensionId: 'cornmute-test-id' };
        for (const l of listeners) l(id, { mutedInfo: t.mutedInfo });
      },
    },
  };
  return {
    chrome, store, tabs,
    onMuted(fn) { listeners.push(fn); },
    addTab(id, mutedInfo = { muted: false }) { tabs.set(id, { id, mutedInfo }); },
    userSetMuted(id, muted) { const t = tabs.get(id); t.mutedInfo = { muted, reason: 'user' }; return t.mutedInfo; },
    isMuted(id) { return !!tabs.get(id).mutedInfo.muted; },
  };
}
