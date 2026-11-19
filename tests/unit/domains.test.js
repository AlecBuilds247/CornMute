import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanDomain, hostFromUrl, matchSite, matchAdultTld } from '../../extension/domains.js';
import { BUILTIN_SITES } from '../../extension/sites.js';

test('cleanDomain turns links into bare domains', () => {
  assert.equal(cleanDomain('https://www.Example.com/watch?v=1#t'), 'example.com');
  assert.equal(cleanDomain('example.com'), 'example.com');
  assert.equal(cleanDomain('  video.example.com/path '), 'video.example.com');
  assert.equal(cleanDomain('http://www2.example.co.uk:8080/x'), 'example.co.uk');
  assert.equal(cleanDomain('EXAMPLE.COM.'), 'example.com');
  assert.equal(cleanDomain('bücher.de'), 'xn--bcher-kva.de');
});

test('cleanDomain rejects junk', () => {
  for (const bad of ['', '   ', 'hello', 'localhost', '192.168.0.1', 'http://', 'a..b', 'not a site.com', null, undefined]) {
    assert.equal(cleanDomain(bad), null, String(bad));
  }
});

test('hostFromUrl only accepts web pages', () => {
  assert.equal(hostFromUrl('https://Video.Example.com/a'), 'video.example.com');
  assert.equal(hostFromUrl('chrome://extensions'), null);
  assert.equal(hostFromUrl('about:blank'), null);
  assert.equal(hostFromUrl('file:///x.html'), null);
  assert.equal(hostFromUrl('garbage'), null);
});

test('matchSite covers subdomains but not lookalikes', () => {
  const set = new Set(['example.com', 'jav.guru']);
  assert.equal(matchSite('example.com', set), 'example.com');
  assert.equal(matchSite('www.example.com', set), 'example.com');
  assert.equal(matchSite('a.b.video.example.com', set), 'example.com');
  assert.equal(matchSite('notexample.com', set), null);
  assert.equal(matchSite('example.com.evil.net', set), null);
  assert.equal(matchSite('guru', set), null);
  assert.equal(matchSite(null, set), null);
});

test('curated list is clean: valid, unique, lowercase, includes the must-haves', () => {
  assert.equal(new Set(BUILTIN_SITES).size, BUILTIN_SITES.length);
  for (const d of BUILTIN_SITES) assert.equal(cleanDomain(d), d, d);
  for (const d of ['sex.com', 'dmm.co.jp', 'onlyfans.com', 'fansly.com', 'pornhub.com']) assert.ok(BUILTIN_SITES.includes(d), d);
  assert.ok(!BUILTIN_SITES.includes('dmm.com'), 'dmm.com is the all-ages site');
});

test('adult-only TLDs match on the last label only', () => {
  assert.equal(matchAdultTld('anything.xxx'), 'anything.xxx');
  assert.equal(matchAdultTld('video.cdn.example.porn'), 'example.porn');
  assert.equal(matchAdultTld('www.shop.sex'), 'shop.sex');
  assert.equal(matchAdultTld('club.adult'), 'club.adult');
  for (const h of ['sussex.ac.uk', 'essex.ac.uk', 'middlesex.edu', 'sexton.com', 'pornography-research.org',
    'xxx.example.com', 'adult.example.com', 'sex.example.org', 'adultswim.com', 'xxxtentacion.com', 'xxx', null]) {
    assert.equal(matchAdultTld(h), null, String(h));
  }
});
