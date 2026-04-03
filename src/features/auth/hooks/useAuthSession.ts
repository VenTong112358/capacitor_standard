import { useCallback, useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../shared/lib/supabase';
import { completeOAuthFromCallbackUrl, isOAuthCallbackUrl } from '../services/oauthCallback';
import { refreshCurrentUser } from '../services/authService';

function clearUrlHash() {
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function urlIndicatesRecovery() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

export function useAuthSession() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const reloadUser = useCallback(async () => {
    const currentUser = await refreshCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const leaveRecoveryMode = useCallback(() => {
    setIsRecoveryMode(false);
    clearUrlHash();
  }, []);

  useEffect(() => {
    let isUnmounted = false;

    if (urlIndicatesRecovery()) {
      setIsRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isUnmounted) {
        return;
      }

      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        clearUrlHash();
        setIsLoading(false);
        return;
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUser(session.user);
        setIsLoading(false);
        if (Capacitor.isNativePlatform()) {
          Browser.close().catch(() => undefined);
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRecoveryMode(false);
      }

      if (event === 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
      }

      setIsLoading(false);
    });

    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!isOAuthCallbackUrl(url)) {
          return;
        }

        try {
          await completeOAuthFromCallbackUrl(url);
        } catch (error) {
          console.error('Failed to consume OAuth callback URL:', error);
        } finally {
          Browser.close().catch(() => undefined);
        }
      }).then((handle) => {
        removeUrlListener = () => handle.remove();
      });
    }

    return () => {
      isUnmounted = true;
      subscription.unsubscribe();
      removeUrlListener?.();
    };
  }, []);

  return {
    isLoading,
    user,
    isRecoveryMode,
    reloadUser,
    leaveRecoveryMode,
  };
}
