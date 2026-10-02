import { useCallback, useEffect, useRef, useState } from 'react';
import { getRecognitionCtor, speechReducer, SPEECH_LANG } from './speech';
import type { RecognitionLike, SpeechEvent, SpeechState } from './speech';

/**
 * Browser speech-to-text. The microphone is touched ONLY inside start(),
 * which must be called from a user click. Final phrases are passed to
 * onFinal as text; nothing else (and no audio) leaves the browser API.
 */
export function useSpeechToText(onFinal: (text: string) => void) {
  const [state, setState] = useState<SpeechState>(() => (getRecognitionCtor(typeof window !== 'undefined' ? window : null) ? 'idle' : 'unsupported'));
  const [interim, setInterim] = useState('');
  const rec = useRef<RecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);
  const send = useCallback((e: SpeechEvent) => setState((s) => speechReducer(s, e)), []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor(window);
    if (!Ctor) return;
    try {
      rec.current?.abort();
      const r = new Ctor();
      r.lang = SPEECH_LANG;
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        let live = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const text = res[0]?.transcript ?? '';
          if (res.isFinal) onFinalRef.current(text);
          else live += text;
        }
        setInterim(live);
      };
      r.onerror = (e) => send({ type: 'error', code: e.error });
      r.onend = () => {
        setInterim('');
        send({ type: 'ended' });
      };
      rec.current = r;
      send({ type: 'start' });
      r.start();
    } catch {
      send({ type: 'error', code: 'start-failed' });
    }
  }, [send]);

  const stop = useCallback(() => {
    send({ type: 'stop' });
    rec.current?.stop();
  }, [send]);

  // never leave the microphone open when the panel goes away
  useEffect(() => () => rec.current?.abort(), []);

  return { state, interim, start, stop, reset: () => send({ type: 'reset' }) };
}
