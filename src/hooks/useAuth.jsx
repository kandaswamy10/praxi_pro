// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, sendOTP, verifyOTP, signInWithGoogle, signOut, onAuthChange } from '../lib/supabase';
import { cloud, local } from '../lib/storage';
import { DEFAULT_AI_CONFIG } from '../ai/service';

const AuthContext = createContext(null);

// Build a safe default profile for any user
const makeDefaultProfile = (user) => ({
  id: user.id,
  email: user.email,
  name: user.user_metadata?.full_name || user.email.split('@')[0],
  avatar_url: user.user_metadata?.avatar_url || null,
  storage_mode: 'local',
  enabled_tabs: ['dashboard', 'work', 'learning', 'personal', 'finance'],
  pinned_tab: 'dashboard',
  theme: 'auto',
  ai_config: DEFAULT_AI_CONFIG,
});

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [authStep, setAuthStep] = useState('welcome');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = onAuthChange((session) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else {
        setProfile(null);
        setLoading(false);
        setAuthStep('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (user) => {
    setLoading(true);
    try {
      const { data } = await cloud.getProfile(user.id);
      if (data?.id) {
        // Returning user — merge with defaults to fill any missing fields
        setProfile({ ...makeDefaultProfile(user), ...data });
        setAuthStep('done');
      } else {
        // New user — set defaults, go through onboarding
        setProfile(makeDefaultProfile(user));
        setAuthStep('storage');
      }
    } catch (e) {
      console.warn('loadProfile error (using defaults):', e.message);
      setProfile(makeDefaultProfile(user));
      setAuthStep('storage');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    setAuthStep('done'); // ← advance immediately, don't wait for DB
    try {
      await cloud.saveProfile(session.user.id, merged);
    } catch (e) {
      console.warn('Profile save error (non-blocking):', e.message);
    }
  }, [session, profile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    try {
      await cloud.saveProfile(session.user.id, merged);
      await local.saveProfile(session.user.id, merged);
    } catch (e) {
      console.warn('updateProfile error:', e.message);
    }
  }, [session, profile]);

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.warn('signOut error:', e); }
    setSession(null);
    setProfile(null);
    setAuthStep('welcome');
  };

  const value = {
    session, profile, loading, authStep, setAuthStep,
    sendOTP, verifyOTP, signInWithGoogle,
    signOut: handleSignOut,
    completeOnboarding,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
