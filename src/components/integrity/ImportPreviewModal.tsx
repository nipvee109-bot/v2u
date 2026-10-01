import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  BookOpen,
  Calendar,
  FileText,
  Repeat,
  Target,
  Bookmark,
  ArrowRight,
  Layers,
  Database,
} from 'lucide-react';
import type { ValidationResult, FullBackupPayload } from '../../utils/integrityUtils';
import { CURRENT_SCHEMA_VERSION } from '../../utils/integrityUtils';

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: ValidationResult | null;
  onConfirmImport: (payload: FullBackupPayload, mode: 'replace' | 'merge') => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  validationResult,
  onConfirmImport,
}) => {
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Close modal on Escape
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

  if (!isOpen || !validationResult) return null;

  const { isValid, errors, warnings, detectedVersion, stats, migratedPayload } = validationResult;

  const getVersionBadge = (version: number) => {
    if (version === CURRENT_SCHEMA_VERSION) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> เวอร์ชัน {version} (ล่าสุด)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
        <Layers className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" /> เวอร์ชัน {version} → อัปเกรดเป็น v{CURRENT_SCHEMA_VERSION} อัตโนมัติ
      </span>
    );
  };

  const handleConfirm = () => {
    if (!migratedPayload || !isValid) return;
    onConfirmImport(migratedPayload, importMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isValid ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
              {isValid ? <FileCheck className="w-5 h-5" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5" aria-hidden="true" />}
            </div>
            <div>
              <h3 id="import-preview-title" className="text-base sm:text-lg font-bold text-slate-800">
                {isValid ? 'ตรวจสอบข้อมูลก่อนนำเข้า (Import Preview)' : 'ข้อมูลไฟล์ไม่ถูกต้อง (Validation Failed)'}
              </h3>
              <p className="text-xs text-slate-500">
                ระบบตรวจสอบความเข้ากันได้ของโครงสร้างข้อมูลและความถูกต้อง
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างตรวจสอบข้อมูล"
            className="text-slate-400 hover:text-slate-700 p-2 min-h-[44px] min-w-[44px] rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Version and Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700">Schema Version ตรวจพบ:</span>
              {getVersionBadge(detectedVersion)}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              v{detectedVersion} → v{CURRENT_SCHEMA_VERSION}
            </div>
          </div>

          {/* Critical Errors if invalid */}
          {!isValid && errors.length > 0 && (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" aria-hidden="true" />
                พบข้อผิดพลาดที่ไม่สามารถนำเข้าข้อมูลได้:
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings / Auto-repairs if any */}
          {warnings.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" aria-hidden="true" />
                ระบบได้ซ่อมแซมและปรับโครงสร้างให้อัตโนมัติ ({warnings.length} รายการ):
              </div>
              <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5 max-h-28 overflow-y-auto pr-2">
                {warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary Grid */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2.5">
              สรุปข้อมูลที่จะนำเข้า (Detected Data Summary)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.lessonsCount}</div>
                  <div className="text-[11px] text-slate-500">บทเรียน ({stats.completedLessonsCount} จบแล้ว)</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.sessionsCount}</div>
                  <div className="text-[11px] text-slate-500">เซสชันในตารางเรียน</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.notesCount}</div>
                  <div className="text-[11px] text-slate-500">บันทึกโน้ตสรุป</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <Repeat className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.reviewsCount}</div>
                  <div className="text-[11px] text-slate-500">คิวทบทวนเนื้อหา</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.goalsCount}</div>
                  <div className="text-[11px] text-slate-500">เป้าหมายการเรียน</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100/70 text-rose-600 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">{stats.resourcesCount}</div>
                  <div className="text-[11px] text-slate-500">คลังแหล่งเรียนรู้</div>
                </div>
              </div>
            </div>
          </div>

          {/* Import Mode Selection */}
          {isValid && (
            <div className="space-y-2.5 pt-2">
              <fieldset>
                <legend className="text-xs font-semibold text-slate-700 mb-2">
                  เลือกรูปแบบการนำเข้าข้อมูล (Import Mode):
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all min-h-[44px] ${
                      importMode === 'replace'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        แทนที่ข้อมูลทั้งหมด (Replace All)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ล้างข้อมูลเดิมและแทนที่ด้วยข้อมูลจากไฟล์นี้ทั้งหมด (มี Auto Backup ให้ก่อนเสมอ)
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all min-h-[44px] ${
                      importMode === 'merge'
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-400'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        รวมข้อมูลเข้าด้วยกัน (Merge)
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        คงข้อมูลเดิมไว้ และเพิ่มข้อมูลใหม่ที่ไม่ซ้ำ หรืออัปเดตบทเรียนที่มีความก้าวหน้ามากกว่า
                      </div>
                    </div>
                  </label>
                </div>
              </fieldset>
            </div>
          )}

          {/* Safety Notice */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            <span>
              <strong>ระบบความปลอดภัย:</strong> ระบบจะบันทึก Local Snapshot ของข้อมูลปัจจุบันไว้ให้อัตโนมัติก่อนเริ่มนำเข้า สามารถกู้คืนได้ทันทีหากต้องการ
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors focus:ring-2 focus:ring-blue-500"
          >
            ยกเลิก (Cancel)
          </button>
          <button
            type="button"
            disabled={!isValid || !migratedPayload}
            onClick={handleConfirm}
            className="flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-blue-500"
          >
            ยืนยันการนำเข้าข้อมูล
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
