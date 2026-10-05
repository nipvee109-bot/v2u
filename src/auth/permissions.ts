/* =========================================================================
   V2U roles & permissions (Phase 72) — the ONE place that decides who may do what.
   Components call can(user, permission); nothing checks role strings directly.
   The same matrix is enforced server-side by PostgreSQL RLS + RPCs in
   supabase/migrations (v2u_role_can; parity tested by npm run test:rls), so hiding UI
   is never the only protection.
   ========================================================================= */

export const ROLES = ['STUDENT', 'CONTENT_EDITOR', 'GAME_EDITOR', 'REVIEWER', 'ADMIN', 'SUPER_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'ผู้เรียน',
  CONTENT_EDITOR: 'ผู้แก้ไขเนื้อหา',
  GAME_EDITOR: 'ผู้ดูแลเกม',
  REVIEWER: 'ผู้ตรวจทาน',
  ADMIN: 'ผู้ดูแลระบบ',
  SUPER_ADMIN: 'ผู้ดูแลระบบสูงสุด',
};

export type Permission =
  | 'admin.access'
  | 'content.draft' // create/edit drafts of resources/videos/controlled content
  | 'content.submit' // send a draft to review
  | 'content.review' // approve / reject
  | 'content.publish' // publish / unpublish approved content
  | 'content.verifySource' // mark a video/resource VERIFIED (explicit review)
  | 'game.manage' // register games, edit metadata, configure availability
  | 'game.assign' // attach / detach games to lessons
  | 'users.view'
  | 'users.manageRoles' // ordinary roles (STUDENT … REVIEWER)
  | 'users.manageAdmins' // grant/remove ADMIN and SUPER_ADMIN
  | 'users.setStatus' // suspend / disable accounts
  | 'audit.view'
  | 'settings.manage'
  | 'system.emergency'; // emergency unpublish/disable of anything

const CONTENT_EDITOR: Permission[] = ['admin.access', 'content.draft', 'content.submit'];
const GAME_EDITOR: Permission[] = ['admin.access', 'game.manage', 'game.assign'];
const REVIEWER: Permission[] = ['admin.access', 'content.review', 'content.publish', 'content.verifySource'];
const ADMIN: Permission[] = [...new Set<Permission>([...CONTENT_EDITOR, ...GAME_EDITOR, ...REVIEWER, 'users.view', 'users.manageRoles', 'users.setStatus', 'audit.view', 'settings.manage'])];
const SUPER_ADMIN: Permission[] = [...ADMIN, 'users.manageAdmins', 'system.emergency'];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  STUDENT: [],
  CONTENT_EDITOR,
  GAME_EDITOR,
  REVIEWER,
  ADMIN,
  SUPER_ADMIN,
};

/** What `can` needs — role and status must come from the authoritative profile (server), never the browser. */
export interface Actor {
  uid: string;
  role: Role;
  status: AccountStatus;
}

export function can(actor: Actor | null | undefined, permission: Permission): boolean {
  if (!actor || actor.status !== 'ACTIVE') return false;
  return ROLE_PERMISSIONS[actor.role]?.includes(permission) ?? false;
}

const ADMIN_ROLES: Role[] = ['ADMIN', 'SUPER_ADMIN'];
export const isPrivilegedRole = (r: Role) => ADMIN_ROLES.includes(r);

/** Can `actor` change `target` from its current role to `next`? Returns a reason when not. */
export function roleChangeDenied(actor: Actor, target: { uid: string; role: Role; status?: AccountStatus }, next: Role, activeSuperAdmins: number): string | null {
  if (!can(actor, 'users.manageRoles')) return 'ไม่มีสิทธิ์จัดการบทบาท';
  if (!ROLES.includes(next)) return 'บทบาทไม่ถูกต้อง';
  const touchesAdmin = isPrivilegedRole(target.role) || isPrivilegedRole(next);
  if (touchesAdmin && !can(actor, 'users.manageAdmins')) return 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่ให้หรือถอนสิทธิ์ผู้ดูแลระบบได้';
  if (target.role === 'SUPER_ADMIN' && (target.status ?? 'ACTIVE') === 'ACTIVE' && next !== 'SUPER_ADMIN' && activeSuperAdmins <= 1) return 'ต้องมีผู้ดูแลระบบสูงสุดอย่างน้อย 1 คน';
  if (target.uid === actor.uid && next !== actor.role && isPrivilegedRole(actor.role)) return 'ลดสิทธิ์ของตัวเองไม่ได้ — ให้ผู้ดูแลระบบสูงสุดคนอื่นทำ';
  return null;
}

export function statusChangeDenied(actor: Actor, target: { uid: string; role: Role; status: AccountStatus }, next: AccountStatus, activeSuperAdmins: number): string | null {
  if (!can(actor, 'users.setStatus')) return 'ไม่มีสิทธิ์เปลี่ยนสถานะบัญชี';
  if (target.uid === actor.uid) return 'เปลี่ยนสถานะบัญชีของตัวเองไม่ได้';
  if (isPrivilegedRole(target.role) && !can(actor, 'users.manageAdmins')) return 'เฉพาะผู้ดูแลระบบสูงสุดเท่านั้นที่ระงับบัญชีผู้ดูแลระบบได้';
  if (target.role === 'SUPER_ADMIN' && target.status === 'ACTIVE' && next !== 'ACTIVE' && activeSuperAdmins <= 1) return 'ต้องมีผู้ดูแลระบบสูงสุดที่ใช้งานได้อย่างน้อย 1 คน';
  return null;
}
