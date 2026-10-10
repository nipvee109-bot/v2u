/* Deploy guard: fail if a production bundle contains a Supabase secret key value
   (sb_secret_… or a JWT whose role is service_role). The literal strings
   "sb_secret_"/"service_role" also appear in supabase-js and in our own guard
   code, so this matches key values, not those words. Prints file names only. */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'dist';
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|html|json|webmanifest|css|map)$/.test(e.name)) files.push(p);
  }
})(root);

const role = (jwt) => {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role ?? null; } catch { return null; }
};

const bad = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(s)) bad.push(`${f}: sb_secret_ key`);
  for (const jwt of s.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) ?? []) {
    if (role(jwt) === 'service_role') bad.push(`${f}: service_role JWT`);
  }
}

if (bad.length) {
  console.error(`Secret key material found in ${root}/:\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
console.log(`No secret keys in ${root}/ (${files.length} files scanned).`);
