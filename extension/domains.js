// Pure helpers for turning links into domains and matching hosts against the list.
// Everything here runs on-device; nothing is stored or sent.

const HOST_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/;

// "https://www.Example.com/path?x=1" -> "example.com". Returns null if it isn't a usable domain.
export function cleanDomain(input) {
  let s = String(input ?? '').trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'http://' + s;
  let host;
  try { host = new URL(s).hostname; } catch { return null; }
  host = host.replace(/\.+$/, '').replace(/^www\d*\./, '');
  if (/^\d+(\.\d+){3}$/.test(host)) return null; // plain IP addresses aren't sites
  if (!HOST_RE.test(host)) return null;
  return host;
}

// Hostname of an http(s) URL, or null for anything else (chrome://, file://, about:blank...).
export function hostFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.hostname.toLowerCase().replace(/\.+$/, '') || null;
  } catch { return null; }
}

// Returns the listed domain that covers `host` (the domain itself or any subdomain), or null.
export function matchSite(host, siteSet) {
  if (!host) return null;
  const labels = host.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    if (siteSet.has(candidate)) return candidate;
  }
  return null;
}
