/* Account card (Phase 72) — optional Google sign-in on ฉัน. Guest learning is unchanged:
   learner data stays on this device until a migration is explicitly done. */

import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { can, ROLE_LABEL } from '../../auth/permissions';

const card = { padding: 20, borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--shadow)' } as const;
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold';

export function AccountCard() {
  const a = useAuth();
  return (
    <section aria-labelledby="acct-h" className="flex flex-col gap-3" style={card} data-account-status={a.status}>
      <h2 id="acct-h" className="font-display text-lg font-bold">บัญชี</h2>
      {a.status === 'unconfigured' && <p className="text-sm text-[var(--ink-2)]">ตอนนี้ใช้งานแบบผู้เยี่ยมชม — ข้อมูลการเรียนเก็บไว้ในเครื่องนี้ และเรียนได้ครบทุกส่วน</p>}
      {a.status === 'loading' && <p className="text-sm text-[var(--ink-2)]" role="status">กำลังตรวจสอบบัญชี…</p>}
      {a.status === 'error' && <p className="text-sm" role="alert" style={{ color: 'var(--danger, #b42318)' }}>เชื่อมต่อระบบบัญชีไม่ได้ ยังเรียนต่อแบบผู้เยี่ยมชมได้ตามปกติ</p>}
      {a.status === 'signed-out' && (
        <>
          <p className="text-sm text-[var(--ink-2)]">เข้าสู่ระบบเพื่อเชื่อมบัญชีของคุณ (ไม่บังคับ) — ข้อมูลการเรียนในเครื่องนี้ยังอยู่ครบ</p>
          {!a.online && <p className="text-sm" role="status">ออฟไลน์อยู่ — เข้าสู่ระบบได้เมื่อกลับมาออนไลน์</p>}
          <button type="button" className={`${btn} self-start text-white`} style={{ background: 'var(--brand, #1a2490)' }} disabled={!a.online} onClick={() => void a.signIn()}>
            เข้าสู่ระบบด้วย Google
          </button>
        </>
      )}
      {a.status === 'signed-in' && a.profile && (
        <div className="flex flex-wrap items-center gap-3">
          {a.profile.photoURL ? (
            <img src={a.profile.photoURL} alt="" width={44} height={44} className="h-11 w-11 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full font-bold" style={{ background: 'var(--surface-2, #eef0ff)' }}>{a.profile.displayName.slice(0, 1)}</span>
          )}
          <div className="flex min-w-0 flex-[1_1_180px] flex-col">
            <span className="truncate font-semibold">{a.profile.displayName}</span>
            <span className="truncate text-sm text-[var(--ink-2)]">{a.profile.email}</span>
            <span className="text-xs text-[var(--ink-2)]">{ROLE_LABEL[a.profile.role]}{a.profile.status !== 'ACTIVE' ? ' · บัญชีถูกระงับ' : ''}</span>
          </div>
          {a.actor && can(a.actor, 'admin.access') && (
            <Link to="/admin" className={btn} style={{ border: '1px solid var(--line)' }}>ไปหน้าผู้ดูแล</Link>
          )}
          <button type="button" className={btn} style={{ border: '1px solid var(--line)' }} onClick={() => void a.signOut()}>ออกจากระบบ</button>
        </div>
      )}
      {a.error && <p className="text-sm" role="alert">{a.error}</p>}
    </section>
  );
}
