/* YouTube embed messages (iframe "infoDelivery"). Only messages from YouTube
   origins that carry a numeric currentTime count — so V2U never invents time. */

const YT_ORIGIN = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)$/;

export interface YouTubeInfo {
  currentTime?: number;
  ended?: boolean;
  duration?: number;
}

export function parseYouTubeMessage(origin: string, data: unknown): YouTubeInfo | null {
  if (!YT_ORIGIN.test(origin)) return null;
  let msg: unknown = data;
  if (typeof data === 'string') {
    try {
      msg = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!msg || typeof msg !== 'object') return null;
  const m = msg as { event?: string; info?: Record<string, unknown> };
  if (m.event !== 'infoDelivery' || !m.info || typeof m.info !== 'object') return null;
  const out: YouTubeInfo = {};
  if (typeof m.info.currentTime === 'number' && Number.isFinite(m.info.currentTime)) out.currentTime = m.info.currentTime;
  if (typeof m.info.duration === 'number' && m.info.duration > 0) out.duration = m.info.duration;
  // playerState 0 = ended
  if (m.info.playerState === 0) out.ended = true;
  return out.currentTime !== undefined || out.ended || out.duration !== undefined ? out : null;
}
