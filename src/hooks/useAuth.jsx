// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, sendOTP, verifyOTP, signInWithGoogle, signOut, onAuthChange } from '../lib/supabase';
import { cloud, local } from '../lib/storage';
import { DEFAULT_AI_CONFIG } from '../ai/service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [authStep, setAuthStep] = useState('welcome');

  useEffect(() => {
    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (OTP verify, Google OAuth callback)
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
  }, []);

  const loadProfile = async (user) => {
    try {
      const { data, error } = await cloud.getProfile(user.id);
      if (data && !error) {
        // Existing user — go straight to app
        setProfile(data);
        setAuthStep('done');
      } else {
        // New user — build default profile, go to onboarding
        const defaultProfile = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || null,
          storage_mode: 'local',
          enabled_tabs: ['dashboard', 'work', 'learning', 'personal', 'finance'],
          pinned_tab: 'dashboard',
          theme: 'auto',
          ai_config: DEFAULT_AI_CONFIG,
        };
        setProfile(defaultProfile);
        setAuthStep('storage');
      }
    } catch (e) {
      console.error('loadProfile error:', e);
      // Still let them through with a default profile
      const defaultProfile = {
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        storage_mode: 'local',
        enabled_tabs: ['dashboard', 'work', 'learning', 'personal', 'finance'],
        pinned_tab: 'dashboard',
        theme: 'auto',
        ai_config: DEFAULT_AI_CONFIG,
      };
      setProfile(defaultProfile);
      setAuthStep('storage');
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    // Save to Supabase (don't block on error)
    try {
      await cloud.saveProfile(session.user.id, merged);
    } catch (e) {
      console.warn('Profile save failed, continuing anyway:', e);
    }
    // Always advance to app regardless of save success
    setAuthStep('done');
  }, [session, profile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session) return;
    const merged = { ...profile, ...updates };
    setProfile(merged);
    try {
      await cloud.saveProfile(session.user.id, merged);
      await local.saveProfile(session.user.id, merged);
    } catch (e) {
      console.warn('updateProfile error:', e);
    }
  }, [session, profile]);

  const value = {
    session, profile, loading, authStep, setAuthStep,
    sendOTP, verifyOTP, signInWithGoogle,
    signOut: async () => {
      await signOut();
      setSession(null);
      setProfile(null);
      setAuthStep('welcome');
    },
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
