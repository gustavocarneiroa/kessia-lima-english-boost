import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useWordle, type LetterStatus } from '@/hooks/useWordle';

const QWERTY_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const MAX_GUESSES = 6;

export default function Wordle() {
  const { user, loading: loadingUser } = useAuth();
  const navigate = useNavigate();
  const { today, loading, error, fetchHint, submitGuess, finishGame } = useWordle();

  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessStatuses, setGuessStatuses] = useState<LetterStatus[][]>([]);
  const [usedLetters, setUsedLetters] = useState<Map<string, LetterStatus>>(new Map());
  const [hint, setHint] = useState<string | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalWord, setFinalWord] = useState<string | null>(null);

  const finished = !!today?.result;
  const letterCount = today?.letterCount ?? 5;

  useEffect(() => {
    if (!loadingUser && !user) navigate('/login');
  }, [loadingUser, user, navigate]);

  const handleGuessSubmit = async () => {
    if (!today || currentGuess.length !== letterCount || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitGuess(currentGuess);
      const newGuesses = [...guesses, currentGuess];
      const newStatuses = [...guessStatuses, res.statuses];
      setGuesses(newGuesses);
      setGuessStatuses(newStatuses);

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
      toast.error('Não foi possível enviar o palpite. Tente de novo.');
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

  const getKeyStatus = (key: string): LetterStatus | '' => {
    if (key === 'ENTER' || key === 'BACKSPACE') return '';
    return usedLetters.get(key) || '';
  };

  const getKeyClassName = (key: string) => {
    const baseClass = 'min-w-[40px] h-12 text-sm font-semibold rounded';
    const status = getKeyStatus(key);
    if (key === 'ENTER' || key === 'BACKSPACE') return `${baseClass} bg-muted hover:bg-muted/80 px-3 text-primary`;
    switch (status) {
      case 'correct':
        return `${baseClass} bg-green-500 text-white hover:bg-green-600`;
      case 'present':
        return `${baseClass} bg-yellow-500 text-white hover:bg-yellow-600`;
      case 'absent':
        return `${baseClass} bg-muted text-muted-foreground`;
      default:
        return `${baseClass} bg-background border hover:bg-muted text-primary`;
    }
  };

  const getCellClassName = (rowIndex: number, colIndex: number) => {
    const baseClass = 'w-12 h-12 border-2 flex items-center justify-center text-lg font-bold rounded border-muted';
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
      <div className="min-h-screen bg-primary py-8">
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
      <div className="min-h-screen bg-primary py-8">
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

  return (
    <div className="min-h-screen bg-primary py-8">
      <div className="container mx-auto px-4 max-w-lg">
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-primary-foreground/80 hover:text-primary-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao portal
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-foreground mb-2">TKL Wordle</h1>
          <p className="text-primary-foreground/80">Adivinhe a palavra de {letterCount} letras e aprenda com ela!</p>

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-background/20 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2">
                {result.won ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-100 font-semibold">
                      Você acertou{finalWord ? ` (${finalWord})` : ''} em {result.guessesUsed}{' '}
                      {result.guessesUsed === 1 ? 'tentativa' : 'tentativas'}! +{result.points} pontos
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-100 font-semibold">
                      Você não acertou hoje{finalWord ? ` (era ${finalWord})` : ''}. Volte amanhã!
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {!finished && (
          <div className="mb-6">
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

        <div className="mb-6">
          <div className="grid gap-2 mb-4">
            {Array.from({ length: MAX_GUESSES }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
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

        <div className="mb-8">
          {QWERTY_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center mb-2">
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
