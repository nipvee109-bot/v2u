import React, { useEffect } from 'react';
import { Mic, Square } from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface VoiceSummaryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
  /** Phase 49: lets a parent <label htmlFor> point at the textarea. */
  id?: string;
}

export const VoiceSummaryInput: React.FC<VoiceSummaryInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'พิมพ์สรุปความเข้าใจของคุณที่นี่...',
  label,
  rows = 4,
  className = '',
}) => {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({ language: 'th-TH' });

  // When speech recognition produces a final transcript, append it to the main value
  useEffect(() => {
    if (transcript) {
      const newValue = value + (value && !value.endsWith(' ') ? ' ' : '') + transcript;
      onChange(newValue);
      resetTranscript();
    }
  }, [transcript, value, onChange, resetTranscript]);

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={id}
          aria-label={id ? undefined : label || placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
          disabled={isListening}
        />
        
        {isListening && interimTranscript && (
          <div className="absolute inset-0 p-3 pointer-events-none overflow-hidden bg-white/80 rounded-lg">
             <span className="text-gray-900">{value}</span>
             <span className="text-gray-500">
               {value && !value.endsWith(' ') ? ' ' : ''}
               {interimTranscript}
             </span>
          </div>
        )}

        {isSupported && (
          <button
            type="button"
            onClick={handleToggleListening}
            className={`absolute bottom-3 right-3 p-2 rounded-full transition-colors flex items-center justify-center ${
              isListening 
                ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isListening ? 'หยุดฟัง' : 'เริ่มฟัง'}
          >
            {isListening ? <Square size={20} /> : <Mic size={20} />}
          </button>
        )}
      </div>

      <div className="h-5 text-xs">
        {error ? (
          <span className="text-red-500">
            {error.code === 'not-allowed' 
              ? 'ไม่ได้รับอนุญาตใช้ไมโครโฟน' 
              : error.code === 'network'
              ? 'มีปัญหาการเชื่อมต่อเครือข่าย'
              : 'เกิดข้อผิดพลาดในการฟัง'}
          </span>
        ) : isListening ? (
          <span className="text-blue-600 font-medium flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            กำลังฟัง... พูดได้เลย
          </span>
        ) : !isSupported ? (
          <span className="text-gray-500">เบราว์เซอร์ไม่รองรับการพูด กรุณาพิมพ์แทน</span>
        ) : null}
      </div>
    </div>
  );
};
