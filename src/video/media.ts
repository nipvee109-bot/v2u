/**
 * Phase 58 — Universal video source resolution. SAFE EMBED ONLY.
 *
 *   ทำได้ → ฝังใน V2U · ทำไม่ได้ → เปิดต้นทาง · เสี่ยง → ไม่ฝัง
 *
 * Every embed URL is BUILT here from a strictly parsed id on an allowlisted
 * provider — never copied from a resource, a user or a query parameter. No proxy,
 * no scraping, no URL tricks to get around X-Frame-Options / CSP. Embedding has
 * nothing to do with verification: a resource's status is never changed here.
 */
import { parseYouTubeVideoId } from './youtube';

export type MediaProvider = 'youtube' | 'vimeo' | 'official-embed' | 'direct' | 'webpage' | 'unsupported';
/** iframe = official provider player · video = HTML5 <video> · link = open the source */
export type MediaType = 'iframe' | 'video' | 'link';

export interface MediaSource {
  provider: MediaProvider;
  /** Sanitized https URL to open at the source (absent when the input was unsafe) */
  sourceUrl?: string;
  /** Official player URL built by V2U (iframe providers only) */
  embedUrl?: string;
  /** Direct media URL for <video> (direct only) */
  mediaUrl?: string;
  videoId?: string;
  mediaType: MediaType;
  embedAllowed: boolean;
  /** Human name of the provider, e.g. "YouTube" */
  providerName?: string;
  /** For direct video: the MIME type the browser must support */
  mime?: string;
  /** Why it can't play in V2U (plain reason code) */
  reason?: 'unsafe-url' | 'http' | 'not-video-provider' | 'bad-id' | 'host-not-allowed' | 'unknown-format';
}

/* ── Allowlists ─────────────────────────────────────────────────────── */

export interface OfficialEmbedProvider {
  id: string;
  name: string;
  /** Hostnames whose watch pages we recognise */
  hosts: string[];
  /** Strict id from a watch URL path; null when not recognised */
  parseId: (u: URL) => string | null;
  /** Official, documented player URL for that id */
  embed: (id: string) => string;
  /** Documentation of the official embed */
  docs: string;
}

/** Providers with a documented official embed player. Anything else → open at source. */
export const OFFICIAL_EMBED_PROVIDERS: OfficialEmbedProvider[] = [
  {
    id: 'dailymotion',
    name: 'Dailymotion',
    hosts: ['www.dailymotion.com', 'dailymotion.com', 'dai.ly'],
    parseId: (u) => {
      const m = u.hostname === 'dai.ly' ? u.pathname.match(/^\/([a-z0-9]{6,8})$/i) : u.pathname.match(/^\/(?:embed\/)?video\/([a-z0-9]{6,8})(?:[_/].*)?$/i);
      return m ? m[1] : null;
    },
    embed: (id) => `https://www.dailymotion.com/embed/video/${id}`,
    docs: 'https://developers.dailymotion.com/player/',
  },
  {
    id: 'ted',
    name: 'TED',
    hosts: ['www.ted.com', 'ted.com', 'embed.ted.com'],
    parseId: (u) => {
      const m = u.pathname.match(/^\/talks\/([a-z0-9_]{3,120})\/?$/);
      return m ? m[1] : null;
    },
    embed: (id) => `https://embed.ted.com/talks/${id}`,
    docs: 'https://www.ted.com/about/our-organization/our-policies-terms/ted-talks-usage-policy',
  },
];

/** iframe src hosts V2U may ever render (built URLs only). */
export const EMBED_FRAME_HOSTS = new Set(['www.youtube.com', 'player.vimeo.com', 'www.dailymotion.com', 'embed.ted.com']);

/** Hosts allowed to serve direct video files. Empty by default — nothing is assumed. */
export const DIRECT_VIDEO_HOSTS: string[] = [];

const DIRECT_EXT: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogg: 'video/ogg', ogv: 'video/ogg' };
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

/* ── Sanitizing ─────────────────────────────────────────────────────── */

