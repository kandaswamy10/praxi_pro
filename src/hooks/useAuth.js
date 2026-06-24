// src/hooks/useAuth.js
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, sendOTP, verifyOTP, signInWithGoogle, signOut, onAuthChange } from '../lib/supabase';
import { cloud, local } from '../lib/storage';
import { DEFAULT_AI_CONFIG } from '../ai/service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]       = useState(null);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [authStep, setAuthStep]     = useState('welcome'); // welcome|otp|verify|storage|tabs|aisetup|done

  // Load session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = onAuthChange((session) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (user) => {
    const { data } = await cloud.getProfile(user.id);
    if (data) {
      setProfile(data);
      setAuthStep('done');
    } else {
      // New user — start onboarding
      setProfile({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        storage_mode: 'local',
        enabled_tabs: ['dashboard', 'work', 'learning', 'personal', 'finance'],
        pinned_tab: 'dashboard',
        theme: 'auto',
        ai_config: DEFAULT_AI_CONFIG,
      });
      setAuthStep('storage');
    }
    setLoading(false);
  };

  const completeOnboarding = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    await cloud.saveProfile(session.user.id, merged);
    setAuthStep('done');
  }, [session, profile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    // Save to both cloud and local
    await cloud.saveProfile(session.user.id, merged);
    await local.saveProfile(session.user.id, merged);
  }, [session, profile]);

  return (
    <AuthContext.Provider value={{
      session, profile, loading, authStep, setAuthStep,
      sendOTP, verifyOTP, signInWithGoogle,
      signOut: async () => { await signOut(); setSession(null); setProfile(null); setAuthStep('welcome'); },
      completeOnboarding, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
