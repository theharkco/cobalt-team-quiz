import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchITunesTracks, type ITunesTrack } from '@/lib/itunes';

interface Props {
  previewUrl: string;
  trackName: string;
  artistName: string;
  onSelect: (track: { previewUrl: string; trackName: string; artistName: string }) => void;
}

export default function MusicTrackPicker({ previewUrl, trackName, artistName, onSelect }: Props) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ITunesTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    try {
      const tracks = await searchITunesTracks(term);
      setResults(tracks);
      if (tracks.length === 0) setError('No songs found with a playable clip. Try another spelling.');
    } catch {
      setError('Could not search right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-body text-muted-foreground block">Song clip (30 seconds, plays automatically)</label>

      <div className="flex gap-2">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          placeholder="Search song or artist…"
          className="bg-muted border-border text-foreground"
        />
        <Button type="button" onClick={search} disabled={loading || !term.trim()}>
          {loading ? 'Searching…' : 'Search'}
        </Button>
      </div>

      {error && <p className="text-sm font-body text-destructive">{error}</p>}

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border-2 border-border p-2">
          {results.map((t) => (
            <div key={`${t.trackId}-${t.previewUrl}`} className="flex items-center gap-3 bg-muted rounded-lg p-2">
              {t.artworkUrl && <img src={t.artworkUrl} alt="" className="w-10 h-10 rounded" />}
              <div className="flex-1 min-w-0">
                <p className="font-body font-bold text-foreground text-sm truncate">{t.trackName}</p>
                <p className="font-body text-muted-foreground text-xs truncate">{t.artistName}</p>
              </div>
              <audio src={t.previewUrl} controls preload="none" className="h-8 w-40" />
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onSelect({ previewUrl: t.previewUrl, trackName: t.trackName, artistName: t.artistName })
                }
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-quiz-green/60 bg-quiz-green/10 p-3">
          <div className="flex-1 min-w-0">
            <p className="font-body font-bold text-foreground text-sm truncate">
              ✓ {trackName || 'Selected clip'}
            </p>
            {artistName && <p className="font-body text-muted-foreground text-xs truncate">{artistName}</p>}
          </div>
          <audio src={previewUrl} controls preload="none" className="h-8 w-40" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelect({ previewUrl: '', trackName: '', artistName: '' })}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
