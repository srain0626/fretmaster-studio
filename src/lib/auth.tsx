'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: false,
  isConfigured: false,
  isAdmin: false,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const errParam = params.get('authError');
      if (errParam) {
        setAuthError(errParam);
      }
    } catch {
      // Ignore query parsing failure
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        if (error && error.message !== 'Auth session missing!') {
          setAuthError(error.message);
        }
        setUser(data.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(err instanceof Error ? err.message : 'auth_init_failed');
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { isAdmin: false }))
      .then((json: { isAdmin?: boolean }) => {
        if (!cancelled) {
          setIsAdmin(Boolean(json?.isAdmin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const signInWithGoogle = useCallback(async (nextPath = '/studio') => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError('supabase_not_configured');
      return;
    }

    setAuthError(null);
    const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/studio';
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      setAuthError(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      return;
    }
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isConfigured: configured,
      isAdmin,
      authError,
      clearAuthError,
      signInWithGoogle,
      signOut,
    }),
    [authError, clearAuthError, configured, isAdmin, loading, signInWithGoogle, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
