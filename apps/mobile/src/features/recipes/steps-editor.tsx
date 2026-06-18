import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable, { type SortableGridRenderItem } from 'react-native-sortables';
import { colors, radius, spacing, textVariants } from '@recipeer/core';

import { Icon, Text } from '@/components/ui';
import { Editable } from './editable';
import { SwipeToDelete } from './swipe-to-delete';

// ─── Model ─────────────────────────────────────────────────────────────────

export interface StepEntry {
  /** Stable id (server id for existing steps, generated for new ones) — used as the
   *  sort key so reorders/deletes track the right row. */
  id: string;
  text: string;
  videoStartMs: number | null;
  videoEndMs: number | null;
}

/** A blank step for the "Add" action. */
export function makeStep(): StepEntry {
  return {
    id: `new-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    text: '',
    videoStartMs: null,
    videoEndMs: null,
  };
}

// ─── A single step row ────────────────────────────────────────────────────────

function StepRow({
  step,
  index,
  onChangeText,
  onRemove,
}: {
  step: StepEntry;
  index: number;
  onChangeText: (id: string, v: string) => void;
  onRemove: (id: string) => void;
}) {
  const id = step.id;
  return (
    <SwipeToDelete variant="card" containerStyle={styles.swipeContainer} onDelete={() => onRemove(id)}>
      <View style={styles.stepCard}>
        <View style={styles.stepLeft}>
          <View style={styles.stepNum}>
            <Text variant="micro" color="apricotInk" style={styles.stepNumText}>
              {index + 1}
            </Text>
          </View>
          {/* Only the grip starts a drag — the rest of the card stays tappable/swipeable. */}
          <Sortable.Handle>
            <View style={styles.handle}>
              <Icon name="reorder-three" size={26} color="textSecondary" />
            </View>
          </Sortable.Handle>
        </View>
        <View style={styles.stepBody}>
          <Editable
            value={step.text}
            multiline
            placeholder="Describe this step…"
            textStyle={styles.bodyText}
            onChangeText={(v) => onChangeText(id, v)}
          />
        </View>
      </View>
    </SwipeToDelete>
  );
}

// ─── The list ─────────────────────────────────────────────────────────────────

export function StepsEditor({
  steps,
  setSteps,
  scrollableRef,
}: {
  steps: StepEntry[];
  setSteps: Dispatch<SetStateAction<StepEntry[]>>;
  /** The enclosing scroll view, so the list auto-scrolls when you drag near an edge. */
  scrollableRef?: AnimatedRef<any>;
}) {
  const onRemove = useCallback(
    (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id)),
    [setSteps],
  );
  const onChangeText = useCallback(
    (id: string, v: string) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, text: v } : s))),
    [setSteps],
  );

  const renderItem = useCallback<SortableGridRenderItem<StepEntry>>(
    ({ item, index }) => (
      <StepRow step={item} index={index} onChangeText={onChangeText} onRemove={onRemove} />
    ),
    [onChangeText, onRemove],
  );

  return (
    <Sortable.Grid
      columns={1}
      data={steps}
      keyExtractor={(s) => s.id}
      renderItem={renderItem}
      rowGap={spacing.sm}
      scrollableRef={scrollableRef}
      customHandle
      dragActivationDelay={150}
      activeItemScale={1.03}
      activeItemShadowOpacity={0.18}
      inactiveItemOpacity={0.9}
      onDragEnd={({ data }) => setSteps(data)}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  swipeContainer: { borderRadius: radius.card },

  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
  },

  // Number on top, drag handle directly beneath it.
  stepLeft: { alignItems: 'center', gap: spacing.xs, flexShrink: 0, marginTop: spacing.xxs },
  stepNum: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    backgroundColor: colors.apricot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontWeight: '600' },
  // Bigger, lower-opacity 3-bar grip so the reorder affordance reads clearly.
  handle: { width: 34, height: 26, alignItems: 'center', justifyContent: 'center', opacity: 0.45 },

  stepBody: { flex: 1 },

  bodyText: {
    fontFamily: textVariants.body.fontFamily,
    fontSize: textVariants.body.fontSize,
  },
});
