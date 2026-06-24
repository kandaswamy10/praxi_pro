// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, sendOTP, verifyOTP, signInWithGoogle, signOut, onAuthChange } from '../lib/supabase';
import { cloud, local } from '../lib/storage';
import { DEFAULT_AI_CONFIG } from '../ai/service';

const AuthContext = createContext(null);

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

  // Use refs so async callbacks always have latest values
  // without needing them as useCallback/useEffect dependencies
  const sessionRef = useRef(session);
  const profileRef = useRef(profile);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const loadProfile = async (user) => {
    setLoading(true);
    try {
      const { data } = await cloud.getProfile(user.id);
      if (data?.id) {
        const merged = { ...makeDefaultProfile(user), ...data };
        setProfile(merged);
        setAuthStep('done');
      } else {
        setProfile(makeDefaultProfile(user));
        setAuthStep('storage');
      }
    } catch (e) {
      console.warn('loadProfile error:', e.message);
      setProfile(makeDefaultProfile(user));
      setAuthStep('storage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user);
      else setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthChange((session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
        setAuthStep('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // ← empty deps, no hooks called inside

  // Plain functions (not useCallback) — avoids hook rule violations
  const completeOnboarding = async (updates) => {
    const currentSession = sessionRef.current;
    const currentProfile = profileRef.current;
    if (!currentSession) return;
    const merged = { ...currentProfile, ...updates };
    setProfile(merged);
    setAuthStep('done'); // advance immediately
    try {
      await cloud.saveProfile(currentSession.user.id, merged);
    } catch (e) {
      console.warn('Profile save error (non-blocking):', e.message);
    }
  };

  const updateProfile = async (updates) => {
    const currentSession = sessionRef.current;
    const currentProfile = profileRef.current;
    if (!currentSession) return;
    const merged = { ...currentProfile, ...updates };
    setProfile(merged);
    try {
      await cloud.saveProfile(currentSession.user.id, merged);
      await local.saveProfile(currentSession.user.id, merged);
    } catch (e) {
      console.warn('updateProfile error:', e.message);
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.warn('signOut error:', e); }
    setSession(null);
    setProfile(null);
    setAuthStep('welcome');
  };

  const value = {
    session,
    profile,
    loading,
    authStep,
    setAuthStep,
    sendOTP,
    verifyOTP,
    signInWithGoogle,
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
