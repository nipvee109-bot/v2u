/** T007D: optimistic concurrency, minimal learner snapshots, admin form a11y/UX.
 *  Behavior runs through the real CmsService + memory backend (which mirrors the database rules);
 *  the database itself is exercised by test-supabase-rls.mjs. Admin components are server-rendered. */
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.React = React; // jiti compiles JSX with the classic runtime
const jiti = createJiti(import.meta.url, { jsx: true });
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i], get length() { return mem.size; } };
globalThis.window = globalThis.window ?? { localStorage: globalThis.localStorage, addEventListener() {}, removeEventListener() {} };

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (err) { console.log(`  ❌ ${name}\n     ${err.message}`); failed++; }
}
const rejects = async (p, re) => {
  let err = null;
  try { await p; } catch (e) { err = e; }
  assert(err, 'expected a rejection');
  if (re) assert.match(err.message, re);
  return err;
};

console.log('=== T007D: CMS concurrency, learner snapshots, admin UX ===\n');
const P = await jiti.import(path.join(root, 'src/auth/permissions.ts'));
const W = await jiti.import(path.join(root, 'src/cms/workflow.ts'));
const R = await jiti.import(path.join(root, 'src/cms/resolver.ts'));
const { CmsService, CmsError, friendly, STALE_MESSAGE } = await jiti.import(path.join(root, 'src/cms/service.ts'));
const { createMemoryBackend } = await jiti.import(path.join(root, 'src/backend/memory.ts'));
const MAP = await jiti.import(path.join(root, 'src/backend/supabaseMap.ts'));
const { CURRICULUM: C } = await jiti.import(path.join(root, 'src/curriculum/data.ts'));
const S = await jiti.import(path.join(root, 'src/admin/sections.tsx'));
const UI = await jiti.import(path.join(root, 'src/admin/ui.tsx'));

