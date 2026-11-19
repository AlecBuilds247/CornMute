import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { cleanDomain, ADULT_TLDS, matchSite, matchAdultTld } from '../../extension/domains.js';
import { BUILTIN_SITES } from '../../extension/sites.js';
import { createCore } from '../../extension/core.js';
import { fakeChrome } from './fake-chrome.js';

const file = new URL('../../extension/blocklist.txt', import.meta.url);
const list = readFileSync(file, 'utf8').split('\n').filter(Boolean);
const meta = JSON.parse(readFileSync(new URL('../../extension/blocklist-meta.json', import.meta.url), 'utf8'));
const excludes = readFileSync(new URL('../../data/exclude.txt', import.meta.url), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const set = new Set([...list, ...BUILTIN_SITES]);
const covered = (host) => matchSite(host, set) || matchAdultTld(host);

test('blocklist is large, well-formed, sorted, and matches its metadata', () => {
  assert.ok(list.length > 40000, `only ${list.length} domains`);
  assert.equal(list.length, meta.domains);
  assert.equal(new Set(list).size, list.length, 'duplicates');
  assert.deepEqual([...list].sort(), list, 'not sorted');
  for (const d of list) {
    assert.ok(cleanDomain(d), `invalid: ${d}`);
    assert.ok(!ADULT_TLDS.has(d.split('.').pop()), `TLD-covered entry kept: ${d}`);
  }
  assert.ok(statSync(file).size < 5 * 1024 * 1024, 'blocklist file too big');
});

test('blocklist has no redundant subdomains (parents are checked at lookup)', () => {
  const s = new Set(list);
  for (const d of list) {
    const p = d.split('.');
    for (let i = 1; i < p.length - 1; i++) assert.ok(!s.has(p.slice(i).join('.')), `${d} is covered by a parent`);
  }
});

test('excluded false positives are not in the blocklist', () => {
  for (const x of excludes) assert.ok(!list.some((d) => d === x || d.endsWith('.' + x)), x);
});

test('covers the big names across categories', () => {
  for (const h of ['www.pornhub.com', 'xvideos.com', 'xhamster.com', 'sex.com', 'www.onlyfans.com', 'fansly.com',
    'chaturbate.com', 'stripchat.com', 'missav.ws', 'jable.tv', 'www.dmm.co.jp', '91porn.com', 'hanime.tv',
    'nhentai.net', 'e-hentai.org', 'rule34.xxx', 'anything-at-all.porn', 'erome.com']) {
    assert.ok(covered(h), h);
  }
});

test('does not cover mainstream sites (no substring matching)', () => {
  for (const h of ['google.com', 'www.youtube.com', 'reddit.com', 'www.reddit.com', 'twitter.com', 'x.com', 'tumblr.com',
    'www.tumblr.com', 'wikipedia.org', 'en.wikipedia.org', 'amazon.com', 'github.com', 'alecbuilds247.github.io',
    'sussex.ac.uk', 'www.sussex.ac.uk', 'essex.ac.uk', 'middlesex.edu', 'sexton.com', 'dmm.com', 'www.dmm.com',
    'vk.com', 'm.vk.com', 'mail.ru', 'my.mail.ru', 'bbc.co.uk', 'imgur.com', 'discord.com', 'twitch.tv',
    'netflix.com', 'bilibili.com', 'baidu.com', 'qq.com', 'weibo.com', 'nicovideo.jp', 'pixiv.net', 'patreon.com',
    'blogspot.com', 'wordpress.com', 'medium.com', 'news.ycombinator.com', 'chatgpt.com', 'claude.ai']) {
    assert.equal(covered(h), null, h);
  }
});

test('lookups stay fast: list loads and 100k lookups run quickly', async () => {
  const t0 = performance.now();
  const f = fakeChrome();
  const core = createCore(f.chrome, { loadBlocklist: async () => readFileSync(file, 'utf8').split('\n').filter(Boolean) });
  await core.ready;
  const loadMs = performance.now() - t0;
  const t1 = performance.now();
  for (let i = 0; i < 100000; i++) matchSite(`a${i}.b.cdn.example-site-${i % 97}.com`, set);
  const lookMs = performance.now() - t1;
  console.log(`      load ${loadMs.toFixed(0)} ms, 100k lookups ${lookMs.toFixed(0)} ms`);
  assert.ok(loadMs < 1000, `load took ${loadMs} ms`);
  assert.ok(lookMs < 1000, `lookups took ${lookMs} ms`);
  const info = await core.getTabInfo(null, 'https://www.xvideos.com/');
  assert.equal(info.builtin, true);
});
