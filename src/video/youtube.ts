/** Strict YouTube video id from a real YouTube URL — never guessed. */
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);
const ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (!YT_HOSTS.has(u.hostname.toLowerCase())) return null;
  let id: string | null = null;
  if (u.hostname.toLowerCase() === 'youtu.be') id = u.pathname.split('/')[1] ?? null;
  else if (u.pathname === '/watch') id = u.searchParams.get('v');
  else {
    const m = u.pathname.match(/^\/(embed|shorts|v|live)\/([^/?#]+)/);
    id = m ? m[2] : null;
  }
  return id && ID.test(id) ? id : null;
}

/* YouTube embed messages (iframe "infoDelivery"). Only messages from YouTube
   origins that carry a numeric currentTime count — so V2U never invents time. */

const YT_ORIGIN = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)$/;

export interface YouTubeInfo {
  currentTime?: number;
  ended?: boolean;
  duration?: number;
  /** IFrame API error: 2 bad id, 5 html5, 100 removed/private, 101/150 embedding not allowed */
  error?: number;
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
  const m = msg as { event?: string; info?: Record<string, unknown> | number };
  if (m.event === 'onError' && typeof m.info === 'number') return { error: m.info };
  if (m.event !== 'infoDelivery' || !m.info || typeof m.info !== 'object') return null;
  const out: YouTubeInfo = {};
  if (typeof m.info.currentTime === 'number' && Number.isFinite(m.info.currentTime)) out.currentTime = m.info.currentTime;
  if (typeof m.info.duration === 'number' && m.info.duration > 0) out.duration = m.info.duration;
  // playerState 0 = ended
  if (m.info.playerState === 0) out.ended = true;
  return out.currentTime !== undefined || out.ended || out.duration !== undefined ? out : null;
}