const AT = '2026-10-06T00:00:00.000Z';
const user = (role, uid = `u-${role}`) => ({ uid, displayName: role, email: `${uid}@example.invalid`, photoURL: null, role, status: 'ACTIVE', createdAt: AT, updatedAt: AT, lastLoginAt: AT, onboardingCompleted: true, learnerData: { location: 'local-device' }, schemaVersion: 1 });
const ctx = { lessonIds: new Set(C.lessons.map((l) => l.id)), notYet: new Map() };
const L = C.lessons[0].id;
const setup = () => {
  const users = [...P.ROLES.map((r) => user(r)), user('CONTENT_EDITOR', 'u-CONTENT_EDITOR_2')];
  const be = createMemoryBackend({ users });
  const svc = (role, uid = `u-${role}`) => new CmsService(be, { uid, role, status: 'ACTIVE' }, ctx);
  return { be, svc };
};
const video = (o = {}) => ({ lessonId: L, title: 'clip', provider: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', channel: 'ch', durationSec: 300, purpose: 'FIRST_LEARNING', verification: 'DISCOVERED', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 0, notes: '', ...o });
const resource = (o = {}) => ({ lessonId: L, title: 'Python docs', description: 'if statements', url: 'https://docs.python.org/3/tutorial/controlflow.html', publisher: 'PSF', type: 'documentation', verification: 'DISCOVERED', verifiedBy: null, verifiedAt: null, visibility: 'VISIBLE', order: 0, ...o });
const override = (o = {}) => ({ lessonId: L, field: 'analogy', value: 'text', reason: 'why', ...o });

/* ── P0-1 optimistic concurrency ── */
await test('stale edit is rejected with the Thai stale message; nothing is overwritten', async () => {
  const { be, svc } = setup();
  const created = await svc('CONTENT_EDITOR').createDraft('video', video());
  assert.strictEqual(created.revision, 1);
  const tabA = created, tabB = created; // both tabs load revision 1
  const saved = await svc('CONTENT_EDITOR').updateDraft(tabB, { ...tabB.data, title: 'tab B' });
  assert.strictEqual(saved.revision, 2);
  const err = await rejects(svc('CONTENT_EDITOR', 'u-CONTENT_EDITOR_2').updateDraft(tabA, { ...tabA.data, title: 'tab A' }));
  assert(err instanceof CmsError && err.stale, 'stale flag set');
  assert.strictEqual(err.message, STALE_MESSAGE);
  const now = await be.getDraft('video', created.id);
  assert.strictEqual(now.data.title, 'tab B');
  assert.strictEqual(now.revision, 2);
});

await test('editing from the current revision succeeds and increments the revision by one each time', async () => {
  const { svc } = setup();
  let d = await svc('CONTENT_EDITOR').createDraft('resource', resource());
  for (let i = 2; i <= 4; i++) {
    d = await svc('CONTENT_EDITOR').updateDraft(d, { ...d.data, description: `v${i}` });
    assert.strictEqual(d.revision, i);
  }
});

await test('workflow transitions advance the revision and still work from a fresh copy', async () => {
  const { svc } = setup();
  const d = await svc('CONTENT_EDITOR').createDraft('contentOverride', override());
  const sub = await svc('CONTENT_EDITOR').transition(d, 'submit', null, null);
  assert.strictEqual(sub.state, 'IN_REVIEW');
  assert(sub.revision > d.revision, 'submit advanced the revision');
  const ap = await svc('REVIEWER').transition(sub, 'approve', null, null);
  assert.strictEqual(ap.state, 'APPROVED');
  const pub = await svc('REVIEWER').transition(ap, 'publish', null, null);
  assert.strictEqual(pub.state, 'PUBLISHED');
  // an edit based on the pre-publish copy is stale
  await rejects(svc('CONTENT_EDITOR').updateDraft(ap, { ...ap.data, value: 'late edit' }), /ถูกแก้ไขโดยผู้ใช้อื่นแล้ว/);
});

await test('a reviewer cannot approve resubmitted text they have not seen (stale approve refused)', async () => {
  const { be, svc } = setup();
  const d = await svc('CONTENT_EDITOR').createDraft('contentOverride', override({ value: 'reviewed text' }));
  const inReview = await svc('CONTENT_EDITOR').transition(d, 'submit', null, null);
  const reviewerCopy = inReview; // reviewer opens the item
  const edited = await svc('CONTENT_EDITOR').updateDraft(inReview, { ...inReview.data, value: 'swapped text' });
  assert.strictEqual(edited.state, 'DRAFT', 'editing in review returns to DRAFT');
  await svc('CONTENT_EDITOR').transition(edited, 'submit', null, null); // IN_REVIEW again, new text
  const err = await rejects(svc('REVIEWER').transition(reviewerCopy, 'approve', null, null));
  assert(err.stale, 'refused as stale');
  const now = await be.getDraft('contentOverride', d.id);
  assert.strictEqual(now.state, 'IN_REVIEW');
  assert.strictEqual(now.approvedBy ?? null, null);
  // after reloading, the reviewer can approve what they now see
  assert.strictEqual((await svc('REVIEWER').transition(now, 'approve', null, null)).state, 'APPROVED');
});

await test('concurrency never bypasses self-approval: the author still cannot approve from a fresh copy', async () => {
  const { be, svc } = setup();
  const d = await svc('ADMIN').createDraft('contentOverride', override());
  await svc('ADMIN').transition(d, 'submit', null, null);
  const fresh = await be.getDraft('contentOverride', d.id);
  await rejects(svc('ADMIN').transition(fresh, 'approve', null, null), /คนอื่น/);
  // creator check also holds after another editor touched it (server-side contributor rule)
  const other = await svc('CONTENT_EDITOR').updateDraft(fresh, { ...fresh.data, value: 'edited by editor' });
  await svc('CONTENT_EDITOR').transition(other, 'submit', null, null);
  await rejects(svc('ADMIN').transition(await be.getDraft('contentOverride', d.id), 'approve', null, null), /คนอื่น/);
});

await test('verifying a link that changed after the reviewer loaded it is refused', async () => {
  const { be, svc } = setup();
  const d = await svc('CONTENT_EDITOR').createDraft('video', video());
  const reviewerCopy = d;
  await svc('CONTENT_EDITOR').updateDraft(d, { ...d.data, url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', videoId: 'aaaaaaaaaaa' });
  const err = await rejects(svc('REVIEWER').verifySource(reviewerCopy));
  assert(err.stale);
  assert.strictEqual((await be.getDraft('video', d.id)).data.verification, 'DISCOVERED');
});

await test('stale game metadata edits are refused; current edits advance the revision', async () => {
  const { svc } = setup();
  const g0 = { gameId: 'qa-game', name: 'QA', description: '', subjects: [], skillIds: [], gameVersion: '0.1.0', contentContract: '1.1', evidenceContract: '1.1', launchType: 'none', launchUrl: '', thumbnail: '', status: 'DRAFT', enabled: false, published: false, createdAt: '', updatedAt: '', updatedBy: '', revision: 0 };
  const g = await svc('GAME_EDITOR').saveGame(g0, null);
  assert.strictEqual(g.revision, 1);
  const g2 = await svc('GAME_EDITOR').saveGame({ ...g, name: 'QA 2' }, g);
  assert.strictEqual(g2.revision, 2);
  const err = await rejects(svc('GAME_EDITOR').saveGame({ ...g, name: 'stale' }, g));
  assert(err.stale);
});

await test('Supabase mapping reads revision; updates send exactly revision + 1 (the trigger contract)', async () => {
  assert.strictEqual(MAP.rowToDraft('video', { id: 'x', state: 'DRAFT', revision: 7 }).revision, 7);
  assert.strictEqual(MAP.rowToGame({ game_id: 'g', revision: 3 }).revision, 3);
  const calls = [];
  const fake = { from: () => ({ update: (row) => { calls.push(row); return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'x', state: 'DRAFT', revision: 5 }, error: null }) }) }) }; } }) };
  const { supabaseBackendFromClient } = await jiti.import(path.join(root, 'src/backend/supabase.ts'));
  const be = supabaseBackendFromClient(fake);
  await be.updateDraft({ uid: 'u', role: 'ADMIN', status: 'ACTIVE' }, 'video', 'x', video(), 4);
  assert.strictEqual(calls[0].revision, 5);
  assert(!('state' in calls[0]) && !('verified_by' in calls[0]), 'workflow columns are never sent');
});

