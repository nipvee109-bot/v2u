import type { Resource, ResourceType } from '../types';

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
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
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
