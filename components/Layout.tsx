import React, { useState, useEffect } from 'react';
import { User, LogOut, Map, Shield, Sun, Moon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Button } from './Button';
import { UserProfile, Language } from '../types';
import { LanguageSelector } from './LanguageSelector';
import { TRANSLATIONS } from '../translations';
import { WebAdBanner } from './WebAdBanner';

const syncNativeSystemBarsToTheme = async (isDark: boolean) => {
  if (!Capacitor.isNativePlatform()) return;
  const statusBarColor = isDark ? '#0f172a' : '#ffffff';
  const navigationBarColor = isDark ? '#0f172a' : '#ffffff';
  try {
    await EdgeToEdge.setStatusBarColor({ color: statusBarColor });
    await EdgeToEdge.setNavigationBarColor({ color: navigationBarColor });
    // Style.Light = light icons (for dark bg); Style.Dark = dark icons (for light bg)
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark });
  } catch {
    // Plugins may not be available on web; ignore.
  }
};

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile | null;
  onLogout: () => void;
  onGoHome: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onAdminClick?: () => void; // New prop for admin navigation
  showWebBanner?: boolean;
  nativeBannerOffset?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onGoHome,
  language,
  onLanguageChange,
  onAdminClick,
  showWebBanner = false,
  nativeBannerOffset = false,
}) => {
  const t = TRANSLATIONS[language];
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const shouldBeDark =
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (shouldBeDark) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
    syncNativeSystemBarsToTheme(shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
    setIsDark(next);
    syncNativeSystemBarsToTheme(next);
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-x-hidden ${nativeBannerOffset ? 'pb-16' : ''}`}>
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between overflow-hidden">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={onGoHome}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <Map className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">TodayPlan</span>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Custom Language Selector */}
            <LanguageSelector current={language} onChange={onLanguageChange} />

            {user && (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                  <User className="w-4 h-4" />
                  <span>{user.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={onLogout} className="dark:text-slate-300 dark:hover:bg-slate-800">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t.nav.logout}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="flex-grow">
        {children}
      </main>
      {showWebBanner && <WebAdBanner t={t} />}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} TodayPlan. All rights reserved.
          </span>
          <button 
              onClick={onAdminClick}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 border border-transparent hover:border-blue-100 dark:hover:border-slate-700 shrink-0"
              title="Admin Dashboard"
          >
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Admin</span>
          </button>
        </div>
      </footer>
    </div>
  );
};