/* ── error mapping ── */
await test('known database errors become Thai; unknown errors never leak raw internals', () => {
  assert.strictEqual(friendly({ code: 'PT409', message: 'stale revision: …' }).message, STALE_MESSAGE);
  assert.match(friendly(new Error('only drafts can be submitted')).message, /^ส่งตรวจได้เฉพาะฉบับร่าง/);
  assert.match(friendly(new Error('learning content must be approved by someone else')).message, /ผู้ตรวจคนอื่น/);
  assert.match(friendly(new Error('permission denied: content.draft')).message, /^ไม่มีสิทธิ์ทำรายการนี้$/);
  assert.match(friendly(new Error('you cannot change your own role')).message, /ตัวเอง/);
  const unknown = friendly(new Error('relation "x" does not exist at character 14'));
  assert(!/relation|character/.test(unknown.message), 'no raw internals');
});

/* ── P1-1 learner snapshot minimization ── */
await test('published snapshots carry no reason / verifier / verification time, and learners still see verified items', async () => {
  const { be, svc } = setup();
  const r = await svc('CONTENT_EDITOR').createDraft('resource', resource());
  await svc('REVIEWER').verifySource(r);
  const pub = await svc('REVIEWER').transition(await be.getDraft('resource', r.id), 'publish', null, null);
  assert.strictEqual(pub.state, 'PUBLISHED');
  const live = (await be.listPublished({ learnerOnly: true })).find((p) => p.id === r.id);
  assert(live && live.learnerVisible);
  assert.strictEqual(live.data.verifiedBy, null);
  assert.strictEqual(live.data.verifiedAt, null);
  const curated = R.learnerResources([live]);
  assert.strictEqual(curated.length, 1, 'learner UI still renders it');
  assert(!JSON.stringify(curated).includes('u-REVIEWER'), 'no reviewer id reaches the learner model');
  const o = await svc('CONTENT_EDITOR').createDraft('contentOverride', override({ reason: 'internal editorial note' }));
  const sub = await svc('CONTENT_EDITOR').transition(o, 'submit', null, null);
  const ap = await svc('REVIEWER').transition(sub, 'approve', null, null);
  await svc('REVIEWER').transition(ap, 'publish', null, null);
  const ov = (await be.listPublished({ learnerOnly: true })).find((p) => p.id === o.id);
  assert.strictEqual(ov.data.reason, '');
  assert.strictEqual(R.learnerOverrides([ov])[L].analogy, 'text');
});

await test('an unverified or hidden snapshot is never learner-visible even if flagged', () => {
  assert.strictEqual(W.isSnapshotLearnerVisible('video', video({ verification: 'VERIFIED' })), true);
  assert.strictEqual(W.isSnapshotLearnerVisible('video', video()), false);
  assert.strictEqual(W.isSnapshotLearnerVisible('resource', resource({ verification: 'VERIFIED', visibility: 'HIDDEN' })), false);
  assert.strictEqual(R.learnerResources([{ id: 'x', kind: 'video', lessonId: L, data: video(), version: 1, publishedAt: AT, publishedBy: 'u', previousVersion: null, learnerVisible: true }]).length, 0);
});

/* ── P0-2 / P0-3 / P1 admin UI (server-rendered) ── */
const html = (el) => renderToStaticMarkup(React.createElement(MemoryRouter, null, el));
const draftOf = (kind, data, o = {}) => ({ id: 'd1', kind, lessonId: L, data, state: 'DRAFT', publishedVersion: 0, createdAt: AT, createdBy: 'u-CONTENT_EDITOR', updatedAt: AT, updatedBy: 'u-CONTENT_EDITOR', reviewNote: null, approvedBy: null, revision: 3, ...o });
const me = (role) => ({ ...user(role) });
const ctxFor = (role, drafts = []) => ({ data: { drafts, published: [], games: [], assignments: [], users: [me(role)], audit: [], loaded: true }, svc: {}, allowed: (p) => P.can({ uid: `u-${role}`, role, status: 'ACTIVE' }, p), reload: async () => {}, act: async () => true, confirm: () => {}, me: me(role) });

