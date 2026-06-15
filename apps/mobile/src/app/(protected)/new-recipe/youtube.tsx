import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '@recipeer/core';

import { FadeInUp } from '@/components/motion/fade-in-up';
import { Button, Icon, Screen, Text, TextField } from '@/components/ui';
import { importYouTubeLink } from '@/features/recipes/api';
import { FlowHeader } from '@/features/recipes/flow-header';

const looksLikeYouTube = (url: string) => /(?:youtube\.com|youtu\.be)/i.test(url.trim());

export default function YouTubeImportScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = looksLikeYouTube(url);

  async function importLink() {
    setError(null);
    setBusy(true);
    try {
      const res = await importYouTubeLink(url.trim());
      if (res.deduped && res.recipeId) {
        router.replace({ pathname: '/review/[recipeId]', params: { recipeId: res.recipeId } });
      } else if (res.jobId) {
        router.replace({ pathname: '/processing/[jobId]', params: { jobId: res.jobId } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <FlowHeader title="Paste a YouTube link" />
      <FadeInUp style={styles.body}>
        <View style={styles.iconBubble}>
          <Icon name="logo-youtube" size={28} color="primary" />
        </View>
        <Text variant="body" color="textSecondary">
          Import a single video by URL. It’s saved privately to your account — imported videos can’t be published as your
          own recipe.
        </Text>
        <TextField
          label="YouTube URL"
          placeholder="https://youtube.com/watch?v=…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
          error={error ?? undefined}
        />
        <Text variant="caption" color="textSecondary">
          Please only import videos you own or have permission to use.
        </Text>
        <Button label="Import this recipe" onPress={importLink} loading={busy} disabled={!valid} />
      </FadeInUp>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingTop: spacing.md },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
