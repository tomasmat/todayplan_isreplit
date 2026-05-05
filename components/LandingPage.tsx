import React from 'react';
import { Map, Sparkles, Navigation, Users, ArrowRight, Star } from 'lucide-react';
import { Button } from './Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  t: any; // Translation object
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, t }) => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-blue-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none mb-8 animate-in zoom-in duration-500 ring-1 ring-blue-50 dark:ring-slate-700">
           <Map className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight max-w-5xl leading-tight">
          {t.landing.title.split(',')[0]}, <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            {t.landing.title.split(',')[1] || "one perfect day"}
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed">
          {t.landing.subtitle}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button 
            size="lg" 
            onClick={onGetStarted} 
            className="px-8 py-6 text-lg rounded-xl shadow-xl shadow-blue-200 dark:shadow-none hover:shadow-blue-300 transform hover:-translate-y-1 transition-all flex items-center justify-center"
          >
            {t.landing.ctaStart} <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onLogin} 
            className="px-8 py-6 text-lg rounded-xl border-2 hover:bg-slate-50 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-white"
          >
            {t.landing.ctaLogin}
          </Button>
        </div>

        <div className="mt-12 flex items-center space-x-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
           <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                 <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 overflow-hidden`}>
                   <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="user" />
                 </div>
              ))}
           </div>
           <span>{t.landing.trusted}</span>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white dark:bg-slate-950 py-24 px-4 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t.landing.why}</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">{t.landing.whySubtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow group">
                <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t.landing.feat1Title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t.landing.feat1Desc}
                </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow group">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t.landing.feat2Title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t.landing.feat2Desc}
                </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow group">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Navigation className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{t.landing.feat3Title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t.landing.feat3Desc}
                </p>
            </div>
            </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-20 bg-slate-900 dark:bg-slate-950 text-white overflow-hidden relative border-t dark:border-slate-800">
         <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute left-0 bottom-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
         </div>

         <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-16">Smart planning backed by data</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
               <div>
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-2">10k+</div>
                  <div className="text-slate-400 font-medium">{t.landing.statsCities}</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-2">50k+</div>
                  <div className="text-slate-400 font-medium">{t.landing.statsTrips}</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-2 flex items-center justify-center">
                      4.9 <Star className="w-6 h-6 ml-2 fill-blue-400 text-blue-400" />
                  </div>
                  <div className="text-slate-400 font-medium">{t.landing.statsRating}</div>
               </div>
               <div>
                  <div className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-2">100%</div>
                  <div className="text-slate-400 font-medium">{t.landing.statsFree}</div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
};