await test('Field associates every label with its control and hint (for/id + aria-describedby)', () => {
  const out = html(React.createElement(UI.Field, { label: 'ชื่อคลิป', hint: 'คำแนะนำ' }, React.createElement('input', {})));
  const id = out.match(/<label for="([^"]+)"/)[1];
  assert.match(out, new RegExp(`<input id="${id}" aria-describedby="${id}-hint"`));
  assert.match(out, new RegExp(`<span id="${id}-hint"`));
});

await test('learning-content edit warns BEFORE saving that the item returns to DRAFT', () => {
  for (const state of ['IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED']) {
    const d = draftOf('contentOverride', override(), { state });
    assert.match(html(React.createElement(S.EditOverrideForm, { c: ctxFor('CONTENT_EDITOR', [d]), d, onClose() {} })), /การแก้ไขรายการนี้จะนำกลับไปเป็นฉบับร่าง และต้องส่งตรวจใหม่/);
  }
  const draft = draftOf('contentOverride', override());
  assert.doesNotMatch(html(React.createElement(S.EditOverrideForm, { c: ctxFor('CONTENT_EDITOR', [draft]), d: draft, onClose() {} })), /นำกลับไปเป็นฉบับร่าง/);
});

await test('edit forms flag a newer server copy instead of silently saving over it', () => {
  const opened = draftOf('resource', resource(), { revision: 3 });
  const newer = { ...opened, revision: 4 };
  const out = html(React.createElement(S.EditMediaForm, { c: ctxFor('CONTENT_EDITOR', [newer]), d: opened, onClose() {} }));
  assert.match(out, /ถูกแก้ไขโดยผู้ใช้อื่นหลังจากคุณเปิดฟอร์ม/);
  assert.match(out, /เริ่มแก้จากฉบับล่าสุด/);
  assert.doesNotMatch(html(React.createElement(S.EditMediaForm, { c: ctxFor('CONTENT_EDITOR', [opened]), d: opened, onClose() {} })), /หลังจากคุณเปิดฟอร์ม/);
});

await test('resource edit form has labelled, https-only fields', () => {
  const d = draftOf('resource', resource());
  const out = html(React.createElement(S.EditMediaForm, { c: ctxFor('CONTENT_EDITOR', [d]), d, onClose() {} }));
  for (const label of ['ชื่อแหล่งเรียนรู้', 'ลิงก์ (https)', 'ผู้เผยแพร่ / แหล่งที่มา', 'ประเภท']) assert(out.includes(`>${label}</label>`), label);
  assert.match(out, /type="url"[^>]*pattern="https:\/\/\.\+"/);
});

await test('an author who reviews sees a disabled approve with the reason, not a missing button', () => {
  const d = draftOf('contentOverride', override(), { state: 'IN_REVIEW', createdBy: 'u-ADMIN', updatedBy: 'u-ADMIN' });
  const out = html(React.createElement(S.TransitionButtons, { c: ctxFor('ADMIN', [d]), d, pub: null }));
  assert.match(out, /<button type="button"[^>]*disabled=""[^>]*aria-describedby="self-d1">อนุมัติ<\/button>/);
  assert.match(out, /อนุมัติเองไม่ได้/);
  const other = html(React.createElement(S.TransitionButtons, { c: ctxFor('REVIEWER', [d]), d, pub: null }));
  assert.doesNotMatch(other, /disabled=""/);
  assert.match(other, />อนุมัติ</);
});

await test('audit entries show changed fields readably and keep the raw summary', () => {
  const out = html(React.createElement(S.AuditChange, { before: '{"title":"old","state":"DRAFT"}', after: '{"title":"new","state":"DRAFT"}' }));
  assert.match(out, /title<\/span>: old → new/);
  assert.doesNotMatch(out, /state<\/span>:/);
  assert.match(out, /<details>/);
  assert.match(html(React.createElement(S.AuditChange, { before: 'IN_REVIEW', after: 'APPROVED' })), /IN_REVIEW → APPROVED/);
});

await test('your own role cannot be changed from the users table (disabled + explained)', () => {
  const c = ctxFor('SUPER_ADMIN');
  const out = html(React.createElement(S.UsersSection, { c }));
  assert.match(out, /<select aria-label="บทบาทของ SUPER_ADMIN" aria-describedby="own-role-hint"[^>]*disabled=""/);
  assert.match(out, /id="own-role-hint"[^>]*>เปลี่ยนบทบาทและสถานะของตัวเองไม่ได้/);
});

console.log(`\nTotal: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed) process.exitCode = 1;
