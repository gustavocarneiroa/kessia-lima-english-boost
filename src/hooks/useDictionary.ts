import { useState, useCallback } from 'react';

interface DictionaryEntry {
  word: string;
  valid: boolean;
  banned: boolean;
}

interface DictionaryCache {
  [word: string]: DictionaryEntry;
}

const CACHE_KEY = 'wordle_dictionary_cache';
const BANNED_KEY = 'wordle_banned_words';

export const useDictionary = () => {
  const [isValidating, setIsValidating] = useState(false);

  // Get cache from localStorage
  const getCache = (): DictionaryCache => {
    try {
      const cache = localStorage.getItem(CACHE_KEY);
      return cache ? JSON.parse(cache) : {};
    } catch {
      return {};
    }
  };

  // Get banned words from localStorage
  const getBannedWords = (): Set<string> => {
    try {
      const banned = localStorage.getItem(BANNED_KEY);
      return new Set(banned ? JSON.parse(banned) : []);
    } catch {
      return new Set();
    }
  };

  // Save cache to localStorage
  const saveCache = (cache: DictionaryCache) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to save dictionary cache:', error);
    }
  };

  // Save banned words to localStorage
  const saveBannedWords = (bannedWords: Set<string>) => {
    try {
      localStorage.setItem(BANNED_KEY, JSON.stringify([...bannedWords]));
    } catch (error) {
      console.error('Failed to save banned words:', error);
    }
  };

  // Validate word against dictionary API
  const validateWord = useCallback(async (word: string): Promise<{ valid: boolean; message?: string }> => {
    if (!word || word.length === 0) {
      return { valid: false, message: 'Word cannot be empty' };
    }

    const normalizedWord = word.toLowerCase();
    const cache = getCache();
    const bannedWords = getBannedWords();

    // Check if word is permanently banned
    if (bannedWords.has(normalizedWord)) {
      return { valid: false, message: 'Not in the word list' };
    }

    // Check cache first
    if (cache[normalizedWord]) {
      const entry = cache[normalizedWord];
      if (entry.banned) {
        return { valid: false, message: 'Not in the word list' };
      }
      return { valid: entry.valid };
    }

    setIsValidating(true);

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`);
      
      if (response.status === 404) {
        // Word not found - permanently ban it
        const newBannedWords = new Set([...bannedWords, normalizedWord]);
        saveBannedWords(newBannedWords);
        
        // Also save in cache
        const newCache = {
          ...cache,
          [normalizedWord]: { word: normalizedWord, valid: false, banned: true }
        };
        saveCache(newCache);
        
        return { valid: false, message: 'Not in the word list' };
      }

      if (!response.ok) {
        // Other errors - don't ban, just return invalid for now
        return { valid: false, message: 'Unable to validate word' };
      }

      // Word is valid
      const newCache = {
        ...cache,
        [normalizedWord]: { word: normalizedWord, valid: true, banned: false }
      };
      saveCache(newCache);
      
      return { valid: true };
    } catch (error) {
      console.error('Dictionary API error:', error);
      // Network error - don't ban the word, just return invalid
      return { valid: false, message: 'Unable to validate word' };
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    validateWord,
    isValidating
  };
};
