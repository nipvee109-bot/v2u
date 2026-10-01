import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Target, Calendar, PlayCircle, ArrowRight } from 'lucide-react';
import type { Lesson } from '../../types';

interface OnboardingBannerProps {
  firstLesson?: Lesson;
  onStartFirstLesson?: (lessonId: string) => void;
  onOpenWizard?: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({
  firstLesson,
  onStartFirstLesson,
  onOpenWizard,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-6 md:p-8 text-white shadow-xl border border-indigo-500/20">
      {/* Decorative background glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl" />

      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3.5 py-1 text-xs font-semibold text-blue-300 border border-blue-400/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ยินดีต้อนรับสู่ศูนย์ควบคุมการเรียนรู้ &middot; Quick Start</span>
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
              เริ่มต้นเส้นทางสู่การสอบติดวิศวะ 6 เดือน
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl leading-relaxed">
              ระบบวางแผนและบันทึกความรู้ส่วนตัว พร้อมระบบ Spaced Repetition และ Roadmap อัจฉริยะ 
              เริ่มต้น 3 ขั้นตอนง่ายๆ ด้านล่างนี้ หรือเปิดตัวช่วยสร้างแผน 6 ขั้นตอน
            </p>
          </div>

          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 self-start md:self-auto"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>เปิดตัวช่วยสร้างแผน 6 ขั้นตอน</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3 Action Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Step 1 */}
          <Link
            to="/goals"
            className="group p-4 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-blue-400/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center justify-center border border-blue-400/20">
                  1
                </span>
                <Target className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                ตั้งเป้าหมายการเรียน
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดชั่วโมงเรียนต่อสัปดาห์และเป้าหมายวิชาหลัก
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>ไปตั้งเป้าหมาย</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Step 2 */}
          <Link
            to="/planner"
            className="group p-4 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-emerald-400/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-400/20">
                  2
                </span>
                <Calendar className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                จัดตารางเรียนสัปดาห์นี้
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                วางช่วงเวลาอ่านหนังสือและล็อกคาบเรียนประจำวัน
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>เปิดตารางเรียน</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-400/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-7 h-7 rounded-xl bg-blue-500 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <PlayCircle className="w-5 h-5 text-blue-300 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white">
                เริ่มเรียนบทแรกทันที
              </h3>
              <p className="text-xs text-blue-200 mt-1 line-clamp-1">
                {firstLesson ? firstLesson.title : 'คณิตศาสตร์พื้นฐาน ม.ปลาย'}
              </p>
            </div>
            {firstLesson ? (
              <Link
                to={`/lessons/${firstLesson.id}`}
                onClick={() => onStartFirstLesson?.(firstLesson.id)}
                className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
              >
                <span>เริ่มเรียนบทที่ 1</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/roadmap"
                className="mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
              >
                <span>ดูบทเรียนทั้งหมด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
