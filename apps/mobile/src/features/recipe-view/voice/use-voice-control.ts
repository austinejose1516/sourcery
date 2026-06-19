import { useCallback, useState } from 'react';

/**
 * Hands-free cook control — the single integration point for voice.
 *
 * Today this only models the overlay's *visibility*; the overlay itself animates
 * its listening → answer phases from the step's seeded Q&A. Real speech is not
 * wired yet.
 *
 * TODO(voice): turn this into the real controller. On `show()` start the mic,
 * stream a transcript, match intents ("next" / "previous" / "how long" / "repeat"),
 * speak the matched answer via TTS, and call back into the cook flow to advance
 * steps. The screens already react to `visible`, so nothing else needs to change
 * structurally — swap the body here.
 */
export function useVoiceControl() {
  const [visible, setVisible] = useState(false);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  return { visible, show, hide };
}
