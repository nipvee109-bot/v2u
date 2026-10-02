/**
 * V2U resource link checker (Phase 52)
 * -------------------------------------
 * Opens every candidateUrl / url in the registry and reports:
 *   HTTP status · final URL · page <title> · whether the title matches.
 * It NEVER edits the registry. A link only becomes `verified` when a person
 * also confirms coverage of the lesson and that the source is legal, then
 * records all of it in `verification` (validateResources enforces this).
 *
 * Usage: node scripts/verify-resources.mjs [--out report.json]
 * If the network is blocked every entry is reported as "unreachable" and
 * stays `unverified` (shown to students as "ยังไม่ได้ตรวจลิงก์").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);
const { RESOURCE_REGISTRY } = await jiti.import(path.join(root, 'src/resources/registry.ts'));

const norm = (s) => s.toLowerCase().replace(/[\s\-–—|:·.()"]+/g, ' ').trim();
const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 1));
/** Share of the expected title's words found in the page title. */
export function titleOverlap(expected, actual) {
  const a = words(expected);
  if (!a.size || !actual) return 0;
  const b = words(actual);
  let hit = 0;
  for (const w of a) if (b.has(w) || norm(actual).includes(w)) hit++;
  return hit / a.size;
}

async function check(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'V2U-link-check' } });
    // A proxy refusal is not the site's answer — the link is simply unchecked
    if (res.headers.get('x-deny-reason')) return { error: `blocked-by-network-policy (${res.headers.get('x-deny-reason')})` };
    const html = res.headers.get('content-type')?.includes('html') ? await res.text() : '';
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
    return { httpStatus: res.status, finalUrl: res.url, pageTitle: title };
  } catch (e) {
    return { error: String(e.cause?.code ?? e.name ?? e) };
  } finally {
    clearTimeout(t);
  }
}

const rows = [];
for (const r of RESOURCE_REGISTRY) {
  const url = r.url ?? r.candidateUrl;
  if (!url || r.status === 'deprecated') continue;
  const res = await check(url);
  const expected = r.urlProvenance?.resultTitle ?? r.title;
  const overlap = res.pageTitle ? titleOverlap(expected, res.pageTitle) : 0;
  const ok = res.httpStatus >= 200 && res.httpStatus < 300;
  rows.push({
    id: r.id,
    url,
    status: r.status,
    ...res,
    titleMatches: ok && overlap >= 0.6,
    result: res.error ? 'unreachable' : !ok ? 'broken' : overlap >= 0.6 ? 'ready-for-human-review' : 'title-mismatch',
  });
  console.log(`${rows.at(-1).result.padEnd(24)} ${r.id}`);
}
const summary = rows.reduce((m, x) => ((m[x.result] = (m[x.result] ?? 0) + 1), m), {});
console.log('\nsummary', summary);
const outIdx = process.argv.indexOf('--out');
if (outIdx > 0) fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify({ checkedAt: new Date().toISOString(), summary, rows }, null, 2));
