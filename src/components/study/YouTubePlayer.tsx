import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';

interface YouTubePlayerProps {
  url: string;
  title: string;
  thumbnail?: string;
  onTimeUpdate?: (seconds: number) => void;
  seekToSeconds?: number | null;
}

/**
 * Extracts 11-character YouTube video ID from supported URL patterns.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatVideoTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  url,
  title,
  thumbnail,
  onTimeUpdate,
  seekToSeconds,
}) => {
  const videoId = extractYouTubeVideoId(url);
  const [embedError, setEmbedError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // If seeking is requested externally (e.g. from timestamped notes)
  useEffect(() => {
    if (seekToSeconds !== null && seekToSeconds !== undefined && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func: 'seekTo', args: [seekToSeconds, true] }),
          '*'
        );
        if (onTimeUpdate) onTimeUpdate(seekToSeconds);
      } catch (err) {
        console.warn('Could not postMessage seekTo to iframe:', err);
      }
    }
  }, [seekToSeconds, onTimeUpdate]);

  // Fallback if URL is invalid YouTube URL or user reported embed failed
  if (!videoId || embedError) {
    return (
      <div className="relative w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 text-white text-center shadow-lg">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-xs"
          />
        )}
        <div className="relative z-10 max-w-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white line-clamp-1">{title}</h4>
            <p className="text-xs text-slate-400 mt-1">
              วิดีโอนี้อาจปิดกั้นการฝัง (Embedding Restricted) หรือ URL ไม่รองรับ
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              เปิดดูบน YouTube โดยตรง
            </a>
            {embedError && (
              <button
                type="button"
                onClick={() => setEmbedError(false)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ลองโหลดใหม่
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Valid YouTube video
  const embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : ''
  )}&rel=0`;

  return (
    <div className="relative w-full aspect-video rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-xl group">
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title={title}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onError={() => setEmbedError(true)}
      />

      {/* Floating External Open Button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="เปิดในแท็บใหม่บน YouTube"
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-[11px] font-semibold backdrop-blur-xs border border-white/10"
      >
        <ExternalLink className="w-3 h-3" />
        <span>YouTube</span>
      </a>
    </div>
  );
};
