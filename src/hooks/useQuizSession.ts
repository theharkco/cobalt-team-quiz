import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PLAYER_COLORS } from '@/data/questions';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Player, QuizSession, SessionStatus } from '@/types/quiz';

export type { Player, QuizSession, SessionStatus };

function generateJoinCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function useQuizSession() {
  const [session, setSession] = useState<QuizSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refreshPlayers = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false });
    if (data) setPlayers(data as Player[]);
  }, []);

  const subscribeToSession = useCallback((sessionId: string) => {
    // Clean up existing
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`quiz-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quiz_sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) {
          setSession(payload.new as QuizSession);
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        refreshPlayers(sessionId);
      })
      .subscribe();

    channelRef.current = channel;
  }, [refreshPlayers]);

  const createSession = useCallback(async () => {
    const joinCode = generateJoinCode();
    const { data, error: err } = await supabase
      .from('quiz_sessions')
      .insert({ join_code: joinCode })
      .select()
      .single();

    if (err) {
      setError(err.message);
      return null;
    }
    const s = data as QuizSession;
    setSession(s);
    subscribeToSession(s.id);
    refreshPlayers(s.id);
    return s;
  }, [subscribeToSession, refreshPlayers]);

  const joinSession = useCallback(async (joinCode: string, playerName: string) => {
    // Find session
    const { data: sessionData, error: sessionErr } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('join_code', joinCode)
      .single();

    if (sessionErr || !sessionData) {
      setError('Quiz not found! Check the code.');
      return null;
    }

    const s = sessionData as QuizSession;
    if (s.status !== 'lobby') {
      setError('This quiz has already started!');
      return null;
    }

    // Get current player count for color
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('session_id', s.id);

    const colorIndex = (existingPlayers?.length || 0) % PLAYER_COLORS.length;

    // Create player
    const { data: playerData, error: playerErr } = await supabase
      .from('players')
      .insert({
        session_id: s.id,
        name: playerName,
        color: PLAYER_COLORS[colorIndex],
      })
      .select()
      .single();

    if (playerErr) {
      setError(playerErr.message);
      return null;
    }

    const player = playerData as Player;
    setCurrentPlayer(player);
    setSession(s);
    subscribeToSession(s.id);
    refreshPlayers(s.id);
    return player;
  }, [subscribeToSession, refreshPlayers]);

  const updateSessionStatus = useCallback(async (status: SessionStatus, questionIndex?: number) => {
    if (!session) return;
    const update: Record<string, unknown> = { status };
    if (questionIndex !== undefined) update.current_question = questionIndex;
    await supabase.from('quiz_sessions').update(update).eq('id', session.id);
  }, [session]);

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    session,
    players,
    currentPlayer,
    error,
    setError,
    createSession,
    joinSession,
    updateSessionStatus,
    submitAnswer,
    refreshPlayers,
  };
}
