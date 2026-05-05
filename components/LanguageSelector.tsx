import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { LANGUAGES } from '../constants';
import { Language } from '../types';

interface LanguageSelectorProps {
  current: Language;
  onChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ current, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === current);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
      >
        <span className="text-xl leading-none">{currentLang?.flag}</span>
        <span className="text-sm font-medium hidden md:block">{currentLang?.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform text-slate-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${current === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span className="text-2xl leading-none w-8 text-center">{lang.flag}</span>
                <span className={`text-sm ${current === lang.code ? 'font-bold' : 'font-medium'}`}>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};