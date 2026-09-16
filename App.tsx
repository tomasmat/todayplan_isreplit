import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { PlanWizard } from './components/PlanWizard';
import { PlanResult } from './components/PlanResult';
import { LandingPage } from './components/LandingPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Button } from './components/Button';
import { UserProfile, AppState, PlanRequest, DayPlan, Review, Language, ActivityData } from './types';
import { generateDayPlan, getPlaceTrivia } from './services/geminiService';
import { PlusCircle, History, Sparkles, Map, ChevronRight, AlertTriangle, Clock, RefreshCw, KeyRound } from 'lucide-react';
import { TRANSLATIONS } from './translations';
import { TOURIST_ACTIVITIES } from './constants';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase, loadProfile, saveProfile, createProfileForNewUser, signOut, loadUserPlans, savePlan } from './services/supabaseService';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { hideBannerAd, initializeAds, isNativeAdsAvailable, showBannerAd } from './services/adsService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [state, setState] = useState<AppState>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Language State
  const [language, setLanguage] = useState<Language>('en');
  
  // Translation Helper
  const t = TRANSLATIONS[language];

  // Manage a list of plans for history
  const [plans, setPlans] = useState<DayPlan[]>([]);
  // The ID of the currently selected plan
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Store last request for retry capability
  const [lastRequest, setLastRequest] = useState<PlanRequest | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingTrivia, setLoadingTrivia] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key Selection States
  const [isApiKeySelected, setIsApiKeySelected] = useState(true); // Assume true initially for non-Veo models
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);

  // Admin Config States
  const [activityData, setActivityData] = useState<ActivityData>(TOURIST_ACTIVITIES);
  const [planCost, setPlanCost] = useState<number>(2.00);
  const [adsEnabled, setAdsEnabled] = useState<boolean>(true);
  const [nativeBannerVisible, setNativeBannerVisible] = useState(false);

  const activePlan = plans.find(p => p.id === selectedPlanId) || null;

  const showAdsOnScreen =
    adsEnabled &&
    !!user &&
    (state === 'dashboard' || state === 'result') &&
    !isGenerating &&
    !error &&
    !showApiKeyPrompt;

  // Initialize AdMob once (no-op on web)
  useEffect(() => {
    initializeAds().catch(() => {});
  }, []);

  // Native banner on dashboard/result; hide during wizard so it doesn't cover the pay/ad choice
  useEffect(() => {
    let cancelled = false;
    const syncBanner = async () => {
      if (showAdsOnScreen && isNativeAdsAvailable()) {
        const shown = await showBannerAd();
        if (!cancelled) setNativeBannerVisible(shown);
      } else {
        await hideBannerAd();
        if (!cancelled) setNativeBannerVisible(false);
      }
    };
    syncBanner();
    return () => {
      cancelled = true;
      hideBannerAd().catch(() => {});
    };
  }, [showAdsOnScreen]);

  // Request notification permission once on mount
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const result = await LocalNotifications.requestPermissions();
        if (result.display === 'granted') {
          await LocalNotifications.createChannel({
            id: 'todayplan-channel',
            name: 'TodayPlan',
            description: 'Plan generation updates',
            importance: 4,
            sound: 'beep.wav',
            vibration: true,
          });
        }
      } catch {
        // Notifications not available (e.g. web browser) — ignore silently
      }
    };
    requestNotificationPermission();
  }, []);

  // Restore session on app open + listen for auth state changes (handles Google OAuth redirect)
  useEffect(() => {
    const resolveAndLoginUser = async (supabaseUser: any) => {
      const profile = await loadProfile(supabaseUser.id);
      const resolvedProfile: UserProfile = profile || {
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        age: 30,
        relation: 'Organizer',
        companions: [],
        reviews: [],
      };
      if (!profile) {
        await createProfileForNewUser(supabaseUser.id, resolvedProfile);
      }
      setUser(resolvedProfile);
      // Rehydrate plan history from Supabase so users see every previous plan
      // they've generated (on any device) as soon as they log in.
      const storedPlans = await loadUserPlans(supabaseUser.id);
      setPlans(storedPlans);
      setState('dashboard');
    };

    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await resolveAndLoginUser(session.user);
    };
    restoreSession();

    // Listen for auth state changes (covers email login and Google OAuth session).
    // IMPORTANT: the callback must return synchronously. Supabase holds the auth
    // lock while firing this event and awaits every listener before releasing
    // it. If we await Supabase queries (loadProfile / loadUserPlans) here, their
    // internal getSession() calls try to re-acquire the same lock → deadlock,
    // which manifests as a "Login timed out" error on the second sign-in after
    // a sign-out. Defer the heavy work with setTimeout so the lock releases
    // first. See https://github.com/supabase/auth-js/issues/1010
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const signedInUser = session.user;
        setTimeout(() => {
          resolveAndLoginUser(signedInUser).catch(err =>
            console.warn('login resolve failed', err)
          );
          // Close the external browser after Google OAuth completes
          Browser.close().catch(() => {});
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setState('landing');
      }
    });

    // Handle deep link: com.todayplan.app://login-callback
    // Android fires this when Google OAuth redirects back to the app
    const deepLinkListener = CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (url.includes('login-callback') || url.includes('access_token') || url.includes('code=')) {
        try { await Browser.close(); } catch {}
        // Support both OAuth callback styles:
        // 1) PKCE code flow (?code=...) and 2) token hash flow (#access_token=...)
        const urlObj = new URL(url.replace('com.todayplan.app://', 'https://placeholder/'));
        const code = urlObj.searchParams.get('code');
        const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.warn('OAuth code exchange failed:', error.message);
          }
          return;
        }

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            console.warn('OAuth token session set failed:', error.message);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      deepLinkListener.then(l => l.remove());
    };
  }, []);

  // Check API key selection status on mount and when state might change
  useEffect(() => {
    const checkKeyStatus = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        setIsApiKeySelected(true);
      }
    };
    checkKeyStatus();
  }, [state]);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setState('dashboard');
  };

  const handleLogout = async () => {
    try { await signOut(); } catch {}
    setUser(null);
    setState('landing');
    setSelectedPlanId(null);
    setPlans([]);
    setLastRequest(null);
    setIsApiKeySelected(true);
  };

  const handleUpdateProfile = async (updatedUser: UserProfile) => {
    setUser(updatedUser);
    // Persist profile changes to Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await saveProfile(session.user.id, updatedUser);
      }
    } catch (e) {
      console.warn('Failed to save profile to Supabase', e);
    }
  };

  const handlePlanSubmit = async (request: PlanRequest) => {
    if (!user) return;
    
    // Check API key before making the call
    if (!isApiKeySelected && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      setShowApiKeyPrompt(true);
      setLastRequest(request); // Save request to retry after key selection
      return;
    }

    setLastRequest(request); // Save for retry
    setIsGenerating(true);
    setError(null);
    setLoadingTrivia(null);

    // Keep screen awake while generating
    try { await KeepAwake.keepAwake(); } catch {}

    // Show persistent "generating" notification so Android keeps the process alive
    const GENERATING_NOTIFICATION_ID = 9001;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: GENERATING_NOTIFICATION_ID,
          title: '⏳ Generating your plan...',
          body: `Finding the best spots near ${request.location.name || 'your location'}. Please wait.`,
          channelId: 'todayplan-channel',
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_launcher',
        }]
      });
    } catch {}

    // 1. Trigger the Trivia Fetch (Fast)
    getPlaceTrivia(request.location, language)
      .then(trivia => setLoadingTrivia(trivia))
      .catch(err => console.log("Trivia fetch failed", err));

    // 2. Trigger the Main Plan Generation (Slow, high quality)
    try {
      const plan = await generateDayPlan(user, request, activityData, language);
      setPlans(prev => [plan, ...prev]);
      setSelectedPlanId(plan.id);
      // Persist new plan to Supabase (fire-and-forget — errors are logged inside).
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) savePlan(session.user.id, plan);
      } catch {}
      setState('result');
      // Notify user plan is ready (useful when screen was off)
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now(),
            title: '✅ Your plan is ready!',
            body: plan.title || 'Tap to view your itinerary',
            channelId: 'todayplan-channel',
            sound: 'beep.wav',
            smallIcon: 'ic_launcher',
          }]
        });
      } catch {}
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate plan. Please try again.";
      
      // Detect Quota errors
      if (err.toString().toLowerCase().includes('quota') || err.toString().includes('429') || err.status === 429) {
        errorMessage = "QUOTA_EXCEEDED";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      if (errorMessage === "QUOTA_EXCEEDED" && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        setShowApiKeyPrompt(true);
      }
      // Notify user of failure
      try {
        await LocalNotifications.schedule({
          notifications: [{
            id: Date.now(),
            title: '⚠️ Plan generation failed',
            body: errorMessage === 'QUOTA_EXCEEDED' ? 'High traffic — please try again in a moment.' : 'Tap to retry.',
            channelId: 'todayplan-channel',
          }]
        });
      } catch {}
    } finally {
      setIsGenerating(false);
      setLoadingTrivia(null);
      // Release wake lock
      try { await KeepAwake.allowSleep(); } catch {}
      // Cancel the "generating" persistent notification
      try { await LocalNotifications.cancel({ notifications: [{ id: 9001 }] }); } catch {}
    }
  };

  const handleRetry = () => {
    if (lastRequest) {
      setError(null); // Clear previous error
      if (!isApiKeySelected && window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
         setShowApiKeyPrompt(true); // Re-prompt for key if still not selected
      } else {
         handlePlanSubmit(lastRequest);
      }
    } else {
      setError(null);
      setState('dashboard');
    }
  };

  const handleUpdatePlan = async (updatedPlan: DayPlan) => {
      setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
      // Keep Supabase in sync with finalize/selection edits.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) savePlan(session.user.id, updatedPlan);
      } catch {}
  };

  const handleSubmitReviews = (newReviews: Review[]) => {
    if (!user) return;
    
    // Update user profile with new reviews
    const updatedUser = {
      ...user,
      reviews: [...(user.reviews || []), ...newReviews]
    };
    
    setUser(updatedUser);
    setSelectedPlanId(null); // Clear selection
    setState('dashboard'); // Return to dashboard
  };

  const handleOpenApiKeySelection = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success, and then try to proceed
      setIsApiKeySelected(true);
      setShowApiKeyPrompt(false);
      if (lastRequest) {
         handlePlanSubmit(lastRequest); // Retry the last plan generation
      } else {
         setState('dashboard');
      }
    } else {
      alert("AI Studio API for key selection not available.");
      setShowApiKeyPrompt(false);
      setState('dashboard');
    }
  };

  const renderApiKeyPrompt = () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center px-4 animate-in fade-in zoom-in-95">
      <div className="p-8 rounded-2xl border border-blue-200 dark:border-blue-900 max-w-md shadow-xl bg-white dark:bg-slate-900">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
          <KeyRound className="w-8 h-8" />
        </div>
        
        <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-white">
          Unlock Full AI Capabilities
        </h3>
        
        <p className="mb-6 leading-relaxed text-sm text-slate-600 dark:text-slate-400">
          To generate plans, especially when high traffic volume or premium models are involved, please select or provide a valid API key from your Google Cloud project. This helps us ensure reliable and unthrottled access to AI services.
        </p>

        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium flex items-center justify-center mb-6"
        >
          Learn more about billing <ChevronRight className="w-4 h-4 ml-1" />
        </a>
        
        <div className="flex flex-col space-y-3">
          <Button onClick={handleOpenApiKeySelection} className="w-full">
            Select API Key
          </Button>
          <Button onClick={() => { setShowApiKeyPrompt(false); setState('dashboard'); }} variant="ghost" className="w-full dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel & Go Back
          </Button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center px-6">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
               <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Crafting your perfect day...</h2>
          
          <div className="max-w-md bg-white dark:bg-slate-900 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm mt-4 transition-all duration-500 transform">
             <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">Did you know?</h3>
             {loadingTrivia ? (
               <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed animate-in fade-in">
                 "{loadingTrivia}"
               </p>
             ) : (
               <p className="text-slate-400 dark:text-slate-500 italic animate-pulse">Looking up cool facts about the area...</p>
             )}
          </div>
          
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-8 max-w-sm">
            We are analyzing thousands of spots to find the ones with 4.5+ stars within your selected radius.
          </p>
        </div>
      );
    }

    if (error) {
      const isQuota = error === "QUOTA_EXCEEDED";
      
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center px-4 animate-in fade-in zoom-in-95">
           <div className={`p-8 rounded-2xl border max-w-md shadow-xl bg-white dark:bg-slate-900 ${isQuota ? 'border-amber-200 dark:border-amber-900' : 'border-red-200 dark:border-red-900'}`}>
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${isQuota ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                {isQuota ? <Clock className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
             </div>
             
             <h3 className={`font-bold text-xl mb-3 ${isQuota ? 'text-amber-800 dark:text-amber-400' : 'text-red-800 dark:text-red-400'}`}>
               {isQuota ? "High Traffic Volume" : "Generation Failed"}
             </h3>
             
             <p className={`mb-8 leading-relaxed text-sm ${isQuota ? 'text-amber-700 dark:text-amber-500' : 'text-slate-600 dark:text-slate-400'}`}>
               {isQuota 
                 ? "We've hit our usage limits with the AI service for the moment. This usually resets quickly." 
                 : error}
               {isQuota && <br />}
               {isQuota && <span className="font-semibold mt-2 block">Please wait a minute and try again.</span>}
             </p>
             
             <div className="flex flex-col space-y-3">
               <Button onClick={handleRetry} variant={isQuota ? 'primary' : 'primary'} className={isQuota ? 'bg-amber-600 hover:bg-amber-700' : ''}>
                 <RefreshCw className="w-4 h-4 mr-2" />
                 {isQuota ? "Try Again" : "Retry"}
               </Button>
               <Button onClick={() => { setError(null); setState('dashboard'); }} variant="ghost" className="dark:text-slate-300 dark:hover:bg-slate-800">
                 Cancel & Go Home
               </Button>
             </div>
           </div>
        </div>
      );
    }

    if (showApiKeyPrompt) {
      return renderApiKeyPrompt();
    }

    switch (state) {
      case 'landing':
        return (
          <LandingPage 
             onGetStarted={() => {
                setAuthMode('signup');
                setState('auth');
             }} 
             onLogin={() => {
                setAuthMode('login');
                setState('auth');
             }}
             t={t}
          />
        );

      case 'auth':
        return <Auth onLogin={handleLogin} initialIsLogin={authMode === 'login'} t={t} />;
      
      case 'dashboard':
        return user ? (
          <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 rounded-2xl p-8 text-white shadow-lg">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t.dashboard.hello}, {user.name}!</h1>
                <p className="text-blue-100">{t.dashboard.subtitle}</p>
              </div>
              <Button 
                onClick={() => setState('wizard')}
                className="bg-white text-blue-600 hover:bg-blue-50 border-none shadow-none dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700"
                size="lg"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                {t.dashboard.planNew}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Profile user={user} onUpdate={handleUpdateProfile} t={t} />
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center space-x-2 mb-4">
                   <History className="w-5 h-5 text-slate-400" />
                   <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.dashboard.recentPlans}</h2>
                </div>
                
                <div className="space-y-3">
                  {plans.length > 0 ? (
                    plans.map(plan => (
                      <div 
                        key={plan.id}
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          setState('result');
                        }}
                        className="group p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-all flex justify-between items-center"
                      >
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400">{plan.title}</h3>
                          <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                             <span className="mr-2">{plan.date}</span>
                             {plan.finalizedPlan && (
                                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/30 px-1.5 rounded">
                                   <Map className="w-3 h-3 mr-1" /> Finalized
                                </span>
                             )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-blue-400" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic py-4 text-center">{t.dashboard.noRecent}</p>
                  )}
                </div>
                
                {user.reviews && user.reviews.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.dashboard.myReviews}</h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.dashboard.ratedPlaces.replace('{count}', user.reviews.length.toString())}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null;

      case 'wizard':
        return user ? (
          <PlanWizard 
            user={user} 
            onSubmit={handlePlanSubmit} 
            onCancel={() => setState('dashboard')} 
            t={t}
            activityData={activityData}
            planCost={planCost}
            adsEnabled={adsEnabled}
          />
        ) : null;

      case 'result':
        return activePlan ? (
          <PlanResult 
            plan={activePlan} 
            onClose={() => setState('dashboard')} 
            onUpdatePlan={handleUpdatePlan}
            onSubmitReviews={handleSubmitReviews}
            language={language}
          />
        ) : null;
      
      case 'admin':
        return (
          <AdminDashboard 
            activityData={activityData}
            onUpdateActivities={setActivityData}
            planCost={planCost}
            onUpdateCost={setPlanCost}
            adsEnabled={adsEnabled}
            onUpdateAdsEnabled={setAdsEnabled}
            planLogs={plans}
            onClose={() => setState(user ? 'dashboard' : 'landing')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onGoHome={() => user ? setState('dashboard') : setState('landing')}
      language={language}
      onLanguageChange={setLanguage}
      onAdminClick={() => setState('admin')}
      showWebBanner={showAdsOnScreen && !Capacitor.isNativePlatform()}
      nativeBannerOffset={nativeBannerVisible}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;