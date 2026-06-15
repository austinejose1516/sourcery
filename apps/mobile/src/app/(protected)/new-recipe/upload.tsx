import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Icon, Screen, Text } from '@/components/ui';
import { ingestUpload, uploadVideo } from '@/features/recipes/api';
import { FlowHeader } from '@/features/recipes/flow-header';

type Phase = 'idle' | 'uploading' | 'error';

function extOf(uri: string, fileName?: string | null): string {
  const name = fileName ?? uri;
  const m = name.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return (m?.[1] ?? 'mp4').toLowerCase();
}

export default function UploadScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<FileSystem.UploadTask | null>(null);

  async function pickAndUpload() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('We need access to your library to upload a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPhase('uploading');
    setProgress(0);
    try {
      const { key } = await uploadVideo(asset.uri, extOf(asset.uri, asset.fileName), {
        onProgress: setProgress,
        onTask: setTask,
      });
      const { jobId } = await ingestUpload(key);
      router.replace({ pathname: '/processing/[jobId]', params: { jobId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('error');
    } finally {
      setTask(null);
    }
  }

  function cancel() {
    void task?.cancelAsync();
    setPhase('idle');
    setProgress(0);
  }

  const pct = Math.round(progress * 100);

  return (
    <Screen keyboardAvoiding={false}>
      <FlowHeader title="Upload a video" />

      {phase === 'uploading' ? (
        <FadeInUp style={styles.center}>
          <View style={styles.iconBubble}>
            <Icon name="cloud-upload" size={28} color="primary" />
          </View>
          <Text variant="heading" align="center">
            Uploading your video…
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <Text variant="caption" color="textSecondary">
            {pct}%
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.note}>
            Once it’s uploaded we’ll write up the recipe in the background and notify you when it’s ready. You don’t have
            to wait here.
          </Text>
          <Button label="Cancel upload" variant="secondary" onPress={cancel} />
        </FadeInUp>
      ) : (
        <FadeInUp style={styles.center}>
          <View style={styles.iconBubble}>
            <Icon name="film" size={28} color="primary" />
          </View>
          <Text variant="heading" align="center">
            Bring a video you already have
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.note}>
            Pick a cooking video from your camera roll. We’ll watch it and write up the ingredients and steps.
          </Text>
          {error ? (
            <Text variant="caption" color="danger" align="center">
              {error}
            </Text>
          ) : null}
          <Button label="Choose a video" leftIcon="images" onPress={pickAndUpload} />
        </FadeInUp>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  note: { paddingHorizontal: spacing.lg },
  barTrack: {
    width: '80%',
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  barFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
