/**
 * Test Suite: Phase 72B — RLS test harness runtime (native Windows + Linux)
 * - finds PostgreSQL via PG_BIN or Program Files\PostgreSQL\<version>\bin (.exe tools, no hard-coded version)
 * - Windows connects over TCP 127.0.0.1; Linux keeps the Unix-socket setup unchanged
 * - without PostgreSQL: SKIPPED (exit 0) normally, BLOCKED (exit 2) when V2U_RLS_REQUIRED=1 — never a pass
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  candidateBinDirs, connectionFor, exeName, findServerBin, hasServerTools, initdbArgs, missingRuntimeMessage, rlsRequired,
} from './lib/pgTestRuntime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}\n     ${err.message}`);
    failed++;
  }
}

// A fake Windows filesystem: case-insensitive paths, like NTFS.
const winFs = (files, dirs = {}) => {
  const f = new Set(files.map((x) => x.toLowerCase()));
  const d = Object.fromEntries(Object.entries(dirs).map(([k, v]) => [k.toLowerCase(), v]));
  return { exists: (p) => f.has(p.toLowerCase()), listDir: (p) => d[p.toLowerCase()] ?? [] };
};
const winTools = (bin) => ['initdb.exe', 'pg_ctl.exe', 'postgres.exe', 'psql.exe'].map((t) => `${bin}\\${t}`);
const WIN_ENV = {
  ProgramW6432: 'C:\\Program Files', ProgramFiles: 'C:\\Program Files', 'ProgramFiles(x86)': 'C:\\Program Files (x86)',
  LOCALAPPDATA: 'C:\\Users\\com\\AppData\\Local', USERPROFILE: 'C:\\Users\\com',
};

console.log('=== Phase 72B: RLS test harness runtime (Windows + Linux) ===\n');

await test('Windows tool names get .exe; other platforms unchanged; never doubled', () => {
  assert.strictEqual(exeName('initdb', 'win32'), 'initdb.exe');
  assert.strictEqual(exeName('pg_ctl.exe', 'win32'), 'pg_ctl.exe');
  assert.strictEqual(exeName('initdb', 'linux'), 'initdb');
  assert.strictEqual(missingRuntimeMessage({ env: {}, platform: 'win32' }).includes('initdb.exe, pg_ctl.exe, postgres.exe'), true);
});

await test('PG_BIN with .exe tools is used first (paths with spaces, no version hard-coded)', () => {
  const bin = 'D:\\Tools\\Postgres 18 beta\\bin';
  const fsx = winFs([...winTools(bin), ...winTools('C:\\Program Files\\PostgreSQL\\17\\bin')], { 'C:\\Program Files\\PostgreSQL': ['17'] });
  const r = findServerBin({ env: { ...WIN_ENV, PG_BIN: bin }, platform: 'win32', ...fsx });
  assert.deepStrictEqual([r.dir, r.source], [bin, 'PG_BIN']);
});

await test('auto-detects Program Files\\PostgreSQL\\<version>\\bin, newest version first', () => {
  const fsx = winFs([...winTools('C:\\Program Files\\PostgreSQL\\15\\bin'), ...winTools('C:\\Program Files\\PostgreSQL\\17\\bin'), ...winTools('C:\\Program Files\\PostgreSQL\\9.6\\bin')],
    { 'C:\\Program Files\\PostgreSQL': ['9.6', '15', '17', 'pgAdmin 4', 'data'] });
  const dirs = candidateBinDirs({ env: WIN_ENV, platform: 'win32', listDir: fsx.listDir }).map((c) => c.dir);
  assert.deepStrictEqual(dirs.slice(0, 3), ['C:\\Program Files\\PostgreSQL\\17\\bin', 'C:\\Program Files\\PostgreSQL\\15\\bin', 'C:\\Program Files\\PostgreSQL\\9.6\\bin']);
  assert.strictEqual(dirs.filter((d) => d.startsWith('C:\\Program Files\\PostgreSQL')).length, 3, 'ProgramW6432 == ProgramFiles is not searched twice');
  const r = findServerBin({ env: WIN_ENV, platform: 'win32', ...fsx });
  assert.deepStrictEqual([r.dir, r.source], ['C:\\Program Files\\PostgreSQL\\17\\bin', 'auto']);
});

await test('a PG_BIN without the server tools falls back to installed versions; psql alone is not enough', () => {
  const clientOnly = 'C:\\Program Files\\PostgreSQL\\16\\bin';
  const fsx = winFs([`${clientOnly}\\psql.exe`, ...winTools('C:\\Users\\com\\AppData\\Local\\Programs\\PostgreSQL\\16\\bin')],
    { 'C:\\Users\\com\\AppData\\Local\\Programs\\PostgreSQL': ['16'] });
  assert.strictEqual(hasServerTools(clientOnly, { platform: 'win32', exists: fsx.exists }), false);
  const r = findServerBin({ env: { ...WIN_ENV, PG_BIN: clientOnly }, platform: 'win32', ...fsx });
  assert.strictEqual(r.dir, 'C:\\Users\\com\\AppData\\Local\\Programs\\PostgreSQL\\16\\bin');
  assert(r.tried.includes(clientOnly));
  assert(missingRuntimeMessage({ env: { PG_BIN: clientOnly }, platform: 'win32' }).includes(`PG_BIN=${clientOnly} does not contain`));
});

await test('nothing installed (or autodetect off) finds nothing', () => {
  assert.strictEqual(findServerBin({ env: WIN_ENV, platform: 'win32', ...winFs([]) }).dir, null);
  const fsx = winFs(winTools('C:\\Program Files\\PostgreSQL\\17\\bin'), { 'C:\\Program Files\\PostgreSQL': ['17'] });
  assert.strictEqual(findServerBin({ env: { ...WIN_ENV, V2U_RLS_PG_AUTODETECT: '0' }, platform: 'win32', ...fsx }).dir, null);
});

await test('Linux keeps its historical search order (16, 17, 15) before other versions', () => {
  const dirs = candidateBinDirs({ env: {}, platform: 'linux', listDir: (p) => (p === '/usr/lib/postgresql' ? ['18', '17', '16'] : []) }).map((c) => c.dir);
  assert.deepStrictEqual(dirs, ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/usr/lib/postgresql/15/bin', '/usr/lib/postgresql/18/bin']);
});

await test('Windows connects over TCP 127.0.0.1 without Unix sockets; Linux socket setup is unchanged', () => {
  const w = connectionFor({ dir: 'C:\\Users\\com\\AppData\\Local\\Temp\\v2u-pg-x', port: 54329, env: {}, platform: 'win32' });
  assert.deepStrictEqual([w.transport, w.clientHost, w.serverOptions], ['tcp', '127.0.0.1', '-p 54329 -c listen_addresses=localhost']);
  assert.strictEqual(w.dbUri('authenticator'), 'postgres://authenticator@127.0.0.1:54329/postgres');
  const l = connectionFor({ dir: '/tmp/v2u-pg-x', port: 54329, env: {}, platform: 'linux' });
  assert.deepStrictEqual([l.transport, l.clientHost, l.serverOptions], ['socket', '/tmp/v2u-pg-x', "-p 54329 -k /tmp/v2u-pg-x -c listen_addresses=''"]);
  assert.strictEqual(l.dbUri('authenticator'), 'postgres://authenticator@/postgres?host=/tmp/v2u-pg-x&port=54329');
  const t = connectionFor({ dir: '/tmp/v2u-pg-x', port: 6000, env: { V2U_RLS_PG_TRANSPORT: 'tcp' }, platform: 'linux' });
  assert.deepStrictEqual([t.transport, t.serverOptions], ['tcp', '-p 6000 -c listen_addresses=localhost -k /tmp/v2u-pg-x']);
});

await test('initdb: UTF8 everywhere, C locale only on Windows (system code page is not UTF8)', () => {
  assert.deepStrictEqual(initdbArgs('d', 'linux'), ['-D', 'd', '-U', 'postgres', '--auth=trust', '-E', 'UTF8']);
  assert.deepStrictEqual(initdbArgs('d', 'win32').slice(-1), ['--locale=C']);
});

await test('V2U_RLS_REQUIRED parsing', () => {
  assert.strictEqual(rlsRequired({ V2U_RLS_REQUIRED: '1' }), true);
  assert.strictEqual(rlsRequired({ V2U_RLS_REQUIRED: 'true' }), true);
  assert.strictEqual(rlsRequired({}), false);
});

await test('harness: no PostgreSQL -> SKIPPED exit 0, but BLOCKED exit 2 when RLS is required (never PASS)', () => {
  const script = path.join(__dirname, 'test-supabase-rls.mjs');
  const env = { ...process.env, PG_BIN: path.join(os.tmpdir(), 'no-postgres-here'), V2U_RLS_PG_AUTODETECT: '0' };
  delete env.V2U_RLS_REQUIRED;
  const skipped = spawnSync(process.execPath, [script], { env, encoding: 'utf-8' });
  assert.strictEqual(skipped.status, 0);
  assert.match(skipped.stdout, /^SKIPPED: PostgreSQL server binaries not found/m);
  assert.doesNotMatch(skipped.stdout, /Passed:/);
  const blocked = spawnSync(process.execPath, [script], { env: { ...env, V2U_RLS_REQUIRED: '1' }, encoding: 'utf-8' });
  assert.strictEqual(blocked.status, 2);
  assert.match(blocked.stdout, /^BLOCKED: PostgreSQL server binaries not found .*not a pass/m);
  assert(fs.existsSync(script));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
