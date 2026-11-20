import test from 'node:test';
import assert from 'node:assert/strict';
import { statusCopy, incognitoHint } from '../../extension/popup-copy.js';
import { shouldShowReview, reviewUrl, STORE_ITEM_ID, LINKS, REVIEW_MIN_COUNT } from '../../extension/config.js';

const base = { enabled: true, count: 0, builtinCount: 46987, host: 'news.example.org', site: null, builtin: false,
  muted: false, mutedByCornMute: false, unmutedByUser: false };
const S = '⌥⇧M';

test('normal site: plays normally, dynamic count with comma, add link + button', () => {
  const c = statusCopy(base, S);
  assert.equal(c.title, 'This site plays normally');
  assert.equal(c.sub, 'It’s not one of the 46,987 adult sites CornMute mutes.');
  assert.equal(c.addLink, true);
  assert.equal(c.showButton, true);
  assert.match(statusCopy({ ...base, builtinCount: 51234 }, S).sub, /51,234/);
});

test('browser pages (new tab, chrome://, Web Store): nothing to mute, no button, no link', () => {
  const c = statusCopy({ ...base, host: null }, S);
  assert.equal(c.title, 'Nothing to mute here');
  assert.equal(c.sub, 'CornMute works on websites. Open any site to use it.');
  assert.equal(c.showButton, false);
  assert.equal(c.addLink, false);
});

test('muted by the built-in list: "Muted: adult site" with the real shortcut', () => {
  const c = statusCopy({ ...base, site: 'x.com', builtin: true, muted: true, mutedByCornMute: true }, S);
  assert.equal(c.title, 'Muted: adult site');
  assert.equal(c.sub, 'Unmute anytime with the button or ⌥⇧M.');
  assert.equal(c.showButton, true);
  assert.equal(c.addLink, false);
});

test('muted because the user added it: "Muted: on your list"', () => {
  const c = statusCopy({ ...base, site: 'mine.dev', builtin: false, muted: true, mutedByCornMute: true }, 'Alt+Shift+M');
  assert.equal(c.title, 'Muted: on your list');
  assert.equal(c.sub, 'Unmute anytime with the button or Alt+Shift+M.');
});

test('no shortcut set: unmute line mentions only the button', () => {
  const c = statusCopy({ ...base, site: 'x', builtin: true, muted: true, mutedByCornMute: true }, 'not set');
  assert.equal(c.sub, 'Unmute anytime with the button.');
});

test('other states keep the button and never show the add link', () => {
  const states = { 'CornMute is off': { ...base, enabled: false }, 'Unmuted by you': { ...base, site: 'a', builtin: true, unmutedByUser: true },
    'This tab is muted': { ...base, muted: true }, 'Adult site on CornMute’s list': { ...base, site: 'a', builtin: true }, 'On your list': { ...base, site: 'a' } };
  for (const [title, st] of Object.entries(states)) {
    const c = statusCopy(st, S);
    assert.equal(c.title, title);
    assert.equal(c.showButton, true);
    assert.equal(c.addLink, false);
  }
});

test('no "watching" wording anywhere in the extension UI', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../../extension/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => /\.(js|html)$/.test(x))) {
    assert.doesNotMatch(readFileSync(new URL(f, dir), 'utf8'), /watching/i, f);
  }
});

test('footers: popup = Privacy Policy only; Muted sites = Privacy Policy, review, X; no "Tell me"', async () => {
  const { readFileSync } = await import('node:fs');
  const popup = readFileSync(new URL('../../extension/popup.html', import.meta.url), 'utf8');
  const sites = readFileSync(new URL('../../extension/sites.html', import.meta.url), 'utf8');
  const welcome = readFileSync(new URL('../../extension/welcome.html', import.meta.url), 'utf8');
  const popupFooter = popup.slice(popup.indexOf('class="credits'));
  assert.match(popupFooter, /Privacy Policy/);
  assert.doesNotMatch(popupFooter, /AlecBuilds247|Tell me|review/i);
  assert.match(sites, /Privacy Policy[\s\S]*Leave a review ★[\s\S]*@AlecBuilds247/);
  for (const html of [popup, sites]) assert.doesNotMatch(html, /Tell me/);
  assert.doesNotMatch(welcome, /review/i);
});

test('Incognito hint shows only when Incognito is off', () => {
  assert.equal(incognitoHint(false), '*Click “Fix” to let CornMute work in Incognito windows.');
  assert.equal(incognitoHint(true), '');
});

test('review link: needs count >= 3, a real item ID, and not dismissed', () => {
  const id = 'abcdefghijklmnopabcdefghijklmnop';
  assert.equal(REVIEW_MIN_COUNT, 3);
  assert.equal(shouldShowReview(2, false, id), false);
  assert.equal(shouldShowReview(3, false, id), true);
  assert.equal(shouldShowReview(50, false, id), true);
  assert.equal(shouldShowReview(50, true, id), false, 'dismissed stays hidden');
  assert.equal(shouldShowReview(50, false, ''), false, 'placeholder ID hides it');
  assert.equal(shouldShowReview(50, false, 'not-an-id'), false);
  assert.equal(reviewUrl(id), `https://chromewebstore.google.com/detail/${id}/reviews`);
});

test('review link copy follows store policy (no star demands, no rewards)', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../../extension/popup.html', import.meta.url), 'utf8');
  assert.match(html, /Enjoying CornMute\? Leave a review ★/);
  assert.doesNotMatch(html, /5 stars|five stars|reward|unlock/i);
});

test('item ID constant is empty or valid; footer links are right', () => {
  assert.ok(STORE_ITEM_ID === '' || /^[a-p]{32}$/.test(STORE_ITEM_ID));
  assert.equal(LINKS.privacy, 'https://alecbuilds247.github.io/cornmute-site/privacy.html');
  assert.equal(LINKS.x, 'https://x.com/AlecBuilds247');
});

test('getTabInfo reports the built-in count used by the popup', async () => {
  const { createCore } = await import('../../extension/core.js');
  const { fakeChrome } = await import('./fake-chrome.js');
  const f = fakeChrome();
  const core = createCore(f.chrome, { loadBlocklist: async () => ['a.com', 'b.com'] });
  const info = await core.getTabInfo(null, 'https://example.org/');
  assert.ok(info.builtinCount >= 2);
});
