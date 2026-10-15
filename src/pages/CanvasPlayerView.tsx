import { useParams } from 'react-router-dom';
import CanvasParticipantView from '@/components/canvas/CanvasParticipantView';
import { useCanvasGame, useNow } from '@/hooks/useCanvasGame';

export default function CanvasPlayerView() {
  const { sessionId, playerId } = useParams<{ sessionId: string; playerId: string }>();
  const state = useCanvasGame(sessionId);
  const now = useNow();
  return <CanvasParticipantView state={state} playerId={playerId} now={now} />;
}