/** https URL or null. Rejects javascript:, data:, blob:, file:, http:, credentials and control characters. */
export function sanitizeMediaUrl(raw: string | undefined | null): { url: URL | null; reason?: MediaSource['reason'] } {
  if (!raw || typeof raw !== 'string') return { url: null, reason: 'unsafe-url' };
  const s = raw.trim();
  // eslint-disable-next-line no-control-regex
  if (s.length > 2048 || /[\u0000-\u001f\u007f<>"'`\s]/.test(s)) return { url: null, reason: 'unsafe-url' };
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { url: null, reason: 'unsafe-url' };
  }
  if (u.protocol === 'http:') return { url: null, reason: 'http' };
  if (u.protocol !== 'https:' || u.username || u.password || !u.hostname.includes('.')) return { url: null, reason: 'unsafe-url' };
  return { url: u };
}

const link = (sourceUrl: string | undefined, reason: MediaSource['reason'], provider: MediaProvider = 'webpage'): MediaSource => ({
  provider,
  sourceUrl,
  mediaType: 'link',
  embedAllowed: false,
  reason,
});

export interface ResolveOptions {
  /** Extra hosts allowed for direct video files (e.g. V2U's own origin host) */
  directHosts?: string[];
  /** Whether this browser can play a MIME type (HTMLMediaElement.canPlayType) */
  canPlay?: (mime: string) => boolean;
}

/** Decide how a URL can be played. Unknown or risky → open at source. */
export function resolveMedia(raw: string | undefined | null, opts: ResolveOptions = {}): MediaSource {
  const { url: u, reason } = sanitizeMediaUrl(raw);
  if (!u) return link(undefined, reason, 'unsupported');
  const host = u.hostname.toLowerCase();
  const sourceUrl = u.toString();

  // 1. YouTube — strict 11-char id → official embed
  if (/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|^youtu\.be$/.test(host)) {
    const id = parseYouTubeVideoId(sourceUrl);
    if (!id) return link(sourceUrl, 'bad-id', 'youtube');
    return { provider: 'youtube', providerName: 'YouTube', sourceUrl, videoId: id, embedUrl: `https://www.youtube.com/embed/${id}`, mediaType: 'iframe', embedAllowed: true };
  }

  // 2. Vimeo — numeric id only from known URL shapes; never guessed
  if (VIMEO_HOSTS.has(host)) {
    const m = host === 'player.vimeo.com' ? u.pathname.match(/^\/video\/(\d{6,12})\/?$/) : u.pathname.match(/^\/(\d{6,12})\/?$/);
    if (!m) return link(sourceUrl, 'bad-id', 'vimeo');
    return { provider: 'vimeo', providerName: 'Vimeo', sourceUrl, videoId: m[1], embedUrl: `https://player.vimeo.com/video/${m[1]}`, mediaType: 'iframe', embedAllowed: true };
  }

  // 3. Official embed providers (allowlist)
  const official = OFFICIAL_EMBED_PROVIDERS.find((p) => p.hosts.includes(host));
  if (official) {
    const id = official.parseId(u);
    if (!id) return link(sourceUrl, 'bad-id', 'official-embed');
    return { provider: 'official-embed', providerName: official.name, sourceUrl, videoId: id, embedUrl: official.embed(id), mediaType: 'iframe', embedAllowed: true };
  }

  // 4. Direct video file on an allowed host
  const ext = u.pathname.toLowerCase().match(/\.([a-z0-9]{2,4})$/)?.[1];
  if (ext && DIRECT_EXT[ext]) {
    const hosts = [...DIRECT_VIDEO_HOSTS, ...(opts.directHosts ?? [])].map((h) => h.toLowerCase());
    if (!hosts.includes(host)) return link(sourceUrl, 'host-not-allowed', 'direct');
    const mime = DIRECT_EXT[ext];
    if (opts.canPlay && !opts.canPlay(mime)) return link(sourceUrl, 'unknown-format', 'direct');
    return { provider: 'direct', providerName: host, sourceUrl, mediaUrl: sourceUrl, mime, mediaType: 'video', embedAllowed: true };
  }

  // 5. Ordinary webpage — never iframed, proxied or scraped
  return link(sourceUrl, 'not-video-provider');
}

/** Final guard before rendering an iframe: only URLs V2U built for allowlisted hosts. */
export function isSafeFrameSrc(src: string | undefined): boolean {
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.protocol === 'https:' && EMBED_FRAME_HOSTS.has(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** Plain-Thai label so "play here" and "open the source" are never confused. */
export const PLAY_IN_V2U = '▶️ เล่นใน V2U';
export const OPEN_SOURCE = '↗ เปิดต้นทาง';
export const capabilityLabel = (m: MediaSource) => (m.embedAllowed ? PLAY_IN_V2U : OPEN_SOURCE);

/** Vimeo player postMessage → error only (V2U shows no Vimeo timestamps). Only player.vimeo.com counts. */
export function parseVimeoError(origin: string, data: unknown): boolean {
  if (origin !== 'https://player.vimeo.com') return false;
  let msg: unknown = data;
  if (typeof data === 'string') {
    try {
      msg = JSON.parse(data);
    } catch {
      return false;
    }
  }
  return !!msg && typeof msg === 'object' && (msg as { event?: string }).event === 'error';
}

/** YouTube IFrame API errors that mean "cannot play here" → fall back to the source. */
export const isYouTubeBlockingError = (code: number) => [2, 5, 100, 101, 150, 153].includes(code);
