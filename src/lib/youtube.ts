/** Helpers for treating an exercise's `guideImageUrl` as a YouTube link. */

/** Pull the 11-char video id out of any common YouTube URL form, or null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatch(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}
