import test from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../extension/core.js';
import { fakeChrome } from './fake-chrome.js';

const LISTED = 'https://www.pornhub.com/view?x=1';
const LISTED2 = 'https://xvideos.com/';
const PLAIN = 'https://news.example.org/';

async function setup(opts) {
  const f = fakeChrome(opts);
  const core = createCore(f.chrome, { errorSettleMs: 5 });
  f.onMuted((id, ch) => core.onMutedChanged(id, ch.mutedInfo));
  await core.ready;
  f.addTab(1);
  return { f, core };
}
const nav = async (core, id, url) => { await core.onNavigate(id, url, 'start'); await core.onNavigate(id, url, 'commit'); };
const settle = (ms = 20) => new Promise((r) => setTimeout(r, ms));

test('mutes at navigation start on a listed site (subdomain)', async () => {
  const { f, core } = await setup();
  await core.onNavigate(1, LISTED, 'start');
  assert.equal(f.isMuted(1), true);
});

test('never mutes unlisted sites', async () => {
  const { f, core } = await setup();
  await nav(core, 1, PLAIN);
  assert.equal(f.isMuted(1), false);
});

test('leaving a listed site unmutes only what CornMute muted', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await nav(core, 1, PLAIN);
  assert.equal(f.isMuted(1), false);
});

test('a tab the user muted themselves is never unmuted', async () => {
  const { f, core } = await setup();
  await core.onMutedChanged(1, f.userSetMuted(1, true));
  await nav(core, 1, LISTED);
  await nav(core, 1, PLAIN);
  assert.equal(f.isMuted(1), true);
});

test('user re-muting a CornMute-muted tab makes it theirs', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.onMutedChanged(1, f.userSetMuted(1, true));
  await nav(core, 1, PLAIN);
  assert.equal(f.isMuted(1), true);
});

test('after the user unmutes, the tab stays unmuted on that site', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.onMutedChanged(1, f.userSetMuted(1, false));
  await nav(core, 1, 'https://pornhub.com/other');
  await nav(core, 1, 'https://video.pornhub.com/x');
  assert.equal(f.isMuted(1), false);
});

test('moving to a different listed site starts muted again', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.onMutedChanged(1, f.userSetMuted(1, false));
  await nav(core, 1, LISTED2);
  assert.equal(f.isMuted(1), true);
});

test('leaving and coming back to the unmuted site starts muted again', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.onMutedChanged(1, f.userSetMuted(1, false));
  await nav(core, 1, PLAIN);
  await nav(core, 1, LISTED);
  assert.equal(f.isMuted(1), true);
});

test('a new tab on the same site starts muted', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.onMutedChanged(1, f.userSetMuted(1, false));
  f.addTab(2);
  await nav(core, 2, LISTED);
  assert.equal(f.isMuted(2), true);
  assert.equal(f.isMuted(1), false);
});

test('redirect from an unlisted link onto a listed site is caught at commit', async () => {
  const { f, core } = await setup();
  await core.onNavigate(1, 'https://t.example/abc', 'start');
  assert.equal(f.isMuted(1), false);
  await core.onNavigate(1, LISTED, 'commit');
  assert.equal(f.isMuted(1), true);
});

test('redirect from a listed site onto an unlisted one unmutes at commit', async () => {
  const { f, core } = await setup();
  await core.onNavigate(1, LISTED, 'start');
  assert.equal(f.isMuted(1), true);
  await core.onNavigate(1, PLAIN, 'commit');
  assert.equal(f.isMuted(1), false);
});

test('a cancelled navigation to a listed site restores sound on an unlisted page', async () => {
  const { f, core } = await setup();
  await nav(core, 1, PLAIN);
  await core.onNavigate(1, LISTED, 'start');
  assert.equal(f.isMuted(1), true);
  await core.onNavError(1);
  assert.equal(f.isMuted(1), false);
});

test('a stale error does not undo a newer navigation', async () => {
  const { f, core } = await setup();
  await nav(core, 1, PLAIN);
  const err = core.onNavError(1);
  await core.onNavigate(1, LISTED, 'start');
  await err;
  assert.equal(f.isMuted(1), true);
});

test('off switch unmutes everything CornMute muted, but not user mutes', async () => {
  const { f, core } = await setup();
  f.addTab(2); f.addTab(3);
  await nav(core, 1, LISTED);
  await nav(core, 2, LISTED2);
  await core.onMutedChanged(3, f.userSetMuted(3, true));
  await nav(core, 3, LISTED);
  await f.chrome.storage.local.set({ enabled: false });
  await core.onStorageChanged({ enabled: { oldValue: true, newValue: false } }, 'local');
  assert.equal(f.isMuted(1), false);
  assert.equal(f.isMuted(2), false);
  assert.equal(f.isMuted(3), true);
  await nav(core, 1, LISTED2);
  assert.equal(f.isMuted(1), false, 'stays off');
});

