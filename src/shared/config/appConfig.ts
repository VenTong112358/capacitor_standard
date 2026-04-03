export const APP_CONFIG = {
  appName: 'Capacitor Standard',
  appId: 'com.capacitor.standard',
  oauthCallbackHost: 'oauth-callback',
} as const;

export const NATIVE_OAUTH_REDIRECT = `${APP_CONFIG.appId}://${APP_CONFIG.oauthCallbackHost}`;
