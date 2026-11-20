import test from 'node:test';
import assert from 'node:assert/strict';
import { statusCopy, incognitoHint } from '../../extension/popup-copy.js';
import { shouldShowReview, reviewUrl, STORE_ITEM_ID, LINKS, REVIEW_MIN_COUNT } from '../../extension/config.js';

const base = { enabled: true, count: 0, builtinCount: 46987, host: 'news.example.org', site: null, builtin: false,
  muted: false, mutedByCornMute: false, unmutedByUser: false };
const S = '⌥⇧M';

test('normal site: watching count with comma, plays normally, add link shown', () => {
  const c = statusCopy(base, S);
  assert.equal(c.title, '✓ Watching 46,987 adult sites');
  assert.equal(c.sub, 'This site isn’t one of them, so it plays normally.');
  assert.equal(c.addLink, true);
});

test('non-web page (new tab, chrome://): no add link', () => {
  const c = statusCopy({ ...base, host: null }, S);
  assert.match(c.title, /Watching 46,987/);
  assert.equal(c.addLink, false);
});

test('muted by the built-in list: says adult site on CornMute’s list and how to unmute', () => {
  const c = statusCopy({ ...base, site: 'x.com', builtin: true, muted: true, mutedByCornMute: true }, S);
  assert.equal(c.title, 'Muted: adult site on CornMute’s list');
  assert.equal(c.sub, 'Unmute with the button below or ⌥⇧M.');
  assert.equal(c.addLink, false);
});

test('muted because the user added it: says your list', () => {
  const c = statusCopy({ ...base, site: 'mine.dev', builtin: false, muted: true, mutedByCornMute: true }, 'Alt+Shift+M');
  assert.equal(c.title, 'Muted: this site is on your list');
  assert.match(c.sub, /Alt\+Shift\+M/);
});

test('no shortcut set: unmute hint mentions only the button', () => {
  const c = statusCopy({ ...base, site: 'x', builtin: true, muted: true, mutedByCornMute: true }, 'not set');
  assert.equal(c.sub, 'Unmute with the button below.');
});

test('other states: off, unmuted by user, user-muted, listed but not muted', () => {
  assert.equal(statusCopy({ ...base, enabled: false }, S).title, 'CornMute is off');
  assert.equal(statusCopy({ ...base, site: 'a', builtin: true, unmutedByUser: true }, S).title, 'Unmuted by you');
  assert.equal(statusCopy({ ...base, muted: true }, S).title, 'This tab is muted');
  assert.equal(statusCopy({ ...base, site: 'a', builtin: true }, S).title, 'Adult site on CornMute’s list');
  assert.equal(statusCopy({ ...base, site: 'a', builtin: false }, S).title, 'This site is on your list');
});

test('every state has short copy (card height stays stable)', () => {
  const states = [base, { ...base, host: null }, { ...base, enabled: false },
    { ...base, site: 'a', builtin: true, muted: true, mutedByCornMute: true },
    { ...base, site: 'a', muted: true, mutedByCornMute: true },
    { ...base, site: 'a', unmutedByUser: true }, { ...base, muted: true }, { ...base, site: 'a', builtin: true }];
  for (const st of states) {
    const c = statusCopy(st, S);
    assert.ok(c.title.length <= 40, c.title);
    assert.ok(c.sub.length <= 60, c.sub);
  }
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