test('custom sites (and their subdomains) are muted', async () => {
  const { f, core } = await setup();
  const res = await core.addSite('https://www.my-test-site.dev/some/page');
  assert.deepEqual(res, { ok: true, domain: 'my-test-site.dev' });
  await nav(core, 1, 'https://play.my-test-site.dev/');
  assert.equal(f.isMuted(1), true);
  await core.removeSite('my-test-site.dev');
  f.addTab(2);
  await nav(core, 2, 'https://play.my-test-site.dev/');
  assert.equal(f.isMuted(2), false);
});

test('addSite rejects junk and recognises built-ins', async () => {
  const { core } = await setup();
  assert.equal((await core.addSite('not a site')).ok, false);
  assert.equal((await core.addSite('https://pornhub.com/x')).already, 'builtin');
});

test('adding the current site from the popup mutes the tab right away', async () => {
  const { f, core } = await setup();
  await nav(core, 1, 'https://alecbuilds247.github.io/cornmute-site/demo.html');
  await core.addSite('alecbuilds247.github.io', 1, 'https://alecbuilds247.github.io/cornmute-site/demo.html');
  assert.equal(f.isMuted(1), true);
  const info = await core.getTabInfo(1, 'https://alecbuilds247.github.io/cornmute-site/demo.html');
  assert.equal(info.mutedByCornMute, true);
  assert.equal(info.site, 'alecbuilds247.github.io');
});

test('counter counts once per page, only when a muted page tries to play sound', async () => {
  const { f, core } = await setup();
  f.addTab(2);
  await nav(core, 2, PLAIN);
  await core.onAudible(2); // unmuted, unlisted: no count
  await nav(core, 1, LISTED);
  await core.onAudible(1);
  await core.onAudible(1);
  assert.equal(f.store.local.count, 1);
  await nav(core, 1, LISTED + '&next');
  await core.onAudible(1);
  assert.equal(f.store.local.count, 2);
  await core.onMutedChanged(1, f.userSetMuted(1, false));
  await nav(core, 1, LISTED + '&again');
  await core.onAudible(1); // user unmuted: not prevented
  assert.equal(f.store.local.count, 2);
});

test('popup toggle: unmute is sticky for the site; mute on a listed site behaves like auto-mute', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  await core.toggleTab(1, LISTED);
  assert.equal(f.isMuted(1), false);
  await nav(core, 1, 'https://pornhub.com/2');
  assert.equal(f.isMuted(1), false);
  await core.toggleTab(1, LISTED);
  assert.equal(f.isMuted(1), true);
  await nav(core, 1, PLAIN);
  assert.equal(f.isMuted(1), false);
});

test('popup toggle on an unlisted site is a manual mute CornMute never undoes', async () => {
  const { f, core } = await setup();
  await nav(core, 1, PLAIN);
  await core.toggleTab(1, PLAIN);
  await nav(core, 1, 'https://other.example.org/');
  assert.equal(f.isMuted(1), true);
});

test('state survives a service-worker restart', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  const core2 = createCore(f.chrome, { errorSettleMs: 5 });
  await core2.ready;
  await nav(core2, 1, PLAIN);
  assert.equal(f.isMuted(1), false);
});

test('only the matched domain is kept in tab state, never the URL', async () => {
  const { f, core } = await setup();
  await nav(core, 1, LISTED);
  assert.ok(!JSON.stringify(f.store).includes('view?x=1'));
  assert.ok(!JSON.stringify(f.store).includes('www.pornhub'));
});

test('any site on an adult-only TLD is muted; lookalike domains are not', async () => {
  const { f, core } = await setup();
  await nav(core, 1, 'https://video.some-new-site.porn/watch');
  assert.equal(f.isMuted(1), true);
  f.addTab(2);
  await nav(core, 2, 'https://www.sussex.ac.uk/');
  assert.equal(f.isMuted(2), false);
  assert.equal((await core.addSite('whatever.xxx')).already, 'builtin');
});

test('checkSite reports built-in, custom and uncovered domains', async () => {
  const { core } = await setup();
  await core.addSite('my-site.dev');
  assert.equal((await core.onMessage({ type: 'checkSite', domain: 'https://www.sex.com/x' })).by, 'builtin');
  assert.equal((await core.onMessage({ type: 'checkSite', domain: 'a.my-site.dev' })).by, 'custom');
  assert.equal((await core.onMessage({ type: 'checkSite', domain: 'sussex.ac.uk' })).by, null);
  assert.equal((await core.onMessage({ type: 'checkSite', domain: 'nope' })).ok, false);
});

test('a broken blocklist load falls back to the curated list', async () => {
  const f = fakeChrome();
  const core = createCore(f.chrome, { loadBlocklist: async () => { throw new Error('boom'); } });
  await core.ready;
  f.addTab(1);
  await nav(core, 1, 'https://pornhub.com/');
  assert.equal(f.isMuted(1), true);
});
