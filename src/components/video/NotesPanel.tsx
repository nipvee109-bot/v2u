import { useMemo, useState } from 'react';
import { Pencil, Trash2, Clock, Check, X, Mic, Square } from 'lucide-react';
import { appendTranscript, SPEECH_MESSAGE } from '../../notes/speech';
import { useSpeechToText } from '../../notes/useSpeechToText';
import { useStore } from '../../store/useStore';
import { NOTE_TYPE_META, NOTE_TYPES, notesForLesson } from '../../notes/engine';
import type { NoteType, StudyNote } from '../../notes/types';
import { formatTimestamp } from '../../video/engine';

interface Props {
  lessonId: string;
  videoKey?: string;
  /** Current playback time — ONLY when the player really reports it. */
  currentSeconds?: number;
  onSeek?: (seconds: number) => void;
}

/** "โน้ตของฉัน" — categorised notes, optional real timestamps, editable. */
export function NotesPanel({ lessonId, videoKey, currentSeconds, onSeek }: Props) {
  const all = useStore((s) => s.learningNotes?.notes);
  const { addStudyNote, updateStudyNote, deleteStudyNote } = useStore();
  const notes = useMemo(() => notesForLesson(all ?? [], lessonId), [all, lessonId]);
  const [type, setType] = useState<NoteType>('understood');
  const [text, setText] = useState('');
  const [stamp, setStamp] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const timeOk = currentSeconds !== undefined;
  // 🎙️ speech → TEXT into the same box (editable, saved as a normal note; no audio kept)
  const speech = useSpeechToText((t) => setText((cur) => appendTranscript(cur, t)));
  const listening = speech.state === 'listening';

  const save = () => {
    if (!text.trim()) return;
    addStudyNote({
      lessonId,
      type,
      text,
      ...(videoKey ? { videoKey } : {}),
      ...(stamp && timeOk ? { timestampSeconds: Math.floor(currentSeconds!) } : {}),
    });
    setText('');
    setStamp(false);
  };

  return (
    <section aria-label="โน้ตของฉัน" className="rounded-2xl border border-ink/[0.08] bg-white shadow-card p-4 sm:p-5" data-testid="notes-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold text-ink">📝 โน้ตของฉัน</h3>
        <span className="text-xs text-slate-500">{notes.length} โน้ต</span>
      </div>

      <div role="radiogroup" aria-label="ประเภทโน้ต" className="mt-3 flex flex-wrap gap-1.5">
        {NOTE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors ${
              type === t ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
            }`}
          >
            <span aria-hidden="true">{NOTE_TYPE_META[t].icon}</span> {NOTE_TYPE_META[t].short}
          </button>
        ))}
      </div>

      <label htmlFor={`note-input-${lessonId}`} className="sr-only">
        เขียนโน้ต: {NOTE_TYPE_META[type].label}
      </label>
      <textarea
        id={`note-input-${lessonId}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
        rows={3}
        placeholder={`${NOTE_TYPE_META[type].icon} ${NOTE_TYPE_META[type].label}…`}
        className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-ink outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
      />
      <div className="mt-2" data-testid="voice-notes">
        {speech.state === 'unsupported' ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600" role="note">
            {SPEECH_MESSAGE.unsupported}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={listening ? speech.stop : speech.start}
              disabled={speech.state === 'processing'}
              aria-label={listening ? 'หยุดฟัง' : 'พูดแทนพิมพ์'}
              aria-pressed={listening}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:opacity-60 ${
                listening ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-brand-200 bg-white text-brand-700 hover:bg-brand-50'
              }`}
            >
              {listening ? (
                <>
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>🔴 หยุด</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>พูดแทนพิมพ์</span>
                </>
              )}
            </button>
            <span role="status" aria-live="polite" className="min-w-0 flex-1 text-xs text-slate-600 break-words">
              {listening && <span className="font-semibold text-rose-700">กำลังฟัง... </span>}
              {listening && <span>หยุดพูดหรือกดปุ่มเพื่อหยุด</span>}
              {speech.state === 'processing' && SPEECH_MESSAGE.processing}
              {speech.state === 'error' && <span className="text-amber-800">{SPEECH_MESSAGE.error}</span>}
              {listening && speech.interim && <span className="block italic text-slate-500">“{speech.interim}”</span>}
            </span>
          </div>
        )}
        <p className="mt-1 text-[11px] text-slate-500">เสียงจะถูกแปลงเป็นข้อความในช่องด้านบนเท่านั้น — V2U ไม่บันทึกเสียง และการพูดไม่ใช่การเช็กความเข้าใจ</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {timeOk ? (
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={stamp} onChange={(e) => setStamp(e.target.checked)} className="h-4 w-4 accent-[var(--color-brand-600)]" />
            <Clock className="h-3.5 w-3.5" /> จดตรงนี้ ({formatTimestamp(currentSeconds!)})
          </label>
        ) : (
          <span className="text-[11px] text-slate-500">{videoKey ? 'คลิปนี้ไม่ได้ส่งเวลามาให้ V2U — โน้ตจะไม่มีเวลากำกับ' : ''}</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!text.trim()}
          className="min-h-[44px] rounded-xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-500"
        >
          เพิ่มโน้ต
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4" aria-label="โน้ตที่จดไว้">
          {notes.map((n: StudyNote) => (
            <li key={n.id} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span>
                  {NOTE_TYPE_META[n.type].icon} {NOTE_TYPE_META[n.type].short}
                </span>
                {n.timestampSeconds !== undefined &&
                  (onSeek ? (
                    <button type="button" onClick={() => onSeek(n.timestampSeconds!)} className="inline-flex min-h-[28px] items-center gap-1 rounded-full bg-brand-50 px-2 font-mono text-brand-700 hover:bg-brand-100" aria-label={`กลับไปที่ ${formatTimestamp(n.timestampSeconds)}`}>
                      <Clock className="h-3 w-3" /> {formatTimestamp(n.timestampSeconds)}
                    </button>
                  ) : (
                    <span className="font-mono">{formatTimestamp(n.timestampSeconds)}</span>
                  ))}
                <span className="ml-auto flex gap-0.5">
                  {editing !== n.id && (
                    <>
                      <button type="button" onClick={() => { setEditing(n.id); setDraft(n.text); }} aria-label="แก้โน้ต" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => deleteStudyNote(n.id)} aria-label="ลบโน้ต" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-rose-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </span>
              </div>
              {editing === n.id ? (
                <div className="mt-1.5">
                  <label htmlFor={`edit-${n.id}`} className="sr-only">แก้โน้ต</label>
                  <textarea id={`edit-${n.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} className="w-full rounded-xl border border-brand-300 bg-white p-2 text-sm outline-none focus:ring-4 focus:ring-brand-100" />
                  <div className="mt-1 flex justify-end gap-1">
                    <button type="button" onClick={() => setEditing(null)} aria-label="ยกเลิก" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
                    <button
                      type="button"
                      onClick={() => {
                        if (draft.trim()) updateStudyNote(n.id, { text: draft });
                        setEditing(null);
                      }}
                      aria-label="บันทึกการแก้ไข"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink break-words">{n.text}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
