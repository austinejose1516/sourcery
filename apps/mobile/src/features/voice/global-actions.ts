import { router } from 'expo-router';
import { useVoiceStore } from './voice-store';
import type { VoiceAction } from './types';

/**
 * App-wide actions available on every screen, registered once by the provider.
 * These prove the assistant reaches beyond cook mode; screens add richer,
 * context-specific actions on top via useVoiceActions.
 */
const GLOBAL_ID = '__global__';

const globalActions: VoiceAction[] = [
  {
    name: 'go_back',
    description: 'Go back to the previous screen.',
    handler: () => {
      if (router.canGoBack()) router.back();
    },
  },
  {
    name: 'navigate_home',
    description: 'Go to the Home feed of recipes.',
    handler: () => router.navigate('/home'),
  },
  {
    name: 'navigate_explore',
    description: 'Open Explore to search for recipes and cooks.',
    handler: () => router.navigate('/explore'),
  },
  {
    name: 'navigate_my_recipes',
    description: "Open the user's own and saved recipes.",
    handler: () => router.navigate('/my-recipes'),
  },
];

export function registerGlobalActions(): () => void {
  useVoiceStore.getState().registerActions(GLOBAL_ID, globalActions);
  return () => useVoiceStore.getState().unregisterActions(GLOBAL_ID);
}
