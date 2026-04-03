import type { OAuthResponse } from '@supabase/supabase-js';
import { supabase } from '../../../shared/lib/supabase';
import { ASWebAuth } from '../../../shared/platform/asWebAuth';
import { getOAuthRedirectUrl, isIOS, NATIVE_OAUTH_REDIRECT } from '../../../shared/platform/capacitor';
import { completeOAuthFromCallbackUrl } from './oauthCallback';

type OAuthProvider = 'google' | 'apple';

export type OAuthSignInResult = 'redirect' | 'session';

export type EmailSignUpParams = {
  name: string;
  email: string;
  password: string;
};

export type EmailSignUpResult = {
  requiresEmailVerification: boolean;
  hasSession: boolean;
};

async function ensureOAuthUrl(response: OAuthResponse) {
  if (response.error || !response.data.url) {
    throw new Error(response.error?.message ?? 'Failed to initialize OAuth login.');
  }

  return response.data.url;
}

async function startNativeOAuth(
  provider: OAuthProvider,
  queryParams?: Record<string, string>
): Promise<OAuthSignInResult> {
  const oAuthUrl = await ensureOAuthUrl(
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_OAUTH_REDIRECT,
        skipBrowserRedirect: true,
        queryParams,
      },
    })
  );

  const { url: callbackUrl } = await ASWebAuth.start({ url: oAuthUrl });
  await completeOAuthFromCallbackUrl(callbackUrl);
  return 'session';
}

async function startRedirectOAuth(
  provider: OAuthProvider,
  queryParams?: Record<string, string>
): Promise<OAuthSignInResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
      queryParams,
    },
  });

  if (error) {
    throw error;
  }

  return 'redirect';
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getOAuthRedirectUrl(),
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmail(params: EmailSignUpParams): Promise<EmailSignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: getOAuthRedirectUrl(),
      data: { full_name: params.name },
    },
  });

  if (error) {
    throw error;
  }

  return {
    requiresEmailVerification: Boolean(data.user && !data.session),
    hasSession: Boolean(data.session),
  };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return Boolean(data.session);
}

export async function signInWithGoogle(): Promise<OAuthSignInResult> {
  if (isIOS()) {
    return startNativeOAuth('google', { prompt: 'select_account' });
  }

  return startRedirectOAuth('google', { prompt: 'select_account' });
}

export async function signInWithApple(): Promise<OAuthSignInResult> {
  if (isIOS()) {
    return startNativeOAuth('apple');
  }

  return startRedirectOAuth('apple');
}

export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }
}

export async function refreshCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
