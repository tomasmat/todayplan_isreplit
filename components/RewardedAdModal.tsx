import React, { useEffect, useState } from 'react';
import { Play, Sparkles, X } from 'lucide-react';
import { Button } from './Button';

interface RewardedAdModalProps {
  t: any;
  onComplete: () => void;
  onCancel: () => void;
  durationSeconds?: number;
}

/**
 * In-app fallback used on web (and if native AdMob fails to load).
 * On Android, AdMob rewarded video is shown instead via adsService.
 */
export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  t,
  onComplete,
  onCancel,
  durationSeconds = 8,
}) => {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const ready = remaining <= 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50"
          aria-label={t.wizard.cancel}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white p-8 min-h-[220px] flex flex-col justify-between">
          <div className="inline-flex self-start items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            {t.wizard.sponsored}
          </div>
          <div>
            <p className="text-sm text-blue-100 mb-1">{t.wizard.webAdPartner}</p>
            <h3 className="text-2xl font-bold leading-tight">Discover more of the city</h3>
            <p className="text-blue-100 text-sm mt-2">
              Local guides, hidden cafés, and walkable routes — curated for your day.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {ready ? t.wizard.watchAdContinue : t.wizard.watchAdPlaying}
              </p>
              {!ready && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {(t.wizard.watchAdSkipIn || 'Continue in {seconds}s').replace(
                    '{seconds}',
                    String(remaining)
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
              style={{ width: `${((durationSeconds - remaining) / durationSeconds) * 100}%` }}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={!ready}
            onClick={onComplete}
          >
            {ready ? t.wizard.watchAdContinue : t.wizard.watchAdLoading}
          </Button>
        </div>
      </div>
    </div>
  );
};
