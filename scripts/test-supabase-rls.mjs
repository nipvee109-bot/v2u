/**
 * Supabase RLS / RPC security tests (Phase 72B) — runs the REAL migration on a
 * throwaway PostgreSQL 16 cluster (plus supabase/tests/supabase-shim.sql for
 * Supabase's roles and auth schema) and acts as anon / authenticated users
 * exactly like PostgREST does (SET ROLE + request.jwt.claims).
 *   npm run test:rls
 * Needs PostgreSQL server binaries (initdb/pg_ctl/postgres; .exe on Windows), found via PG_BIN or the usual
 * install folders (see scripts/lib/pgTestRuntime.js). Linux/macOS use a Unix socket in a throwaway folder;
 * Windows uses TCP on 127.0.0.1. Without PostgreSQL it prints SKIPPED and exits 0, or - with
 * V2U_RLS_REQUIRED=1 or CI - prints BLOCKED and exits 2, because a skipped RLS run is not a pass.
 * Missing PostgREST makes the result PARTIAL, or BLOCKED with V2U_RLS_E2E_REQUIRED=1.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { connectionFor, exeName, findServerBin, initdbArgs, missingRuntimeMessage, rlsRequired, rlsRunResult } from './lib/pgTestRuntime.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = findServerBin();
const BIN = runtime.dir;
if (!BIN) {
  const what = missingRuntimeMessage();
  if (rlsRequired()) {
    console.log(`BLOCKED: ${what}. RLS required by V2U_RLS_REQUIRED or CI; a skipped RLS run is not a pass.`);
    process.exit(2);
  }
  console.log(`SKIPPED: ${what}. No RLS assertions ran; this is not a pass.`);
  process.exit(0);
}
if (process.env.PG_BIN && runtime.source !== 'PG_BIN') {
  console.warn(`WARNING: PG_BIN lacks the required server tools; using detected PostgreSQL at ${BIN}.`);
}
const PORT = Number(process.env.V2U_RLS_PG_PORT) || 54329;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2u-pg-'));
const isRoot = process.getuid?.() === 0;
const conn = connectionFor({ dir, port: PORT });
const run = (bin, args) => {
  const exe = path.join(BIN, exeName(bin));
  if (isRoot) {
    { const id = Number(execFileSync("id", ["-u", "postgres"]).toString().trim()); const gid = Number(execFileSync("id", ["-g", "postgres"]).toString().trim()); fs.chownSync(dir, id, gid); }
    return execFileSync('runuser', ['-u', 'postgres', '--', exe, ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
  }
  if (process.platform === 'win32') {
    // pg_ctl's background server inherits stdio; a pipe would keep execFileSync waiting, so stderr goes to a file.
    const errFile = path.join(dir, `${bin}.err`);
    const fd = fs.openSync(errFile, 'w');
    try {
      return execFileSync(exe, args, { stdio: ['ignore', 'ignore', fd], windowsHide: true });
    } catch (err) {
      err.message += `\n${fs.readFileSync(errFile, 'utf-8')}`;
      throw err;
    } finally {
      fs.closeSync(fd);
    }
  }
  return execFileSync(exe, args, { stdio: ['ignore', 'ignore', 'pipe'] });
};
run('initdb', initdbArgs(path.join(dir, 'data')));
run('pg_ctl', ['-D', path.join(dir, 'data'), '-l', path.join(dir, 'pg.log'), '-o', conn.serverOptions, '-w', 'start']);
const stop = () => { try { run('pg_ctl', ['-D', path.join(dir, 'data'), '-m', 'immediate', 'stop']); } catch { /* already stopped */ } fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); };

const db = new pg.Client({ host: conn.clientHost, port: PORT, user: 'postgres', database: 'postgres' });
let passed = 0;
let failed = 0;
const skippedSections = [];
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

