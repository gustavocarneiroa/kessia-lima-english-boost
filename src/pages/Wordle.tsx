import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWordle } from '@/hooks/useWordle';

interface GuessResult {
  letter: string;
  status: 'correct' | 'present' | 'absent';
}

const QWERTY_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
];

const Wordle = () => {
  const { dailyWord, userStats, todayGame, loading, error, saveGameSession } = useWordle();
  
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessResults, setGuessResults] = useState<GuessResult[][]>([]);
  const [usedLetters, setUsedLetters] = useState<Map<string, 'correct' | 'present' | 'absent'>>(new Map());
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const maxGuesses = 6;

  // Initialize game state based on today's game
  useEffect(() => {
    if (todayGame) {
      if (todayGame.won) {
        setGameState('won');
      } else {
        setGameState('lost');
      }
    }
  }, [todayGame]);

  const checkGuess = (guess: string): GuessResult[] => {
    if (!dailyWord) return [];
    
    const result: GuessResult[] = [];
    const targetLetters = dailyWord.word.split('');
    const guessLetters = guess.split('');
    
    // First pass: mark correct positions
    const targetCounts = new Map<string, number>();
    targetLetters.forEach(letter => {
      targetCounts.set(letter, (targetCounts.get(letter) || 0) + 1);
    });

    // Check exact matches first
    guessLetters.forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = { letter, status: 'correct' };
        targetCounts.set(letter, targetCounts.get(letter)! - 1);
      } else {
        result[i] = { letter, status: 'absent' };
      }
    });

    // Second pass: mark present letters
    guessLetters.forEach((letter, i) => {
      if (result[i].status === 'absent' && targetCounts.get(letter)! > 0) {
        result[i] = { letter, status: 'present' };
        targetCounts.set(letter, targetCounts.get(letter)! - 1);
      }
    });

    return result;
  };

  const handleGuessSubmit = async () => {
    if (!dailyWord) return;
    
    if (currentGuess.length !== dailyWord.letter_count) {
      toast.error(`Word must be ${dailyWord.letter_count} letters long`);
      return;
    }

    const result = checkGuess(currentGuess);
    const newGuesses = [...guesses, currentGuess];
    const newResults = [...guessResults, result];
    
    setGuesses(newGuesses);
    setGuessResults(newResults);

    // Update used letters
    const newUsedLetters = new Map(usedLetters);
    result.forEach(({ letter, status }) => {
      const currentStatus = newUsedLetters.get(letter);
      if (!currentStatus || 
          (currentStatus === 'absent' && status !== 'absent') ||
          (currentStatus === 'present' && status === 'correct')) {
        newUsedLetters.set(letter, status);
      }
    });
    setUsedLetters(newUsedLetters);

    // Check win condition
    const won = currentGuess === dailyWord.word;
    const gameFinished = won || newGuesses.length >= maxGuesses;
    
    if (gameFinished) {
      try {
        await saveGameSession(won, newGuesses.length, hintsUsed);
        
        if (won) {
          setGameState('won');
          toast.success(`Congratulations! You got it in ${newGuesses.length} ${newGuesses.length === 1 ? 'try' : 'tries'}!`);
        } else {
          setGameState('lost');
          toast.error(`Game over! The word was: ${dailyWord.word}`);
        }
      } catch (error) {
        // Game state still updates even if save fails
        if (won) {
          setGameState('won');
          toast.success(`Congratulations! You got it in ${newGuesses.length} ${newGuesses.length === 1 ? 'try' : 'tries'}!`);
        } else {
          setGameState('lost');
          toast.error(`Game over! The word was: ${dailyWord.word}`);
        }
      }
    }

    setCurrentGuess('');
  };

  const handleKeyPress = (key: string) => {
    if (gameState !== 'playing' || todayGame) return;

    if (key === 'ENTER') {
      handleGuessSubmit();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (dailyWord && currentGuess.length < dailyWord.letter_count) {
        setCurrentGuess(prev => prev + key);
      }
    }
  };

  const handleHintClick = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
    toast.info('Hint revealed!');
  };

  const getKeyStatus = (key: string) => {
    if (key === 'ENTER' || key === 'BACKSPACE') return '';
    return usedLetters.get(key) || '';
  };

  const getKeyClassName = (key: string) => {
    const baseClass = "min-w-[40px] h-12 text-sm font-semibold rounded";
    const status = getKeyStatus(key);
    
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return `${baseClass} bg-muted hover:bg-muted/80 px-3`;
    }
    
    switch (status) {
      case 'correct':
        return `${baseClass} bg-green-500 text-white hover:bg-green-600`;
      case 'present':
        return `${baseClass} bg-yellow-500 text-white hover:bg-yellow-600`;
      case 'absent':
        return `${baseClass} bg-muted text-muted-foreground`;
      default:
        return `${baseClass} bg-background border hover:bg-muted`;
    }
  };

  const getCellClassName = (rowIndex: number, colIndex: number) => {
    const baseClass = "w-12 h-12 border-2 flex items-center justify-center text-lg font-bold rounded";
    
    if (rowIndex < guessResults.length) {
      const status = guessResults[rowIndex][colIndex].status;
      switch (status) {
        case 'correct':
          return `${baseClass} bg-green-500 text-white border-green-500`;
        case 'present':
          return `${baseClass} bg-yellow-500 text-white border-yellow-500`;
        case 'absent':
          return `${baseClass} bg-muted text-muted-foreground border-muted`;
      }
    } else if (rowIndex === guesses.length && !todayGame) {
      return `${baseClass} border-primary ${colIndex < currentGuess.length ? 'bg-primary/10' : ''}`;
    }
    
    return `${baseClass} border-muted`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center mb-8">
            <Skeleton className="h-10 w-32 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto mb-2" />
            <Skeleton className="h-6 w-24 mx-auto" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !dailyWord) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-4">Wordle</h1>
            <Card>
              <CardContent className="pt-6">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Oops!</p>
                <p className="text-muted-foreground mb-4">
                  {error || 'No word available for today'}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Wordle</h1>
          <p className="text-muted-foreground">Guess the {dailyWord.letter_count}-letter word!</p>
          <Badge variant="outline" className="mt-2">
            {dailyWord.date.replace(/_/g, '-')}
          </Badge>
          
          {/* Game Status */}
          {todayGame && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-center gap-2">
                {todayGame.won ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-semibold">
                      You solved today's puzzle in {todayGame.guesses_count} tries!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-semibold">
                      You didn't solve today's puzzle. Come back tomorrow!
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{userStats?.current_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Current Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{userStats?.best_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{userStats?.games_played || 0}</div>
                <div className="text-xs text-muted-foreground">Games Played</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{userStats?.total_wins || 0}</div>
                <div className="text-xs text-muted-foreground">Total Wins</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">
                Win Rate: {userStats?.games_played ? Math.round((userStats.total_wins / userStats.games_played) * 100) : 0}% 
                • Total Hints Used: {userStats?.hints_used_total || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hint Section */}
        {!todayGame && (
          <div className="mb-6">
            <Button
              onClick={handleHintClick}
              disabled={showHint}
              variant="outline"
              className="w-full"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              {showHint ? 'Hint Used' : 'Show Hint'}
            </Button>
            {showHint && (
              <Card className="mt-2">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{dailyWord.hint}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Game Grid */}
        <div className="mb-6">
          <div className="grid gap-2 mb-4" style={{ gridTemplateRows: `repeat(${maxGuesses}, minmax(0, 1fr))` }}>
            {Array.from({ length: maxGuesses }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
                {Array.from({ length: dailyWord.letter_count }, (_, colIndex) => (
                  <div key={colIndex} className={getCellClassName(rowIndex, colIndex)}>
                    {rowIndex < guesses.length 
                      ? guesses[rowIndex][colIndex] 
                      : rowIndex === guesses.length && colIndex < currentGuess.length && !todayGame
                      ? currentGuess[colIndex]
                      : ''
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard */}
        <div className="mb-6">
          {QWERTY_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center mb-2">
              {row.map((key) => (
                <Button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className={getKeyClassName(key)}
                  disabled={gameState !== 'playing' || !!todayGame}
                >
                  {key === 'BACKSPACE' ? '⌫' : key}
                </Button>
              ))}
            </div>
          ))}
        </div>

        {/* Game Over Actions */}
        {(gameState !== 'playing' || todayGame) && (
          <div className="text-center">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              {todayGame ? 'Check Tomorrow for New Word' : 'Play Again Tomorrow'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wordle;