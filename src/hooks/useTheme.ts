import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // 檢查 localStorage，若無設定則預設為 true (Dark Mode)
    const saved = localStorage.getItem('ffxiv-tools-theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ffxiv-tools-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ffxiv-tools-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return { isDark, toggleTheme };
}
