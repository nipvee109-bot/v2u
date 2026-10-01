import { X, Award, Sparkles } from 'lucide-react';
import type { MasteryScore } from '../types';
import { MASTERY_SCALE } from '../types';

interface MasteryScaleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MasteryScaleGuideModal({ isOpen, onClose }: MasteryScaleGuideModalProps) {
  if (!isOpen) return null;

  const steps: MasteryScore[] = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">เกณฑ์วัดระดับความเข้าใจ (Mastery Scale 0–4)</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                ระบบแยกการเรียนจบ (Completion) ออกจากความเชี่ยวชาญจริง (Mastery)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Notice */}
        <div className="bg-purple-50/70 border-b border-purple-100 p-4 px-6 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
          <p className="text-xs text-purple-900 leading-relaxed">
            <strong className="font-bold">หลักการสำคัญ:</strong> "การกดเรียนจบครบ 100% ไม่ได้แปลว่าคุณเข้าใจระดับ 4/4" —
            Mastery วัดจากสัญญาณเชิงประจักษ์ 4 ด้าน: ผลการทำโจทย์ (Assessment Quiz), การทบทวนระยะยาว (Spaced Review),
            การจดบันทึกสรุปแนวคิด (Summary Notes), และระดับความมั่นใจจริง (Confidence)
          </p>
        </div>

        {/* Scale Cards */}
        <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto">
          {steps.map((score) => {
            const info = MASTERY_SCALE[score];
            return (
              <div
                key={score}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 transition-all space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-xl font-extrabold flex items-center justify-center text-sm border ${info.badgeClass}`}>
                      {score}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        ระดับ {score}: {info.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {info.shortDescription}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${info.badgeClass}`}>
                    {score === 4 ? 'เชี่ยวชาญสูงสุด' : score === 0 ? 'ยังไม่เริ่ม' : `ขั้นที่ ${score}`}
                  </span>
                </div>

                <div className="pt-1 text-xs space-y-1.5 border-t border-slate-100 text-slate-600">
                  <p className="leading-relaxed text-slate-700">
                    {info.fullDescription}
                  </p>
                  <p className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-100">
                    <strong className="text-slate-700">เกณฑ์การประเมิน (Deterministic Criteria):</strong> {info.criteria}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>สูตรคำนวณแบบ Deterministic ปราศจากการสุ่มหรือตัดสินเชิงคุณค่า</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
}
