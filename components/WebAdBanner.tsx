import React from 'react';
import { Megaphone } from 'lucide-react';

interface WebAdBannerProps {
  t: any;
}

/**
 * Display banner for the web app. Native Android uses AdMob banners instead.
 * Replace the inner content with AdSense once you have a publisher ID.
 */
export const WebAdBanner: React.FC<WebAdBannerProps> = ({ t }) => {
  return (
    <div className="w-full border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3 min-h-[50px]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t.wizard.sponsored}
        </span>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Megaphone className="w-4 h-4 text-blue-500" />
          <span>{t.wizard.webAdPartner}</span>
        </div>
      </div>
    </div>
  );
};
