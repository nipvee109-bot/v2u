import type { Resource, ResourceType, ResourceRole } from '../types';

/**
 * Validates if the string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts YouTube 11-char video ID from common URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    // Check shorts format: /shorts/VIDEO_ID
    const shortsMatch = url.match(/\/shorts\/([\w-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  } catch {
    return null;
  }
}

export interface UrlAnalysisResult {
  url: string;
  type: ResourceType;
  provider: string;
  suggestedTitle: string;
  thumbnail?: string;
  canEmbed: boolean;
  suggestedRole: ResourceRole;
  isPlaylist?: boolean;
  isShorts?: boolean;
  videoId?: string;
}

/**
 * Phase 37: Real-World URL Intelligence & Auto-Classification
 */
export function analyzeResourceUrl(rawUrl: string): UrlAnalysisResult {
  const url = (rawUrl || '').trim();
  const lower = url.toLowerCase();

  // Default fallback
  const result: UrlAnalysisResult = {
    url,
    type: 'website',
    provider: 'Web Resource',
    suggestedTitle: '',
    canEmbed: false,
    suggestedRole: 'reference',
  };

  if (!url) return result;

  // 1. YouTube Intelligence (Video, Shorts, Playlist)
  const isYouTube = lower.includes('youtube.com') || lower.includes('youtu.be');
  if (isYouTube) {
    const videoId = extractYouTubeVideoId(url);
    const isPlaylist = lower.includes('list=');
    const isShorts = lower.includes('/shorts/');

    result.type = 'youtube';
    result.provider = 'YouTube';
    result.canEmbed = true;
    result.suggestedRole = 'primary';
    result.isPlaylist = isPlaylist;
    result.isShorts = isShorts;

    if (videoId) {
      result.videoId = videoId;
      result.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      result.suggestedTitle = isShorts ? `YouTube Short (${videoId})` : `YouTube Video (${videoId})`;
    } else if (isPlaylist) {
      result.suggestedTitle = 'YouTube Playlist';
    } else {
      result.suggestedTitle = 'YouTube Video';
    }
    return result;
  }

  // 2. Direct PDF Documents
  const isPdf = lower.endsWith('.pdf') || lower.includes('/pdf/') || lower.includes('type=pdf') || lower.includes('.pdf?');
  if (isPdf) {
    result.type = 'pdf';
    result.canEmbed = true;
    result.suggestedRole = 'reference';

    if (lower.includes('arxiv.org')) {
      result.provider = 'arXiv Research';
      result.suggestedTitle = 'arXiv Research Paper (PDF)';
    } else if (lower.includes('ocw.mit.edu')) {
      result.provider = 'MIT OpenCourseWare';
      result.suggestedTitle = 'MIT Lecture Notes (PDF)';
    } else {
      result.provider = 'PDF Document';
      result.suggestedTitle = extractTitleFromUrl(url) || 'เอกสารประกอบการเรียน (PDF)';
    }
    return result;
  }

  // 3. Known Coding / Practice Platforms
  if (lower.includes('leetcode.com')) {
    result.provider = 'LeetCode';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'LeetCode Problem';
    return result;
  }
  if (lower.includes('kaggle.com')) {
    result.provider = 'Kaggle';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'Kaggle Notebook / Dataset';
    return result;
  }
  if (lower.includes('hackerrank.com')) {
    result.provider = 'HackerRank';
    result.suggestedRole = 'practice';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'HackerRank Challenge';
    return result;
  }

  // 4. Academic & Course Platforms
  if (lower.includes('ocw.mit.edu')) {
    result.provider = 'MIT OpenCourseWare';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'MIT Course Material';
    return result;
  }
  if (lower.includes('coursera.org')) {
    result.provider = 'Coursera';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'Coursera Lecture';
    return result;
  }
  if (lower.includes('edx.org')) {
    result.provider = 'edX';
    result.suggestedRole = 'primary';
    result.canEmbed = false;
    result.suggestedTitle = extractTitleFromUrl(url) || 'edX Course';
    return result;
  }

  // 5. Documentation & Developer Reference
  if (lower.includes('docs.python.org')) {
    result.provider = 'Python Docs';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'Python Official Documentation';
    return result;
  }
  if (lower.includes('developer.mozilla.org') || lower.includes('mdn')) {
    result.provider = 'MDN Web Docs';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'MDN Documentation';
    return result;
  }
  if (lower.includes('github.com')) {
    result.provider = 'GitHub';
    result.suggestedRole = 'practice';
    result.suggestedTitle = extractTitleFromUrl(url) || 'GitHub Repository';
    return result;
  }
  if (lower.includes('wikipedia.org')) {
    result.provider = 'Wikipedia';
    result.suggestedRole = 'reference';
    result.suggestedTitle = extractTitleFromUrl(url) || 'Wikipedia Article';
    return result;
  }

  // 6. Generic Website
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    result.provider = domain;
    result.suggestedTitle = extractTitleFromUrl(url) || `${domain} Guide`;
  } catch {
    result.provider = 'Web Resource';
  }

  return result;
}

/**
 * Extracts a human-friendly title from a URL slug/path
 */
function extractTitleFromUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    let lastSegment = segments[segments.length - 1];
    // Remove extension
    lastSegment = lastSegment.replace(/\.(html|php|asp|pdf)$/i, '');
    // Replace dashes and underscores
    const words = lastSegment.replace(/[-_]+/g, ' ').trim();
    if (!words || words.length < 3) return null;

    // Capitalize words
    return words
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return null;
  }
}

/**
 * Determines or generates a thumbnail URL:
 * - If user provided an existing thumbnail, uses it.
 * - If type is YouTube or URL is YouTube, returns high-res hqdefault thumbnail.
 * - Otherwise returns undefined (UI will render elegant fallback card).
 */
export function getAutoThumbnail(
  url: string,
  type: ResourceType,
  existingThumbnail?: string
): string | undefined {
  if (existingThumbnail && existingThumbnail.trim().length > 0) {
    return existingThumbnail.trim();
  }

  if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  return undefined;
}

/**
 * Detects duplicate resource by normalized URL (case-insensitive, trailing slashes stripped)
 */
export function isDuplicateResource(
  url: string,
  currentId?: string,
  existingResources: Resource[] = []
): boolean {
  if (!url) return false;
  const normalized = url.trim().toLowerCase().replace(/\/+$/, '');
  return existingResources.some(
    (r) => r.id !== currentId && r.url.trim().toLowerCase().replace(/\/+$/, '') === normalized
  );
}
