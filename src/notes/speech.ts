/* =========================================================================
   Voice notes (Phase 57) — "พูดแทนพิมพ์"
   Browser speech-to-text only (Web Speech API, th-TH). The browser returns
   TEXT; V2U never records, receives or stores audio. Speaking is just a way
   to type a note — it is never evidence of understanding.
   ========================================================================= */

export type SpeechState = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export type SpeechEvent =
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'ended' }
  | { type: 'error'; code: string }
  | { type: 'reset' };

export const SPEECH_LANG = 'th-TH';

export const SPEECH_MESSAGE: Record<SpeechState, string> = {
  idle: '🎙️ พูดแทนพิมพ์',
  listening: 'กำลังฟัง... หยุดพูดหรือกดปุ่มเพื่อหยุด',
  processing: 'กำลังแปลงเสียงเป็นข้อความ...',
  error: 'ไม่สามารถใช้ไมโครโฟนได้ ลองใหม่อีกครั้ง หรือพิมพ์แทน',
  unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการพิมพ์ด้วยเสียง คุณสามารถพิมพ์โน้ตได้ตามปกติ',
};

/** Pure state machine — the UI and tests share it. */
export function speechReducer(state: SpeechState, e: SpeechEvent): SpeechState {
  if (state === 'unsupported') return 'unsupported';
  switch (e.type) {
    case 'start':
      return state === 'listening' ? state : 'listening';
    case 'stop':
      return state === 'listening' ? 'processing' : state;
    case 'ended':
      return state === 'error' ? 'error' : 'idle';
    case 'error':
      // silence is not a microphone failure
      return e.code === 'no-speech' || e.code === 'aborted' ? 'idle' : 'error';
    case 'reset':
      return 'idle';
  }
}

/** Append recognised text to what the learner already typed (keeps their edits). */
export function appendTranscript(current: string, transcript: string): string {
  const t = transcript.trim();
  if (!t) return current;
  if (!current.trim()) return t;
  return /\s$/.test(current) ? current + t : `${current} ${t}`;
}

/** Minimal shape of the browser's SpeechRecognition we rely on. */
export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export type RecognitionCtor = new () => RecognitionLike;

export function getRecognitionCtor(w: unknown): RecognitionCtor | null {
  if (!w || typeof w !== 'object') return null;
  const g = w as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null;
}
