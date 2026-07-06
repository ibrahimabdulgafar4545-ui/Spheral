import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import { usersAPI } from '../api/users';

const ThemeContext = createContext(null);

// Immediate inline paint helper to prevent flashing of wrong theme before react mounts
const syncThemeDOM = (themeName) => {
  if (themeName === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }
};

const initialTheme = localStorage.getItem('theme') || 'dark';
syncThemeDOM(initialTheme);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  const [userId, setUserId] = useState(null);

  // Apply theme classes on changes
  useLayoutEffect(() => {
    syncThemeDOM(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = async (customUserId = null) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);

    const activeUserId = customUserId || userId;
    if (activeUserId) {
      try {
        await usersAPI.updatePreferences(activeUserId, nextTheme);
      } catch (err) {
        console.error('Failed to sync theme preferences to database:', err);
      }
    }
  };

  const syncWithDatabase = (dbTheme, loggedInUserId) => {
    setUserId(loggedInUserId);
    if (dbTheme && dbTheme !== theme) {
      setTheme(dbTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, syncWithDatabase }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
