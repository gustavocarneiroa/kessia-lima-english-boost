import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, CheckCircle, XCircle, ArrowLeft, Volume2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useWordle, useWordleStats, type LetterStatus } from '@/hooks/useWordle';
import { ApiError } from '@/lib/api';

const QWERTY_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const MAX_GUESSES = 6;
const KEY_CLASS = 'min-w-[26px] h-9 px-1.5 text-xs sm:min-w-[40px] sm:h-12 sm:px-3 sm:text-sm font-semibold rounded';

export default function Wordle() {
  const { user, loading: loadingUser } = useAuth();
  const navigate = useNavigate();
  const { today, loading, error, fetchHint, submitGuess, finishGame, refreshSilent } = useWordle();
  const { stats, loading: loadingStats } = useWordleStats();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessStatuses, setGuessStatuses] = useState<LetterStatus[][]>([]);
  const [reviews, setReviews] = useState<{ word: string; phonetic: string | null; audioUrl: string | null }[]>([]);
  const [usedLetters, setUsedLetters] = useState<Map<string, LetterStatus>>(new Map());
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalWord, setFinalWord] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const finished = !!today?.result;
  const letterCount = today?.letterCount ?? 5;

  useEffect(() => {
    if (!loadingUser && !user) navigate('/login');
  }, [loadingUser, user, navigate]);

  // Ao carregar, recupera as tentativas já feitas hoje (permite revisitar/continuar).
  useEffect(() => {
    if (!today || hydrated) return;
    const rehydratedLetters = new Map<string, LetterStatus>();
    today.guesses.forEach((g) => {
      g.statuses.forEach((status, i) => {
        const letter = g.word[i];
        const current = rehydratedLetters.get(letter);
        if (!current || (current === 'absent' && status !== 'absent') || (current === 'present' && status === 'correct')) {
          rehydratedLetters.set(letter, status);
        }
      });
    });
    setGuesses(today.guesses.map((g) => g.word));
    setGuessStatuses(today.guesses.map((g) => g.statuses));
    setReviews(today.guesses.map((g) => ({ word: g.word, phonetic: g.phonetic, audioUrl: g.audioUrl })));
    setUsedLetters(rehydratedLetters);
    if (today.result?.hintUsed) setHintUsed(true);
    setHydrated(true);
  }, [today, hydrated]);

  // A fonética/áudio de cada tentativa chega em segundo plano (não trava o
  // palpite) — quando a gente recarrega "today", completa o que já foi buscado.
  useEffect(() => {
    if (!today || !hydrated) return;
    setReviews((prev) =>
      prev.map((r, i) => {
        const updated = today.guesses[i];
        return updated && (updated.phonetic || updated.audioUrl)
          ? { word: updated.word, phonetic: updated.phonetic, audioUrl: updated.audioUrl }
          : r;
      }),
    );
  }, [today, hydrated]);

  const handleGuessSubmit = async () => {
    if (!today || currentGuess.length !== letterCount || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitGuess(currentGuess);
      const newGuesses = [...guesses, currentGuess];
      const newStatuses = [...guessStatuses, res.statuses];
      setGuesses(newGuesses);
      setGuessStatuses(newStatuses);
      setReviews((prev) => [...prev, { word: currentGuess, phonetic: null, audioUrl: null }]);
      setTimeout(() => refreshSilent(), 1500);

      const newUsedLetters = new Map(usedLetters);
      res.statuses.forEach((status, i) => {
        const letter = currentGuess[i];
        const current = newUsedLetters.get(letter);
        if (!current || (current === 'absent' && status !== 'absent') || (current === 'present' && status === 'correct')) {
          newUsedLetters.set(letter, status);
        }
      });
      setUsedLetters(newUsedLetters);
      setCurrentGuess('');

      const gameOver = res.correct || newGuesses.length >= MAX_GUESSES;
      if (gameOver) {
        if (res.word) setFinalWord(res.word);
        await finishGame(res.correct, newGuesses.length, hintUsed);
        if (res.correct) {
          toast.success(`Parabéns! Você acertou em ${newGuesses.length} ${newGuesses.length === 1 ? 'tentativa' : 'tentativas'}!`);
        } else {
          toast.error('Fim de jogo! Volte amanhã para uma nova palavra.');
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'already_finished') {
        toast.error('Você já jogou hoje.');
      } else {
        toast.error('Não foi possível enviar o palpite. Tente de novo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (finished || submitting) return;
    if (key === 'ENTER') {
      if (currentGuess.length !== letterCount) {
        toast.error(`A palavra tem ${letterCount} letras.`);
        return;
      }
      handleGuessSubmit();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (currentGuess.length < letterCount) setCurrentGuess((prev) => prev + key);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished || submitting) return;
      const key = e.key.toUpperCase();
      if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
        e.preventDefault();
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleHintClick = async () => {
    if (hint || loadingHint) return;
    setLoadingHint(true);
    try {
      setHint(await fetchHint());
      setHintUsed(true);
    } catch {
      toast.error('Não foi possível carregar a dica.');
    } finally {
      setLoadingHint(false);
    }
  };

  const playAudio = (url: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => toast.error('Não foi possível tocar o áudio.'));
  };

  const getKeyStatus = (key: string): LetterStatus | '' => {
    if (key === 'ENTER' || key === 'BACKSPACE') return '';
    return usedLetters.get(key) || '';
  };

  const getKeyClassName = (key: string) => {
    const status = getKeyStatus(key);
    if (key === 'ENTER' || key === 'BACKSPACE') return `${KEY_CLASS} bg-muted hover:bg-muted/80 text-primary`;
    switch (status) {
      case 'correct':
        return `${KEY_CLASS} bg-green-500 text-white hover:bg-green-600`;
      case 'present':
        return `${KEY_CLASS} bg-yellow-500 text-white hover:bg-yellow-600`;
      case 'absent':
        return `${KEY_CLASS} bg-muted text-muted-foreground`;
      default:
        return `${KEY_CLASS} bg-background border hover:bg-muted text-primary`;
    }
  };

  const getCellClassName = (rowIndex: number, colIndex: number) => {
    const baseClass = 'w-9 h-9 sm:w-12 sm:h-12 border-2 flex items-center justify-center text-base sm:text-lg font-bold rounded border-muted';
    if (rowIndex < guessStatuses.length) {
      const status = guessStatuses[rowIndex][colIndex];
      switch (status) {
        case 'correct':
          return `${baseClass} bg-green-500 text-white border-green-500`;
        case 'present':
          return `${baseClass} bg-yellow-500 text-white border-yellow-500`;
        case 'absent':
          return `${baseClass} bg-muted text-muted-foreground/90 border-muted`;
      }
    } else if (rowIndex === guesses.length && !finished) {
      return `${baseClass} ${colIndex < currentGuess.length ? 'bg-primary-foreground/10' : ''} text-primary-foreground`;
    }
    return `${baseClass} text-primary-foreground`;
  };

  if (loadingUser || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-primary py-4 sm:py-8">
        <div className="container mx-auto px-4 max-w-lg space-y-4">
          <Skeleton className="h-10 w-32 mx-auto" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !today) {
    return (
      <div className="min-h-screen bg-primary py-4 sm:py-8">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <Card>
            <CardContent className="pt-6">
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Ops!</p>
              <p className="text-muted-foreground mb-4">{error || 'Não há palavra disponível hoje.'}</p>
              <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const result = today.result;
  const rowLabels = ['1ª tentativa', '2ª tentativa', '3ª tentativa', '4ª tentativa', '5ª tentativa', '6ª tentativa'];
  const maxDistribution = stats ? Math.max(1, ...stats.distribution, stats.lost) : 1;

  return (
    <div className="min-h-screen bg-primary py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-lg">
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao portal
        </Link>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-2">TKL Wordle</h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base">Adivinhe a palavra de {letterCount} letras e aprenda com ela!</p>

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-background/20 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                {result.won ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                    <span className="text-green-100 font-semibold text-sm sm:text-base">
                      Você acertou{finalWord ? ` (${finalWord})` : ''} em {result.guessesUsed}{' '}
                      {result.guessesUsed === 1 ? 'tentativa' : 'tentativas'}! +{result.points} pontos
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span className="text-red-100 font-semibold text-sm sm:text-base">
                      Você não acertou hoje{finalWord ? ` (era ${finalWord})` : ''}. Volte amanhã!
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!finished && (
          <div className="mb-4 sm:mb-6">
            <Button
              onClick={handleHintClick}
              disabled={!!hint || loadingHint}
              variant="outline"
              className="w-full bg-background border-primary-foreground/20 text-primary hover:bg-primary-foreground hover:text-primary"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              {hint ? 'Dica usada' : loadingHint ? 'Carregando...' : 'Ver dica'}
            </Button>
            {hint && (
              <Card className="mt-2 bg-background/80 backdrop-blur-sm border-primary-foreground/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-primary">{hint}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mb-4 sm:mb-6">
          <div className="grid gap-1.5 sm:gap-2 mb-4">
            {Array.from({ length: MAX_GUESSES }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-1.5 sm:gap-2 justify-center">
                {Array.from({ length: letterCount }, (_, colIndex) => (
                  <div key={colIndex} className={getCellClassName(rowIndex, colIndex)}>
                    {rowIndex < guesses.length
                      ? guesses[rowIndex][colIndex]
                      : rowIndex === guesses.length && colIndex < currentGuess.length && !finished
                        ? currentGuess[colIndex]
                        : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          {QWERTY_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-0.5 sm:gap-1 justify-center mb-1.5 sm:mb-2">
              {row.map((key) => (
                <Button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={getKeyClassName(key)}
                  disabled={finished || submitting}
                >
                  {key === 'BACKSPACE' ? '⌫' : key}
                </Button>
              ))}
            </div>
          ))}
        </div>

        {reviews.length > 0 && (
          <Card className="mb-4 bg-background/95">
            <CardContent className="pt-4">
              <p className="mb-3 text-sm font-semibold">Suas tentativas de hoje</p>
              <ul className="space-y-2">
                {reviews.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-semibold">{r.word}</span>
                      {r.phonetic && <span className="ml-2 text-muted-foreground italic">{r.phonetic}</span>}
                    </div>
                    {r.audioUrl && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => playAudio(r.audioUrl!)}>
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 bg-background/95">
          <CardContent className="pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> Seu histórico de acertos
            </p>
            {loadingStats ? (
              <Skeleton className="h-24 w-full" />
            ) : !stats || stats.gamesPlayed === 0 ? (
              <p className="text-sm text-muted-foreground">Jogue para começar seu histórico.</p>
            ) : (
              <ul className="space-y-1">
                {rowLabels.map((label, i) => (
                  <li key={label} className="flex items-center gap-2 text-xs">
                    <span className="w-8 shrink-0 text-muted-foreground">{i + 1}ª</span>
                    <div className="h-4 flex-1 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded bg-green-500"
                        style={{ width: `${(stats.distribution[i] / maxDistribution) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-medium">{stats.distribution[i]}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-xs">
                  <span className="w-8 shrink-0 text-muted-foreground">Não</span>
                  <div className="h-4 flex-1 rounded bg-muted overflow-hidden">
                    <div className="h-full rounded bg-destructive" style={{ width: `${(stats.lost / maxDistribution) * 100}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right font-medium">{stats.lost}</span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>

        <Link
          to="/portal"
          className="block text-center text-sm text-primary-foreground/80 hover:text-primary-foreground underline"
        >
          Ver ranking do dia na página inicial
        </Link>
      </div>
    </div>
  );
}
