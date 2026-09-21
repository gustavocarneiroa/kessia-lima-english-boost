import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export type LetterStatus = 'correct' | 'present' | 'absent';

interface GameResult {
  won: boolean;
  guessesUsed: number;
  hintUsed: boolean;
  points: number;
}

interface TodayInfo {
  date: string;
  hint: string;
  letterCount: number;
  result: GameResult | null;
}

export interface LeaderboardEntry {
  studentId: string;
  isYou: boolean;
  firstName: string;
  won: boolean;
  guessesUsed: number;
  hintUsed: boolean;
  points: number;
}

export const useWordle = () => {
  const [today, setToday] = useState<TodayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<TodayInfo>('/api/wordle/today');
      setToday(data);
    } catch (err) {
      console.error('Error fetching today\'s word:', err);
      setError("Não foi possível carregar o jogo de hoje.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const submitGuess = useCallback(async (guess: string) => {
    return api.post<{ statuses: LetterStatus[]; correct: boolean; word?: string }>('/api/wordle/guess', { guess });
  }, []);

  const finishGame = useCallback(
    async (won: boolean, guessesUsed: number, hintUsed: boolean) => {
      const result = await api.post<GameResult>('/api/wordle/finish', { won, guessesUsed, hintUsed });
      setToday((prev) => (prev ? { ...prev, result } : prev));
      return result;
    },
    [],
  );

  return { today, loading, error, submitGuess, finishGame, refresh: fetchToday };
};

export const useWordleLeaderboard = (date?: string) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const qs = date ? `?date=${encodeURIComponent(date)}` : '';
      const data = await api.get<{ items: LeaderboardEntry[] }>(`/api/wordle/leaderboard${qs}`);
      setEntries(data.items);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { entries, loading, refresh: fetchLeaderboard };
};
