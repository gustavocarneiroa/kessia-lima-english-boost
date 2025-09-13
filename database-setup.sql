-- Wordle Game Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create daily_words table
CREATE TABLE daily_words (
  date TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  hint TEXT NOT NULL,
  letter_count INTEGER NOT NULL CHECK (letter_count >= 4 AND letter_count <= 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_stats table
CREATE TABLE user_stats (
  browser_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  hints_used_total INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_sessions table
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_id TEXT NOT NULL,
  date TEXT NOT NULL,
  won BOOLEAN NOT NULL DEFAULT FALSE,
  guesses_count INTEGER CHECK (guesses_count >= 1 AND guesses_count <= 6),
  hints_used INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (date) REFERENCES daily_words(date),
  UNIQUE(browser_id, date) -- One game per user per day
);

-- Create indexes for better performance
CREATE INDEX idx_game_sessions_browser_id ON game_sessions(browser_id);
CREATE INDEX idx_game_sessions_date ON game_sessions(date);
CREATE INDEX idx_game_sessions_completed_at ON game_sessions(completed_at);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_words (everyone can read)
CREATE POLICY "Daily words are publicly readable" ON daily_words
  FOR SELECT USING (true);

-- RLS Policies for user_stats (public access for browser-based users)
CREATE POLICY "User stats are publicly accessible" ON user_stats
  FOR ALL USING (true);

-- RLS Policies for game_sessions (public access for browser-based users)
CREATE POLICY "Game sessions are publicly accessible" ON game_sessions
  FOR ALL USING (true);

-- Function to update user stats after a game
CREATE OR REPLACE FUNCTION update_user_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user stats
  INSERT INTO user_stats (browser_id, games_played, total_wins, hints_used_total)
  VALUES (
    NEW.browser_id,
    1,
    CASE WHEN NEW.won THEN 1 ELSE 0 END,
    NEW.hints_used
  )
  ON CONFLICT (browser_id) DO UPDATE SET
    games_played = user_stats.games_played + 1,
    total_wins = user_stats.total_wins + CASE WHEN NEW.won THEN 1 ELSE 0 END,
    hints_used_total = user_stats.hints_used_total + NEW.hints_used,
    updated_at = NOW();

  -- Update streaks
  IF NEW.won THEN
    -- Check if user played yesterday and won
    WITH yesterday_game AS (
      SELECT won FROM game_sessions 
      WHERE browser_id = NEW.browser_id 
      AND date = (DATE(NEW.date::date - INTERVAL '1 day'))::text
      LIMIT 1
    )
    UPDATE user_stats 
    SET 
      current_streak = CASE 
        WHEN EXISTS(SELECT 1 FROM yesterday_game WHERE won = true) THEN current_streak + 1
        ELSE 1
      END,
      best_streak = GREATEST(best_streak, CASE 
        WHEN EXISTS(SELECT 1 FROM yesterday_game WHERE won = true) THEN current_streak + 1
        ELSE 1
      END),
      updated_at = NOW()
    WHERE browser_id = NEW.browser_id;
  ELSE
    -- Reset current streak if lost
    UPDATE user_stats 
    SET current_streak = 0, updated_at = NOW()
    WHERE browser_id = NEW.browser_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stats after game completion
CREATE TRIGGER update_stats_after_game
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_after_game();

-- Insert sample data for testing
INSERT INTO daily_words (date, word, hint, letter_count) VALUES
  ('2025-09-13', 'REACT', 'A popular JavaScript library for building user interfaces', 5),
  ('2025-09-14', 'WORDLE', 'The name of this very game you are playing', 6),
  ('2025-09-15', 'CODE', 'What programmers write all day long', 4),
  ('2025-09-16', 'FRONTEND', 'The part of software that users interact with directly', 8),
  ('2025-09-17', 'DESIGN', 'The art of creating beautiful and functional interfaces', 6);