/**
 * Re-checks every OpenStax evidence quote against the publisher's own source files.
 * Clones each repository at the commit pinned in src/content/knowledge/sources.ts
 * (or uses OPENSTAX_DIR=<dir containing the clones>) and searches the flattened
 * module text (scripts/research/openstax_text.py). Needs network access to github.com.
 *   node scripts/research/verify-openstax.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const K = await createJiti(import.meta.url).import(path.join(root, 'src/content/knowledge/index.ts'));
const dir = process.env.OPENSTAX_DIR ?? fs.mkdtempSync(path.join(os.tmpdir(), 'openstax-'));
const sh = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf-8', maxBuffer: 64 << 20 });

const repos = new Map();
for (const s of K.SOURCES) if (s.verification === 'opened-repo') repos.set(s.repo.url, s.repo.commit);
for (const [url, commit] of repos) {
  const d = path.join(dir, path.basename(url));
  if (!fs.existsSync(d)) {
    sh('git', ['clone', '-q', '--filter=blob:none', '--no-checkout', url, d]);
    sh('git', ['sparse-checkout', 'set', 'collections', 'modules/'], d);
  }
  sh('git', ['-c', 'advice.detachedHead=false', 'checkout', '-q', commit], d);
}

const text = new Map();
const norm = (s) => s.replace(/\s+/g, ' ');
let ok = 0, bad = 0;
for (const k of K.LESSON_KNOWLEDGE) for (const p of k.provenance) {
  const src = K.getSource(p.sourceId);
  for (const e of p.evidence ?? []) {
    if (!e.ref.startsWith('openstax:')) continue;
    const mod = e.ref.slice('openstax:'.length);
    const bundle = path.join(dir, path.basename(src.repo.url));
    const key = `${bundle}/${mod}`;
    if (!text.has(key)) text.set(key, norm(sh('python3', [path.join(root, 'scripts/research/openstax_text.py'), bundle, mod])));
    if (text.get(key).includes(norm(e.quote))) ok++;
    else { bad++; console.log(`MISSING ${k.lessonId} ${e.ref}: ${e.quote}`); }
  }
}
console.log(`OpenStax evidence: ${ok} found, ${bad} missing (${repos.size} repositories at pinned commits)`);
if (bad || !ok) process.exit(1);
