import { createClient } from '@supabase/supabase-js';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';
import { UserProfile, DayPlan } from '../types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Native-friendly storage adapter for Supabase auth.
// Uses Capacitor Preferences (backed by SharedPreferences on Android), which is
// reliable inside the WebView — unlike localStorage, which can hang or be cleared.
const capacitorStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    // Critical for native apps: prevents the client from trying to parse an
    // OAuth session from window.location (which hangs on Android Capacitor).
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'com.todayplan.app://login-callback',
      skipBrowserRedirect: true, // We handle opening the browser ourselves
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) throw error;
  // Open Google OAuth in the system browser (required for Android — WebView blocks Google OAuth)
  if (data?.url) {
    await Browser.open({ url: data.url, windowName: '_self' });
  }
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const loadProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    name: data.name || '',
    email: data.email || '',
    age: data.age || 30,
    relation: data.relation || 'Organizer',
    companions: data.companions || [],
    reviews: data.reviews || [],
  };
};

export const saveProfile = async (userId: string, profile: UserProfile) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: profile.name,
      email: profile.email,
      age: profile.age,
      relation: profile.relation,
      companions: profile.companions,
      reviews: profile.reviews,
    }, { onConflict: 'id' });

  if (error) throw error;
};

export const createProfileForNewUser = async (userId: string, profile: UserProfile) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: profile.name,
      email: profile.email,
      age: profile.age || 30,
      relation: profile.relation || 'Organizer',
      companions: profile.companions || [],
      reviews: profile.reviews || [],
    }, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.error('createProfileForNewUser error:', error.message, error.details, error.hint);
    throw error;
  }
};

// ── Plans ─────────────────────────────────────────────────────────────────────
// RLS on the `plans` table ensures users can only access their own rows, so we
// just filter by user_id on reads. Errors are logged and swallowed so that
// generation never fails because of a backend/offline hiccup — the plan always
// stays in local state regardless.

export const loadUserPlans = async (userId: string): Promise<DayPlan[]> => {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('loadUserPlans error:', error.message);
    return [];
  }
  return (data || []).map(row => row.data as DayPlan);
};

export const savePlan = async (userId: string, plan: DayPlan) => {
  const { error } = await supabase.from('plans').upsert(
    {
      id: plan.id,
      user_id: userId,
      title: plan.title,
      plan_date: plan.date,
      is_finalized: !!plan.finalizedPlan,
      data: plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );
  if (error) console.warn('savePlan error:', error.message);
};

export const deletePlan = async (planId: string) => {
  const { error } = await supabase.from('plans').delete().eq('id', planId);
  if (error) console.warn('deletePlan error:', error.message);
};
