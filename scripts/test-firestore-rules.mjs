/**
 * Firestore Security Rules tests (Phase 72) — run against the REAL Firestore emulator.
 *   npm run test:rules
 * Needs Java 11+. The emulator jar is downloaded once to ~/.cache/v2u (or set FIRESTORE_EMULATOR_JAR).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JAR = process.env.FIRESTORE_EMULATOR_JAR ?? path.join(os.homedir(), '.cache/v2u/firestore-emulator.jar');
const JAR_URL = 'https://storage.googleapis.com/firebase-preview-drop/emulator/cloud-firestore-emulator-v1.19.7.jar';
const PORT = 8187;

if (!fs.existsSync(JAR)) {
  fs.mkdirSync(path.dirname(JAR), { recursive: true });
  const r = await fetch(JAR_URL);
  if (!r.ok) throw new Error(`cannot download emulator: ${r.status}`);
  fs.writeFileSync(JAR, Buffer.from(await r.arrayBuffer()));
}
const emu = spawn('java', ['-jar', JAR, `--host=127.0.0.1`, `--port=${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('emulator did not start')), 60000);
  const on = (b) => { if (/Dev App Server is now running|is now running/.test(String(b))) { clearTimeout(t); res(); } };
  emu.stdout.on('data', on);
  emu.stderr.on('data', on);
});

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; } catch (e) { console.log(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

import { setLogLevel } from 'firebase/firestore';
setLogLevel('silent');
const env = await initializeTestEnvironment({ projectId: 'demo-v2u-rules', firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: PORT } });
const ROLES = ['STUDENT', 'CONTENT_EDITOR', 'GAME_EDITOR', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'];
const AT = '2026-10-04T00:00:00.000Z';
const profile = (uid, role, status = 'ACTIVE') => ({ uid, displayName: uid, email: `${uid}@example.test`, photoURL: null, role, status, createdAt: AT, updatedAt: AT, lastLoginAt: AT, onboardingCompleted: true, learnerData: { location: 'local-device' }, schemaVersion: 1 });
const uidOf = (r) => `u-${r.toLowerCase()}`;
const video = (patch = {}) => ({ lessonId: 'prog-ctrl-conditions', title: 'คลิป', provider: 'youtube', url: 'https://www.youtube.com/watch?v=vnXIPsijIRc', videoId: 'vnXIPsijIRc', channel: 'ch', durationSec: null, purpose: 'FIRST_LEARNING', verification: 'VERIFICATION_PENDING', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 0, notes: '', ...patch });
const draft = (id, data = video(), state = 'DRAFT', kind = 'video') => ({ id, kind, lessonId: 'prog-ctrl-conditions', data, state, publishedVersion: 0, createdAt: AT, createdBy: 'x', updatedAt: AT, updatedBy: 'x', reviewNote: null });
const pub = (id, data, learnerVisible, kind = 'video') => ({ id, kind, lessonId: 'prog-ctrl-conditions', data, version: 1, publishedAt: AT, publishedBy: 'x', previousVersion: null, learnerVisible });
const game = (patch = {}) => ({ gameId: 'pixel-code-battle', name: 'Pixel Code Battle', description: '', subjects: ['programming'], skillIds: ['skill-prog-conditions'], gameVersion: '0.1', contentContract: '1.1', evidenceContract: '1.1', launchType: 'none', launchUrl: '', thumbnail: '', status: 'PREPARING', enabled: true, published: false, createdAt: AT, updatedAt: AT, updatedBy: 'x', ...patch });
const audit = (uid, role) => ({ actorUid: uid, actorRole: role, action: 'VIDEO_CREATED', entityType: 'video', entityId: 'v1', before: null, after: null, at: AT });

async function seed() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const r of ROLES) await setDoc(doc(db, 'users', uidOf(r)), profile(uidOf(r), r));
    await setDoc(doc(db, 'users', 'u-super2'), profile('u-super2', 'SUPER_ADMIN'));
    await setDoc(doc(db, 'users', 'u-suspended'), profile('u-suspended', 'ADMIN', 'SUSPENDED'));
    await setDoc(doc(db, 'cmsDrafts', 'd1'), draft('d1'));
    await setDoc(doc(db, 'cmsPublished', 'p-visible'), pub('p-visible', video({ verification: 'VERIFIED', verifiedBy: 'r', verifiedAt: AT }), true));
    await setDoc(doc(db, 'cmsPublished', 'p-hidden'), pub('p-hidden', video({ visibility: 'HIDDEN' }), false));
    await setDoc(doc(db, 'games', 'pixel-code-battle'), game());
    await setDoc(doc(db, 'games', 'pub-game'), game({ gameId: 'pub-game', published: true }));
  });
}
const as = (r) => env.authenticatedContext(uidOf(r), { email: `${uidOf(r)}@example.test` }).firestore();

console.log('=== Firestore Security Rules (emulator) ===\n');

await seed();
await test('STUDENT cannot read drafts, audit log or other users (admin data stays server-side)', async () => {
  const db = as('STUDENT');
  await assertFails(getDoc(doc(db, 'cmsDrafts', 'd1')));
  await assertFails(getDocs(collection(db, 'auditLogs')));
  await assertFails(getDoc(doc(db, 'users', uidOf('ADMIN'))));
  await assertSucceeds(getDoc(doc(db, 'users', uidOf('STUDENT'))));
});

await test('client-side role spoofing fails: own role/status can never be self-edited', async () => {
  const db = as('STUDENT');
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'SUPER_ADMIN' }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { status: 'ACTIVE', role: 'ADMIN' }));
  await assertSucceeds(updateDoc(doc(db, 'users', uidOf('STUDENT')), { displayName: 'ชื่อใหม่', updatedAt: AT }));
  const fresh = env.authenticatedContext('newbie', { email: 'newbie@example.test' }).firestore();
  await assertFails(setDoc(doc(fresh, 'users', 'newbie'), profile('newbie', 'ADMIN')));
  await assertFails(setDoc(doc(fresh, 'users', 'someone-else'), profile('someone-else', 'STUDENT')));
  await assertSucceeds(setDoc(doc(fresh, 'users', 'newbie'), { ...profile('newbie', 'STUDENT'), email: 'newbie@example.test' }));
});

await test('unauthorized direct writes fail (student writing CMS/games/audit/published)', async () => {
  const db = as('STUDENT');
  await assertFails(setDoc(doc(db, 'cmsDrafts', 'x'), draft('x')));
  await assertFails(setDoc(doc(db, 'cmsPublished', 'x'), pub('x', video(), false)));
  await assertFails(setDoc(doc(db, 'games', 'x'), game({ gameId: 'x' })));
  await assertFails(setDoc(doc(db, 'auditLogs', 'x'), audit(uidOf('STUDENT'), 'STUDENT')));
  await assertFails(setDoc(doc(db, 'settings', 'x'), { a: 1 }));
  const anon = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(anon, 'cmsDrafts', 'y'), draft('y')));
});

await test('unpublished and hidden content is not readable by students; visible verified content is', async () => {
  const db = as('STUDENT');
  await assertSucceeds(getDoc(doc(db, 'cmsPublished', 'p-visible')));
  await assertFails(getDoc(doc(db, 'cmsPublished', 'p-hidden')));
  await assertSucceeds(getDocs(query(collection(db, 'cmsPublished'), where('learnerVisible', '==', true))));
  await assertFails(getDocs(collection(db, 'cmsPublished')));
  const anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(anon, 'cmsPublished', 'p-visible')));
  await assertFails(getDoc(doc(anon, 'cmsDrafts', 'd1')));
});

await test('unpublished games are hidden from students; published ones are readable', async () => {
  const db = as('STUDENT');
  await assertFails(getDoc(doc(db, 'games', 'pixel-code-battle')));
  await assertSucceeds(getDoc(doc(db, 'games', 'pub-game')));
});

await test('CONTENT_EDITOR: can draft and submit, cannot verify, publish, or change roles', async () => {
  const db = as('CONTENT_EDITOR');
  await assertSucceeds(setDoc(doc(db, 'cmsDrafts', 'e1'), draft('e1')));
  await assertSucceeds(setDoc(doc(db, 'cmsDrafts', 'e1'), draft('e1', video(), 'IN_REVIEW')));
  await assertFails(setDoc(doc(db, 'cmsDrafts', 'e1'), draft('e1', video(), 'APPROVED')));
  await assertFails(setDoc(doc(db, 'cmsDrafts', 'e1'), draft('e1', video({ verification: 'VERIFIED', verifiedBy: 'me', verifiedAt: AT }), 'DRAFT')));
  await assertFails(setDoc(doc(db, 'cmsPublished', 'e1'), pub('e1', video(), false)));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'REVIEWER', updatedAt: AT }));
  await assertFails(deleteDoc(doc(db, 'cmsDrafts', 'e1')));
});

await test('GAME_EDITOR: manages games/assignments, cannot publish curriculum content or edit drafts', async () => {
  const db = as('GAME_EDITOR');
  await assertSucceeds(setDoc(doc(db, 'games', 'pixel-code-battle'), game({ description: 'x' })));
  await assertFails(setDoc(doc(db, 'games', 'bad'), game({ gameId: 'bad', contentContract: '9.9' })));
  await assertSucceeds(setDoc(doc(db, 'lessonGameAssignments', 'a1'), { id: 'a1', lessonId: 'prog-ctrl-conditions', gameId: 'pixel-code-battle', attached: true, visible: false, required: false, order: 0 }));
  await assertFails(setDoc(doc(db, 'lessonGameAssignments', 'a2'), { id: 'a2', lessonId: 'prog-ctrl-conditions', gameId: 'pixel-code-battle', attached: true, visible: true, required: true, order: 0 }));
  await assertFails(setDoc(doc(db, 'cmsPublished', 'g1'), pub('g1', video(), false)));
  await assertFails(setDoc(doc(db, 'cmsDrafts', 'g1'), draft('g1')));
  await assertFails(deleteDoc(doc(db, 'games', 'pixel-code-battle')));
});

await test('REVIEWER: approves/verifies/publishes, cannot grant ADMIN or change roles at all', async () => {
  const db = as('REVIEWER');
  await assertSucceeds(setDoc(doc(db, 'cmsDrafts', 'r1'), draft('r1', video({ verification: 'VERIFIED', verifiedBy: uidOf('REVIEWER'), verifiedAt: AT }), 'APPROVED')));
  await assertSucceeds(setDoc(doc(db, 'cmsPublished', 'r1'), pub('r1', video({ verification: 'VERIFIED', verifiedBy: 'r', verifiedAt: AT }), true)));
  await assertFails(setDoc(doc(db, 'cmsPublished', 'r2'), pub('r2', video(), true)), 'learnerVisible lie: unverified marked visible');
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'ADMIN', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'CONTENT_EDITOR', updatedAt: AT }));
});

await test('controlled learning content can be published only after APPROVED', async () => {
  const db = as('REVIEWER');
  const co = { lessonId: 'prog-ctrl-conditions', field: 'summary', value: ['x'], reason: 'r' };
  await assertSucceeds(setDoc(doc(db, 'cmsDrafts', 'c1'), draft('c1', co, 'IN_REVIEW', 'contentOverride')));
  await assertFails(setDoc(doc(db, 'cmsPublished', 'c1'), pub('c1', co, true, 'contentOverride')));
  await assertSucceeds(setDoc(doc(db, 'cmsDrafts', 'c1'), draft('c1', co, 'APPROVED', 'contentOverride')));
  await assertSucceeds(setDoc(doc(db, 'cmsPublished', 'c1'), pub('c1', co, true, 'contentOverride')));
});

await test('ADMIN: manages ordinary roles; cannot grant ADMIN/SUPER_ADMIN or touch admins; cannot self-edit', async () => {
  const db = as('ADMIN');
  await assertSucceeds(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'CONTENT_EDITOR', updatedAt: AT }));
  await assertSucceeds(updateDoc(doc(db, 'users', uidOf('STUDENT')), { status: 'SUSPENDED', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'ADMIN', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'SUPER_ADMIN', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('SUPER_ADMIN')), { status: 'SUSPENDED', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('ADMIN')), { role: 'SUPER_ADMIN', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { email: 'x@y.z', updatedAt: AT }), 'admins cannot edit other profile fields');
  await assertSucceeds(getDocs(collection(db, 'auditLogs')));
});

await test('SUPER_ADMIN: grants/removes ADMIN; cannot demote itself (last SUPER_ADMIN protected)', async () => {
  const db = as('SUPER_ADMIN');
  await assertSucceeds(updateDoc(doc(db, 'users', uidOf('REVIEWER')), { role: 'ADMIN', updatedAt: AT }));
  await assertSucceeds(updateDoc(doc(db, 'users', uidOf('REVIEWER')), { role: 'REVIEWER', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', uidOf('SUPER_ADMIN')), { role: 'ADMIN', updatedAt: AT }));
  await assertSucceeds(updateDoc(doc(db, 'users', 'u-super2'), { role: 'ADMIN', updatedAt: AT }), 'another SUPER_ADMIN may be demoted');
});

await test('suspended staff lose access', async () => {
  const db = env.authenticatedContext('u-suspended', { email: 'u-suspended@example.test' }).firestore();
  await assertFails(getDoc(doc(db, 'cmsDrafts', 'd1')));
  await assertFails(updateDoc(doc(db, 'users', uidOf('STUDENT')), { role: 'REVIEWER', updatedAt: AT }));
  await assertFails(updateDoc(doc(db, 'users', 'u-suspended'), { displayName: 'x', updatedAt: AT }));
});

await test('audit log: append-only, must name the real actor and role, no secrets fields', async () => {
  const db = as('CONTENT_EDITOR');
  const b = writeBatch(db);
  b.set(doc(db, 'cmsDrafts', 'au1'), draft('au1'));
  b.set(doc(db, 'auditLogs', 'l1'), audit(uidOf('CONTENT_EDITOR'), 'CONTENT_EDITOR'));
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(db, 'auditLogs', 'l2'), audit(uidOf('ADMIN'), 'ADMIN')), 'impersonation');
  await assertFails(setDoc(doc(db, 'auditLogs', 'l3'), { ...audit(uidOf('CONTENT_EDITOR'), 'CONTENT_EDITOR'), token: 'ya29.x' }));
  const admin = as('SUPER_ADMIN');
  await assertFails(updateDoc(doc(admin, 'auditLogs', 'l1'), { action: 'X' }));
  await assertFails(deleteDoc(doc(admin, 'auditLogs', 'l1')));
});

await test('accounts and published history are never hard-deleted', async () => {
  const db = as('SUPER_ADMIN');
  await assertFails(deleteDoc(doc(db, 'users', uidOf('STUDENT'))));
  await assertFails(deleteDoc(doc(db, 'cmsDrafts', 'd1')));
  await assertFails(deleteDoc(doc(db, 'cmsVersions', 'x')));
});

await test('unknown collections (e.g. learner mastery) are denied by default', async () => {
  const db = as('SUPER_ADMIN');
  await assertFails(setDoc(doc(db, 'mastery', 'u'), { score: 100 }));
  await assertFails(getDoc(doc(db, 'reviewSchedule', 'u')));
});

await env.cleanup();
emu.kill();
console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
assert.ok(true);
process.exit(failed ? 1 : 0);
