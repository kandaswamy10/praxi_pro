// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, sendOTP, verifyOTP, signInWithGoogle, signOut, onAuthChange } from '../lib/supabase';
import { DEFAULT_AI_CONFIG } from '../ai/service';

const AuthContext = createContext(null);

const STORAGE_KEY = 'praxi_profile';

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
  onboarded: false,
});

const saveProfileLocal = (profile) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch(e) {}
};

const loadProfileLocal = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { return null; }
};

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [authStep, setAuthStep] = useState('welcome');

  const sessionRef = useRef(null);
  const profileRef = useRef(null);
  sessionRef.current = session;
  profileRef.current = profile;

  useEffect(() => {
    // On mount — check if there's already a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        handleExistingSession(session);
      } else {
        setLoading(false);
      }
    });

    // Auth state changes — only handle SIGNED_IN and SIGNED_OUT
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session);
        handleExistingSession(session);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
        setAuthStep('welcome');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleExistingSession = (session) => {
    // Check localStorage for saved profile
    const saved = loadProfileLocal();
    if (saved && saved.id === session.user.id && saved.onboarded) {
      // Returning user who completed onboarding
      setProfile(saved);
      setAuthStep('done');
    } else {
      // New user or incomplete onboarding — build default profile
      const defaultProfile = makeDefaultProfile(session.user);
      setProfile(defaultProfile);
      setAuthStep('storage'); // always show onboarding for new sessions
    }
    setLoading(false);
  };

  const completeOnboarding = (updates) => {
    const merged = { ...profileRef.current, ...updates, onboarded: true };
    setProfile(merged);
    saveProfileLocal(merged);
    setAuthStep('done');
    // Also try to save to Supabase in background (non-blocking)
    if (sessionRef.current) {
      supabase.from('profiles').upsert({ id: sessionRef.current.user.id, ...merged })
        .then(() => {}).catch(e => console.warn('Supabase profile save:', e.message));
    }
  };

  const updateProfile = (updates) => {
    const merged = { ...profileRef.current, ...updates };
    setProfile(merged);
    saveProfileLocal(merged);
    if (sessionRef.current) {
      supabase.from('profiles').upsert({ id: sessionRef.current.user.id, ...merged })
        .then(() => {}).catch(e => console.warn('Supabase profile update:', e.message));
    }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch(e) {}
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setProfile(null);
    setAuthStep('welcome');
  };

  return (
    <AuthContext.Provider value={{
      session, profile, loading, authStep, setAuthStep,
      sendOTP, verifyOTP, signInWithGoogle,
      signOut: handleSignOut,
      completeOnboarding,
      updateProfile,
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
