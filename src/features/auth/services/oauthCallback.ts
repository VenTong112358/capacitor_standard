import { supabase } from '../../../shared/lib/supabase';

export type OAuthCallbackPayload = {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
};

function mergeParams(target: URLSearchParams, source: URLSearchParams) {
  source.forEach((value, key) => {
    target.set(key, value);
  });
}

function parseUrlParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [withoutHash, hashPart = ''] = url.split('#', 2);
  const queryIndex = withoutHash.indexOf('?');

  if (queryIndex !== -1) {
    const queryPart = withoutHash.slice(queryIndex + 1);
    mergeParams(params, new URLSearchParams(queryPart));
  }

  if (hashPart) {
    mergeParams(params, new URLSearchParams(hashPart));
  }

  return params;
}

export function extractOAuthCallbackPayload(url: string): OAuthCallbackPayload {
  const params = parseUrlParams(url);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
  };
}

export function isOAuthCallbackUrl(url: string): boolean {
  const payload = extractOAuthCallbackPayload(url);

  return Boolean(payload.accessToken || payload.refreshToken || payload.code || payload.error);
}

export async function completeOAuthFromCallbackUrl(url: string): Promise<void> {
  const payload = extractOAuthCallbackPayload(url);

  if (payload.error) {
    throw new Error(payload.errorDescription ?? payload.error);
  }

  if (payload.accessToken) {
    const { error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken ?? '',
    });

    if (error) {
      throw error;
    }

    return;
  }

  if (payload.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(payload.code);
    if (error) {
      throw error;
    }
    return;
  }

  throw new Error('OAuth callback did not include a session token or authorization code.');
}
