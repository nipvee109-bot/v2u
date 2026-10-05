/* Supabase backend (Phase 72B): Supabase Auth (Google OAuth, PKCE) + PostgreSQL with RLS.
   Loaded lazily (dynamic import) so guests never download the SDK.
   The browser holds only the public anon/publishable key. Every write is authorized by
   Row Level Security, guard triggers and SECURITY DEFINER RPCs (supabase/migrations);
   the audit log is written by the database. No provider/access tokens are read or logged. */

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AuthUserInfo, CmsBackend, SignInResult } from './types';
import type { SupabaseEnv } from './supabaseEnv';
import { assignmentToRow, dataToRow, gameToRow, rowToAssignment, rowToAudit, rowToDraft, rowToGame, rowToProfile, rowToPublished, TABLE } from './supabaseMap';
import type { EntityKind } from '../cms/types';

type Row = Record<string, unknown>;

function check<T>(r: { data: T; error: { message: string; code?: string } | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code });
  return r.data;
}

const info = (u: User | null | undefined): AuthUserInfo | null =>
  u ? { uid: u.id, email: u.email ?? '', displayName: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email ?? 'ผู้ใช้'), photoURL: typeof u.user_metadata?.avatar_url === 'string' ? u.user_metadata.avatar_url : null } : null;

/** OAuth errors come back on the redirect URL (?error=… or #error=…). Read once, then remove from the address bar. */
export function readAuthRedirectError(loc: { search: string; hash: string }): SignInResult | null {
  const q = new URLSearchParams(loc.search);
  const h = new URLSearchParams(loc.hash.replace(/^#/, ''));
  const err = q.get('error') ?? h.get('error');
  if (!err) return null;
  const desc = `${q.get('error_description') ?? h.get('error_description') ?? ''}`;
  if (err === 'access_denied') return { ok: false, reason: 'cancelled' };
  return { ok: false, reason: 'error', message: desc.slice(0, 120) || err };
}

export async function createSupabaseBackend(cfg: SupabaseEnv): Promise<CmsBackend> {
  const { createClient } = await import('@supabase/supabase-js');
  return supabaseBackendFromClient(
    createClient(cfg.url, cfg.anonKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  );
}

/** The repository implementation over a Supabase client (also used by the end-to-end test against real PostgREST). */
export function supabaseBackendFromClient(sb: SupabaseClient): CmsBackend {
  const drafts = async (kind: EntityKind) => (check(await sb.from(TABLE[kind]).select('*')) as Row[]).map((r) => rowToDraft(kind, r));

  return {
    kind: 'supabase',
    onAuthChanged(cb) {
      // Supabase advises against awaiting other client calls inside this callback — defer.
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => cb(info(session?.user)), 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle(): Promise<SignInResult> {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } });
      if (error) return /fetch|network/i.test(error.message) ? { ok: false, reason: 'network' } : { ok: false, reason: 'error', message: error.message.slice(0, 120) };
      return { ok: true, redirecting: true };
    },
    consumeAuthRedirectError() {
      const r = readAuthRedirectError(window.location);
      if (r) {
        const url = new URL(window.location.href);
        for (const k of ['error', 'error_code', 'error_description']) url.searchParams.delete(k);
        url.hash = '';
        window.history.replaceState(window.history.state, '', url.pathname + url.search);
      }
      return r;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async getProfile(uid) {
      const r = check(await sb.from('profiles').select('*').eq('id', uid).maybeSingle()) as Row | null;
      return r ? rowToProfile(r) : null;
    },
    async touchOwnProfile(u) {
      // only columns the database lets a user change on their own profile
      const r = check(await sb.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', u.uid).select('*').maybeSingle()) as Row | null;
      if (!r) throw new Error('profile not updatable (inactive or missing)');
      return rowToProfile(r);
    },
    async listUsers() {
      return (check(await sb.from('profiles').select('*').order('created_at')) as Row[]).map(rowToProfile);
    },
    async setUserRole(_by, uid, role) {
      check(await sb.rpc('set_user_role', { target_user_id: uid, new_role: role }));
    },
    async setUserStatus(_by, uid, status) {
      check(await sb.rpc('set_user_status', { target_user_id: uid, new_status: status }));
    },
    async listDrafts() {
      return (await Promise.all((['video', 'resource', 'contentOverride'] as EntityKind[]).map(drafts))).flat();
    },
    async listPublished(opts) {
      const q = sb.from('cms_published').select('*');
      return (check(await (opts?.learnerOnly ? q.eq('learner_visible', true) : q)) as Row[]).map(rowToPublished);
    },
    async listVersions(kind, id) {
      return (check(await sb.from('cms_versions').select('*').eq('kind', kind).eq('entity_id', id)) as Row[]).map((r) => ({ ...rowToPublished(r), previousVersion: null }));
    },
    async insertDraft(_by, kind, data) {
      const r = check(await sb.from(TABLE[kind]).insert(dataToRow(kind, data)).select('*').single()) as Row;
      return rowToDraft(kind, r);
    },
    async updateDraft(_by, kind, id, data) {
      const r = check(await sb.from(TABLE[kind]).update(dataToRow(kind, data)).eq('id', id).select('*').single()) as Row;
      return rowToDraft(kind, r);
    },
    async verifySource(_by, kind, id) {
      check(await sb.rpc('cms_verify_source', { p_kind: kind, p_id: id }));
    },
    async transition(_by, kind, id, t, note) {
      return check(await sb.rpc('cms_transition', { p_kind: kind, p_id: id, p_transition: t, p_note: note })) as never;
    },
    async listGames(opts) {
      const q = sb.from('games').select('*').order('created_at');
      return (check(await (opts?.learnerOnly ? q.eq('published', true) : q)) as Row[]).map(rowToGame);
    },
    async insertGame(_by, g) {
      return rowToGame(check(await sb.from('games').insert(gameToRow(g)).select('*').single()) as Row);
    },
    async updateGame(_by, g) {
      const { game_id: gameId, ...rest } = gameToRow(g);
      return rowToGame(check(await sb.from('games').update(rest).eq('game_id', gameId as string).select('*').single()) as Row);
    },
    async listAssignments(opts) {
      const q = sb.from('lesson_game_assignments').select('*').order('sort_order');
      const assignments = (check(await (opts?.learnerOnly ? q.eq('attached', true).eq('visible', true) : q)) as Row[]).map(rowToAssignment);
      if (!opts?.learnerOnly) return assignments;
      // Staff RLS also exposes unpublished games; the learner view must use only published ones.
      const games = check(await sb.from('games').select('game_id').eq('published', true)) as Row[];
      const published = new Set(games.map((g) => g.game_id));
      return assignments.filter((a) => published.has(a.gameId));
    },
    async upsertAssignment(_by, a) {
      return rowToAssignment(check(await sb.from('lesson_game_assignments').upsert(assignmentToRow(a), { onConflict: 'lesson_id,game_id' }).select('*').single()) as Row);
    },
    async listAudit(max = 200) {
      return (check(await sb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(max)) as Row[]).map(rowToAudit);
    },
  };
}
