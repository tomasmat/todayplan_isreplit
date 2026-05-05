import React, { useState } from 'react';
import { Button } from './Button';
import { UserProfile } from '../types';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, createProfileForNewUser, loadProfile } from '../services/supabaseService';
import { AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
  initialIsLogin?: boolean;
  t: any;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, initialIsLogin = true, t }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  };

  const withTimeoutAndRetry = async <T,>(
    fn: () => Promise<T>,
    ms: number,
    message: string,
    retries = 2
  ): Promise<T> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await withTimeout(fn(), ms, message);
      } catch (err: any) {
        const isTimeout = err.message === message;
        if (isTimeout && attempt < retries) {
          console.warn(`Auth attempt ${attempt} timed out, retrying...`);
          continue;
        }
        throw err;
      }
    }
    throw new Error(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        const data = await withTimeoutAndRetry(
          () => signInWithEmail(email, password),
          30000,
          'Login timed out. Please check your internet and try again.'
        );
        const user = data.user;
        if (!user) throw new Error('Login failed. Please try again.');

        onLogin({
          name: user.user_metadata?.name || email.split('@')[0],
          email: user.email || email,
          age: 30,
          relation: 'Organizer',
          companions: [],
          reviews: [],
        });
      } else {
        const signUpData = await withTimeoutAndRetry(
          () => signUpWithEmail(email, password, name),
          30000,
          'Signup timed out. Please check your internet and try again.'
        );
        const signUpUser = signUpData.user;

        if (!signUpUser) {
          throw new Error('Signup failed — please try again.');
        }

        // If identities is empty the email already exists in auth
        if (signUpUser.identities && signUpUser.identities.length === 0) {
          throw new Error('This email is already registered. Please log in instead.');
        }

        // Always sign in immediately after signup — this guarantees a session
        const loginData = await withTimeoutAndRetry(
          () => signInWithEmail(email, password),
          30000,
          'Account created, but login timed out. Please try logging in now.'
        );
        const user = loginData.user;
        if (!user) throw new Error('Could not log in after signup. Please try logging in manually.');

        // Navigate immediately after auth succeeds; sync profile in background.
        const fallbackProfile: UserProfile = {
          name: user.user_metadata?.name || name || email.split('@')[0],
          email: user.email || email,
          age: 30,
          relation: 'Organizer',
          companions: [],
          reviews: [],
        };
        onLogin(fallbackProfile);

        void (async () => {
          try {
            const profile = await withTimeoutAndRetry(
              () => loadProfile(user.id),
              20000,
              'Profile load timed out.'
            );
            if (!profile) {
              await withTimeoutAndRetry(
                () => createProfileForNewUser(user.id, fallbackProfile),
                20000,
                'Profile save timed out.'
              );
            }
          } catch (profileErr: any) {
            console.warn('Background profile sync failed:', profileErr?.message || profileErr);
          }
        })();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // OAuth redirects the page — onLogin will be called via session check in App.tsx
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            {isLogin ? t.auth.welcomeBack : t.auth.createAccount}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {isLogin ? t.auth.signInSubtitle : t.auth.signUpSubtitle}
          </p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all mb-4 disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.name}</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.auth.email}</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {isLogin ? t.auth.signIn : t.auth.signUp}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); setSuccessMsg(null); }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline"
          >
            {isLogin ? t.auth.noAccount : t.auth.hasAccount}
          </button>
        </div>
      </div>
    </div>
  );
};
