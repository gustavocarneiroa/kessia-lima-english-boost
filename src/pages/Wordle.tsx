import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface WordleStats {
  currentStreak: number;
  bestStreak: number;
  gamesPlayed: number;
  winPercentage: number;
  averageGuesses: number;
  hintsUsed: number;
}

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
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [currentGuess, setCurrentGuess] = useState('');
  const [guesses, setGuesses] = useState<string[]>([]);
  const [guessResults, setGuessResults] = useState<GuessResult[][]>([]);
  const [usedLetters, setUsedLetters] = useState<Map<string, 'correct' | 'present' | 'absent'>>(new Map());
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState<WordleStats>({
    currentStreak: 0,
    bestStreak: 0,
    gamesPlayed: 0,
    winPercentage: 0,
    averageGuesses: 0,
    hintsUsed: 0
  });

  // Placeholder data - will be replaced with Supabase integration
  const [todayWord] = useState('REACT'); // This will come from Supabase
  const [wordLength] = useState(5); // This will come from Supabase  
  const [hint] = useState('A popular JavaScript library for building user interfaces'); // This will come from Supabase
  const [date] = useState('2025-09-13'); // Today's date

  const maxGuesses = 6;

  const checkGuess = (guess: string): GuessResult[] => {
    const result: GuessResult[] = [];
    const targetLetters = todayWord.split('');
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

  const handleGuessSubmit = () => {
    if (currentGuess.length !== wordLength) {
      toast.error(`Word must be ${wordLength} letters long`);
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
    if (currentGuess === todayWord) {
      setGameState('won');
      toast.success(`Congratulations! You got it in ${newGuesses.length} ${newGuesses.length === 1 ? 'try' : 'tries'}!`);
    } else if (newGuesses.length >= maxGuesses) {
      setGameState('lost');
      toast.error(`Game over! The word was: ${todayWord}`);
    }

    setCurrentGuess('');
  };

  const handleKeyPress = (key: string) => {
    if (gameState !== 'playing') return;

    if (key === 'ENTER') {
      handleGuessSubmit();
    } else if (key === 'BACKSPACE') {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key.length === 1 && /[A-Z]/.test(key)) {
      if (currentGuess.length < wordLength) {
        setCurrentGuess(prev => prev + key);
      }
    }
  };

  const handleHintClick = () => {
    setShowHint(true);
    setStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
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
    } else if (rowIndex === guesses.length) {
      return `${baseClass} border-primary ${colIndex < currentGuess.length ? 'bg-primary/10' : ''}`;
    }
    
    return `${baseClass} border-muted`;
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Wordle</h1>
          <p className="text-muted-foreground">Guess the {wordLength}-letter word!</p>
          <Badge variant="outline" className="mt-2">
            {date}
          </Badge>
        </div>

        {/* Stats */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Your Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.currentStreak}</div>
                <div className="text-xs text-muted-foreground">Current Streak</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stats.gamesPlayed}</div>
                <div className="text-xs text-muted-foreground">Games Played</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{stats.hintsUsed}</div>
                <div className="text-xs text-muted-foreground">Hints Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hint Section */}
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
                <p className="text-sm text-muted-foreground">{hint}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Game Grid */}
        <div className="mb-6">
          <div className="grid gap-2 mb-4" style={{ gridTemplateRows: `repeat(${maxGuesses}, minmax(0, 1fr))` }}>
            {Array.from({ length: maxGuesses }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 justify-center">
                {Array.from({ length: wordLength }, (_, colIndex) => (
                  <div key={colIndex} className={getCellClassName(rowIndex, colIndex)}>
                    {rowIndex < guesses.length 
                      ? guesses[rowIndex][colIndex] 
                      : rowIndex === guesses.length && colIndex < currentGuess.length
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
                  disabled={gameState !== 'playing'}
                >
                  {key === 'BACKSPACE' ? '⌫' : key}
                </Button>
              ))}
            </div>
          ))}
        </div>

        {/* Game Over Actions */}
        {gameState !== 'playing' && (
          <div className="text-center">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again Tomorrow
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wordle;