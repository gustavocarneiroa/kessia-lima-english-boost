import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export type LetterStatus = 'correct' | 'present' | 'absent';

interface GameResult {
  won: boolean;
  guessesUsed: number;
  hintUsed: boolean;
  points: number;
}

export interface GuessRecord {
  word: string;
  statuses: LetterStatus[];
  phonetic: string | null;
  audioUrl: string | null;
}

interface TodayInfo {
  date: string;
  letterCount: number;
  guesses: GuessRecord[];
  result: GameResult | null;
}

export interface WordleStats {
  distribution: number[];
  lost: number;
  gamesPlayed: number;
  totalPoints: number;
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

  // Recarrega os dados sem acionar o "loading" de tela cheia — usado pra
  // atualizar a fonética/áudio que chegam em segundo plano após um palpite.
  const refreshSilent = useCallback(async () => {
    try {
      const data = await api.get<TodayInfo>('/api/wordle/today');
      setToday(data);
    } catch {
      // silencioso: só é um refresh em segundo plano
    }
  }, []);

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

  const fetchHint = useCallback(async () => {
    const data = await api.get<{ hint: string }>('/api/wordle/hint');
    return data.hint;
  }, []);

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

  return { today, loading, error, fetchHint, submitGuess, finishGame, refresh: fetchToday, refreshSilent };
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

export const useWordleStats = () => {
  const [stats, setStats] = useState<WordleStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<WordleStats>('/api/wordle/stats');
      setStats(data);
    } catch (err) {
      console.error('Error fetching wordle stats:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
};
