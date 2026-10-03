import { Lock, LockOpen, Bug, FlaskConical } from 'lucide-react';
import type { InteractiveLesson, PlayerState } from '../../interactive/types';
import { themeProgress } from '../../interactive/engine';

/** Subject-specific framing: a locked door (math), a battle (programming), a lab (physics). */
export function ThemeBanner({ lesson, state }: { lesson: InteractiveLesson; state: PlayerState }) {
  const t = lesson.theme;
  if (!t) return null;
  const p = themeProgress(lesson, state);
  if (t.kind === 'battle') {
    return (
      <div className="rounded-[22px] border border-[var(--err-soft)] bg-rose-50 p-4" data-testid="theme-battle">
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${p.enemyHp === 0 ? 'bg-[var(--ok)] text-white' : 'bg-rose-600 text-white'}`}>
            <Bug className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-between text-sm font-bold text-[var(--ink)]">
              {t.enemy}
              <span className="font-mono">HP {p.enemyHp}/{t.hp}</span>
            </p>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--surface)]" role="progressbar" aria-valuemin={0} aria-valuemax={t.hp} aria-valuenow={p.enemyHp} aria-label={`พลังชีวิต ${t.enemy}`}>
              <div className="h-full rounded-full bg-rose-500 transition-[width] duration-500" style={{ width: `${(p.enemyHp / t.hp) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-rose-900">{p.enemyHp === 0 ? 'ชนะแล้ว! ไปเช็กความเข้าใจเพื่อยืนยันผล' : 'ตอบถูก = โจมตี · ตอบผิดไม่เสียอะไร แค่ลองใหม่'}</p>
          </div>
        </div>
      </div>
    );
  }
  if (t.kind === 'mission') {
    return (
      <div className={`flex items-center gap-3 rounded-[22px] border p-4 ${p.unlocked ? 'border-[var(--ok-soft)] bg-[var(--ok-soft)]' : 'border-[var(--rev-soft)] bg-[var(--rev-soft)]'}`} data-testid="theme-mission">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${p.unlocked ? 'bg-[var(--ok)] text-white' : 'bg-[var(--rev)] text-white'}`}>
          {p.unlocked ? <LockOpen className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{t.title}</p>
          <p className="text-xs text-[var(--ink-2)]">{p.unlocked ? t.unlockLabel : t.lockLabel} · ภารกิจ {p.done}/{p.total}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-[var(--phy-soft)] bg-sky-50 p-4" data-testid="theme-lab">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white">
        <FlaskConical className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{t.title}</p>
        <p className="text-xs text-[var(--ink-2)]">การทดลอง {p.done}/{p.total} · เปลี่ยนค่า สังเกต แล้วสรุป</p>
      </div>
    </div>
  );
}
