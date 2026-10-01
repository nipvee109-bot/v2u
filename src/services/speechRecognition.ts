export interface SpeechRecognitionOptions {
  language?: string; // default: 'th-TH'
  continuous?: boolean; // default: true
  interimResults?: boolean; // default: true
}

export interface SpeechRecognitionError {
  code: 'not-supported' | 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'unknown';
  message: string;
}

export interface SpeechRecognitionProvider {
  isSupported(): boolean;
  start(options?: SpeechRecognitionOptions): void;
  stop(): void;
  onResult: ((transcript: string, isFinal: boolean) => void) | null;
  onError: ((error: SpeechRecognitionError) => void) | null;
  onEnd: (() => void) | null;
  isListening: boolean;
}

class WebSpeechRecognitionProvider implements SpeechRecognitionProvider {
  private recognition: any | null = null;
  public isListening = false;
  
  public onResult: ((transcript: string, isFinal: boolean) => void) | null = null;
  public onError: ((error: SpeechRecognitionError) => void) | null = null;
  public onEnd: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  start(options?: SpeechRecognitionOptions): void {
    if (!this.recognition) return;

    this.recognition.lang = options?.language ?? 'th-TH';
    this.recognition.continuous = options?.continuous ?? true;
    this.recognition.interimResults = options?.interimResults ?? true;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (this.onResult) {
        if (finalTranscript) {
          this.onResult(finalTranscript, true);
        }
        if (interimTranscript) {
          this.onResult(interimTranscript, false);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      let code: SpeechRecognitionError['code'] = 'unknown';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        code = 'not-allowed';
      } else if (event.error === 'no-speech') {
        code = 'no-speech';
      } else if (event.error === 'network') {
        code = 'network';
      } else if (event.error === 'aborted') {
        code = 'aborted';
      }

      if (this.onError) {
        this.onError({ code, message: event.message || event.error });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) {
        this.onEnd();
      }
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      if (e.name !== 'InvalidStateError') {
         if (this.onError) {
           this.onError({ code: 'unknown', message: e.message });
         }
      }
    }
  }

  stop(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }
}

class FallbackSpeechRecognitionProvider implements SpeechRecognitionProvider {
  public isListening = false;
  public onResult = null;
  public onError = null;
  public onEnd = null;

  isSupported(): boolean {
    return false;
  }

  start(): void {
    // No-op
  }

  stop(): void {
    // No-op
  }
}

export function createSpeechRecognitionProvider(): SpeechRecognitionProvider {
  if (typeof window !== 'undefined') {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      return new WebSpeechRecognitionProvider();
    }
  }
  return new FallbackSpeechRecognitionProvider();
}
