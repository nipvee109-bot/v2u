import { useEffect } from 'react';
import { X, Award, Sparkles } from 'lucide-react';
import type { MasteryScore } from '../types';
import { MASTERY_SCALE } from '../types';

interface MasteryScaleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MasteryScaleGuideModal({ isOpen, onClose }: MasteryScaleGuideModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const steps: MasteryScore[] = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mastery-guide-title"
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-6 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="mastery-guide-title" className="text-base sm:text-lg font-bold">
                เกณฑ์วัดระดับความเข้าใจ (Mastery Scale 0–4)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                ระบบแยกการเรียนจบ (Completion) ออกจากความเชี่ยวชาญจริง (Mastery)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดคู่มือระดับความเข้าใจ"
            className="p-2 min-h-[44px] min-w-[44px] text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center focus:ring-2 focus:ring-purple-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Notice */}
        <div className="bg-purple-50/70 border-b border-purple-100 p-3.5 sm:p-4 sm:px-6 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-purple-900 leading-relaxed">
            <strong className="font-bold">หลักการสำคัญ:</strong> "การกดเรียนจบครบ 100% ไม่ได้แปลว่าคุณเข้าใจระดับ 4/4" —
            Mastery วัดจากสัญญาณเชิงประจักษ์ 4 ด้าน: ผลการทำโจทย์ (Assessment Quiz), การทบทวนระยะยาว (Spaced Review),
            การจดบันทึกสรุปแนวคิด (Summary Notes), และระดับความมั่นใจจริง (Confidence)
          </p>
        </div>

        {/* Scale Cards */}
        <div className="p-4 sm:p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {steps.map((score) => {
            const info = MASTERY_SCALE[score];
            return (
              <div
                key={score}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-sm border ${info.badgeClass}`}>
                      {score}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {info.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {info.shortDescription}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    ระดับ {score}/4
                  </span>
                </div>

                <div className="pt-1 text-xs space-y-1.5 border-t border-slate-100 text-slate-600">
                  <p className="leading-relaxed text-slate-700">
                    {info.fullDescription}
                  </p>
                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                    <strong className="text-slate-800">เกณฑ์การประเมิน (Deterministic Criteria):</strong> {info.criteria}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <span>สูตรคำนวณแบบ Deterministic ปราศจากการสุ่มหรือตัดสินเชิงคุณค่า</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors focus:ring-2 focus:ring-purple-500 text-center"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
