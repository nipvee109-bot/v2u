import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import type { MediaSource } from '../../video/media';
import { isSafeFrameSrc, isYouTubeBlockingError, OPEN_SOURCE, parseVimeoError, PLAY_IN_V2U } from '../../video/media';
import { parseYouTubeMessage } from '../../video/youtube';

interface Props {
  media: MediaSource;
  title: string;
  /** Real playback time only (YouTube IFrame API / HTML5 video). Never invented. */
  onTimeUpdate?: (seconds: number) => void;
  onEnded?: () => void;
  seekToSeconds?: number | null;
}

/** "ทำไม่ได้ → เปิดต้นทาง": honest message + a link to the source, nothing else. */
export function MediaFallback({ media, title, cause }: { media: MediaSource; title: string; cause: 'error' | 'unsupported' }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5" data-testid="video-fallback" data-reason={cause === 'error' ? 'provider-error' : media.reason}>
      <p className="text-sm font-bold text-ink">{media.provider === 'webpage' || media.provider === 'unsupported' ? 'แหล่งนี้ยังไม่สามารถเล่นใน V2U ได้' : 'คลิปนี้ไม่สามารถเล่นใน V2U ได้'}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {cause === 'error'
          ? 'ผู้ให้บริการไม่อนุญาตให้เล่นคลิปนี้นอกเว็บของเขา หรือคลิปถูกลบ/ตั้งเป็นส่วนตัว — เปิดต้นทางไว้ข้าง ๆ แล้วจดโน้ตใน V2U ต่อได้'
          : 'V2U เล่นได้เฉพาะแหล่งที่ฝังได้อย่างเป็นทางการ — เปิดต้นทางไว้ข้าง ๆ แล้วจดโน้ตใน V2U ต่อได้'}
      </p>
      <p className="mt-2 text-base font-semibold text-ink break-words">{title}</p>
      {media.sourceUrl && (
        <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">
          <ExternalLink className="h-4 w-4" /> {OPEN_SOURCE.replace('↗ ', '')}
        </a>
      )}
    </div>
  );
}

/**
 * One player for every source V2U is allowed to embed. iframe src is always the
 * official URL that resolveMedia() built — and checked again by isSafeFrameSrc().
 * No autoplay: the learner presses play.
 */
export function UniversalVideoPlayer({ media, title, onTimeUpdate, onEnded, seekToSeconds }: Props) {
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isYouTube = media.provider === 'youtube';
  const isVimeo = media.provider === 'vimeo';

  // Provider events: YouTube (time, end, errors) · Vimeo (errors only)
  useEffect(() => {
    if (media.mediaType !== 'iframe') return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (isYouTube) {
        const info = parseYouTubeMessage(e.origin, e.data);
        if (!info) return;
        if (info.error !== undefined && isYouTubeBlockingError(info.error)) setFailed(true);
        if (info.currentTime !== undefined) onTimeUpdate?.(info.currentTime);
        if (info.ended) onEnded?.();
      } else if (isVimeo && parseVimeoError(e.origin, e.data)) setFailed(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [media.mediaType, isYouTube, isVimeo, onTimeUpdate, onEnded]);

  useEffect(() => {
    if (seekToSeconds === null || seekToSeconds === undefined) return;
    if (media.mediaType === 'video' && videoRef.current) videoRef.current.currentTime = seekToSeconds;
    else if (isYouTube) frameRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [seekToSeconds, true] }), 'https://www.youtube.com');
  }, [seekToSeconds, media.mediaType, isYouTube]);

  const onFrameLoad = () => {
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    if (isYouTube) w.postMessage(JSON.stringify({ event: 'listening', id: 'v2u-player', channel: 'widget' }), 'https://www.youtube.com');
    if (isVimeo) w.postMessage(JSON.stringify({ method: 'addEventListener', value: 'error' }), 'https://player.vimeo.com');
  };

  if (!media.embedAllowed) return <MediaFallback media={media} title={title} cause="unsupported" />;
  if (failed) return <MediaFallback media={media} title={title} cause="error" />;

  let player: ReactNode = null;
  if (media.mediaType === 'iframe') {
    let src = media.embedUrl;
    if (isYouTube && src) src += `?enablejsapi=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
    if (isVimeo && src) src += '?dnt=1';
    if (!isSafeFrameSrc(src)) return <MediaFallback media={media} title={title} cause="unsupported" />;
    player = (
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        data-provider={media.provider}
        className="h-full w-full border-0"
        allow="encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={onFrameLoad}
      />
    );
  } else if (media.mediaType === 'video' && media.mediaUrl) {
    // Format the browser can't play → open at source (no conversion, no download)
    if (media.mime && typeof document !== 'undefined' && document.createElement('video').canPlayType(media.mime) === '') {
      return <MediaFallback media={media} title={title} cause="unsupported" />;
    }
    player = (
      <video
        ref={videoRef}
        controls
        preload="metadata"
        playsInline
        className="h-full w-full bg-black"
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onEnded={() => onEnded?.()}
        aria-label={title}
      >
        <source src={media.mediaUrl} type={media.mime} onError={() => setFailed(true)} />
      </video>
    );
  }
  if (!player) return <MediaFallback media={media} title={title} cause="unsupported" />;

  return (
    <div className="space-y-1.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-xl" data-testid="universal-player" data-provider={media.provider}>
        {player}
      </div>
      <p className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800" data-testid="play-in-v2u">{PLAY_IN_V2U}</span>
        {media.sourceUrl && (
          <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 px-1 font-semibold text-slate-600 hover:text-brand-700">
            {OPEN_SOURCE} {media.providerName ? `(${media.providerName})` : ''}
          </a>
        )}
      </p>
    </div>
  );
}
