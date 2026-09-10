export interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl?: string;
  previewUrl: string;
}

interface RawResult {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

/**
 * Search Apple's public iTunes catalogue for songs with 30-second preview clips.
 * No API key or login required, CORS-enabled, plays via plain HTML5 audio.
 */
export async function searchITunesTracks(term: string, limit = 8): Promise<ITunesTrack[]> {
  const q = term.trim();
  if (!q) return [];
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not reach the music search');
  const data: { results?: RawResult[] } = await res.json();
  return (data.results ?? [])
    .filter((r): r is RawResult & { previewUrl: string } => Boolean(r.previewUrl))
    .map((r) => ({
      trackId: r.trackId ?? 0,
      trackName: r.trackName ?? 'Unknown track',
      artistName: r.artistName ?? 'Unknown artist',
      collectionName: r.collectionName,
      artworkUrl: r.artworkUrl100,
      previewUrl: r.previewUrl,
    }));
}
