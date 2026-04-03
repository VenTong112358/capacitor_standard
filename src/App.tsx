import { useEffect, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import type { User } from '@supabase/supabase-js';
import { AuthView } from './views/AuthView';
import { HomeView } from './views/HomeView';
import { RecoveryPasswordView } from './views/RecoveryPasswordView';
import { supabase } from './services/supabase';

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

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    if (urlIndicatesRecovery()) {
      setIsRecoveryMode(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        clearUrlHash();
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        if (Capacitor.isNativePlatform()) {
          Browser.close().catch(() => undefined);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsRecoveryMode(false);
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        setUser(session.user);
      }
    });

    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url.includes('access_token') && !url.includes('refresh_token')) return;
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        const separator = hashIndex !== -1 ? hashIndex : queryIndex;
        if (separator === -1) return;
        const fragment = url.substring(separator + 1);
        const urlParams = new URLSearchParams(fragment.replace('#', ''));
        const access_token = urlParams.get('access_token');
        const refresh_token = urlParams.get('refresh_token');
        if (access_token) {
          await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token ?? '',
          });
          Browser.close().catch(() => undefined);
        }
      }).then((handle) => {
        removeUrlListener = () => handle.remove();
      });
    }

    return () => {
      subscription.unsubscribe();
      removeUrlListener?.();
    };
  }, []);

  const handleAuthSuccess = async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleRecoveryDone = () => {
    setIsRecoveryMode(false);
    clearUrlHash();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen paper-texture flex items-center justify-center">
        <p className="text-sm font-semibold text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isRecoveryMode) {
    return <RecoveryPasswordView onDone={handleRecoveryDone} />;
  }

  if (!user) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return <HomeView user={user} onLogout={handleLogout} />;
}
