import { useEffect, useMemo, useState, useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useOptionalHistoryStore } from '@/data/history-store-context';
import { createMemoryTodayStore } from '@/data/memory/memory-today-store';
import {
  AppButton,
  AppSheet,
  AppText,
  AppTextField,
  EmptyState,
  Screen,
  Snackbar,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import {
  ACTIVITY_CATEGORIES,
  getCategoryLabel,
  type ActivityCategory,
} from '@/domain/activities';
import type {
  HistoryActivityOption,
  HistoryEntry,
  HistoryFilters,
  HistoryStore,
  PlannedLogCandidate,
} from '@/domain/history-store';
import {
  addCalendarDays,
  formatLocalDateShort,
  getCurrentZagrebLocalDate,
  getZagrebDateTimeSnapshot,
  isLocalDate,
  isLocalTime,
  type LocalDate,
} from '@/domain/time';

type Period = 'today' | '7-days' | '30-days' | 'all';

type EntryFormValues = {
  activityId: string;
  localDate: string;
  localTime: string;
  occurrenceKey: string;
};

const PERIOD_OPTIONS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Danas' },
  { id: '7-days', label: '7 dana' },
  { id: '30-days', label: '30 dana' },
  { id: 'all', label: 'Sve' },
];

function periodStart(period: Period, today: LocalDate) {
  if (period === 'today') {
    return today;
  }

  if (period === '7-days') {
    return addCalendarDays(today, -6);
  }

  if (period === '30-days') {
    return addCalendarDays(today, -29);
  }

  return undefined;
}

function dateHeading(localDate: LocalDate, today: LocalDate) {
  if (localDate === today) {
    return 'Danas';
  }

  if (localDate === addCalendarDays(today, -1)) {
    return 'Jučer';
  }

  return formatLocalDateShort(localDate);
}

function ChoiceChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primarySoft
            : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <AppText
        style={{ color: selected ? theme.colors.primaryStrong : undefined }}
        variant="label"
        weight={selected ? 'bold' : 'medium'}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function HistoryEntrySheet({
  activities,
  entry,
  onClose,
  onDelete,
  onSaved,
  recentEntries,
  store,
  visible,
}: {
  activities: HistoryActivityOption[];
  entry: HistoryEntry | null;
  onClose: () => void;
  onDelete: (entry: HistoryEntry) => void;
  onSaved: () => void;
  recentEntries: HistoryEntry[];
  store: HistoryStore;
  visible: boolean;
}) {
  const theme = useAppTheme();
  const now = getZagrebDateTimeSnapshot();
  const [candidates, setCandidates] = useState<PlannedLogCandidate[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { control, handleSubmit, reset, setValue } = useForm<EntryFormValues>({
    defaultValues: {
      activityId: '',
      localDate: now.localDate,
      localTime: now.localTime,
      occurrenceKey: '',
    },
  });
  const activityId = useWatch({ control, name: 'activityId' });
  const localDate = useWatch({ control, name: 'localDate' });
  const occurrenceKey = useWatch({ control, name: 'occurrenceKey' });

  useEffect(() => {
    if (!visible) {
      return;
    }

    const current = getZagrebDateTimeSnapshot();
    reset({
      activityId: entry?.activityId ?? activities[0]?.id ?? '',
      localDate: entry?.localDate ?? current.localDate,
      localTime: entry?.localTime ?? current.localTime,
      occurrenceKey: '',
    });
    const clearPreviousState = setTimeout(() => {
      setCandidates([]);
      setFormError(null);
    }, 0);

    return () => clearTimeout(clearPreviousState);
  }, [activities, entry, reset, visible]);

  useEffect(() => {
    if (!visible || entry || !activityId || !isLocalDate(localDate)) {
      const clearInvalidCandidates = setTimeout(() => setCandidates([]), 0);
      return () => clearTimeout(clearInvalidCandidates);
    }

    let active = true;

    void store
      .listPlannedCandidates(activityId, localDate)
      .then((options) => {
        if (!active) {
          return;
        }

        setCandidates(options);
        setValue(
          'occurrenceKey',
          options.length === 1 ? options[0]!.occurrenceKey : '',
        );
      })
      .catch((error: unknown) => {
        if (active) {
          setFormError(
            error instanceof Error
              ? error.message
              : 'Planirani termini se nisu mogli učitati.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [activityId, entry, localDate, setValue, store, visible]);

  const submit = handleSubmit(async (values) => {
    setFormError(null);

    if (!values.activityId) {
      setFormError('Odaberi aktivnost.');
      return;
    }

    if (!isLocalDate(values.localDate)) {
      setFormError('Datum mora biti u obliku GGGG-MM-DD.');
      return;
    }

    if (!isLocalTime(values.localTime)) {
      setFormError('Vrijeme mora biti u obliku HH:mm.');
      return;
    }

    setIsSaving(true);

    try {
      if (entry) {
        await store.updateLogTime(entry.id, values.localDate, values.localTime);
      } else {
        await store.createManualLog({
          activityId: values.activityId,
          localDate: values.localDate,
          localTime: values.localTime,
          plannedCandidate: candidates.find(
            (candidate) => candidate.occurrenceKey === values.occurrenceKey,
          ),
        });
      }

      onSaved();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Zapis nije spremljen.',
      );
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <AppSheet
      onClose={onClose}
      title={entry ? 'Detalj zapisa' : 'Dodaj izvršenje'}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {entry ? (
          <View style={styles.entryIdentity}>
            <View
              style={[
                styles.largeIcon,
                { backgroundColor: `${entry.color}20` },
              ]}
            >
              <AppText variant="heading">{entry.icon}</AppText>
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyLarge" weight="bold">
                {entry.name}
              </AppText>
              <AppText tone="muted" variant="caption">
                {entry.plannedSlotLabel ?? 'Dodatno izvršenje'}
              </AppText>
            </View>
          </View>
        ) : (
          <View style={styles.fieldGroup}>
            <AppText variant="label" weight="semibold">
              Aktivnost
            </AppText>
            <Controller
              control={control}
              name="activityId"
              render={({ field: { onChange, value } }) => (
                <View style={styles.chipWrap}>
                  {activities.map((activity) => (
                    <ChoiceChip
                      key={activity.id}
                      label={`${activity.icon} ${activity.name}`}
                      onPress={() => onChange(activity.id)}
                      selected={value === activity.id}
                    />
                  ))}
                </View>
              )}
            />
          </View>
        )}

        <View style={styles.fieldRow}>
          <Controller
            control={control}
            name="localDate"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                label="Datum"
                onChangeText={onChange}
                placeholder="2026-07-31"
                style={styles.dateField}
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="localTime"
            render={({ field: { onChange, value } }) => (
              <AppTextField
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                label="Vrijeme"
                onChangeText={onChange}
                placeholder="08:15"
                style={styles.timeField}
                value={value}
              />
            )}
          />
        </View>

        {!entry && candidates.length > 0 ? (
          <View style={styles.fieldGroup}>
            <AppText variant="label" weight="semibold">
              Poveži s planiranim terminom
            </AppText>
            <AppText tone="muted" variant="caption">
              Odaberi termin ako ovim unosom ispravljaš propuštenu obvezu.
            </AppText>
            <View style={styles.chipWrap}>
              <ChoiceChip
                label="Dodatno izvršenje"
                onPress={() => setValue('occurrenceKey', '')}
                selected={!occurrenceKey}
              />
              {candidates.map((candidate) => (
                <ChoiceChip
                  key={candidate.occurrenceKey}
                  label={candidate.label}
                  onPress={() =>
                    setValue('occurrenceKey', candidate.occurrenceKey)
                  }
                  selected={occurrenceKey === candidate.occurrenceKey}
                />
              ))}
            </View>
          </View>
        ) : null}

        {formError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorBox,
              { backgroundColor: theme.colors.dangerSurface },
            ]}
          >
            <AppText
              style={{ color: theme.colors.dangerText }}
              variant="caption"
              weight="semibold"
            >
              {formError}
            </AppText>
          </View>
        ) : null}

        <AppButton
          disabled={isSaving}
          label={
            isSaving ? 'Spremanje…' : entry ? 'Spremi promjenu' : 'Dodaj zapis'
          }
          onPress={() => void submit()}
        />

        {entry ? (
          <>
            <View style={styles.recentSection}>
              <AppText variant="bodyLarge" weight="bold">
                Nedavna izvršenja
              </AppText>
              {recentEntries.slice(0, 5).map((recent) => (
                <View
                  key={recent.id}
                  style={[
                    styles.recentRow,
                    { borderBottomColor: theme.colors.divider },
                  ]}
                >
                  <AppText variant="label">
                    {formatLocalDateShort(recent.localDate)}
                  </AppText>
                  <AppText tone="muted" variant="label">
                    {recent.localTime}
                  </AppText>
                </View>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onDelete(entry)}
              style={({ pressed }) => [
                styles.deleteButton,
                {
                  backgroundColor: theme.colors.dangerSurface,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <AppText
                style={{ color: theme.colors.dangerText }}
                variant="label"
                weight="bold"
              >
                Ukloni pogrešan zapis
              </AppText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </AppSheet>
  );
}

export default function HistoryScreen({
  store: providedStore,
}: {
  store?: HistoryStore;
}) {
  const theme = useAppTheme();
  const contextStore = useOptionalHistoryStore();
  const fallbackStore = useMemo(() => createMemoryTodayStore(), []);
  const store = providedStore ?? contextStore ?? fallbackStore;
  const today = getCurrentZagrebLocalDate();
  const [activities, setActivities] = useState<HistoryActivityOption[]>([]);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [activityId, setActivityId] = useState<string | undefined>();
  const [category, setCategory] = useState<ActivityCategory | undefined>();
  const [period, setPeriod] = useState<Period>('30-days');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [entrySheetVisible, setEntrySheetVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [deletedEntry, setDeletedEntry] = useState<HistoryEntry | null>(null);

  const filters = useMemo<HistoryFilters>(
    () => ({
      activityId,
      category,
      fromLocalDate: periodStart(period, today),
      toLocalDate: today,
    }),
    [activityId, category, period, today],
  );

  const load = useCallback(async () => {
    setLoadError(null);

    try {
      const [nextActivities, nextEntries] = await Promise.all([
        store.listActivities(),
        store.listEntries(filters),
      ]);
      setActivities(nextActivities);
      setEntries(nextEntries);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Povijest se nije mogla učitati.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters, store]);

  useEffect(() => {
    const initialLoad = setTimeout(() => void load(), 0);
    const unsubscribe = store.subscribe?.(() => {
      void load();
    });

    return () => {
      clearTimeout(initialLoad);
      unsubscribe?.();
    };
  }, [load, store]);

  useEffect(() => {
    if (!deletedEntry) {
      return;
    }

    const timeout = setTimeout(() => setDeletedEntry(null), 5_000);
    return () => clearTimeout(timeout);
  }, [deletedEntry]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<LocalDate, HistoryEntry[]>();

    for (const entry of entries) {
      const group = groups.get(entry.localDate) ?? [];
      group.push(entry);
      groups.set(entry.localDate, group);
    }

    return [...groups.entries()];
  }, [entries]);

  const activeFilterCount = (activityId ? 1 : 0) + (category ? 1 : 0);

  const openAdd = () => {
    setEditingEntry(null);
    setEntrySheetVisible(true);
  };

  const openEdit = (entry: HistoryEntry) => {
    setEditingEntry(entry);
    setEntrySheetVisible(true);
  };

  const requestDelete = (entry: HistoryEntry) => {
    setEntrySheetVisible(false);
    setPendingDelete(entry);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const entry = pendingDelete;
    setPendingDelete(null);

    try {
      await store.deleteLog(entry.id);
      setDeletedEntry(entry);
      await load();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Zapis nije uklonjen.',
      );
    }
  };

  const undoDelete = async () => {
    if (!deletedEntry) {
      return;
    }

    try {
      await store.restoreLog(deletedEntry.id);
      setDeletedEntry(null);
      await load();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Zapis nije vraćen.',
      );
    }
  };

  return (
    <>
      <Screen contentStyle={styles.content} testID="history-screen">
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <AppText accessibilityRole="header" variant="title" weight="bold">
              Povijest
            </AppText>
            <AppText tone="muted">
              Pregledaj i ispravi svoja evidentiranja.
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={openAdd}
          style={({ pressed }) => [
            styles.addAction,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <AppText
            style={{ color: theme.colors.onPrimary }}
            variant="label"
            weight="bold"
          >
            + Dodaj izvršenje
          </AppText>
        </Pressable>

        <View style={styles.filterBar}>
          <ScrollView
            contentContainerStyle={styles.horizontalChips}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {PERIOD_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.id}
                label={option.label}
                onPress={() => setPeriod(option.id)}
                selected={period === option.id}
              />
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFilterVisible(true)}
            style={({ pressed }) => [
              styles.filterButton,
              {
                backgroundColor:
                  activeFilterCount > 0
                    ? theme.colors.primarySoft
                    : theme.colors.surface,
                borderColor:
                  activeFilterCount > 0
                    ? theme.colors.primary
                    : theme.colors.border,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <AppText variant="label" weight="bold">
              Filtri{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            </AppText>
          </Pressable>
        </View>

        {loadError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorBox,
              { backgroundColor: theme.colors.dangerSurface },
            ]}
          >
            <AppText
              style={{ color: theme.colors.dangerText }}
              variant="label"
              weight="semibold"
            >
              {loadError}
            </AppText>
            <AppButton
              label="Pokušaj ponovno"
              onPress={() => void load()}
              variant="secondary"
            />
          </View>
        ) : null}

        {!isLoading && entries.length === 0 ? (
          <EmptyState
            description="Evidentiraj aktivnost na ekranu Danas ili dodaj propušteno izvršenje."
            icon="○"
            title="Još nema zapisa"
          />
        ) : null}

        {groupedEntries.map(([localDate, dayEntries]) => (
          <View key={localDate} style={styles.section}>
            <AppText variant="bodyLarge" weight="bold">
              {dateHeading(localDate, today)}
            </AppText>
            <Surface padded={false}>
              {dayEntries.map((entry, index) => (
                <Pressable
                  accessibilityHint="Otvara detalj i uređivanje vremena"
                  accessibilityRole="button"
                  key={entry.id}
                  onPress={() => openEdit(entry)}
                  style={({ pressed }) => [
                    styles.historyRow,
                    index > 0 && {
                      borderTopColor: theme.colors.divider,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    },
                    { opacity: pressed ? 0.68 : 1 },
                  ]}
                >
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: `${entry.color}20` },
                    ]}
                  >
                    <AppText>{entry.icon}</AppText>
                  </View>
                  <View style={styles.itemCopy}>
                    <AppText weight="semibold">{entry.name}</AppText>
                    {entry.doseLabel ? (
                      <AppText tone="muted" variant="caption">
                        {entry.doseLabel}
                      </AppText>
                    ) : null}
                    <AppText tone="subtle" variant="caption">
                      {entry.plannedSlotLabel ??
                        getCategoryLabel(entry.category)}
                    </AppText>
                  </View>
                  <AppText tone="subtle" variant="label">
                    {entry.localTime}
                  </AppText>
                  <AppText tone="subtle">›</AppText>
                </Pressable>
              ))}
            </Surface>
          </View>
        ))}
      </Screen>

      <AppSheet
        onClose={() => setFilterVisible(false)}
        title="Filtriraj povijest"
        visible={filterVisible}
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fieldGroup}>
            <AppText variant="label" weight="semibold">
              Aktivnost
            </AppText>
            <View style={styles.chipWrap}>
              <ChoiceChip
                label="Sve aktivnosti"
                onPress={() => setActivityId(undefined)}
                selected={!activityId}
              />
              {activities.map((activity) => (
                <ChoiceChip
                  key={activity.id}
                  label={`${activity.icon} ${activity.name}`}
                  onPress={() => setActivityId(activity.id)}
                  selected={activityId === activity.id}
                />
              ))}
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <AppText variant="label" weight="semibold">
              Kategorija
            </AppText>
            <View style={styles.chipWrap}>
              <ChoiceChip
                label="Sve kategorije"
                onPress={() => setCategory(undefined)}
                selected={!category}
              />
              {ACTIVITY_CATEGORIES.map((option) => (
                <ChoiceChip
                  key={option.id}
                  label={`${option.icon} ${option.label}`}
                  onPress={() => setCategory(option.id)}
                  selected={category === option.id}
                />
              ))}
            </View>
          </View>
          <AppButton
            label="Prikaži rezultate"
            onPress={() => setFilterVisible(false)}
          />
        </ScrollView>
      </AppSheet>

      <HistoryEntrySheet
        activities={activities}
        entry={editingEntry}
        onClose={() => setEntrySheetVisible(false)}
        onDelete={requestDelete}
        onSaved={() => {
          setEntrySheetVisible(false);
          void load();
        }}
        recentEntries={
          editingEntry
            ? entries.filter(
                (entry) => entry.activityId === editingEntry.activityId,
              )
            : []
        }
        store={store}
        visible={entrySheetVisible}
      />

      <AppSheet
        onClose={() => setPendingDelete(null)}
        title="Ukloniti zapis?"
        visible={pendingDelete !== null}
      >
        <View style={styles.confirmContent}>
          <AppText tone="muted">
            {pendingDelete
              ? `${pendingDelete.name}, ${formatLocalDateShort(
                  pendingDelete.localDate,
                )} u ${pendingDelete.localTime} bit će uklonjen iz povijesti.`
              : ''}
          </AppText>
          <AppButton
            label="Odustani"
            onPress={() => setPendingDelete(null)}
            variant="secondary"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void confirmDelete()}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                backgroundColor: theme.colors.dangerSurface,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            <AppText
              style={{ color: theme.colors.dangerText }}
              variant="label"
              weight="bold"
            >
              Ukloni zapis
            </AppText>
          </Pressable>
        </View>
      </AppSheet>

      <Snackbar
        actionLabel="Poništi"
        message={
          deletedEntry ? `${deletedEntry.name} je uklonjen iz povijesti.` : ''
        }
        onAction={() => void undoDelete()}
        visible={deletedEntry !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  addAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
  },
  filterBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  horizontalChips: {
    gap: spacing.sm,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
  },
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateField: {
    minWidth: 160,
  },
  timeField: {
    minWidth: 96,
  },
  sheetContent: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  historyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  entryIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  largeIcon: {
    alignItems: 'center',
    borderRadius: radii.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  flex: {
    flex: 1,
  },
  errorBox: {
    borderRadius: radii.md,
    gap: spacing.md,
    padding: spacing.md,
  },
  recentSection: {
    gap: spacing.sm,
  },
  recentRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: touchTarget,
    paddingHorizontal: spacing.xl,
  },
  confirmContent: {
    gap: spacing.md,
  },
});
