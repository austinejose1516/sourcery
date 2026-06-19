import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { radius } from '@recipeer/core';

export interface UploadSegmentProps {
  /** Signed R2 playback URL for the full recording. */
  url: string;
  startMs: number;
  endMs: number;
  muted: boolean;
}

/**
 * Plays one step's segment of an uploaded (R2) video, looping start→end. We seek
 * within the full recording — there are no pre-cut clips.
 */
export function UploadSegment({ url, startMs, endMs, muted }: UploadSegmentProps) {
  const startSec = startMs / 1000;
  const endSec = endMs / 1000;

  const player = useVideoPlayer(url, (p) => {
    p.muted = muted;
    // Hide the AirPlay / casting button from the native controls.
    p.allowsExternalPlayback = false;
    p.timeUpdateEventInterval = 0.25;
    // We only loop this one segment, so don't let the player buffer the whole
    // recording ahead (iOS default is unbounded). Buffer ~the segment + a little.
    p.bufferOptions = {
      preferredForwardBufferDuration: Math.min(Math.max(endSec - startSec, 5) + 3, 30),
    };
    p.currentTime = startSec;
    p.play();
  });

  // Reflect the mute toggle.
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  // Snap into the segment and loop it. `entered` guards the initial seek: the
  // setup `currentTime` is ignored if the source isn't loaded yet, so until we've
  // first reached the window we force the play head to `startSec`; afterwards we
  // only loop at the end, leaving the scrub controls usable.
  const entered = useRef(false);
  useEffect(() => {
    entered.current = false;
  }, [startSec, endSec]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (currentTime >= endSec) {
        player.currentTime = startSec;
      } else if (!entered.current && currentTime < startSec - 0.25) {
        player.currentTime = startSec;
      }
      if (currentTime >= startSec - 0.25 && currentTime < endSec) entered.current = true;
    });
    return () => sub.remove();
  }, [player, startSec, endSec]);

  return <VideoView player={player} nativeControls contentFit="cover" style={styles.video} />;
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%', borderRadius: radius.md },
});
