// Downloads the StevenBlack "porn-only" hosts list and writes extension/blocklist.txt.
// Run:  node scripts/update-blocklist.mjs   (or: npm run update-blocklist)
// Then: npm test && npm run build
//
// Steps: parse hosts lines -> clean each domain -> drop data/exclude.txt entries ->
// drop entries already covered by an adult-only TLD (.xxx .porn .sex .adult) ->
// drop subdomains whose parent is already listed (lookups check parent domains anyway) -> sort.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanDomain, ADULT_TLDS } from '../extension/domains.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts';

const localFile = process.argv[2]; // optional: path to an already-downloaded hosts file
const text = localFile ? readFileSync(localFile, 'utf8') : await (await fetch(SOURCE)).text();
const sourceDate = (text.match(/^# Date:\s*(.+)$/m) || [])[1] || 'unknown';

const excludes = readFileSync(path.join(root, 'data/exclude.txt'), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const isExcluded = (d) => excludes.some((x) => d === x || d.endsWith('.' + x));

const all = new Set();
for (const line of text.split('\n')) {
  const m = line.match(/^\s*(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)/);
  if (!m) continue;
  // keep the exact host (don't strip "www." here: "www.x" lines are collapsed into "x" below if "x" exists)
  const d = m[1].toLowerCase().replace(/\.+$/, '');
  if (d === '0.0.0.0' || d === 'localhost' || !cleanDomain(d)) continue;
  if (isExcluded(d)) continue;
  if (ADULT_TLDS.has(d.split('.').pop())) continue;
  all.add(d);
}
const kept = [...all].filter((d) => {
  const p = d.split('.');
  for (let i = 1; i < p.length - 1; i++) if (all.has(p.slice(i).join('.'))) return false;
  return true;
}).sort();

writeFileSync(path.join(root, 'extension/blocklist.txt'), kept.join('\n') + '\n');
const meta = {
  source: 'StevenBlack/hosts – porn extension (porn-only)',
  url: SOURCE,
  sourceDate,
  sourceEntries: all.size,
  domains: kept.length,
  generated: new Date().toISOString().slice(0, 10),
};
writeFileSync(path.join(root, 'extension/blocklist-meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(meta);
