import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type SpeechRecognitionProvider,
  type SpeechRecognitionOptions,
  type SpeechRecognitionError,
  createSpeechRecognitionProvider
} from '../services/speechRecognition';

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: SpeechRecognitionError | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(options?: SpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechRecognitionError | null>(null);

  const providerRef = useRef<SpeechRecognitionProvider | null>(null);

  if (!providerRef.current) {
    providerRef.current = createSpeechRecognitionProvider();
  }

  const provider = providerRef.current;
  const isSupported = provider.isSupported();

  useEffect(() => {
    provider.onResult = (result, isFinal) => {
      if (isFinal) {
        setTranscript((prev) => prev + (prev ? ' ' : '') + result);
        setInterimTranscript('');
      } else {
        setInterimTranscript(result);
      }
    };

    provider.onError = (err) => {
      setError(err);
      setIsListening(false);
    };

    provider.onEnd = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    return () => {
      provider.stop();
    };
  }, [provider]);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    setInterimTranscript('');
    setIsListening(true);
    provider.start(options);
  }, [provider, isSupported, options]);

  const stopListening = useCallback(() => {
    if (!isSupported) return;
    provider.stop();
  }, [provider, isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
