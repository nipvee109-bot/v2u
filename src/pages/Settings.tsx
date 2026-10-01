import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  Download,
  Upload,
  RotateCcw,
  Monitor,
  Moon,
  Sun,
  ShieldCheck,
  History,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  createExportPayload,
  validateAndParseImport,
  createLocalBackupSnapshot,
  getLocalBackupSnapshots,
  deleteLocalBackupSnapshot,
  mergePayloadWithExisting,
  type FullBackupPayload,
  type ValidationResult,
  type BackupSnapshot,
} from '../utils/integrityUtils';
import { ImportPreviewModal } from '../components/integrity/ImportPreviewModal';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export function Settings() {
  const {
    theme,
    setTheme,
    lessons,
    unclearTopics,
    sessions,
    weeklyGoal,
    learningSessionsHistory,
    reviewQueue,
    goals,
    resources,
    hasCompletedOnboarding,
    importData,
    resetToInitial,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import Preview State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Snapshots State
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load snapshots on mount
  useEffect(() => {
    refreshSnapshots();
  }, []);

  const refreshSnapshots = () => {
    setSnapshots(getLocalBackupSnapshots());
  };

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Helper to get current full backup payload
  const getCurrentPayload = (): FullBackupPayload => {
    return createExportPayload({
      lessons,
      sessions,
      learningSessionsHistory,
      unclearTopics,
      weeklyGoal,
      reviewQueue,
      goals,
      resources,
      hasCompletedOnboarding,
    });
  };

  // 1. Export Handler (Full v4 schema + metadata + checksum)
  const handleExport = () => {
    try {
      const payload = getCurrentPayload();
      const dataStr = JSON.stringify(payload, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `engineering-study-hub-backup-${dateStr}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', filename);
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      showToast('success', `ส่งออกข้อมูลสำรองเวอร์ชัน ${payload.schemaVersion} เรียบร้อยแล้ว`);
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
  };

  // 2. Select File for Import (Does NOT mutate store yet; triggers validation)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateAndParseImport(content);
      setValidationResult(result);
      setPreviewModalOpen(true);
      // Reset input value so user can re-select the same file if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showToast('error', 'ไม่สามารถอ่านไฟล์ได้');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // 3. Confirm Import from Modal (Replace or Merge)
  const handleConfirmImport = (migratedPayload: FullBackupPayload, mode: 'replace' | 'merge') => {
    try {
      // 1. Automatically create local snapshot of current data before overwriting!
      const currentPayload = getCurrentPayload();
      createLocalBackupSnapshot(currentPayload, 'auto_before_import');

      let finalPayload = migratedPayload;
      if (mode === 'merge') {
        finalPayload = mergePayloadWithExisting(currentPayload, migratedPayload);
      }

      // 2. Apply to store
      importData({
        lessons: finalPayload.lessons,
        unclearTopics: finalPayload.unclearTopics,
        sessions: finalPayload.sessions,
        weeklyGoal: finalPayload.weeklyGoal,
        learningSessionsHistory: finalPayload.learningSessionsHistory,
        reviewQueue: finalPayload.reviewQueue,
        goals: finalPayload.goals,
        resources: finalPayload.resources,
        hasCompletedOnboarding: finalPayload.hasCompletedOnboarding,
      });

      // 3. Close modal & refresh snapshot list
      setPreviewModalOpen(false);
      refreshSnapshots();

      const modeText = mode === 'replace' ? 'แทนที่ข้อมูลทั้งหมด' : 'รวมข้อมูลเข้าด้วยกัน';
      showToast(
        'success',
        `นำเข้าข้อมูลสำเร็จ (${modeText})! ระบบได้สำรองข้อมูลเดิมไว้ใน Local Snapshots อัตโนมัติ`
      );
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดระหว่างการนำเข้าข้อมูล');
    }
  };

  // 4. Safe Reset to Initial Data (with auto snapshot!)
  const handleReset = () => {
    const confirmed = window.confirm(
      'คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลทั้งหมด?\n\n* ระบบจะสร้างจุดสำรองข้อมูลอัตโนมัติ (Auto Backup) ไว้ให้ คุณสามารถกู้คืนได้เสมอ'
    );
    if (!confirmed) return;

    try {
      const currentPayload = getCurrentPayload();
      createLocalBackupSnapshot(currentPayload, 'auto_before_reset');
      resetToInitial();
      refreshSnapshots();
      showToast('info', 'รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้นแล้ว (บันทึกจุดสำรองไว้ในประวัติเรียบร้อย)');
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการรีเซ็ตข้อมูล');
    }
  };

  // 5. Create Manual Snapshot
  const handleCreateManualSnapshot = () => {
    try {
      const currentPayload = getCurrentPayload();
      createLocalBackupSnapshot(currentPayload, 'manual');
      refreshSnapshots();
      showToast('success', 'บันทึกจุดสำรองข้อมูล (Snapshot) สำเร็จ');
    } catch {
      showToast('error', 'ไม่สามารถสร้างจุดสำรองข้อมูลได้');
    }
  };

  // 6. Restore from Snapshot
  const handleRestoreSnapshot = (snapshot: BackupSnapshot) => {
    const confirmed = window.confirm(
      `คุณต้องการกู้คืนข้อมูลจาก "${snapshot.label}" หรือไม่?\n\n(ระบบจะสำรองข้อมูลปัจจุบันไว้ก่อนเริ่มกู้คืน)`
    );
    if (!confirmed) return;

    try {
      // Auto backup current first
      const currentPayload = getCurrentPayload();
      createLocalBackupSnapshot(currentPayload, 'manual', 'สำรองก่อนกู้คืน Snapshot');

      // Apply snapshot
      const p = snapshot.payload;
      importData({
        lessons: p.lessons,
        unclearTopics: p.unclearTopics,
        sessions: p.sessions,
        weeklyGoal: p.weeklyGoal,
        learningSessionsHistory: p.learningSessionsHistory,
        reviewQueue: p.reviewQueue,
        goals: p.goals,
        resources: p.resources,
        hasCompletedOnboarding: p.hasCompletedOnboarding,
      });

      refreshSnapshots();
      showToast('success', `กู้คืนข้อมูลจาก "${snapshot.label}" สำเร็จ`);
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการกู้คืนข้อมูล');
    }
  };

  // 7. Download Snapshot as JSON file
  const handleDownloadSnapshot = (snapshot: BackupSnapshot) => {
    try {
      const dataStr = JSON.stringify(snapshot.payload, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const dateStr = format(new Date(snapshot.createdAt), 'yyyy-MM-dd_HHmm');
      const filename = `snapshot-${dateStr}.json`;

      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      showToast('error', 'ไม่สามารถดาวน์โหลดไฟล์ snapshot ได้');
    }
  };

  // 8. Delete Snapshot
  const handleDeleteSnapshot = (snapshotId: string) => {
    deleteLocalBackupSnapshot(snapshotId);
    refreshSnapshots();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าและความปลอดภัยของข้อมูล</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            จัดการธีมหน้าจอ, สำรองข้อมูลทุกโมดูล, ตรวจสอบความถูกต้องก่อนนำเข้า และกู้คืนข้อมูล
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Schema v4 Active
          </span>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        {/* Theme Settings */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
            <Monitor className="w-5 h-5 text-blue-600" /> ธีมหน้าจอ (Theme)
          </h2>
          <p className="text-sm text-slate-500 mb-4">เลือกรูปแบบการแสดงผลของแอปพลิเคชัน</p>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[48px] ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-sm font-semibold'
                  : 'border-slate-100 hover:border-slate-200 text-slate-600'
              }`}
            >
              <Sun className="w-6 h-6" aria-hidden="true" /> สว่าง (Light)
            </button>
            <button
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[48px] ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-sm font-semibold'
                  : 'border-slate-100 hover:border-slate-200 text-slate-600'
              }`}
            >
              <Moon className="w-6 h-6" aria-hidden="true" /> มืด (Dark)
            </button>
            <button
              onClick={() => setTheme('system')}
              aria-pressed={theme === 'system'}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[48px] ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-700 shadow-sm font-semibold'
                  : 'border-slate-100 hover:border-slate-200 text-slate-600'
              }`}
            >
              <Monitor className="w-6 h-6" aria-hidden="true" /> ระบบ (System)
            </button>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Data Backup & Restore Center */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-600" /> สำรองและนำเข้าข้อมูล (Data Backup & Restore)
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                ส่งออกข้อมูลทั้งหมดเป็น JSON ที่มี Checksum หรือนำเข้าไฟล์พร้อมระบบตรวจสอบและป้องกันข้อมูลสูญหาย
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Card */}
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2.5 font-bold text-slate-800 text-base">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  ส่งออกข้อมูลเต็มรูปแบบ (Export)
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  ดาวน์โหลดข้อมูลทั้งหมด: บทเรียน, ความก้าวหน้า, บันทึกโน้ต, คิวทบทวน (Review Queue), เป้าหมาย 6 เดือน, และคลังแหล่งเรียนรู้ พร้อม Metadata และ Checksum Hash
                </p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-colors text-sm"
              >
                <Download className="w-4 h-4" /> Export Backup (v4 JSON)
              </button>
            </div>

            {/* Import Card */}
            <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2.5 font-bold text-slate-800 text-base">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  นำเข้าข้อมูลอย่างปลอดภัย (Safe Import)
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  ตรวจสอบโครงสร้างข้อมูลก่อนนำเข้า รองรับไฟล์เวอร์ชันเก่าทั้งหมด (v1, v2, v3, v4) พร้อมหน้าต่าง Preview สรุปข้อมูล และตัวเลือกว่าจะเขียนทับหรือรวมเข้ากับข้อมูลเดิม
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-colors text-sm"
                >
                  <Upload className="w-4 h-4 text-emerald-600" /> นำเข้าไฟล์ข้อมูล (Import File)
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Automatic Local Backup Snapshots Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" /> จุดสำรองข้อมูลในเครื่อง (Local Backup Snapshots)
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                ระบบจะบันทึก Snapshot อัตโนมัติ (เก็บสูงสุด 5 จุดล่าสุด) ก่อนการนำเข้าหรือรีเซ็ตข้อมูล เพื่อให้คุณกู้คืนได้ทันที
              </p>
            </div>
            <button
              onClick={handleCreateManualSnapshot}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" /> สร้างจุดสำรองข้อมูลเดี๋ยวนี้
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <History className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <div className="text-sm font-semibold text-slate-600">ยังไม่มี Snapshot ในเครื่อง</div>
              <div className="text-xs text-slate-400 mt-0.5">
                เมื่อคุณนำเข้าข้อมูลหรือรีเซ็ต ระบบจะสร้างจุดสำรองไว้ที่นี่ให้อัตโนมัติ
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800">{snap.label}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          snap.reason === 'auto_before_import'
                            ? 'bg-amber-100 text-amber-800'
                            : snap.reason === 'auto_before_reset'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {snap.reason === 'auto_before_import'
                          ? 'ก่อนนำเข้า'
                          : snap.reason === 'auto_before_reset'
                          ? 'ก่อนรีเซ็ต'
                          : 'สำรองด้วยตนเอง'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {format(new Date(snap.createdAt), 'dd MMM yyyy, HH:mm น.', { locale: th })}
                      </span>
                      <span>•</span>
                      <span>{snap.stats.lessonsCount} บทเรียน ({snap.stats.completedLessonsCount} จบ)</span>
                      <span>•</span>
                      <span>{snap.stats.sessionsCount} เซสชัน</span>
                      <span>•</span>
                      <span>{snap.stats.reviewsCount} รายการทบทวน</span>
                      <span>•</span>
                      <span>{snap.stats.goalsCount} เป้าหมาย</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="min-h-[38px] px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> กู้คืน (Restore)
                    </button>
                    <button
                      onClick={() => handleDownloadSnapshot(snap)}
                      className="w-9 h-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center"
                      aria-label={`ดาวน์โหลดจุดสำรอง ${snap.label}`}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handleDeleteSnapshot(snap.id)}
                      className="w-9 h-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center"
                      aria-label={`ลบจุดสำรอง ${snap.label}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Danger Zone: Reset */}
        <div>
          <h2 className="text-lg font-bold text-rose-600 mb-2 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" aria-hidden="true" /> รีเซ็ตข้อมูลกลับสู่ค่าเริ่มต้น (Reset to Default)
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            ล้างข้อมูลความคืบหน้าทั้งหมดและกลับสู่ชุดข้อมูลตั้งต้น (ระบบจะสร้าง Auto Backup ไว้ใน Local Snapshots ให้ก่อนรีเซ็ตเสมอ)
          </p>
          <button
            onClick={handleReset}
            className="min-h-[44px] flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> รีเซ็ตข้อมูล (Reset Data)
          </button>
        </div>
      </div>

      {/* Import Preview Modal */}
      <ImportPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        validationResult={validationResult}
        onConfirmImport={handleConfirmImport}
      />
    </div>
  );
}
