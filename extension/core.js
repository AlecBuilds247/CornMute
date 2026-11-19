// CornMute core logic. Kept free of top-level chrome.* calls so tests can drive it with a fake API.
import { BUILTIN_SITES } from './sites.js';
import { cleanDomain, hostFromUrl, matchSite } from './domains.js';

const BUILTIN_SET = new Set(BUILTIN_SITES);

// Per-tab state (kept in chrome.storage.session = memory only, cleared when Chrome closes).
// Only the matched *listed domain* is kept, never the page URL.
//   site        listed domain of the committed page, or null
//   pending     listed domain of a navigation that started but hasn't committed, or null
//   ours        true while CornMute is responsible for this tab being muted
//   unmutedSite listed domain the user unmuted on; stays unmuted while the tab stays on it
//   counted     the current page already counted as an "awkward moment prevented"
//   seq         navigation counter, used to ignore stale error events
function freshState() {
  return { site: null, pending: null, ours: false, unmutedSite: null, counted: false, seq: 0 };
}

export function createCore(chrome, opts = {}) {
  const errorSettleMs = opts.errorSettleMs ?? 300;
  const selfId = chrome.runtime.id;
  const settings = { enabled: true, customSites: [], count: 0 };
  let siteSet = new Set(BUILTIN_SET);
  const tabs = new Map();
  const queues = new Map();

  function rebuildSites() {
    siteSet = new Set([...BUILTIN_SET, ...settings.customSites]);
  }

  const ready = (async () => {
    const s = await chrome.storage.local.get(['enabled', 'customSites', 'count']);
    settings.enabled = s.enabled !== false;
    settings.customSites = Array.isArray(s.customSites) ? s.customSites : [];
    settings.count = Number(s.count) || 0;
    rebuildSites();
    const sess = await chrome.storage.session.get(null);
    for (const [k, v] of Object.entries(sess || {})) {
      if (k.startsWith('tab:')) tabs.set(Number(k.slice(4)), { ...freshState(), ...v });
    }
  })();

  // Run handlers for one tab strictly in order, so fast event bursts can't interleave.
  function run(tabId, fn) {
    const prev = queues.get(tabId) || Promise.resolve();
    const next = prev.then(() => ready).then(fn).catch((e) => console.warn('CornMute:', e?.message || e));
    queues.set(tabId, next);
    next.finally(() => { if (queues.get(tabId) === next) queues.delete(tabId); });
    return next;
  }

  function stateOf(tabId) {
    let st = tabs.get(tabId);
    if (!st) { st = freshState(); tabs.set(tabId, st); }
    return st;
  }

  function save(tabId) {
    const st = tabs.get(tabId);
    if (st) return chrome.storage.session.set({ ['tab:' + tabId]: st }).catch(() => {});
  }

  function mutedByUs(mi) {
    return !!(mi && mi.muted && mi.reason === 'extension' && mi.extensionId === selfId);
  }

  async function getTab(tabId) {
    try { return await chrome.tabs.get(tabId); } catch { return null; }
  }

  async function setMuted(tabId, muted) {
    try { await chrome.tabs.update(tabId, { muted }); return true; } catch { return false; }
  }

  async function ensureMuted(tabId, st) {
    if (st.ours) return; // already ours; skip the extra lookup for speed
    const tab = await getTab(tabId);
    if (!tab) return;
    if (!tab.mutedInfo?.muted) {
      st.ours = true;
      if (!(await setMuted(tabId, true))) st.ours = false;
    } else if (mutedByUs(tab.mutedInfo)) {
      st.ours = true;
    }
    // Muted by the user (or something else): leave it alone and never take ownership.
  }

  // Unmute only if CornMute is still the reason the tab is muted.
  async function releaseMute(tabId, st) {
    if (!st.ours) return;
    st.ours = false;
    const tab = await getTab(tabId);
    if (tab && mutedByUs(tab.mutedInfo)) await setMuted(tabId, false);
  }

  function lookup(url) {
    return matchSite(hostFromUrl(url), siteSet);
  }

  // phase: 'start' (navigation began) or 'commit' (page is now in the tab, incl. after redirects)
  function onNavigate(tabId, url, phase) {
    if (tabId == null || tabId < 0) return Promise.resolve();
    return run(tabId, async () => {
      const st = stateOf(tabId);
      st.seq++;
      const site = lookup(url);
      if (phase === 'commit') {
        st.site = site;
        st.pending = null;
        st.counted = false;
        if (site !== st.unmutedSite) st.unmutedSite = null; // left the site the user unmuted
      } else {
        st.pending = site;
      }
      if (settings.enabled) {
        if (site && site !== st.unmutedSite) {
          await ensureMuted(tabId, st);
        } else if (phase === 'commit') {
          await releaseMute(tabId, st); // unlisted page, or back on the site the user unmuted
        }
      }
      await save(tabId);
    });
  }

  // A main-frame navigation failed/was cancelled: the tab stays on its committed page.
  function onNavError(tabId) {
    if (tabId == null || tabId < 0) return Promise.resolve();
    const seqAtError = tabs.get(tabId)?.seq;
    return new Promise((resolve) => setTimeout(resolve, errorSettleMs)).then(() => run(tabId, async () => {
      const st = tabs.get(tabId);
      if (!st || st.seq !== seqAtError) return; // a newer navigation took over
      st.pending = null;
      if (!st.site || st.site === st.unmutedSite) await releaseMute(tabId, st);
      await save(tabId);
    }));
  }

  function onMutedChanged(tabId, mutedInfo) {
    return run(tabId, async () => {
      const st = tabs.get(tabId);
      if (!st || !mutedInfo) return;
      if (!mutedInfo.muted) {
        if (st.ours) { // the user unmuted a tab CornMute muted
          st.ours = false;
          st.unmutedSite = st.pending || st.site;
          await save(tabId);
        }
      } else if (!mutedByUs(mutedInfo) && st.ours) {
        st.ours = false; // someone else re-muted it; it's theirs now
        await save(tabId);
      }
    });
  }

  function onAudible(tabId) {
    return run(tabId, async () => {
      const st = tabs.get(tabId);
      if (!st || !st.ours || st.counted || !settings.enabled) return;
      st.counted = true;
      settings.count++;
      await chrome.storage.local.set({ count: settings.count });
      await save(tabId);
    });
  }

  function onTabRemoved(tabId) {
    tabs.delete(tabId);
    return chrome.storage.session.remove('tab:' + tabId).catch(() => {});
  }

  async function unmuteAllOurs() {
    for (const [tabId, st] of tabs) {
      if (st.ours) await run(tabId, async () => { await releaseMute(tabId, st); await save(tabId); });
    }
  }

  async function onStorageChanged(changes, area) {
    if (area !== 'local') return;
    await ready;
    if (changes.customSites) {
      settings.customSites = Array.isArray(changes.customSites.newValue) ? changes.customSites.newValue : [];
      rebuildSites();
    }
    if (changes.count) settings.count = Number(changes.count.newValue) || 0;
    if (changes.enabled) {
      const was = settings.enabled;
      settings.enabled = changes.enabled.newValue !== false;
      if (was && !settings.enabled) await unmuteAllOurs();
    }
  }

  // Popup button / keyboard shortcut. This is the user acting, so it counts as their choice.
  function toggleTab(tabId, url) {
    return run(tabId, async () => {
      const tab = await getTab(tabId);
      if (!tab) return;
      const st = stateOf(tabId);
      const site = st.site || lookup(url);
      if (tab.mutedInfo?.muted) {
        st.ours = false;
        if (site) st.unmutedSite = site;
        await setMuted(tabId, false);
      } else {
        await setMuted(tabId, true);
        if (site) { st.site = site; st.ours = true; st.unmutedSite = null; } else { st.ours = false; }
      }
      await save(tabId);
    });
  }

  async function addSite(input, tabId, url) {
    await ready;
    const domain = cleanDomain(input);
    if (!domain) return { ok: false, error: 'That doesn’t look like a website address.' };
    if (BUILTIN_SET.has(domain)) return { ok: true, domain, already: 'builtin' };
    if (!settings.customSites.includes(domain)) {
      settings.customSites = [...settings.customSites, domain].sort();
      rebuildSites();
      await chrome.storage.local.set({ customSites: settings.customSites });
    }
    // Added from the popup while on the site: mute right away.
    if (tabId != null && url && settings.enabled) {
      await run(tabId, async () => {
        const site = lookup(url);
        if (!site) return;
        const st = stateOf(tabId);
        st.site = site;
        st.unmutedSite = null;
        await ensureMuted(tabId, st);
        await save(tabId);
      });
    }
    return { ok: true, domain };
  }

  async function removeSite(input) {
    await ready;
    const domain = cleanDomain(input) || String(input);
    settings.customSites = settings.customSites.filter((d) => d !== domain);
    rebuildSites();
    await chrome.storage.local.set({ customSites: settings.customSites });
    return { ok: true };
  }

  async function getTabInfo(tabId, url) {
    await ready;
    const tab = tabId != null ? await getTab(tabId) : null;
    const st = tabs.get(tabId) || freshState();
    const host = hostFromUrl(url);
    const site = matchSite(host, siteSet);
    return {
      enabled: settings.enabled,
      count: settings.count,
      host: host ? host.replace(/^www\d*\./, '') : null,
      site,
      builtin: !!site && BUILTIN_SET.has(site),
      muted: !!tab?.mutedInfo?.muted,
      mutedByCornMute: !!tab && st.ours && mutedByUs(tab.mutedInfo),
      unmutedByUser: !!site && st.unmutedSite === site,
    };
  }

  async function onMessage(msg) {
    switch (msg?.type) {
      case 'getTabInfo': return getTabInfo(msg.tabId, msg.url);
      case 'toggleTab': await toggleTab(msg.tabId, msg.url); return getTabInfo(msg.tabId, msg.url);
      case 'addSite': return addSite(msg.domain, msg.tabId, msg.url);
      case 'removeSite': return removeSite(msg.domain);
      case 'getSites': await ready; return { builtin: BUILTIN_SITES, custom: settings.customSites };
      default: return { ok: false, error: 'unknown message' };
    }
  }

  return {
    ready, onNavigate, onNavError, onMutedChanged, onAudible, onTabRemoved, onStorageChanged,
    toggleTab, addSite, removeSite, getTabInfo, onMessage,
    _tabs: tabs, _settings: settings,
  };
}
