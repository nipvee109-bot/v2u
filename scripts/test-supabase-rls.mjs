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
  const ROLES = ['STUDENT', 'CONTENT_EDITOR', 'GAME_EDITOR', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'];
  const U = {};
  for (const r of [...ROLES, 'SUPER_ADMIN_2', 'SUSPENDED_ADMIN']) {
    const { rows } = await db.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [`${r.toLowerCase()}@example.invalid`, { full_name: r, role: 'SUPER_ADMIN', avatar_url: 'javascript:alert(1)' }]);
    U[r] = rows[0].id;
  }
  // bootstrap (owner in SQL editor): the only way to set roles without the RPC
  for (const r of ROLES) await db.query(`update public.profiles set role = $2 where id = $1`, [U[r], r]);
  await db.query(`update public.profiles set role = 'ADMIN', status = 'SUSPENDED' where id = $1`, [U.SUSPENDED_ADMIN]);
  const L = 'prog-ctrl-loops';
  const newVideo = (uid, extra = {}) => as(uid, `insert into public.videos (lesson_id, title, url, video_id, channel) values ($1, $2, $3, $4, 'ch') returning *`, [L, extra.title ?? 'คลิป', extra.url ?? 'https://www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk']).then((r) => r[0]);

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
    assert.strictEqual((await as(U.GAME_EDITOR, `select * from public.lesson_game_assignments`)).length, 1, 'staff retains access');
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
