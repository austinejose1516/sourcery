import { useEffect, useRef } from 'react';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';

export interface YouTubeSegmentProps {
  youtubeId: string;
  startMs: number;
  endMs: number;
  width: number;
  height: number;
  muted: boolean;
}

/**
 * Plays one step's segment of a YouTube-imported recipe via the embed player,
 * looping start→end. We poll the play head and seek back at the segment boundary
 * (more reliable than the `end` param across the iframe bridge).
 */
export function YouTubeSegment({ youtubeId, startMs, endMs, width, height, muted }: YouTubeSegmentProps) {
  const ref = useRef<YoutubeIframeRef>(null);
  const entered = useRef(false);
  const startSec = Math.floor(startMs / 1000);
  const endSec = Math.max(startSec + 1, Math.ceil(endMs / 1000));

  useEffect(() => {
    entered.current = false;
    const id = setInterval(async () => {
      const t = await ref.current?.getCurrentTime().catch(() => undefined);
      if (typeof t !== 'number') return;
      if (t >= endSec) {
        ref.current?.seekTo(startSec, true);
      } else if (!entered.current && t < startSec - 0.5) {
        // Initial seek into the segment if the `start` param was ignored on load.
        ref.current?.seekTo(startSec, true);
      }
      if (t >= startSec - 0.5 && t < endSec) entered.current = true;
    }, 400);
    return () => clearInterval(id);
  }, [startSec, endSec]);

  return (
    <YoutubePlayer
      ref={ref}
      height={height}
      width={width}
      play
      mute={muted}
      videoId={youtubeId}
      initialPlayerParams={{ start: startSec, controls: false, modestbranding: true, rel: false }}
      onChangeState={(state: string) => {
        if (state === 'ended') ref.current?.seekTo(startSec, true);
      }}
    />
  );
}