try {
  await db.connect();
  await db.query(fs.readFileSync(path.join(root, 'supabase/tests/supabase-shim.sql'), 'utf-8'));
  const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort();
  // A separate database proves upgrade behavior with the two old migrations
  // and real legacy rows, without polluting the normal security fixtures.
  await db.query('create database t004_legacy');
  const legacy = new pg.Client({ host: conn.clientHost, port: PORT, user: 'postgres', database: 't004_legacy' });
  try {
    await legacy.connect();
    const shim = fs.readFileSync(path.join(root, 'supabase/tests/supabase-shim.sql'), 'utf-8').replace(/^create role .*;\r?$/gm, '');
    await legacy.query(shim);
    for (const m of migrations.slice(0, 2)) await legacy.query(fs.readFileSync(path.join(root, 'supabase/migrations', m), 'utf-8'));
    const forward = fs.readFileSync(path.join(root, 'supabase/migrations/20261005010000_v2u_review_history_privileges.sql'), 'utf-8');
    const actors = (await legacy.query(`insert into auth.users(email) values ('creator@example.invalid'), ('middle@example.invalid'),
      ('last@example.invalid'), ('reviewer@example.invalid') returning id`)).rows.map((r) => r.id);
    await legacy.query(`update public.profiles set role='ADMIN'`);
    const legacyAs = async (uid, sql, params = []) => {
      await legacy.query('begin');
      try {
        await legacy.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
        await legacy.query('set local role authenticated');
        const result = await legacy.query(sql, params);
        await legacy.query('commit');
        return result.rows;
      } catch (err) { await legacy.query('rollback'); throw err; }
    };
    const o = (await legacyAs(actors[0], `insert into public.content_overrides(lesson_id,field,value,reason)
      values ('prog-ctrl-loops','analogy','"legacy"','legacy') returning id`))[0];
    await legacyAs(actors[1], `update public.content_overrides set reason='middle edit' where id=$1`, [o.id]);
    await legacyAs(actors[2], `update public.content_overrides set reason='last edit' where id=$1`, [o.id]);
    await legacy.query(`insert into public.cms_versions(kind,entity_id,lesson_id,data,version,published_at,published_by,learner_visible)
      values ('contentOverride',$1,'prog-ctrl-loops','{"value":"historic"}',3,now(),$2,true)`, [o.id, actors[3]]);
    await legacy.query(`insert into public.cms_published(kind,entity_id,lesson_id,data,version,published_by,learner_visible)
      values ('contentOverride',$1,'prog-ctrl-loops','{"value":"live"}',3,$2,true)`, [o.id, actors[3]]);
    const auditBefore = (await legacy.query('select * from public.audit_logs order by id')).rows;
    const historyBefore = (await legacy.query('select * from public.cms_versions order by id')).rows;
    await test('populated legacy migration fails closed on equal or lower live versions, preserving all data', async () => {
      for (const version of [3, 2]) {
        await legacy.query('update public.cms_published set version=$1', [version]);
        const publishedBefore = (await legacy.query('select * from public.cms_published')).rows;
        await assert.rejects(legacy.query(forward), (e) => e.code === '23514' && /T004 history invariant.*explicit owner repair required/.test(e.message));
        await legacy.query('rollback');
        assert.deepStrictEqual((await legacy.query('select * from public.cms_published')).rows, publishedBefore);
        assert.deepStrictEqual((await legacy.query('select * from public.cms_versions order by id')).rows, historyBefore);
        assert.deepStrictEqual((await legacy.query('select * from public.audit_logs order by id')).rows, auditBefore);
        assert.strictEqual((await legacy.query(`select count(*)::int n from information_schema.columns
          where table_schema='public' and table_name='content_overrides' and column_name='contributors'`)).rows[0].n, 0);
      }
    });
    // Explicit test-fixture repair only: retain both distinct snapshots and
    // place the live snapshot after history. The migration never repairs it.
    await legacy.query('update public.cms_published set version=4');
    await legacy.query('begin');
    await legacy.query(`select set_config('v2u.in_rpc','on',true)`);
    await legacy.query('update public.content_overrides set published_version=4 where id=$1', [o.id]);
    await legacy.query('commit');
    // Owner fixture updates are internal; capture the exact pre-migration audit.
    const preMigrationAudit = (await legacy.query('select * from public.audit_logs order by id')).rows;
    await test('populated legacy backfill adds no audit rows; unpublish/republish preserves strictly increasing snapshots', async () => {
      await legacy.query(forward);
      assert.deepStrictEqual((await legacy.query('select * from public.audit_logs order by id')).rows, preMigrationAudit);
      const row = (await legacy.query('select contributors from public.content_overrides where id=$1', [o.id])).rows[0];
      assert.deepStrictEqual(row.contributors.sort(), [...actors.slice(0, 3)].sort());
      assert.strictEqual((await legacy.query('select count(*)::int n from public.content_overrides')).rows[0].n, 1);
      assert.notStrictEqual((await legacy.query(`select current_setting('v2u.in_rpc',true) flag`)).rows[0].flag, 'on');
      assert.strictEqual((await legacy.query('select count(*)::int n from public.audit_logs where actor_id is null')).rows[0].n, 0);
      // A normal direct edit still audits, and the recovered middle actor
      // (neither creator nor last editor) cannot approve.
      await legacyAs(actors[2], `update public.content_overrides set reason='after migration' where id=$1`, [o.id]);
      const lastAudit = (await legacy.query('select actor_id,action from public.audit_logs order by id desc limit 1')).rows[0];
      assert.deepStrictEqual(lastAudit, { actor_id: actors[2], action: 'CONTENT_UPDATED' });
      await legacyAs(actors[2], `select public.cms_transition('contentOverride',$1,'submit')`, [o.id]);
      await assert.rejects(legacyAs(actors[1], `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]), (e) => e.code === '42501');
      await legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]);
      assert.deepStrictEqual((await legacy.query('select contributors from public.content_overrides where id=$1', [o.id])).rows[0].contributors, []);
      await legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'unpublish')`, [o.id]);
      await legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'publish')`, [o.id]);
      assert.strictEqual((await legacy.query('select version from public.cms_published where entity_id=$1', [o.id])).rows[0].version, 5);
      await legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'unpublish')`, [o.id]);
      await legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'publish')`, [o.id]);
      const published = (await legacy.query('select * from public.cms_published where entity_id=$1', [o.id])).rows[0];
      assert.strictEqual(published.version, 6);
      assert.strictEqual(published.previous_version, 5);
      const history = (await legacy.query(`select version,data->>'value' value from public.cms_versions where entity_id=$1 order by version`, [o.id])).rows;
      assert.deepStrictEqual(history.map((r) => r.version), [3, 4, 5]);
      assert.deepStrictEqual(history.slice(0, 2), [{ version: 3, value: 'historic' }, { version: 4, value: 'live' }]);
      assert.deepStrictEqual((await legacy.query('select * from public.cms_versions where version=3')).rows, historyBefore);
      // A later invariant violation must fail atomically, with no snapshot or
      // audit loss, rather than treating a duplicate archive as success.
      await legacy.query(`insert into public.cms_versions(kind,entity_id,lesson_id,data,version,published_at,published_by,learner_visible)
        select kind,entity_id,lesson_id,'{"value":"collision"}',version,published_at,published_by,learner_visible from public.cms_published`);
      const auditCount = (await legacy.query('select count(*)::int n from public.audit_logs')).rows[0].n;
      await assert.rejects(legacyAs(actors[3], `select public.cms_transition('contentOverride',$1,'unpublish')`, [o.id]), (e) => e.code === '23505');
      assert.deepStrictEqual((await legacy.query('select * from public.cms_published where entity_id=$1', [o.id])).rows[0], published);
      assert.strictEqual((await legacy.query('select count(*)::int n from public.audit_logs')).rows[0].n, auditCount);
    });
  } finally { await legacy.end(); }
  await test('existing auth users receive one default profile; backfill is repeatable and preserves existing profiles', async () => {
    await db.query('create database t005_profiles');
    const profiles = new pg.Client({ host: conn.clientHost, port: PORT, user: 'postgres', database: 't005_profiles' });
    try {
      await profiles.connect();
      await profiles.query(fs.readFileSync(path.join(root, 'supabase/tests/supabase-shim.sql'), 'utf-8').replace(/^create role .*;\r?$/gm, ''));
      // Identities predate the profile table and trigger, just like legacy auth.
      const users = (await profiles.query(`insert into auth.users(email,raw_user_meta_data) values
        ('legacy@example.invalid','{"full_name":"Legacy learner","role":"SUPER_ADMIN","status":"DISABLED","avatar_url":"javascript:alert(1)"}'),
        ('existing@example.invalid','{"role":"SUPER_ADMIN","status":"ACTIVE"}'),
        ('avatar@example.invalid','{"name":"Learner","avatar_url":"https://example.invalid/avatar.png","role":"ADMIN"}') returning id`)).rows;
      for (const m of migrations.filter((m) => m < '20261005020000')) await profiles.query(fs.readFileSync(path.join(root, 'supabase/migrations', m), 'utf-8'));
      await profiles.query(`insert into public.profiles(id,email,display_name,role,status,onboarding_completed,last_login_at)
        values ($1,'preserved@example.invalid','Existing profile','REVIEWER','SUSPENDED',true,'2026-10-01T00:00:00Z')`, [users[1].id]);
      const existing = (await profiles.query('select * from public.profiles where id=$1', [users[1].id])).rows[0];
      const backfill = fs.readFileSync(path.join(root, 'supabase/migrations/20261005020000_v2u_existing_auth_profiles.sql'), 'utf-8');
      for (let run = 0; run < 2; run++) {
        await profiles.query(backfill);
        assert.deepStrictEqual((await profiles.query('select * from public.profiles where id=$1', [users[1].id])).rows[0], existing);
        const rows = (await profiles.query('select id,role,status,avatar_url from public.profiles order by id')).rows;
        assert.strictEqual(rows.length, 3);
        for (const uid of [users[0].id, users[2].id]) {
          const p = rows.find((r) => r.id === uid);
          assert.strictEqual(p.role, 'STUDENT');
          assert.strictEqual(p.status, 'ACTIVE');
        }
        assert.strictEqual(rows.find((r) => r.id === users[0].id).avatar_url, null);
        assert.strictEqual(rows.find((r) => r.id === users[2].id).avatar_url, 'https://example.invalid/avatar.png');
        assert((await profiles.query('select id,count(*)::int n from public.profiles group by id')).rows.every((r) => r.n === 1));
      }
    } finally { await profiles.end(); }
  });
  for (const m of migrations) await db.query(fs.readFileSync(path.join(root, 'supabase/migrations', m), 'utf-8'));
  console.log(`=== Supabase RLS (${migrations.length} migration(s), PostgreSQL ${(await db.query('show server_version')).rows[0].server_version}, ${conn.transport}, ${runtime.source === 'PG_BIN' ? 'PG_BIN' : BIN}) ===\n`);

  /** Run SQL as a PostgREST caller. uid=null → anon. Returns rows, or throws the DB error. */
  const as = async (uid, sql, params = []) => {
    await db.query('begin');
    try {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '']);
      await db.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
      const r = await db.query(sql, params);
      await db.query('commit');
      return r.rows;
    } catch (e) {
      await db.query('rollback');
      throw e;
    }
  };
  const denied = async (p, re = /permission denied|violates row-level security|managed by|cannot|only|required|VERIFIED|must|archived/i) => {
    let err = null;
    try { await p; } catch (e) { err = e; }
    assert(err, 'expected the database to refuse');
    assert.match(err.message, re);
  };
  // Matrix probes must not change fixtures or leave successful RPC audit rows behind.
  const probe = async (uid, fn, claims = {}) => {
    await db.query('begin');
    try {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: uid ? 'authenticated' : 'anon', ...claims, sub: uid })]);
      await db.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
      return await fn();
    } finally {
      await db.query('rollback');
    }
  };
  const ROLES = ['STUDENT', 'CONTENT_EDITOR', 'GAME_EDITOR', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'];
  const U = {};
  for (const r of [...ROLES, 'SUPER_ADMIN_2', 'SUSPENDED_ADMIN', 'CONTENT_EDITOR_2']) {
    const { rows } = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [`${r.toLowerCase()}@example.invalid`, { full_name: r, role: 'SUPER_ADMIN', avatar_url: 'javascript:alert(1)' }]);
    U[r] = rows[0].id;
  }
  const setupDoc = fs.readFileSync(path.join(root, 'docs/supabase-setup.md'), 'utf-8');
  const bootstrapSql = setupDoc.match(/<!-- v2u-owner-bootstrap-sql:[^\n]*-->\s*```sql\s*([\s\S]*?)```/)?.[1];
  assert(bootstrapSql, 'setup docs must include the tested owner bootstrap SQL');
  const bootstrap = async (uid) => {
    try {
      const results = await db.query(bootstrapSql.replaceAll('<your-uuid>', uid));
      return results.find((r) => r.command === 'UPDATE');
    } catch (err) {
      await db.query('rollback');
      throw err;
    }
  };
  const superCount = async () => Number((await db.query(`select count(*) from public.profiles where role = 'SUPER_ADMIN' and status = 'ACTIVE'`)).rows[0].count);
  const denyClientBootstrap = async () => {
    for (const uid of [null, U.STUDENT, U.ADMIN]) {
      for (const target of [uid ?? U.STUDENT, U.SUPER_ADMIN_2]) {
        await denied(as(uid, `select public.set_user_role($1, 'SUPER_ADMIN')`, [target]));
        await denied(as(uid, `update public.profiles set role = 'SUPER_ADMIN', status = 'ACTIVE' where id = $1`, [target]), /permission denied/);
      }
      await denied(as(uid, `select public.set_user_status($1, 'ACTIVE')`, [uid ?? U.STUDENT]));
      await denied(as(uid, `lock table public.profiles in exclusive mode`), /permission denied/);
    }
  };

  await test('clients cannot bootstrap the first SUPER_ADMIN, even with no existing owner', async () => {
    assert.strictEqual(await superCount(), 0);
    assert((await db.query(`select role, status from public.profiles`)).rows.every((p) => p.role === 'STUDENT' && p.status === 'ACTIVE'));
    await denyClientBootstrap();
    // An ADMIN without an existing SUPER_ADMIN still cannot claim ownership.
    await db.query(`update public.profiles set role = 'ADMIN' where id = $1`, [U.ADMIN]);
    await denyClientBootstrap();
    assert.strictEqual(await superCount(), 0);
  });

  await test('documented owner SQL bootstraps once; clients and repeat owner attempts cannot re-bootstrap', async () => {
    assert.strictEqual((await bootstrap('00000000-0000-0000-0000-000000000000')).rowCount, 0, 'missing profile is not created');
    assert.strictEqual(await superCount(), 0);
    const first = await bootstrap(U.SUPER_ADMIN);
    assert.strictEqual(first.rowCount, 1);
    assert.deepStrictEqual(first.rows, [{ id: U.SUPER_ADMIN, role: 'SUPER_ADMIN', status: 'ACTIVE' }]);
    for (const target of [U.SUPER_ADMIN, U.SUPER_ADMIN_2]) assert.strictEqual((await bootstrap(target)).rowCount, 0);
    await denyClientBootstrap();
    assert.strictEqual(await superCount(), 1);
    assert.strictEqual((await db.query(`select role from public.profiles where id = $1`, [U.SUPER_ADMIN_2])).rows[0].role, 'STUDENT');
  });

  await test('documented owner recovery restores an inactive SUPER_ADMIN only when no active owner remains', async () => {
    for (const status of ['SUSPENDED', 'DISABLED']) {
      await db.query(`update public.profiles set status = $2 where id = $1`, [U.SUPER_ADMIN, status]);
      assert.strictEqual(await superCount(), 0);
      await denyClientBootstrap();
      assert.strictEqual((await bootstrap(U.SUPER_ADMIN)).rowCount, 1);
      assert.strictEqual(await superCount(), 1);
      assert.strictEqual((await bootstrap(U.SUPER_ADMIN_2)).rowCount, 0);
    }
  });

  await test('client-executable public functions match the allowlist; no bootstrap RPC is exposed', async () => {
    const helpers = ['v2u_can(text)', 'v2u_current_role()', 'v2u_https_url(text)', 'v2u_is_client()', 'v2u_lesson_id(text)', 'v2u_role_can(app_role,text)'];
    const rpcs = ['cms_transition(text,uuid,text,text)', 'cms_verify_source(text,uuid)', 'set_user_role(uuid,app_role)', 'set_user_status(uuid,account_status)'];
    for (const role of ['anon', 'authenticated']) {
      const { rows } = await db.query(`select p.oid::regprocedure::text signature from pg_proc p
        where p.pronamespace = 'public'::regnamespace and has_function_privilege($1, p.oid, 'EXECUTE')
        order by signature`, [role]);
      assert.deepStrictEqual(rows.map((r) => r.signature).sort(), [...helpers, ...(role === 'authenticated' ? rpcs : [])].sort(), role);
    }
  });

  // Owner-only fixture setup for the remaining role matrix tests.
  for (const r of ROLES) await db.query(`update public.profiles set role = $2 where id = $1`, [U[r], r]);
  await db.query(`update public.profiles set role = 'CONTENT_EDITOR' where id = $1`, [U.CONTENT_EDITOR_2]);
  await db.query(`update public.profiles set role = 'ADMIN', status = 'SUSPENDED' where id = $1`, [U.SUSPENDED_ADMIN]);
  const L = 'prog-ctrl-loops';
  const newVideo = (uid, extra = {}) => as(uid, `insert into public.videos (lesson_id, title, url, video_id, channel) values ($1, $2, $3, $4, 'ch') returning *`, [L, extra.title ?? 'คลิป', extra.url ?? 'https://www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk']).then((r) => r[0]);

  await test('future postgres-owned tables, sequences and definer functions fail closed', async () => {
    await db.query('begin');
    try {
      await db.query(`create table public.future_probe(id integer); create sequence public.future_seq;
        create function public.future_rpc() returns integer language sql security definer set search_path = '' as 'select 1'`);
      for (const role of ['anon', 'authenticated']) {
        const { rows } = await db.query(`select
          has_table_privilege($1, 'public.future_probe', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') t,
          has_sequence_privilege($1, 'public.future_seq', 'USAGE,SELECT,UPDATE') s,
          has_function_privilege($1, 'public.future_rpc()', 'EXECUTE') f`, [role]);
        assert.deepStrictEqual(rows[0], { t: false, s: false, f: false }, role);
      }
    } finally { await db.query('rollback'); }
  });

  await test('JWT and metadata role spoofing cannot grant staff access', async () => {
    await probe(U.STUDENT, async () => {
      assert.deepStrictEqual((await db.query(`select public.v2u_current_role() role, public.v2u_can('admin.access') ok`)).rows, [{ role: 'STUDENT', ok: false }]);
      assert.deepStrictEqual((await db.query('select * from public.content_overrides')).rows, []);
    }, { role: 'SUPER_ADMIN', user_role: 'SUPER_ADMIN', app_metadata: { role: 'SUPER_ADMIN' }, user_metadata: { role: 'SUPER_ADMIN' } });
    for (const sql of [
      `insert into public.videos(lesson_id,title,url) values ('${L}','spoof','https://example.com/v')`,
      `select public.set_user_role('${U.SUPER_ADMIN_2}', 'SUPER_ADMIN')`,
    ]) await assert.rejects(probe(U.STUDENT, () => db.query(sql), { app_metadata: { role: 'SUPER_ADMIN' }, user_metadata: { role: 'SUPER_ADMIN' }, user_role: 'SUPER_ADMIN' }), (e) => e.code === '42501');
  });

  await test('six-role table and RPC operation matrix, plus suspended staff and anon', async () => {
    const { createJiti } = await import('jiti');
    const { ROLE_PERMISSIONS } = await createJiti(import.meta.url).import(path.join(root, 'src/auth/permissions.ts'));
    const v = await newVideo(U.CONTENT_EDITOR);
    const resource = (await as(U.CONTENT_EDITOR, `insert into public.resources(lesson_id,title,url) values ($1,'matrix','https://example.com/r') returning id`, [L]))[0];
    const o = (await as(U.CONTENT_EDITOR, `insert into public.content_overrides(lesson_id,field,value,reason) values ($1,'analogy','"matrix"','matrix') returning id`, [L]))[0];
    await as(U.GAME_EDITOR, `insert into public.games(game_id,name) values ('matrix-game','matrix')`);
    await as(U.GAME_EDITOR, `insert into public.lesson_game_assignments(lesson_id,game_id) values ($1,'matrix-game')`, [L]);
    const cases = [
      ...[['videos', v.id], ['resources', resource.id], ['content_overrides', o.id]].flatMap(([table, id]) => [
        { name: `${table} update`, perm: 'content.draft', sql: `update public.${table} set lesson_id = lesson_id where id = $1 returning id`, args: [id], update: true },
        { name: `${table} insert`, perm: 'content.draft', sql: table === 'content_overrides' ? `insert into public.${table}(lesson_id,field,value,reason) values ($1,'analogy','"matrix"','matrix') returning id` : `insert into public.${table}(lesson_id,title,url) values ($1,'matrix','https://example.com/m') returning id`, args: [L] },
      ]),
      { name: 'games insert', perm: 'game.manage', sql: `insert into public.games(game_id,name) values ('matrix-new','matrix') returning game_id` },
      { name: 'games update', perm: 'game.manage', sql: `update public.games set name = name where game_id = 'matrix-game' returning game_id`, update: true },
      { name: 'assignments insert', perm: 'game.assign', sql: `insert into public.lesson_game_assignments(lesson_id,game_id) values ('prog-matrix-probe','matrix-game') returning id` },
      { name: 'assignments update', perm: 'game.assign', sql: `update public.lesson_game_assignments set visible = visible where game_id = 'matrix-game' returning id`, update: true },
      { name: 'role RPC', perm: 'users.manageRoles', sql: `select public.set_user_role($1,'CONTENT_EDITOR')`, args: [U.SUPER_ADMIN_2], audit: 'ROLE_CHANGED' },
      { name: 'status RPC', perm: 'users.setStatus', sql: `select public.set_user_status($1,'SUSPENDED')`, args: [U.SUPER_ADMIN_2], audit: 'STATUS_CHANGED' },
      ...[['video', v.id], ['resource', resource.id]].map(([kind, id]) => ({ name: `${kind} verify RPC`, perm: 'content.verifySource', sql: `select public.cms_verify_source($1,$2)`, args: [kind, id], audit: kind === 'video' ? 'VIDEO_VERIFIED' : 'RESOURCE_VERIFIED' })),
      ...['video', 'resource', 'contentOverride'].flatMap((kind) => ['submit', 'approve', 'reject', 'publish', 'unpublish', 'archive', 'reopen'].map((action) => ({
        name: `${kind} ${action}`, perm: { submit: 'content.submit', approve: 'content.review', reject: 'content.review', publish: 'content.publish', unpublish: 'content.publish', archive: 'content.draft', reopen: 'content.draft' }[action],
        sql: `select public.cms_transition($1,$2,$3)`, args: [kind, { video: v.id, resource: resource.id, contentOverride: o.id }[kind], action],
        setup: async () => {
          const table = { video: 'videos', resource: 'resources', contentOverride: 'content_overrides' }[kind];
          const state = { submit: 'DRAFT', approve: 'IN_REVIEW', reject: 'IN_REVIEW', publish: 'APPROVED', unpublish: 'PUBLISHED', archive: 'DRAFT', reopen: 'ARCHIVED' }[action];
          await db.query(`update public.${table} set state = $2 where id = $1`, [{ video: v.id, resource: resource.id, contentOverride: o.id }[kind], state]);
          if (action === 'unpublish') await db.query(`insert into public.cms_published(kind,entity_id,lesson_id,data,version,learner_visible,published_by) values ($1,$2,$3,'{}',1,true,$4)`, [kind, { video: v.id, resource: resource.id, contentOverride: o.id }[kind], L, U.REVIEWER]);
        }, audit: `CONTENT_${{ submit: 'SUBMITTED', approve: 'APPROVED', reject: 'REJECTED', publish: 'PUBLISHED', unpublish: 'UNPUBLISHED', archive: 'ARCHIVED', reopen: 'REOPENED' }[action]}`,
      }))),
    ];
    for (const role of [...ROLES, 'SUSPENDED_ADMIN', 'ANON']) {
      const uid = U[role] ?? null;
      const perms = ROLE_PERMISSIONS[role] ?? [];
      for (const c of cases) {
        const before = Number((await db.query('select count(*) from public.audit_logs')).rows[0].count);
        await db.query('begin');
        try {
          await c.setup?.();
          const fixtureAuditCount = Number((await db.query('select count(*) from public.audit_logs')).rows[0].count);
          await db.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid, role: uid ? 'authenticated' : 'anon' })]);
          await db.query(`set local role ${uid ? 'authenticated' : 'anon'}`);
          if (perms.includes(c.perm)) {
            const result = await db.query(c.sql, c.args);
            assert.strictEqual(result.rows.length, 1, `${role}: ${c.name}`);
            await db.query('set local role postgres');
            const auditRows = (await db.query('select actor_id,actor_role,action from public.audit_logs order by id desc limit 1')).rows;
            assert.strictEqual(Number((await db.query('select count(*) from public.audit_logs')).rows[0].count), fixtureAuditCount + 1, `${role}: ${c.name} audit count`);
            assert.strictEqual(auditRows[0].actor_id, uid);
            assert.strictEqual(auditRows[0].actor_role, role);
            if (c.audit) assert.strictEqual(auditRows[0].action, c.audit);
          } else if (c.update && uid) {
            assert.deepStrictEqual((await db.query(c.sql, c.args)).rows, [], `${role}: ${c.name} RLS filters writes`);
          } else {
            await assert.rejects(db.query(c.sql, c.args), (e) => e.code === '42501', `${role}: ${c.name}`);
          }
        } finally { await db.query('rollback'); }
        assert.strictEqual(Number((await db.query('select count(*) from public.audit_logs')).rows[0].count), before, `${role}: ${c.name} leaves no audit changes`);
      }
      for (const table of ['profiles', 'videos', 'resources', 'content_overrides', 'cms_published', 'cms_versions', 'games', 'lesson_game_assignments', 'audit_logs']) {
        for (const sql of [`delete from public.${table}`, `truncate public.${table}`]) await assert.rejects(probe(uid, () => db.query(sql)), (e) => e.code === '42501', `${role}: ${sql}`);
        if (role === 'ANON' && !['cms_published', 'games', 'lesson_game_assignments'].includes(table)) {
          await assert.rejects(probe(uid, () => db.query(`select * from public.${table}`)), (e) => e.code === '42501');
        } else {
          const rows = await probe(uid, async () => (await db.query(`select * from public.${table}`)).rows);
          const staff = perms.includes('admin.access');
          if (table === 'profiles') assert.strictEqual(rows.length, perms.includes('users.view') ? Object.keys(U).length : 1);
          else if (table === 'audit_logs') assert.strictEqual(rows.length > 0, perms.includes('audit.view'));
          else if (!['cms_published', 'games', 'lesson_game_assignments'].includes(table)) assert.strictEqual(rows.length, staff ? Number((await db.query(`select count(*) from public.${table}`)).rows[0].count) : 0);
          else {
            const filter = table === 'cms_published' ? 'learner_visible' : table === 'games' ? 'published' : 'attached and visible and exists(select 1 from public.games g where g.game_id = t.game_id and g.published)';
            const expected = (await db.query(`select * from public.${table} t ${staff ? '' : `where ${filter}`}`)).rows;
            assert.deepStrictEqual(rows, expected, `${role}: ${table} visibility`);
          }
        }
        if (['profiles', 'cms_published', 'cms_versions', 'audit_logs'].includes(table)) {
          await assert.rejects(probe(uid, () => db.query(`insert into public.${table} default values`)), (e) => e.code === '42501');
          const column = { profiles: 'role', cms_published: 'data', cms_versions: 'data', audit_logs: 'action' }[table];
          await assert.rejects(probe(uid, () => db.query(`update public.${table} set ${column} = ${column}`)), (e) => e.code === '42501');
        }
      }
      if (uid) {
        const own = await probe(uid, async () => (await db.query(`update public.profiles set display_name='matrix' where id=$1 returning id`, [uid])).rows);
        assert.deepStrictEqual(own, role === 'SUSPENDED_ADMIN' ? [] : [{ id: uid }], `${role}: own display update`);
        assert.deepStrictEqual(await probe(uid, async () => (await db.query(`update public.profiles set display_name='IDOR' where id=$1 returning id`, [uid === U.STUDENT ? U.ADMIN : U.STUDENT])).rows), [], `${role}: other profile update`);
      }
    }
  });

  await test('every publish retains history across unpublish and republish', async () => {
    const v = await newVideo(U.CONTENT_EDITOR, { title: 'history-1' });
    for (let version = 1; version <= 4; version++) {
      if (version === 3) await as(U.REVIEWER, `select public.cms_transition('video',$1,'unpublish')`, [v.id]);
      if (version > 1) await as(U.CONTENT_EDITOR, `update public.videos set title = $2 where id = $1`, [v.id, `history-${version}`]);
      await as(U.REVIEWER, `select public.cms_transition('video',$1,'publish')`, [v.id]);
      const p = (await db.query('select * from public.cms_published where entity_id=$1', [v.id])).rows[0];
      assert.strictEqual(p.version, version);
      assert.strictEqual(p.previous_version, version === 1 ? null : version - 1);
    }
    const history = (await db.query(`select version,data->>'title' title from public.cms_versions where entity_id=$1 order by version`, [v.id])).rows;
    assert.deepStrictEqual(history, [1, 2, 3].map((version) => ({ version, title: `history-${version}` })));
  });

  await test('intermediate edits cannot launder self-approval, including promoted editors', async () => {
    const o = (await as(U.CONTENT_EDITOR, `insert into public.content_overrides(lesson_id,field,value,reason) values ($1,'analogy','"original"','review') returning id`, [L]))[0];
    await as(U.CONTENT_EDITOR_2, `update public.content_overrides set reason='intermediate editor' where id=$1`, [o.id]);
    await as(U.ADMIN, `update public.content_overrides set value='"admin text"' where id=$1`, [o.id]);
    await as(U.CONTENT_EDITOR, `update public.content_overrides set reason='minor edit' where id=$1`, [o.id]);
    await as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride',$1,'submit')`, [o.id]);
    await assert.rejects(as(U.ADMIN, `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]), (e) => e.code === '42501');
    const authors = (await db.query('select created_by,updated_by,contributors from public.content_overrides where id=$1', [o.id])).rows[0];
    assert.notStrictEqual(authors.created_by, U.CONTENT_EDITOR_2);
    assert.notStrictEqual(authors.updated_by, U.CONTENT_EDITOR_2);
    assert(authors.contributors.includes(U.CONTENT_EDITOR_2));
    await probe(U.CONTENT_EDITOR_2, async () => {
      await db.query('set local role postgres');
      await db.query(`update public.profiles set role='REVIEWER' where id=$1`, [U.CONTENT_EDITOR_2]);
      await db.query('set local role authenticated');
      await assert.rejects(db.query(`select public.cms_transition('contentOverride',$1,'approve')`, [o.id]), (e) => e.code === '42501');
    });
    await as(U.REVIEWER, `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]);
    assert.deepStrictEqual((await db.query('select contributors from public.content_overrides where id=$1', [o.id])).rows[0].contributors, []);
    await as(U.REVIEWER, `select public.cms_transition('contentOverride',$1,'publish')`, [o.id]);
    const snap = (await as(null, `select data from public.cms_published where entity_id=$1`, [o.id]))[0].data;
    assert(!('contributors' in snap));
    await as(U.ADMIN, `update public.content_overrides set value='"new admin text"' where id=$1`, [o.id]);
    await as(U.CONTENT_EDITOR, `update public.content_overrides set reason='minor again' where id=$1`, [o.id]);
    await as(U.REVIEWER, `select public.cms_transition('contentOverride',$1,'unpublish')`, [o.id]);
    await as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride',$1,'archive')`, [o.id]);
    await as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride',$1,'reopen')`, [o.id]);
    await as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride',$1,'submit')`, [o.id]);
    await assert.rejects(as(U.ADMIN, `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]), (e) => e.code === '42501');
    await assert.rejects(as(U.ADMIN, `update public.content_overrides set contributors='{}' where id=$1`, [o.id]), (e) => e.code === '42501');
    await as(U.REVIEWER, `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]);
    await as(U.REVIEWER, `select public.cms_transition('contentOverride',$1,'publish')`, [o.id]);
    await as(U.CONTENT_EDITOR, `update public.content_overrides set reason='independent later cycle' where id=$1`, [o.id]);
    await as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride',$1,'submit')`, [o.id]);
    await as(U.ADMIN, `select public.cms_transition('contentOverride',$1,'approve')`, [o.id]);
    assert.deepStrictEqual((await db.query('select contributors,approved_by from public.content_overrides where id=$1', [o.id])).rows[0], { contributors: [], approved_by: U.ADMIN });
  });

  await test('new Google user gets a STUDENT/ACTIVE profile; OAuth metadata cannot set role; unsafe avatar dropped', async () => {
    const { rows } = await db.query(`select * from public.profiles where id = $1`, [U.SUPER_ADMIN_2]);
    assert.strictEqual(rows[0].role, 'STUDENT');
    assert.strictEqual(rows[0].status, 'ACTIVE');
    assert.strictEqual(rows[0].avatar_url, null);
    assert.strictEqual(rows[0].display_name, 'SUPER_ADMIN_2');
  });

  await test('RLS enabled on every application table; no delete grants; anon/authenticated have no default write privileges', async () => {
    const { rows } = await db.query(`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`);
    assert(rows.length >= 9);
    for (const r of rows) assert(r.relrowsecurity, `RLS off: ${r.relname}`);
    const g = await db.query(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated') and privilege_type in ('DELETE','TRUNCATE','REFERENCES','TRIGGER')`);
    assert.deepStrictEqual(g.rows, []);
    const aw = await db.query(`select table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT'`);
    assert.deepStrictEqual(aw.rows, []);
    const w = await db.query(`select distinct table_name from information_schema.role_table_grants where table_schema='public' and grantee='authenticated' and privilege_type in ('INSERT','UPDATE')`);
    assert.deepStrictEqual(w.rows.map((x) => x.table_name).sort(), ['content_overrides', 'games', 'lesson_game_assignments', 'resources', 'videos'], 'profiles update is column-level only');
  });

  await test('SECURITY DEFINER functions all pin search_path; internal helpers are not callable by clients', async () => {
    const { rows } = await db.query(`select proname, proconfig from pg_proc where pronamespace = 'public'::regnamespace and prosecdef`);
    assert(rows.length >= 6);
    for (const r of rows) assert((r.proconfig ?? []).some((c) => c === 'search_path=""' || c === 'search_path='), `${r.proname} search_path`);
    for (const f of ['v2u_audit(public.audit_action, text, text, text, text)', 'v2u_require(text)', 'v2u_audit_row()']) {
      const { rows: x } = await db.query(`select has_function_privilege('authenticated', $1, 'execute') a, has_function_privilege('anon', $1, 'execute') b`, [`public.${f}`]);
      assert(!x[0].a && !x[0].b, f);
    }
    await denied(as(U.ADMIN, `select public.v2u_audit('ROLE_CHANGED', 'user', 'x', 'a', 'b')`), /permission denied/);
  });

  await test('permission matrix in SQL matches src/auth/permissions.ts exactly', async () => {
    const { createJiti } = await import('jiti');
    const P = await createJiti(import.meta.url).import(path.join(root, 'src/auth/permissions.ts'));
    const perms = [...new Set(Object.values(P.ROLE_PERMISSIONS).flat())];
    for (const role of ROLES) for (const p of perms) {
      const { rows } = await db.query(`select public.v2u_role_can($1, $2) ok`, [role, p]);
      assert.strictEqual(rows[0].ok, P.ROLE_PERMISSIONS[role].includes(p), `${role} ${p}`);
    }
  });

  await test('STUDENT: no admin reads or writes', async () => {
    await denied(newVideo(U.STUDENT));
    assert.deepStrictEqual(await as(U.STUDENT, `select * from public.videos`), []);
    assert.strictEqual((await as(U.STUDENT, `select * from public.profiles`)).length, 1, 'only own profile');
    assert.deepStrictEqual(await as(U.STUDENT, `select * from public.audit_logs`), []);
    await denied(as(U.STUDENT, `insert into public.games (game_id, name) values ('x', 'x')`));
  });

  await test('self elevation blocked: direct role/status update, RPC on self, and metadata', async () => {
    await denied(as(U.STUDENT, `update public.profiles set role = 'SUPER_ADMIN' where id = $1`, [U.STUDENT]), /permission denied/);
    await denied(as(U.STUDENT, `update public.profiles set status = 'ACTIVE', role = 'ADMIN' where id = $1`, [U.STUDENT]), /permission denied/);
    await denied(as(U.ADMIN, `select public.set_user_role($1, 'SUPER_ADMIN')`, [U.ADMIN]));
    await denied(as(U.STUDENT, `select public.set_user_role($1, 'ADMIN')`, [U.STUDENT]));
    // own display fields still editable
    await as(U.STUDENT, `update public.profiles set display_name = 'ใหม่', last_login_at = now() where id = $1`, [U.STUDENT]);
    // IDOR: cannot edit someone else's profile display fields
    const r = await as(U.STUDENT, `update public.profiles set display_name = 'x' where id = $1 returning id`, [U.ADMIN]);
    assert.deepStrictEqual(r, []);
    assert.strictEqual((await db.query(`select role from public.profiles where id = $1`, [U.STUDENT])).rows[0].role, 'STUDENT');
  });

  await test('CONTENT_EDITOR: drafts yes; roles, verification, workflow columns and publishing no', async () => {
    const v = await newVideo(U.CONTENT_EDITOR);
    assert.strictEqual(v.state, 'DRAFT');
    assert.strictEqual(v.created_by, U.CONTENT_EDITOR);
    await denied(as(U.CONTENT_EDITOR, `select public.set_user_role($1, 'REVIEWER')`, [U.STUDENT]));
    await denied(as(U.CONTENT_EDITOR, `insert into public.videos (lesson_id, title, url, verification_status, verified_by, verified_at) values ($1, 'x', 'https://example.com/v', 'VERIFIED', $2, now())`, [L, U.CONTENT_EDITOR]));
    await denied(as(U.CONTENT_EDITOR, `update public.videos set verification_status = 'VERIFIED' where id = $1`, [v.id]));
    await denied(as(U.CONTENT_EDITOR, `update public.videos set state = 'PUBLISHED' where id = $1`, [v.id]), /managed by/);
    await denied(as(U.CONTENT_EDITOR, `update public.videos set created_by = $2 where id = $1`, [v.id, U.ADMIN]), /managed by/);
    await denied(as(U.CONTENT_EDITOR, `select public.cms_verify_source('video', $1)`, [v.id]));
    await denied(as(U.CONTENT_EDITOR, `select public.cms_transition('video', $1, 'publish')`, [v.id]));
    await denied(as(U.CONTENT_EDITOR, `insert into public.cms_published (kind, entity_id, lesson_id, data, version, learner_visible) values ('video', $1, $2, '{}', 1, true)`, [v.id, L]), /permission denied/);
    await denied(as(U.CONTENT_EDITOR, `delete from public.videos where id = $1`, [v.id]), /permission denied/);
    // mass assignment: spoofed created_by on insert is overwritten
    const w = await as(U.CONTENT_EDITOR, `insert into public.videos (lesson_id, title, url, created_by, updated_by, state) values ($1, 'x', 'https://example.com/v', $2, $2, 'PUBLISHED') returning created_by, state`, [L, U.SUPER_ADMIN]);
    assert.deepStrictEqual(w[0], { created_by: U.CONTENT_EDITOR, state: 'DRAFT' });
  });

  await test('GAME_EDITOR: games and assignments yes; curriculum content and publishing no', async () => {
    await denied(newVideo(U.GAME_EDITOR));
    const v = await newVideo(U.CONTENT_EDITOR);
    await denied(as(U.GAME_EDITOR, `select public.cms_transition('video', $1, 'publish')`, [v.id]));
    const g = await as(U.GAME_EDITOR, `insert into public.games (game_id, name, created_by, updated_by) values ('demo-game', 'Demo', $1, $1) returning *`, [U.SUPER_ADMIN]);
    assert.strictEqual(g[0].created_by, U.GAME_EDITOR, 'created_by not spoofable');
    await denied(as(U.GAME_EDITOR, `update public.games set game_id = 'renamed' where game_id = 'demo-game'`), /cannot change/);
    await denied(as(U.GAME_EDITOR, `update public.games set game_content_contract_version = '2.0' where game_id = 'demo-game'`), /check constraint/);
    await denied(as(U.GAME_EDITOR, `update public.games set launch_path = 'javascript:alert(1)' where game_id = 'demo-game'`), /check constraint/);
    await as(U.GAME_EDITOR, `insert into public.lesson_game_assignments (lesson_id, game_id, visible) values ($1, 'demo-game', true)`, [L]);
    await denied(as(U.GAME_EDITOR, `insert into public.lesson_game_assignments (lesson_id, game_id, optional) values ('math-x', 'demo-game', false)`), /check constraint/);
    await denied(as(U.GAME_EDITOR, `delete from public.lesson_game_assignments`), /permission denied/);
    await denied(as(U.GAME_EDITOR, `select public.set_user_role($1, 'GAME_EDITOR')`, [U.STUDENT]));
  });

  await test('REVIEWER cannot grant ADMIN or any role; ADMIN cannot grant SUPER_ADMIN/ADMIN; SUPER_ADMIN can', async () => {
    await denied(as(U.REVIEWER, `select public.set_user_role($1, 'ADMIN')`, [U.STUDENT]));
    await denied(as(U.REVIEWER, `select public.set_user_role($1, 'CONTENT_EDITOR')`, [U.STUDENT]));
    await denied(as(U.ADMIN, `select public.set_user_role($1, 'SUPER_ADMIN')`, [U.STUDENT]), /only SUPER_ADMIN/);
    await denied(as(U.ADMIN, `select public.set_user_role($1, 'ADMIN')`, [U.STUDENT]), /only SUPER_ADMIN/);
    await denied(as(U.ADMIN, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN]), /only SUPER_ADMIN/);
    await denied(as(U.ADMIN, `select public.set_user_status($1, 'SUSPENDED')`, [U.SUPER_ADMIN]), /only SUPER_ADMIN/);
    await as(U.ADMIN, `select public.set_user_role($1, 'CONTENT_EDITOR')`, [U.SUPER_ADMIN_2]);
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'SUPER_ADMIN')`, [U.SUPER_ADMIN_2]);
    assert.strictEqual((await db.query(`select role from public.profiles where id = $1`, [U.SUPER_ADMIN_2])).rows[0].role, 'SUPER_ADMIN');
    const a = (await db.query(`select actor_id, actor_role, action from public.audit_logs where action = 'ROLE_CHANGED' order by id`)).rows;
    assert.deepStrictEqual(a.map((x) => [x.actor_id, x.actor_role]), [[U.ADMIN, 'ADMIN'], [U.SUPER_ADMIN, 'SUPER_ADMIN']]);
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN_2]);
  });

  await test('last SUPER_ADMIN is protected (role and status)', async () => {
    assert.strictEqual(Number((await db.query(`select count(*) from public.profiles where role = 'SUPER_ADMIN'`)).rows[0].count), 1);
    await denied(as(U.SUPER_ADMIN, `select public.set_user_role($1, 'ADMIN')`, [U.SUPER_ADMIN]));
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'SUPER_ADMIN')`, [U.SUPER_ADMIN_2]);
    // two supers: one may demote the other, but then the remaining one is protected again
    await as(U.SUPER_ADMIN_2, `select public.set_user_status($1, 'SUSPENDED')`, [U.SUPER_ADMIN]);
    await denied(as(U.SUPER_ADMIN, `select public.set_user_status($1, 'SUSPENDED')`, [U.SUPER_ADMIN_2]), /permission denied/); // suspended has no rights
    await db.query(`update public.profiles set status = 'ACTIVE' where id = $1`, [U.SUPER_ADMIN]);
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN_2]);
    await denied(as(U.SUPER_ADMIN_2, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN]), /permission denied/);
  });

  await test('concurrent admin changes re-check a suspended/demoted caller after the lock', async () => {
    const originalProfiles = (await db.query(`select id, role, status from public.profiles where id = any($1::uuid[])`, [[U.SUPER_ADMIN, U.SUPER_ADMIN_2]])).rows;
    const observer = new pg.Client({ host: conn.clientHost, port: PORT, user: 'postgres', database: 'postgres' });
    const queued = new pg.Client({ host: conn.clientHost, port: PORT, user: 'postgres', database: 'postgres', application_name: 'v2u-hardening-race' });
    try {
      await observer.connect();
      await queued.connect();
      const queuedPid = (await queued.query('select pg_backend_pid() pid')).rows[0].pid;
      for (const [first, second] of [['status', 'role'], ['role', 'status']]) {
        await db.query(`update public.profiles set role = 'SUPER_ADMIN', status = 'ACTIVE' where id = any($1::uuid[])`, [[U.SUPER_ADMIN, U.SUPER_ADMIN_2]]);
        await db.query('begin');
        await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.SUPER_ADMIN_2, role: 'authenticated' })]);
        await db.query('set local role authenticated');
        await db.query(`select public.set_user_${first}($1, $2)`, [U.SUPER_ADMIN, first === 'status' ? 'SUSPENDED' : 'STUDENT']);
        await queued.query('begin');
        await queued.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: U.SUPER_ADMIN, role: 'authenticated' })]);
        await queued.query('set local role authenticated');
        const pending = queued.query(`select public.set_user_${second}($1, $2)`, [U.SUPER_ADMIN_2, second === 'status' ? 'SUSPENDED' : 'STUDENT']).then(() => null, (e) => e);
        // Prove the second RPC is waiting before releasing the first transaction.
        let waiting = false;
        for (let i = 0; i < 200; i++) {
          // Observe as postgres, outside either caller transaction; authenticated cannot see other sessions' wait details.
          waiting = (await observer.query(`select exists(select 1 from pg_stat_activity where pid = $1 and wait_event_type = 'Lock') ok`, [queuedPid])).rows[0].ok;
          if (waiting) break;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        await db.query('commit');
        const err = await pending;
        await queued.query('rollback');
        assert(waiting, 'second RPC must actually contend on the admin lock');
        assert.strictEqual(err?.code, '42501', 'revoked caller must fail closed after waiting');
        assert.strictEqual(Number((await db.query(`select count(*) from public.profiles where role = 'SUPER_ADMIN' and status = 'ACTIVE'`)).rows[0].count), 1);
      }
    } finally {
      await db.query('rollback');
      await queued.end();
      await observer.end();
      for (const profile of originalProfiles) {
        await db.query(`update public.profiles set role = $2, status = $3 where id = $1`, [profile.id, profile.role, profile.status]);
      }
    }
  });

  await test('a suspended SUPER_ADMIN is not an active backup; it can be demoted safely', async () => {
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'SUPER_ADMIN')`, [U.SUPER_ADMIN_2]);
    await as(U.SUPER_ADMIN, `select public.set_user_status($1, 'SUSPENDED')`, [U.SUPER_ADMIN_2]);
    for (const caller of [U.SUPER_ADMIN, U.SUPER_ADMIN_2, U.ADMIN]) {
      await assert.rejects(as(caller, `select public.set_user_role($1,'STUDENT')`, [U.SUPER_ADMIN]), (e) => e.code === '42501');
      for (const status of ['SUSPENDED', 'DISABLED']) await assert.rejects(as(caller, `select public.set_user_status($1,$2)`, [U.SUPER_ADMIN, status]), (e) => e.code === '42501');
      assert.strictEqual(await superCount(), 1, 'a suspended backup cannot justify removing the active owner');
    }
    await denied(as(U.SUPER_ADMIN_2, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN]), /permission denied/);
    await as(U.SUPER_ADMIN, `select public.set_user_role($1, 'STUDENT')`, [U.SUPER_ADMIN_2]);
    assert.strictEqual(Number((await db.query(`select count(*) from public.profiles where role = 'SUPER_ADMIN' and status = 'ACTIVE'`)).rows[0].count), 1);
    await as(U.SUPER_ADMIN, `select public.set_user_status($1, 'ACTIVE')`, [U.SUPER_ADMIN_2]);
  });

  await test('suspended/disabled accounts keep their session but lose every staff right', async () => {
    await denied(as(U.SUSPENDED_ADMIN, `select public.set_user_role($1, 'REVIEWER')`, [U.STUDENT]));
    await denied(newVideo(U.SUSPENDED_ADMIN));
    assert.deepStrictEqual(await as(U.SUSPENDED_ADMIN, `select * from public.videos`), []);
    assert.deepStrictEqual(await as(U.SUSPENDED_ADMIN, `select * from public.audit_logs`), []);
    assert.strictEqual((await as(U.SUSPENDED_ADMIN, `select public.v2u_can('admin.access') ok`))[0].ok, false);
    await as(U.SUPER_ADMIN, `select public.set_user_status($1, 'DISABLED')`, [U.CONTENT_EDITOR]);
    await denied(newVideo(U.CONTENT_EDITOR));
    await as(U.SUPER_ADMIN, `select public.set_user_status($1, 'ACTIVE')`, [U.CONTENT_EDITOR]);
  });

  await test('workflow: controlled content cannot be self-approved and needs APPROVED before publish; reviewer recorded', async () => {
    const o = (await as(U.ADMIN, `insert into public.content_overrides (lesson_id, field, value, reason) values ($1, 'whyItMatters', '"ข้อความ"', 'ชัดขึ้น') returning id`, [L]))[0];
    await denied(as(U.REVIEWER, `select public.cms_transition('contentOverride', $1, 'publish')`, [o.id]), /approved before publishing/);
    await as(U.ADMIN, `select public.cms_transition('contentOverride', $1, 'submit')`, [o.id]);
    await denied(as(U.ADMIN, `select public.cms_transition('contentOverride', $1, 'approve')`, [o.id]), /someone else/);
    await denied(as(U.CONTENT_EDITOR, `select public.cms_transition('contentOverride', $1, 'approve')`, [o.id]));
    await as(U.REVIEWER, `select public.cms_transition('contentOverride', $1, 'approve', 'ok')`, [o.id]);
    const row = (await db.query(`select approved_by, reviewed_by, approved_at from public.content_overrides where id = $1`, [o.id])).rows[0];
    assert.strictEqual(row.approved_by, U.REVIEWER);
    assert(row.approved_at);
    await as(U.REVIEWER, `select public.cms_transition('contentOverride', $1, 'publish')`, [o.id]);
    assert.strictEqual((await as(null, `select * from public.cms_published where entity_id = $1`, [o.id])).length, 1, 'published override readable by guests');
    await denied(as(U.ADMIN, `insert into public.content_overrides (lesson_id, field, value, reason) values ($1, 'skills', '"x"', 'x')`, [L]), /check constraint/);
  });

  await test('review edits and withdrawing an older snapshot cannot approve unreviewed text', async () => {
    const o = (await as(U.CONTENT_EDITOR, `insert into public.content_overrides (lesson_id, field, value, reason) values ($1, 'analogy', '"original"', 'security regression') returning id`, [L]))[0];
    const transition = (who, action) => as(who, `select public.cms_transition('contentOverride', $1, $2) state`, [o.id, action]);
    await transition(U.CONTENT_EDITOR, 'submit');
    await as(U.CONTENT_EDITOR, `update public.content_overrides set value = '"review edit"' where id = $1`, [o.id]);
    assert.strictEqual((await db.query(`select state from public.content_overrides where id = $1`, [o.id])).rows[0].state, 'DRAFT');
    await denied(transition(U.REVIEWER, 'approve'), /only items in review/);
    await transition(U.CONTENT_EDITOR, 'submit');
    await transition(U.REVIEWER, 'approve');
    await transition(U.REVIEWER, 'publish');
    await as(U.CONTENT_EDITOR, `update public.content_overrides set value = '"unreviewed live edit"' where id = $1`, [o.id]);
    assert.strictEqual((await as(null, `select data->>'value' value from public.cms_published where entity_id = $1`, [o.id]))[0].value, 'review edit', 'live snapshot stays unchanged');
    assert.strictEqual((await transition(U.REVIEWER, 'unpublish'))[0].state, 'DRAFT');
    await denied(transition(U.REVIEWER, 'publish'), /approved before publishing/);
    assert.deepStrictEqual(await as(null, `select * from public.cms_published where entity_id = $1`, [o.id]), []);
    await transition(U.CONTENT_EDITOR, 'submit');
    await transition(U.REVIEWER, 'approve');
    await transition(U.REVIEWER, 'publish');
    assert.strictEqual((await transition(U.REVIEWER, 'unpublish'))[0].state, 'APPROVED', 'unchanged published content keeps approval');
  });

  await test('audit_logs and cms_versions reject all direct client mutations with 42501', async () => {
    for (const uid of [null, ...Object.values(U)]) {
      for (const table of ['audit_logs', 'cms_versions']) {
        // Identity columns reject non-DEFAULT updates before privilege checks.
        // Use a writable column so the assertion exercises client authorization.
        const column = table === 'audit_logs' ? 'entity_id' : 'data';
        for (const sql of [`insert into public.${table} default values`, `update public.${table} set ${column} = ${column}`, `delete from public.${table}`]) {
          await assert.rejects(as(uid, sql), (err) => err.code === '42501', `${uid ?? 'anon'}: ${sql}`);
        }
      }
    }
  });

  await test('unpublished / unverified / hidden content is not learner-readable; versions recover history', async () => {
    const v = await newVideo(U.CONTENT_EDITOR, { title: 'วิดีโอเผยแพร่' });
    await denied(as(null, `select * from public.videos where id = $1`, [v.id]), /permission denied/); // guests: no privilege at all
    assert.deepStrictEqual(await as(U.STUDENT, `select * from public.videos where id = $1`, [v.id]), [], 'drafts never readable');
    await as(U.REVIEWER, `select public.cms_transition('video', $1, 'publish')`, [v.id]);
    assert.deepStrictEqual(await as(null, `select * from public.cms_published where entity_id = $1`, [v.id]), [], 'published but unverified');
    await as(U.REVIEWER, `select public.cms_verify_source('video', $1)`, [v.id]);
    await as(U.REVIEWER, `select public.cms_transition('video', $1, 'publish')`, [v.id]);
    const seen = await as(null, `select * from public.cms_published where entity_id = $1`, [v.id]);
    assert.strictEqual(seen.length, 1);
    assert.strictEqual(seen[0].data.verified_by, U.REVIEWER);
    assert(!('created_by' in seen[0].data) && !('review_note' in seen[0].data), 'snapshot has no workflow internals');
    await as(U.CONTENT_EDITOR, `update public.videos set visible = false where id = $1`, [v.id]);
    assert.strictEqual((await db.query(`select state from public.videos where id = $1`, [v.id])).rows[0].state, 'DRAFT', 'edit of published → draft');
    await as(U.REVIEWER, `select public.cms_transition('video', $1, 'publish')`, [v.id]);
    assert.deepStrictEqual(await as(null, `select * from public.cms_published where entity_id = $1`, [v.id]), [], 'hidden not readable');
    assert.strictEqual((await as(U.CONTENT_EDITOR, `select version from public.cms_versions where entity_id = $1 order by version`, [v.id])).length, 2);
    assert.deepStrictEqual(await as(U.STUDENT, `select * from public.cms_versions`), []);
    // changing the URL of a verified video requires re-verification
    await as(U.REVIEWER, `select public.cms_verify_source('video', $1)`, [v.id]);
    await as(U.CONTENT_EDITOR, `update public.videos set url = 'https://www.youtube.com/watch?v=zzzzzzzzzzz' where id = $1`, [v.id]);
    assert.strictEqual((await db.query(`select verification_status from public.videos where id = $1`, [v.id])).rows[0].verification_status, 'VERIFICATION_PENDING');
    await denied(as(U.STUDENT, `update public.cms_published set learner_visible = true`), /permission denied/);
  });

  await test('disabled / unpublished games and hidden assignments are not readable by learners', async () => {
    await as(U.GAME_EDITOR, `update public.games set status = 'AVAILABLE', enabled = true, published = false where game_id = 'demo-game'`);
    assert.deepStrictEqual(await as(null, `select * from public.games`), []);
    for (const uid of [null, U.STUDENT, U.SUSPENDED_ADMIN]) assert.deepStrictEqual(await as(uid, `select * from public.lesson_game_assignments`), [], 'unpublished game assignments are private');
    assert.strictEqual((await as(U.GAME_EDITOR, `select * from public.lesson_game_assignments where game_id = 'demo-game'`)).length, 1, 'staff retains access');
    await as(U.GAME_EDITOR, `update public.games set published = true, enabled = false, status = 'DISABLED' where game_id = 'demo-game'`);
    const g = (await as(null, `select status, enabled from public.games`))[0];
    assert.deepStrictEqual(g, { status: 'DISABLED', enabled: false }, 'learner sees it disabled; resolver refuses to launch');
    await as(U.GAME_EDITOR, `update public.lesson_game_assignments set visible = false where game_id = 'demo-game'`);
    assert.deepStrictEqual(await as(null, `select * from public.lesson_game_assignments`), []);
    await denied(as(null, `update public.games set enabled = true`), /permission denied/);
  });

  await test('audit log: database-written, actor recorded, append-only for everyone, secrets redacted', async () => {
    const a = (await db.query(`select action from public.audit_logs`)).rows.map((x) => x.action);
    for (const x of ['VIDEO_CREATED', 'VIDEO_HIDDEN', 'VIDEO_VERIFIED', 'CONTENT_PUBLISHED', 'CONTENT_APPROVED', 'GAME_REGISTERED', 'GAME_ATTACHED', 'GAME_DISABLED', 'ROLE_CHANGED', 'STATUS_CHANGED']) assert(a.includes(x), x);
    assert(Number((await db.query(`select count(*) from public.audit_logs where actor_id is null`)).rows[0].count) === 0);
    await denied(as(U.SUPER_ADMIN, `delete from public.audit_logs`), /permission denied/);
    await denied(as(U.SUPER_ADMIN, `update public.audit_logs set action = 'SETTINGS_UPDATED'`), /permission denied/);
    await denied(as(U.SUPER_ADMIN, `insert into public.audit_logs (action, entity_type, entity_id) values ('ROLE_CHANGED', 'user', 'x')`), /permission denied/);
    await denied(db.query(`delete from public.audit_logs`), /append-only/);
    assert((await as(U.ADMIN, `select * from public.audit_logs`)).length > 0);
    assert.deepStrictEqual(await as(U.REVIEWER, `select * from public.audit_logs`), []);
    await as(U.CONTENT_EDITOR, `insert into public.videos (lesson_id, title, url, notes) values ($1, 'x', 'https://example.com/v', 'token ya29.abcdefSECRET')`, [L]);
    assert(!(await db.query(`select after_summary from public.audit_logs order by id desc limit 1`)).rows[0].after_summary.includes('SECRET'));
  });

  await test('unsafe RPC arguments are rejected (unknown kind, unknown transition, missing row)', async () => {
    await denied(as(U.SUPER_ADMIN, `select public.cms_transition('profiles', gen_random_uuid(), 'publish')`), /unknown content kind/);
    await denied(as(U.SUPER_ADMIN, `select public.cms_transition('video', gen_random_uuid(), 'drop table')`), /permission denied: invalid/);
    await denied(as(U.SUPER_ADMIN, `select public.cms_transition('video', gen_random_uuid(), 'publish')`), /not found/);
    await denied(as(U.SUPER_ADMIN, `select public.cms_verify_source('contentOverride', gen_random_uuid())`), /only videos/);
  });

  // ── End-to-end: the app's Supabase repository (supabase-js) → real PostgREST → this database ──
  const PGRST = [process.env.POSTGREST_BIN, '/usr/local/bin/postgrest', '/usr/bin/postgrest', path.join(os.tmpdir(), exeName('postgrest'))].find((f) => f && fs.existsSync(f));
  if (!PGRST) {
    skippedSections.push('client end-to-end (PostgREST binary not found; set POSTGREST_BIN)');
    console.log('\n  (client end-to-end SKIPPED: PostgREST binary not found — set POSTGREST_BIN)');
  } else {
    console.log(`PostgREST: ${execFileSync(PGRST, ['--version'], { encoding: 'utf-8', windowsHide: true }).trim()}`);
    const http = await import('node:http');
    const crypto = await import('node:crypto');
    const { createClient } = await import('@supabase/supabase-js');
    const { createJiti } = await import('jiti');
    const jiti = createJiti(import.meta.url);
    const { supabaseBackendFromClient } = await jiti.import(path.join(root, 'src/backend/supabase.ts'));
    const SECRET = crypto.randomBytes(32).toString('hex');
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const jwt = (claims) => { const h = b64({ alg: 'HS256', typ: 'JWT' }); const b = b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 }); return `${h}.${b}.${crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url')}`; };
    await db.query(`create role authenticator login noinherit; grant anon, authenticated to authenticator;`);
    const conf = path.join(dir, 'pgrst.conf');
    fs.writeFileSync(conf, `db-uri = "${conn.dbUri('authenticator')}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${SECRET}"\nserver-port = ${PORT + 1}\nserver-host = "127.0.0.1"\nlog-level = "crit"\n`);
    const { spawn } = await import('node:child_process');
    const proc = spawn(PGRST, [conf], { stdio: 'ignore' });
    // Supabase serves PostgREST under /rest/v1 — a tiny local proxy gives supabase-js the same layout
    const proxy = http.createServer((req, res) => {
      const up = http.request({ host: '127.0.0.1', port: PORT + 1, method: req.method, path: req.url.replace(/^\/rest\/v1/, ''), headers: { ...req.headers, host: `127.0.0.1:${PORT + 1}` } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
      up.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(up);
    });
    await new Promise((r) => proxy.listen(PORT + 2, '127.0.0.1', r));
    try {
      for (let i = 0; i < 100; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT + 1}/`); if (r.status < 500) break; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 100)); }
      const base = `http://127.0.0.1:${PORT + 2}`;
      const anonKey = jwt({ role: 'anon' });
      const backendFor = (uid) => supabaseBackendFromClient(createClient(base, anonKey, { accessToken: async () => (uid ? jwt({ sub: uid, role: 'authenticated' }) : anonKey) }));
      const by = (r) => ({ uid: U[r], role: r, status: 'ACTIVE' });
      const B = Object.fromEntries([...ROLES, null].map((r) => [r ?? 'GUEST', backendFor(r ? U[r] : null)]));
      await test('REST: spoofed JWT metadata and direct self-role updates fail closed', async () => {
        const raw = createClient(base, anonKey, { accessToken: async () => jwt({ sub: U.STUDENT, role: 'authenticated', user_role: 'SUPER_ADMIN', app_metadata: { role: 'SUPER_ADMIN' }, user_metadata: { role: 'SUPER_ADMIN' } }) });
        const role = await raw.rpc('v2u_current_role');
        assert.ifError(role.error);
        assert.strictEqual(role.data, 'STUDENT');
        const access = await raw.rpc('v2u_can', { perm: 'admin.access' });
        assert.ifError(access.error);
        assert.strictEqual(access.data, false);
        for (const patch of [{ role: 'SUPER_ADMIN' }, { role: 'ADMIN', status: 'ACTIVE' }]) {
          const result = await raw.from('profiles').update(patch).eq('id', U.STUDENT).select();
          assert.strictEqual(result.error?.code, '42501', 'self role PATCH must be rejected by the database');
        }
        const grant = await raw.rpc('set_user_role', { target_user_id: U.SUPER_ADMIN_2, new_role: 'SUPER_ADMIN' });
        assert.strictEqual(grant.error?.code, '42501');
        const draft = await raw.from('videos').insert({ lesson_id: L, title: 'spoof', url: 'https://example.com/v' });
        assert.strictEqual(draft.error?.code, '42501');
        assert.strictEqual((await db.query('select role from public.profiles where id=$1', [U.STUDENT])).rows[0].role, 'STUDENT');
      });
      const throws = async (p, re) => { let err; try { await p; } catch (e) { err = e; } assert(err, 'expected refusal'); if (re) assert.match(err.message, re); };
      const vdata = (o = {}) => ({ lessonId: L, title: 'E2E clip', provider: 'youtube', url: 'https://www.youtube.com/watch?v=e2eE2Ee2e2E', videoId: 'e2eE2Ee2e2E', channel: 'ch', durationSec: 300, purpose: 'REVIEW', verification: 'DISCOVERED', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 3, notes: 'n', ...o });
      console.log('\n=== Client end-to-end (supabase-js → PostgREST → PostgreSQL) ===\n');

      await test('e2e: content flow through the real client — draft, verify, publish, learner snapshot mapping', async () => {
        const d = await B.CONTENT_EDITOR.insertDraft(by('CONTENT_EDITOR'), 'video', vdata());
        assert.strictEqual(d.state, 'DRAFT');
        assert.strictEqual(d.createdBy, U.CONTENT_EDITOR);
        assert.deepStrictEqual({ ...d.data }, vdata(), 'row ⇄ VideoData round-trip');
        await throws(B.CONTENT_EDITOR.insertDraft(by('CONTENT_EDITOR'), 'video', vdata({ verification: 'VERIFIED' })), /VERIFIED/);
        await throws(B.CONTENT_EDITOR.verifySource(by('CONTENT_EDITOR'), 'video', d.id), /permission denied/);
        await throws(B.CONTENT_EDITOR.transition(by('CONTENT_EDITOR'), 'video', d.id, 'publish', null), /permission denied/);
        await B.REVIEWER.verifySource(by('REVIEWER'), 'video', d.id);
        assert.strictEqual(await B.REVIEWER.transition(by('REVIEWER'), 'video', d.id, 'publish', null), 'PUBLISHED');
        const seen = (await B.GUEST.listPublished({ learnerOnly: true })).find((p) => p.id === d.id);
        assert(seen, 'guest sees verified published video');
        assert.strictEqual(seen.data.title, 'E2E clip');
        assert.strictEqual(seen.data.verifiedBy, U.REVIEWER);
        assert.strictEqual(seen.data.visibility, 'VISIBLE');
        const upd = await B.CONTENT_EDITOR.updateDraft(by('CONTENT_EDITOR'), 'video', d.id, { ...seen.data, visibility: 'HIDDEN' });
        assert.strictEqual(upd.state, 'DRAFT');
        await B.REVIEWER.transition(by('REVIEWER'), 'video', d.id, 'publish', null);
        assert(!(await B.GUEST.listPublished({ learnerOnly: true })).some((p) => p.id === d.id), 'hidden → not learner-visible');
        assert.strictEqual((await B.REVIEWER.listVersions('video', d.id)).length, 1);
        await throws(B.GUEST.listDrafts(), /permission denied/);
        assert.deepStrictEqual(await B.STUDENT.listDrafts(), []);
      });

      await test('e2e: controlled override — mapping, no self-approval, reviewer publishes', async () => {
        const o = await B.ADMIN.insertDraft(by('ADMIN'), 'contentOverride', { lessonId: L, field: 'summary', value: ['ข้อ 1', 'ข้อ 2'], reason: 'ปรับ' });
        assert.deepStrictEqual(o.data.value, ['ข้อ 1', 'ข้อ 2']);
        await B.ADMIN.transition(by('ADMIN'), 'contentOverride', o.id, 'submit', null);
        await throws(B.ADMIN.transition(by('ADMIN'), 'contentOverride', o.id, 'approve', null), /someone else/);
        await B.REVIEWER.transition(by('REVIEWER'), 'contentOverride', o.id, 'approve', 'ok');
        assert.strictEqual((await B.ADMIN.listDrafts()).find((x) => x.id === o.id).approvedBy, U.REVIEWER);
        await B.REVIEWER.transition(by('REVIEWER'), 'contentOverride', o.id, 'publish', null);
        assert((await B.GUEST.listPublished({ learnerOnly: true })).some((p) => p.id === o.id && p.kind === 'contentOverride'));
      });

      await test('e2e: games and assignments — register, disable, upsert by (lesson, game), learner visibility', async () => {
        const g = { gameId: 'e2e-game', name: 'E2E', description: '', subjects: ['programming'], skillIds: [], gameVersion: '0.1.0', contentContract: '1.1', evidenceContract: '1.1', launchType: 'none', launchUrl: '', thumbnail: '', status: 'PREPARING', enabled: true, published: true, createdAt: '', updatedAt: '', updatedBy: '' };
        await throws(B.CONTENT_EDITOR.insertGame(by('CONTENT_EDITOR'), g), /row-level security/);
        const ins = await B.GAME_EDITOR.insertGame(by('GAME_EDITOR'), g);
        assert.deepStrictEqual([ins.gameId, ins.subjects, ins.updatedBy], ['e2e-game', ['programming'], U.GAME_EDITOR]);
        const off = await B.GAME_EDITOR.updateGame(by('GAME_EDITOR'), { ...ins, enabled: false, status: 'DISABLED' });
        assert.deepStrictEqual([off.enabled, off.status], [false, 'DISABLED']);
        const a1 = await B.GAME_EDITOR.upsertAssignment(by('GAME_EDITOR'), { id: '', lessonId: L, gameId: 'e2e-game', position: 'after-guided-practice', attached: true, visible: true, required: false, displayTitle: 'เกม', description: '', order: 0, createdAt: '', updatedAt: '', updatedBy: '' });
        const a2 = await B.GAME_EDITOR.upsertAssignment(by('GAME_EDITOR'), { ...a1, attached: false, visible: false });
        assert.strictEqual(a2.id, a1.id, 'same row updated, not duplicated');
        assert(!(await B.GUEST.listAssignments({ learnerOnly: true })).some((a) => a.gameId === 'e2e-game'));
        const lg = (await B.GUEST.listGames({ learnerOnly: true })).find((x) => x.gameId === 'e2e-game');
        assert.deepStrictEqual([lg.enabled, lg.status], [false, 'DISABLED'], 'learners see it disabled → resolver never launches');
        await B.GAME_EDITOR.upsertAssignment(by('GAME_EDITOR'), { ...a2, attached: true, visible: true });
        assert((await B.GAME_EDITOR.listAssignments({ learnerOnly: true })).some((a) => a.gameId === 'e2e-game'));
        await B.GAME_EDITOR.updateGame(by('GAME_EDITOR'), { ...off, published: false });
        assert((await B.GAME_EDITOR.listAssignments()).some((a) => a.gameId === 'e2e-game'), 'staff keeps the working assignment');
        for (const caller of [B.GAME_EDITOR, B.GUEST]) {
          assert(!(await caller.listAssignments({ learnerOnly: true })).some((a) => a.gameId === 'e2e-game'), 'learner view hides unpublished games for staff too');
        }
      });

      await test('e2e: users — RPC role/status rules, own profile only, audit readable by ADMIN only', async () => {
        const me = await B.STUDENT.touchOwnProfile({ uid: U.STUDENT, displayName: 'x', email: '', photoURL: null });
        assert.deepStrictEqual([me.role, me.status], ['STUDENT', 'ACTIVE']);
        assert.deepStrictEqual((await B.STUDENT.listUsers()).map((u) => u.uid), [U.STUDENT]);
        await throws(B.ADMIN.setUserRole(by('ADMIN'), U.STUDENT, 'SUPER_ADMIN'), /only SUPER_ADMIN/);
        await throws(B.REVIEWER.setUserRole(by('REVIEWER'), U.STUDENT, 'ADMIN'), /permission denied/);
        await throws(B.STUDENT.setUserRole(by('STUDENT'), U.STUDENT, 'SUPER_ADMIN'), /permission denied/);
        await B.ADMIN.setUserRole(by('ADMIN'), U.STUDENT, 'CONTENT_EDITOR');
        await B.SUPER_ADMIN.setUserRole(by('SUPER_ADMIN'), U.STUDENT, 'STUDENT');
        await throws(B.SUPER_ADMIN.setUserStatus(by('SUPER_ADMIN'), U.SUPER_ADMIN, 'DISABLED'), /own status/);
        const audit = await B.ADMIN.listAudit(500);
        for (const a of ['VIDEO_VERIFIED', 'CONTENT_PUBLISHED', 'GAME_REGISTERED', 'GAME_DISABLED', 'GAME_DETACHED', 'ROLE_CHANGED']) assert(audit.some((e) => e.action === a), a);
        assert(audit.every((e) => e.actorUid && e.at));
        assert.deepStrictEqual(await B.REVIEWER.listAudit(), []);
        // the RPC-internal flag cannot be set by API clients (pg_catalog is not exposed), nor can internal helpers be called
        const raw = createClient(base, anonKey, { accessToken: async () => jwt({ sub: U.SUPER_ADMIN, role: 'authenticated' }) });
        for (const [fn, args] of [['set_config', { setting_name: 'v2u.in_rpc', new_value: 'on', is_local: true }], ['v2u_audit', { a: 'ROLE_CHANGED', etype: 'user', eid: 'x', b: 'a', af: 'b' }], ['v2u_require', { perm: 'x' }]]) {
          const r = await raw.rpc(fn, args);
          assert(r.error, `${fn} must not be callable`);
        }
      });
    } finally {
      proxy.close();
      proc.kill('SIGKILL');
    }
  }
} finally {
  await db.end().catch(() => {});
  stop();
}
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
const result = rlsRunResult({ failed, skippedSections });
console.log(`RLS RESULT: ${result.status}${skippedSections.length ? `; skipped: ${skippedSections.join('; ')}; not a complete pass` : ''}`);
if (result.status === 'BLOCKED') console.log('V2U_RLS_E2E_REQUIRED requires the skipped client end-to-end section.');
process.exitCode = result.exitCode;
