import { registerPlugin } from '@capacitor/core';

interface ASWebAuthPlugin {
  start(options: { url: string }): Promise<{ url: string }>;
}

const ASWebAuth = registerPlugin<ASWebAuthPlugin>('ASWebAuth');

export { ASWebAuth };
