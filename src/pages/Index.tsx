import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FloatingShapes from '@/components/quiz/FloatingShapes';
import QuizPicker from '@/components/quiz/QuizPicker';
import { useQuizSession } from '@/hooks/useQuizSession';
import { supabase } from '@/integrations/supabase/client';
import type { QuizQuestion } from '@/data/questionTypes';

const Index = () => {
  const navigate = useNavigate();
  const { createSession, joinSession, findSession, error, setError } = useQuizSession();
  const [showJoin, setShowJoin] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [codeOk, setCodeOk] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleHost = async (questions: QuizQuestion[], quizId?: string) => {
    setLoading(true);
    const session = await createSession();
    if (session) {
      sessionStorage.setItem(`quiz-questions-${session.id}`, JSON.stringify(questions));
      if (quizId) {
        await supabase.from('quiz_sessions').update({ quiz_id: quizId }).eq('id', session.id);
      }
      navigate(`/host/${session.id}`);
    }
    setLoading(false);
  };

  const handleCheckCode = async () => {
    if (joinCode.length !== 4) return;
    setLoading(true);
    setError(null);
    const s = await findSession(joinCode);
    if (s) setCodeOk(true);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError(null);
    const player = await joinSession(joinCode, playerName);
    if (player) {
      navigate(`/play/${player.session_id}/${player.id}`);
    }
    setLoading(false);
  };

  if (showPicker) {
    return <QuizPicker onSelect={handleHost} onBack={() => setShowPicker(false)} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
      <FloatingShapes />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="text-center"
        >
          <h1 className="text-6xl md:text-8xl font-display font-bold text-gradient mb-2">
            Quiz Clash
          </h1>
          <p className="text-lg font-body text-muted-foreground">
            ⚡ Real-time multiplayer quiz battle ⚡
          </p>
        </motion.div>

        {!showJoin ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex flex-col gap-4 w-full"
          >
            <Button
              onClick={() => setShowPicker(true)}
              disabled={loading}
              className="h-16 text-xl font-display font-bold rounded-2xl gradient-fun text-foreground border-none hover:opacity-90 transition-all hover:scale-105 active:scale-95"
            >
              🎤 Host a Quiz
            </Button>
            <Button
              onClick={() => setShowJoin(true)}
              variant="outline"
              className="h-16 text-xl font-display font-bold rounded-2xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105 active:scale-95"
            >
              🎮 Join a Quiz
            </Button>
            <Button
              onClick={() => navigate('/create')}
              variant="outline"
              className="h-14 text-lg font-display font-bold rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              ✏️ Create a Quiz
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key={codeOk ? 'name' : 'code'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col gap-4 w-full"
          >
            {!codeOk ? (
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit code"
                inputMode="numeric"
                className="h-14 text-center text-3xl font-display tracking-[0.5em] bg-card border-2 border-border text-foreground placeholder:text-muted-foreground placeholder:text-lg placeholder:tracking-normal rounded-xl"
                maxLength={4}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCheckCode()}
              />
            ) : (
              <>
                <p className="text-center font-body text-muted-foreground">
                  Joining quiz <span className="font-display font-bold text-foreground">{joinCode}</span>
                </p>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  className="h-14 text-center text-lg font-body bg-card border-2 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </>
            )}
            {error && (
              <p className="text-destructive text-center font-body font-bold animate-shake">{error}</p>
            )}
            {!codeOk ? (
              <Button
                onClick={handleCheckCode}
                disabled={loading || joinCode.length !== 4}
                className="h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
              >
                {loading ? '⏳ Checking...' : 'Next →'}
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={loading || !playerName.trim()}
                className="h-14 text-lg font-display font-bold rounded-xl gradient-fun text-foreground border-none hover:opacity-90"
              >
                {loading ? '⏳ Joining...' : '🚀 Join Game'}
              </Button>
            )}
            <Button
              onClick={() => {
                setError(null);
                if (codeOk) setCodeOk(false);
                else setShowJoin(false);
              }}
              variant="ghost"
              className="text-muted-foreground font-body"
            >
              ← Back
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Index;
