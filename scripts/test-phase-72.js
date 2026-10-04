/**
 * Test Suite: Phase 72 — Accounts, admin CMS & RBAC
 * - permission matrix, role escalation, workflow, learner visibility, disabled games
 * - no secrets / owner email, dev fixture never in production, non-destructive migration
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createJiti } from 'jiti';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
const jiti = createJiti(import.meta.url);
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };

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


console.log('=== Phase 72: Accounts, admin CMS & RBAC ===\n');
const P = await jiti.import(path.join(root, 'src/auth/permissions.ts'));
const W = await jiti.import(path.join(root, 'src/cms/workflow.ts'));
const R = await jiti.import(path.join(root, 'src/cms/resolver.ts'));
const O = await jiti.import(path.join(root, 'src/cms/overlay.ts'));
const { CmsService } = await jiti.import(path.join(root, 'src/cms/service.ts'));
const { createMemoryBackend } = await jiti.import(path.join(root, 'src/backend/memory.ts'));
const { readSupabaseEnv, isSecretKey } = await jiti.import(path.join(root, 'src/backend/supabaseEnv.ts'));
const MAP = await jiti.import(path.join(root, 'src/backend/supabaseMap.ts'));
const MIGRATION = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).map((f) => read(`supabase/migrations/${f}`)).join('\n');
const { planLearnerDataMigration } = await jiti.import(path.join(root, 'src/cms/migration.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const RE = await jiti.import(path.join(root, 'src/resources/engine.ts'));
const GB = await jiti.import(path.join(root, 'src/learning/gameBridge.ts'));

const AT = '2026-10-04T00:00:00.000Z';
const user = (role, uid = `u-${role}`, status = 'ACTIVE') => ({ uid, displayName: role, email: `${uid}@example.invalid`, photoURL: null, role, status, createdAt: AT, updatedAt: AT, lastLoginAt: AT, onboardingCompleted: true, learnerData: { location: 'local-device' }, schemaVersion: 1 });
const actor = (u) => ({ uid: u.uid, role: u.role, status: u.status });
const ctx = { lessonIds: new Set(C.lessons.map((l) => l.id)), notYet: new Map() };
const L = C.lessons[0].id;
const setup = () => {
  const users = P.ROLES.map((r) => user(r));
  const be = createMemoryBackend({ users });
  const svc = (role) => new CmsService(be, actor(users.find((u) => u.role === role)), ctx);
  return { be, users, svc };
};
const video = (over = {}) => ({ lessonId: L, title: 'คลิปทดสอบ', provider: 'youtube', url: 'https://www.youtube.com/watch?v=abcdefghijk', videoId: 'abcdefghijk', channel: 'ช่อง', durationSec: null, purpose: 'FIRST_LEARNING', verification: 'DISCOVERED', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 0, notes: '', ...over });
const rejects = async (p, re) => { let ok = false; try { await p; } catch (e) { ok = true; if (re) assert.match(e.message, re); } assert(ok, 'expected rejection'); };

await test('permission matrix: exactly the expected permissions per role', () => {
  const has = (r, p) => P.can({ uid: 'x', role: r, status: 'ACTIVE' }, p);
  assert.deepStrictEqual(P.ROLE_PERMISSIONS.STUDENT, []);
  for (const r of P.ROLES) assert.strictEqual(has(r, 'admin.access'), r !== 'STUDENT', r);
  assert(!has('CONTENT_EDITOR', 'users.manageRoles') && !has('CONTENT_EDITOR', 'content.publish') && !has('CONTENT_EDITOR', 'content.verifySource'));
  assert(!has('GAME_EDITOR', 'content.publish') && !has('GAME_EDITOR', 'content.draft') && has('GAME_EDITOR', 'game.assign'));
  assert(!has('REVIEWER', 'users.manageRoles') && !has('REVIEWER', 'users.manageAdmins') && has('REVIEWER', 'content.publish'));
  assert(has('ADMIN', 'users.manageRoles') && !has('ADMIN', 'users.manageAdmins'));
  assert(has('SUPER_ADMIN', 'users.manageAdmins'));
  for (const s of ['SUSPENDED', 'DISABLED']) assert(!P.can({ uid: 'x', role: 'SUPER_ADMIN', status: s }, 'admin.access'), s);
  assert(!P.can(null, 'admin.access'));
});

await test('STUDENT cannot open admin (route gate uses can(admin.access)) and has no CMS write', async () => {
  assert(!P.can(actor(user('STUDENT')), 'admin.access'));
  const app = read('src/admin/AdminApp.tsx');
  assert(/can\(a\.actor, 'admin\.access'\)/.test(app) && app.includes('ไม่มีสิทธิ์เข้าถึง'));
  const { svc } = setup();
  await rejects(svc('STUDENT').createDraft('video', video()), /ไม่มีสิทธิ์/);
});

await test('CONTENT_EDITOR cannot change roles, verify sources or publish', async () => {
  const { svc, users } = setup();
  const s = svc('CONTENT_EDITOR');
  await rejects(s.setRole(users[0], 'REVIEWER', 1));
  await rejects(s.createDraft('video', video({ verification: 'VERIFIED', verifiedBy: 'me', verifiedAt: AT })), /ผู้ตรวจทาน/);
  const d = await s.createDraft('video', video());
  await rejects(s.verifySource(d));
  await rejects(s.transition(d, 'publish', null, null));
});

await test('GAME_EDITOR cannot publish curriculum content, can manage and attach games', async () => {
  const { svc } = setup();
  const d = await svc('CONTENT_EDITOR').createDraft('video', video());
  await rejects(svc('GAME_EDITOR').transition(d, 'publish', null, null));
  await rejects(svc('GAME_EDITOR').createDraft('video', video()));
  const g = await svc('GAME_EDITOR').saveGame({ gameId: 'test-game', name: 'T', description: '', subjects: [], skillIds: [], gameVersion: '0.1', contentContract: '1.1', evidenceContract: '1.1', launchType: 'none', launchUrl: '', thumbnail: '', status: 'DRAFT', enabled: false, published: false, createdAt: '', updatedAt: '', updatedBy: '' }, null);
  const a = await svc('GAME_EDITOR').attachGame(L, g, { position: 'after-guided-practice', visible: true, displayTitle: '', description: '' }, []);
  assert.strictEqual(a.required, false);
  await rejects(svc('GAME_EDITOR').saveGame({ ...g, gameId: 'renamed' }, g), /แก้ไม่ได้/);
  await rejects(svc('GAME_EDITOR').saveGame({ ...g, launchUrl: 'javascript:alert(1)' }, g));
});

await test('REVIEWER cannot grant ADMIN; ADMIN cannot grant SUPER_ADMIN; only SUPER_ADMIN can', async () => {
  const { svc, users, be } = setup();
  const student = users.find((u) => u.role === 'STUDENT');
  await rejects(svc('REVIEWER').setRole(student, 'ADMIN', 1));
  await rejects(svc('ADMIN').setRole(student, 'SUPER_ADMIN', 1), /สูงสุด/);
  await rejects(svc('ADMIN').setRole(student, 'ADMIN', 1), /สูงสุด/);
  await rejects(svc('ADMIN').setRole(users.find((u) => u.role === 'SUPER_ADMIN'), 'STUDENT', 1));
  await svc('ADMIN').setRole(student, 'CONTENT_EDITOR', 1); // ordinary role: allowed
  await svc('SUPER_ADMIN').setRole({ ...student, role: 'CONTENT_EDITOR' }, 'ADMIN', 1);
  assert.strictEqual((await be.getProfile(student.uid)).role, 'ADMIN');
  assert(be._dump().audit.filter((e) => e.action === 'ROLE_CHANGED').length === 2);
});

await test('last SUPER_ADMIN is protected (no self-demotion, no last demotion/suspension)', async () => {
  const { svc, users } = setup();
  const sa = users.find((u) => u.role === 'SUPER_ADMIN');
  await rejects(svc('SUPER_ADMIN').setRole(sa, 'ADMIN', 1));
  await rejects(svc('SUPER_ADMIN').setStatus(sa, 'SUSPENDED', 1));
  assert(P.roleChangeDenied(actor(user('SUPER_ADMIN', 'other')), sa, 'ADMIN', 1));
  assert.strictEqual(P.roleChangeDenied(actor(user('SUPER_ADMIN', 'other')), sa, 'ADMIN', 2), null);
});

await test('role spoofing fails: a new identity is always STUDENT/ACTIVE; roles never come from the browser or OAuth metadata', async () => {
  const be = createMemoryBackend({ signInAs: { uid: 'n1', displayName: 'n', email: 'n@example.invalid', photoURL: null, role: 'SUPER_ADMIN' } });
  await be.signInWithGoogle();
  assert.strictEqual((await be.getProfile('n1')).role, 'STUDENT');
  const p2 = await be.touchOwnProfile({ uid: 'n1', displayName: 'n2', email: 'n@example.invalid', photoURL: null, role: 'ADMIN', status: 'ACTIVE' });
  assert.strictEqual(p2.role, 'STUDENT');
  await rejects(be.setUserRole({ uid: 'n1', role: 'SUPER_ADMIN', status: 'ACTIVE' }, 'n1', 'SUPER_ADMIN'), /permission denied|สิทธิ์/); // claimed actor ignored: stored profile decides
  const provider = read('src/auth/AuthProvider.tsx');
  assert(!/localStorage/.test(provider), 'AuthProvider must not read roles from storage');
  // database: profile created by trigger (role defaulted), metadata only fills display fields, role/status need the RPC
  assert(/create trigger on_auth_user_created after insert on auth\.users/.test(MIGRATION));
  assert(/insert into public\.profiles \(id, email, display_name, avatar_url\)/.test(MIGRATION), 'trigger never copies role from metadata');
  assert(/grant update \(display_name, avatar_url, last_login_at, onboarding_completed\) on public\.profiles to authenticated/.test(MIGRATION));
  // the Supabase client never writes role/status/state/verification columns
  const sup = read('src/backend/supabase.ts');
  assert(!/role:|status:|state:|verified_by|created_by/.test(sup.replace(/rpc\('set_user_(role|status)'[^)]*\)/g, '')), 'no privileged columns written directly');
  for (const k of ['state', 'verified_by', 'verified_at', 'created_by', 'updated_by', 'published_version', 'approved_by']) {
    assert(!(k in MAP.dataToRow('video', video())), k);
  }
});

await test('unauthorized direct writes are denied by the database (RLS everywhere, revoked defaults, append-only audit, no deletes)', () => {
  for (const t of ['profiles', 'videos', 'resources', 'content_overrides', 'cms_published', 'cms_versions', 'games', 'lesson_game_assignments', 'audit_logs']) assert(MIGRATION.includes(`alter table public.${t} enable row level security`), t);
  assert(MIGRATION.includes('revoke all on all tables in schema public from anon, authenticated'));
  assert(!/for delete/.test(MIGRATION), 'no delete policies');
  assert(/create trigger audit_logs_immutable before update or delete/.test(MIGRATION));
  assert(/create trigger cms_versions_immutable before update or delete/.test(MIGRATION));
  for (const m of MIGRATION.matchAll(/create function ([\w.]+)\([^)]*\)[^$]*?security definer([^$]*?)as \$/g)) assert(/set search_path = ''/.test(m[2]), `${m[1]} search_path`);
  // real-database suite exists and is wired
  assert(read('package.json').includes('"test:rls"') && fs.existsSync(path.join(root, 'scripts/test-supabase-rls.mjs')));
});

await test('workflow: controlled content needs approval by someone else; safe content can be published directly', async () => {
  const { svc } = setup();
  const o = await svc('ADMIN').createDraft('contentOverride', { lessonId: L, field: 'whyItMatters', value: 'ข้อความใหม่', reason: 'ชัดขึ้น' });
  await rejects(svc('REVIEWER').transition(o, 'publish', null, null), /อนุมัติ/);
  const sub = await svc('ADMIN').transition(o, 'submit', null, null);
  await rejects(svc('ADMIN').transition(sub, 'approve', null, null), /คนอื่น/);
  const ap = await svc('REVIEWER').transition(sub, 'approve', null, null);
  const pub = await svc('REVIEWER').transition(ap, 'publish', null, null);
  assert.strictEqual(pub.state, 'PUBLISHED');
  // field outside the allow-list is rejected
  await rejects(svc('ADMIN').createDraft('contentOverride', { lessonId: L, field: 'skills', value: 'x', reason: 'x' }), /ไม่ได้/);
  await rejects(svc('ADMIN').createDraft('video', video({ lessonId: 'not-a-lesson' })), /บทเรียน/);
});

await test('unpublished, hidden and unverified content is never shown to learners; versions kept', async () => {
  const { svc, be } = setup();
  const d = await svc('CONTENT_EDITOR').createDraft('video', video());
  assert.strictEqual(R.learnerResources(await be.listPublished({ learnerOnly: true })).length, 0, 'draft not shown');
  const p1 = await svc('REVIEWER').transition(d, 'publish', null, null); // published but unverified
  assert.strictEqual((await be.listPublished({ learnerOnly: true })).length, 0, 'unverified not shown');
  await svc('REVIEWER').verifySource(p1);
  const v = (await be.listDrafts()).find((x) => x.id === d.id);
  assert.strictEqual(v.data.verification, 'VERIFIED');
  const p2 = await svc('REVIEWER').transition(v, 'publish', null, (await be.listPublished())[0]);
  const shown = R.learnerResources(await be.listPublished({ learnerOnly: true }));
  assert.strictEqual(shown.length, 1);
  assert.strictEqual(shown[0].id, `cms:${d.id}`);
  const h = await svc('CONTENT_EDITOR').updateDraft(p2, { ...p2.data, visibility: 'HIDDEN' });
  assert.strictEqual(h.state, 'DRAFT', 'editing published content makes a new draft');
  await svc('REVIEWER').transition(h, 'publish', null, (await be.listPublished())[0]);
  assert.strictEqual((await be.listPublished({ learnerOnly: true })).length, 0, 'hidden not shown');
  assert((await be.listVersions('video', d.id)).length >= 2, 'previous versions kept');
  assert(be._dump().audit.some((e) => e.action === 'VIDEO_HIDDEN') && be._dump().audit.some((e) => e.action === 'VIDEO_VERIFIED'));
});

await test('disabled / hidden / unpublished games cannot launch; CMS alone never makes a game AVAILABLE', () => {
  const g = { gameId: 'g', status: 'AVAILABLE', enabled: true, published: true };
  const a = { lessonId: L, gameId: 'g', attached: true, visible: true };
  assert.strictEqual(R.effectiveGameAvailability(L, 'AVAILABLE', [g], [a]), 'AVAILABLE');
  assert.strictEqual(R.effectiveGameAvailability(L, 'PREPARING', [g], [a]), 'PREPARING', 'integration gate');
  for (const bad of [{ ...g, enabled: false }, { ...g, status: 'DISABLED' }, { ...g, published: false }, { ...g, status: 'ARCHIVED' }]) assert(!R.canLaunchGame(R.effectiveGameAvailability(L, 'AVAILABLE', [bad], [a])));
  assert(!R.canLaunchGame(R.effectiveGameAvailability(L, 'AVAILABLE', [g], [{ ...a, visible: false }])));
  assert.strictEqual(GB.getGameSlotStatus('prog-ctrl-conditions'), 'PREPARING', 'Pixel Code Battle still PREPARING');
});

await test('empty overlay leaves learner resources unchanged; published overlay prepends verified CMS items', () => {
  O.resetCmsOverlay();
  const before = RE.getResourcesForLesson(L).map((r) => r.id);
  O.setCmsOverlay({});
  assert.deepStrictEqual(RE.getResourcesForLesson(L).map((r) => r.id), before);
  const pub = [{ id: 'v1', kind: 'video', lessonId: L, data: video({ verification: 'VERIFIED', verifiedBy: 'r', verifiedAt: AT }), version: 1, publishedAt: AT, publishedBy: 'r', previousVersion: null, learnerVisible: true }];
  O.setCmsOverlay({ resources: R.learnerResources(pub) });
  assert.deepStrictEqual(RE.getResourcesForLesson(L).map((r) => r.id), ['cms:v1', ...before]);
  O.resetCmsOverlay();
});

await test('audit events redact token-like strings and are clipped', () => {
  const e = W.auditEvent({ uid: 'a', role: 'ADMIN', status: 'ACTIVE' }, 'CONTENT_UPDATED', 'video', 'x', 'ya29.SECRETTOKEN', 'x'.repeat(500), AT);
  assert(!e.before.includes('SECRETTOKEN') && e.after.length === 300);
});

await test('no hardcoded owner email or secrets in client source; .env.example has placeholders only', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((x) => (x.isDirectory() ? walk(path.join(d, x.name)) : [path.join(d, x.name)]));
  for (const f of walk(path.join(root, 'src'))) {
    const s = fs.readFileSync(f, 'utf-8');
    assert(!/[\w.+-]+@(gmail|hotmail|outlook|yahoo)\.com/i.test(s), `email in ${f}`);
    assert(!/AIza[0-9A-Za-z_-]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY|"private_key"|client_secret|sb_secret_[A-Za-z0-9]{8,}|SUPABASE_SERVICE_ROLE_KEY\s*=|service_role"\s*:/.test(s), `secret in ${f}`);
  }
  const env = read('.env.example');
  assert(/VITE_SUPABASE_URL=https:\/\/your-/.test(env) && /VITE_SUPABASE_ANON_KEY=your-/.test(env));
  assert(!/^\s*[A-Z_]*(SERVICE_ROLE|SECRET|PASSWORD)[A-Z_]*=/m.test(env), 'no secret variables defined');
  assert.strictEqual(readSupabaseEnv(Object.fromEntries(env.split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => l.split('=')))), null, 'placeholders never configure the backend');
  // a service-role key is refused even if someone puts it in the browser env
  const fakeServiceJwt = `x.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.y`;
  assert(isSecretKey(fakeServiceJwt) && isSecretKey('sb_secret_abc'));
  const origErr = console.error; console.error = () => {};
  assert.strictEqual(readSupabaseEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_ANON_KEY: fakeServiceJwt }), null);
  console.error = origErr;
  assert.deepStrictEqual(readSupabaseEnv({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_ANON_KEY: `x.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.y` })?.url, 'https://abc.supabase.co');
  const gi = read('.gitignore');
  assert(gi.includes('.env') && gi.includes('*service-account*.json'));
});

await test('dev fixture only under import.meta.env.DEV and absent from the production build', () => {
  const idx = read('src/backend/index.ts');
  assert(/import\.meta\.env\.DEV && import\.meta\.env\.VITE_V2U_DEV_ADMIN === '1'/.test(idx));
  const dist = path.join(root, 'dist/assets');
  if (fs.existsSync(dist)) for (const f of fs.readdirSync(dist).filter((x) => x.endsWith('.js'))) assert(!fs.readFileSync(path.join(dist, f), 'utf-8').includes('V2U_DEV_ADMIN_FIXTURE'), `fixture in ${f}`);
});

await test('learner-data migration plan is non-destructive and guest mode keeps local data', () => {
  const p = user('STUDENT');
  for (const plan of [planLearnerDataMigration(null, '{}'), planLearnerDataMigration(p, null), planLearnerDataMigration(p, '{"x":1}'), planLearnerDataMigration({ ...p, learnerData: { location: 'account' } }, '{}')]) assert.strictEqual(plan.destructive, false);
  assert.strictEqual(planLearnerDataMigration(null, '{}').action, 'guest-keep-local');
  assert.strictEqual(planLearnerDataMigration(p, '{"x":1}').action, 'offer-copy-with-consent');
  // CMS cannot touch learner state: no CMS module imports the store
  for (const f of ['src/cms/service.ts', 'src/cms/workflow.ts', 'src/backend/supabase.ts', 'src/backend/supabaseMap.ts', 'src/admin/sections.tsx', 'src/admin/AdminApp.tsx']) assert(!/store\/useStore/.test(read(f)), f);
});

await test('learner navigation unchanged; /admin is outside the learner Layout', () => {
  const app = read('src/App.tsx');
  assert(app.indexOf('path="/admin/*"') < app.indexOf('<Layout>'));
  assert(read('src/pages/hubs/MeHub.tsx').includes('<AccountCard />'));
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
