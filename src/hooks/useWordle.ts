import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyWord {
  date: string;
  word: string;
  hint: string;
  letter_count: number;
}

interface UserStats {
  browser_id: string;
  current_streak: number;
  best_streak: number;
  games_played: number;
  total_wins: number;
  hints_used_total: number;
}

interface GameSession {
  browser_id: string;
  date: string;
  won: boolean;
  guesses_count: number;
  hints_used: number;
}

// Generate a persistent browser ID
const getBrowserId = (): string => {
  let browserId = localStorage.getItem('wordle_browser_id');
  if (!browserId) {
    browserId = 'browser_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('wordle_browser_id', browserId);
  }
  return browserId;
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0].replace(/-/g, '_');
};

export const useWordle = () => {
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [todayGame, setTodayGame] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const browserId = getBrowserId();
  const todayDate = getTodayDate();

  // Fetch today's word
  const fetchDailyWord = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_words')
        .select('*')
        .eq('date', todayDate)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('No word available for today');
        } else {
          throw error;
        }
        return;
      }

      setDailyWord(data);
    } catch (err) {
      console.error('Error fetching daily word:', err);
      setError('Failed to load today\'s word');
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('browser_id', browserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUserStats(data || {
        browser_id: browserId,
        current_streak: 0,
        best_streak: 0,
        games_played: 0,
        total_wins: 0,
        hints_used_total: 0
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
    }
  };

  // Check if user already played today
  const checkTodayGame = async () => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('browser_id', browserId)
        .eq('date', todayDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setTodayGame(data);
    } catch (err) {
      console.error('Error checking today\'s game:', err);
    }
  };

  // Save game session
  const saveGameSession = async (won: boolean, guessesCount: number, hintsUsed: number) => {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          browser_id: browserId,
          date: todayDate,
          won,
          guesses_count: guessesCount,
          hints_used: hintsUsed
        })
        .select()
        .single();

      if (error) throw error;

      setTodayGame(data);
      
      // Refresh user stats after saving game
      await fetchUserStats();
      
      return data;
    } catch (err) {
      console.error('Error saving game session:', err);
      toast.error('Failed to save game progress');
      throw err;
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchDailyWord(),
        fetchUserStats(),
        checkTodayGame()
      ]);
      
      setLoading(false);
    };

    initializeData();
  }, []);

  return {
    dailyWord,
    userStats,
    todayGame,
    loading,
    error,
    saveGameSession,
    browserId
  };
};