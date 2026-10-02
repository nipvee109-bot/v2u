import React, { useState } from 'react';
import { ExternalLink, FileText, Globe, AlertCircle, WifiOff, BookOpen } from 'lucide-react';
import type { Resource } from '../../types';
import { YouTubePlayer } from './YouTubePlayer';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface ResourceViewerProps {
  resource: Resource | null;
  onTimeUpdate?: (seconds: number) => void;
  seekToSeconds?: number | null;
  /** Phase 49: V2U's curated recommendation, shown when no resource is selected. */
  suggestion?: { title: string; locator: string };
}

export const ResourceViewer: React.FC<ResourceViewerProps> = ({
  resource,
  onTimeUpdate,
  seekToSeconds,
  suggestion,
}) => {
  const [iframeError, setIframeError] = useState(false);
  const { isOnline } = useNetworkStatus();

  if (!resource) {
    return (
      <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-8 text-white text-center shadow-lg">
        <FileText className="w-12 h-12 text-slate-600 mb-3" />
        <h4 className="text-base font-bold text-slate-300">ยังไม่ได้เลือกแหล่งเรียนรู้</h4>
        {suggestion ? (
          <div className="mt-2 max-w-sm text-xs text-slate-300">
            <p className="font-semibold text-white">V2U แนะนำ: {suggestion.title}</p>
            <p className="mt-1 text-slate-400">หาได้ที่: {suggestion.locator}</p>
            <p className="mt-1 text-slate-500">เปิดเรียนจากแหล่งนี้ แล้วจดสิ่งที่เรียนรู้ในสมุดโน้ตด้านล่าง</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            เลือกสื่อจากรายการด้านบน หรือกดเพิ่มแหล่งเรียนรู้ใหม่เพื่อเริ่มศึกษา
          </p>
        )}
      </div>
    );
  }

  // Phase 39: Offline Fallback for Online Media (YouTube)
  if (!isOnline && resource.type === 'youtube') {
    return (
      <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-amber-900/40 flex flex-col items-center justify-center p-8 text-white text-center shadow-xl relative overflow-hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-3">
          <WifiOff className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-base font-bold text-slate-200">
          ไม่สามารถสตรีมวิดีโอ YouTube ขณะออฟไลน์
        </h4>
        <p className="text-xs text-slate-400 mt-1.5 max-w-md">
          คุณกำลังศึกษา: <span className="text-amber-300 font-semibold">{resource.title}</span>
          <br />
          คุณสามารถอ่านหนังสือ ตำรา หรือชีทสรุปแบบออฟไลน์ พร้อมจับเวลาและจดบันทึกในห้องเรียนได้ตามปกติ ข้อมูลจะถูกบันทึกไว้อย่างปลอดภัย
        </p>
        <div className="flex items-center gap-2 mt-5">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            โหมดเรียนออฟไลน์ (Offline Study Active)
          </span>
        </div>
      </div>
    );
  }

  // 1. YouTube
  if (resource.type === 'youtube') {
    return (
      <YouTubePlayer
        url={resource.url}
        title={resource.title}
        thumbnail={resource.thumbnail}
        onTimeUpdate={onTimeUpdate}
        seekToSeconds={seekToSeconds}
      />
    );
  }

  // 2. PDF Document
  if (resource.type === 'pdf') {
    return (
      <div className="relative w-full aspect-video sm:h-[480px] lg:h-[540px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-white text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded-md bg-red-600/30 text-red-300 text-[10px] font-bold border border-red-500/30">
              PDF
            </span>
            <span className="font-semibold truncate">{resource.title}</span>
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิดไฟล์เต็มหน้าจอ
          </a>
        </div>

        {/* Embedded Viewer with Fallback */}
        <div className="flex-1 relative bg-slate-800">
          <iframe
            src={`${resource.url}#view=FitH`}
            title={resource.title}
            className="w-full h-full border-0"
            onError={() => setIframeError(true)}
          />

          {iframeError && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center text-white">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm font-bold">บราวเซอร์อาจปิดกั้นการแสดงผล PDF ในเฟรม</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                คุณสามารถเปิดไฟล์ PDF นี้ในแท็บใหม่เพื่ออ่านคู่กับการจับเวลาเรียน
              </p>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                เปิดอ่าน PDF โดยตรง
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Website or Document
  if (resource.type === 'website' || resource.type === 'document') {
    return (
      <div className="relative w-full aspect-video sm:h-[480px] lg:h-[540px] rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex flex-col">
        {/* Web Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-white text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 text-[10px] font-bold border border-blue-500/30">
              {resource.type === 'document' ? 'Document' : 'Website'}
            </span>
            <span className="font-semibold truncate">{resource.title}</span>
          </div>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิดเว็บไซต์ในแท็บใหม่
          </a>
        </div>

        {/* Embedded Iframe */}
        <div className="flex-1 relative bg-slate-800">
          <iframe
            src={resource.url}
            title={resource.title}
            className="w-full h-full border-0"
            onError={() => setIframeError(true)}
          />

          {/* Fallback Banner at bottom of web frame */}
          <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl p-2.5 text-white flex items-center gap-2 text-xs shadow-lg">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              หากเว็บไม่โหลดเนื่องจากความปลอดภัย
            </span>
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold underline text-[11px]"
            >
              เปิดภายนอก &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 4. Image / Diagram
  if (resource.type === 'image') {
    return (
      <div className="relative w-full aspect-video rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl flex items-center justify-center p-4">
        <img
          src={resource.url}
          alt={resource.title}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold hover:bg-black transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          ดูภาพขนาดเต็ม
        </a>
      </div>
    );
  }

  // 5. Other Resource Fallback
  return (
    <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-white text-center shadow-lg">
      <FileText className="w-12 h-12 text-slate-500 mb-3" />
      <h4 className="text-base font-bold text-white">{resource.title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        {resource.description || 'แหล่งเรียนรู้นี้เปิดผ่านลิงก์ภายนอกได้โดยตรง'}
      </p>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        เปิดแหล่งเรียนรู้นี้
      </a>
    </div>
  );
};
