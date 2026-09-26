import { router } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { useActivityStore } from '@/data/activity-store-context';
import {
  AppButton,
  AppSheet,
  AppText,
  AppTextField,
  Screen,
  Surface,
} from '@/design-system/components';
import { radii, spacing, touchTarget } from '@/design-system/tokens';
import { useAppTheme } from '@/design-system/theme';
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_COLORS,
  ACTIVITY_ICONS,
  DAY_PART_OPTIONS,
  WEEKDAY_OPTIONS,
  type ActivityDetails,
  type ActivityDraft,
  type ActivityStatus,
} from '@/domain/activities';
import {
  formatLocalDateShort,
  getCurrentZagrebLocalDate,
  isLocalDate,
} from '@/domain/time';

const formSchema = z
  .object({
    category: z.enum([
      'pet-care',
      'oral-care',
      'body-care',
      'hair-care',
      'skin-care',
      'nail-care',
      'grooming',
      'personal-items',
      'supplements',
      'other',
    ]),
    color: z.string().min(1),
    dayParts: z.array(z.enum(['morning', 'day', 'evening', 'anytime'])),
    doseLabel: z.string().trim().max(80, 'Doza može imati najviše 80 znakova.'),
    description: z.string().max(240, 'Opis može imati najviše 240 znakova.'),
    firstDueLocalDate: z.string(),
    icon: z.string().min(1),
    intervalEvery: z.string(),
    intervalUnit: z.enum(['day', 'week']),
    name: z
      .string()
      .trim()
      .min(2, 'Naziv mora imati barem 2 znaka.')
      .max(60, 'Naziv može imati najviše 60 znakova.'),
    scheduleType: z.enum([
      'daily_slots',
      'weekdays',
      'interval',
      'unscheduled',
    ]),
    startsOnLocalDate: z.string(),
    weekdays: z.array(z.number().int().min(1).max(7)),
  })
  .superRefine((value, context) => {
    if (value.scheduleType === 'weekdays' && value.weekdays.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Odaberi barem jedan dan u tjednu.',
        path: ['weekdays'],
      });
    }

    if (value.scheduleType !== 'unscheduled' && value.dayParts.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Odaberi barem jedan dio dana.',
        path: ['dayParts'],
      });
    }

    if (!isLocalDate(value.startsOnLocalDate)) {
      context.addIssue({
        code: 'custom',
        message: 'Upiši datum u obliku GGGG-MM-DD.',
        path: ['startsOnLocalDate'],
      });
    }

    if (value.scheduleType === 'interval') {
      const intervalEvery = Number(value.intervalEvery);

      if (
        !Number.isInteger(intervalEvery) ||
        intervalEvery < 1 ||
        intervalEvery > 365
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Interval mora biti cijeli broj od 1 do 365.',
          path: ['intervalEvery'],
        });
      }

      if (!isLocalDate(value.firstDueLocalDate)) {
        context.addIssue({
          code: 'custom',
          message: 'Upiši datum u obliku GGGG-MM-DD.',
          path: ['firstDueLocalDate'],
        });
      } else if (
        isLocalDate(value.startsOnLocalDate) &&
        value.firstDueLocalDate < value.startsOnLocalDate
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Prvi termin ne može biti prije početka praćenja.',
          path: ['firstDueLocalDate'],
        });
      }
    }
  });

type ActivityFormValues = z.infer<typeof formSchema>;

function createDefaultValues(): ActivityFormValues {
  const localDate = getCurrentZagrebLocalDate();

  return {
    category: 'oral-care',
    color: ACTIVITY_COLORS[0],
    dayParts: ['morning'],
    doseLabel: '',
    description: '',
    firstDueLocalDate: localDate,
    icon: '🪥',
    intervalEvery: '14',
    intervalUnit: 'day',
    name: '',
    scheduleType: 'daily_slots',
    startsOnLocalDate: localDate,
    weekdays: [1, 3, 5],
  };
}

type ActivityEditorScreenProps = {
  activityId?: string;
};

type PendingStatusAction = {
  description: string;
  label: string;
  status: ActivityStatus;
  title: string;
};

function activityToForm(activity: ActivityDetails): ActivityFormValues {
  return {
    category: activity.category,
    color: activity.color,
    dayParts: activity.schedule.dayParts,
    doseLabel: activity.schedule.doseLabel ?? '',
    description: activity.description,
    firstDueLocalDate:
      activity.schedule.firstDueLocalDate ??
      activity.schedule.startsOnLocalDate,
    icon: activity.icon,
    intervalEvery: String(activity.schedule.intervalEvery ?? 14),
    intervalUnit: activity.schedule.intervalUnit ?? 'day',
    name: activity.name,
    scheduleType: activity.schedule.type,
    startsOnLocalDate: activity.schedule.startsOnLocalDate,
    weekdays: activity.schedule.weekdays,
  };
}

function toDraft(values: ActivityFormValues): ActivityDraft {
  return {
    category: values.category,
    color: values.color,
    description: values.description,
    icon: values.icon,
    name: values.name,
    schedule: {
      doseLabel: values.doseLabel || null,
      dayParts:
        values.scheduleType === 'unscheduled'
          ? ['anytime']
          : values.scheduleType === 'interval'
            ? [values.dayParts[0] ?? 'anytime']
            : values.dayParts,
      firstDueLocalDate:
        values.scheduleType === 'interval'
          ? (values.firstDueLocalDate as ActivityDraft['schedule']['firstDueLocalDate'])
          : null,
      intervalEvery:
        values.scheduleType === 'interval'
          ? Number(values.intervalEvery)
          : null,
      intervalUnit:
        values.scheduleType === 'interval' ? values.intervalUnit : null,
      startsOnLocalDate:
        values.startsOnLocalDate as ActivityDraft['schedule']['startsOnLocalDate'],
      type: values.scheduleType,
      weekdays: values.scheduleType === 'weekdays' ? values.weekdays : [],
    },
  };
}

function ChoiceChip({
  accessibilityLabel,
  label,
  onPress,
  selected,
}: {
  accessibilityLabel?: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
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
        tone={selected ? 'primary' : 'muted'}
        variant="label"
        weight={selected ? 'bold' : 'semibold'}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ActivityEditorScreen({
  activityId,
}: ActivityEditorScreenProps) {
  const theme = useAppTheme();
  const store = useActivityStore();
  const isEditing = Boolean(activityId);
  const [activity, setActivity] = useState<ActivityDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [pendingStatusAction, setPendingStatusAction] =
    useState<PendingStatusAction | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
  } = useForm<ActivityFormValues>({ defaultValues: createDefaultValues() });
  const scheduleType = useWatch({ control, name: 'scheduleType' });
  const selectedIcon = useWatch({ control, name: 'icon' });
  const selectedColor = useWatch({ control, name: 'color' });

  useEffect(() => {
    if (!activityId) {
      return;
    }

    let isActive = true;

    void store
      .getActivity(activityId)
      .then((loadedActivity) => {
        if (!isActive) {
          return;
        }

        if (!loadedActivity) {
          setErrorMessage('Aktivnost više ne postoji.');
          return;
        }

        setActivity(loadedActivity);
        reset(activityToForm(loadedActivity));
      })
      .catch(() => {
        if (isActive) {
          setErrorMessage('Aktivnost se trenutačno ne može otvoriti.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activityId, reset, store]);

  const statusActions = useMemo<PendingStatusAction[]>(() => {
    if (!activity) {
      return [];
    }

    if (activity.status === 'active') {
      return [
        {
          description:
            'Neodrađeni termini od danas više se neće prikazivati. Dosadašnja povijest ostaje spremljena.',
          label: 'Pauziraj',
          status: 'paused',
          title: 'Pauzirati aktivnost?',
        },
        {
          description:
            'Aktivnost će se maknuti iz aktivnog popisa, a svi stari zapisi ostat će sačuvani.',
          label: 'Arhiviraj',
          status: 'archived',
          title: 'Arhivirati aktivnost?',
        },
      ];
    }

    return [
      {
        description:
          'Aktivnost će se ponovno pojaviti prema svom rasporedu. Povijest ostaje nepromijenjena.',
        label:
          activity.status === 'archived'
            ? 'Vrati u aktivne'
            : 'Nastavi praćenje',
        status: 'active',
        title: 'Ponovno aktivirati?',
      },
      ...(activity.status === 'paused'
        ? [
            {
              description:
                'Aktivnost će se premjestiti u arhivu bez brisanja starih zapisa.',
              label: 'Arhiviraj',
              status: 'archived' as const,
              title: 'Arhivirati aktivnost?',
            },
          ]
        : []),
    ];
  }, [activity]);

  const saveActivity = handleSubmit(async (values) => {
    setErrorMessage(null);
    const parsed = formSchema.safeParse(values);

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];

        if (typeof field === 'string') {
          setError(field as keyof ActivityFormValues, {
            message: issue.message,
            type: 'validate',
          });
        }
      }
      return;
    }

    try {
      const localDate = getCurrentZagrebLocalDate();

      if (!activityId && parsed.data.startsOnLocalDate < localDate) {
        setError('startsOnLocalDate', {
          message: 'Nova aktivnost ne može početi u prošlosti.',
          type: 'validate',
        });
        return;
      }

      if (activityId) {
        await store.updateActivity(activityId, toDraft(parsed.data), localDate);
      } else {
        await store.createActivity(toDraft(parsed.data), localDate);
      }

      router.back();
    } catch {
      setErrorMessage(
        'Spremanje nije uspjelo. Postojeći podatci nisu promijenjeni.',
      );
    }
  });

  async function confirmStatusAction() {
    if (!activityId || !pendingStatusAction) {
      return;
    }

    const action = pendingStatusAction;
    setPendingStatusAction(null);

    try {
      await store.setActivityStatus(
        activityId,
        action.status,
        getCurrentZagrebLocalDate(),
      );
      router.back();
    } catch {
      setErrorMessage('Promjena statusa nije uspjela. Pokušaj ponovno.');
    }
  }

  if (isLoading) {
    return (
      <Screen contentStyle={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <AppText tone="muted">Otvaram aktivnost…</AppText>
      </Screen>
    );
  }

  return (
    <>
      <Screen contentStyle={styles.content} testID="activity-editor-screen">
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Natrag"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconButton,
              {
                backgroundColor: theme.colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <AppText variant="bodyLarge">‹</AppText>
          </Pressable>
          <View style={styles.headerCopy}>
            <AppText accessibilityRole="header" variant="heading" weight="bold">
              {isEditing ? 'Uredi aktivnost' : 'Nova aktivnost'}
            </AppText>
            <AppText tone="muted" variant="caption">
              {isEditing
                ? 'Naziv i izgled vrijede odmah, novi raspored od sutra.'
                : 'Postavi samo ono što treba za brzo evidentiranje.'}
            </AppText>
          </View>
        </View>

        {errorMessage ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.message,
              { backgroundColor: theme.colors.dangerSurface },
            ]}
          >
            <AppText tone="danger">{errorMessage}</AppText>
          </View>
        ) : null}

        <Surface style={styles.formSection}>
          <AppText variant="bodyLarge" weight="bold">
            Osnovno
          </AppText>
          <Controller
            control={control}
            name="name"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppTextField
                autoCapitalize="sentences"
                autoCorrect
                label="Naziv"
                maxLength={60}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Npr. Pranje zubi"
                returnKeyType="done"
                value={value}
              />
            )}
          />
          {errors.name?.message ? (
            <AppText tone="danger" variant="caption">
              {errors.name.message}
            </AppText>
          ) : null}
          <Controller
            control={control}
            name="doseLabel"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppTextField
                label="Doza po terminu (neobvezno)"
                maxLength={80}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Npr. 3 tablete"
                value={value}
              />
            )}
          />
          <AppText tone="muted" variant="caption">
            Jedan dodir evidentira cijelu dozu. Promjene rasporeda i doze
            vrijede od sutra; stari zapisi ostaju sačuvani.
          </AppText>
          <Controller
            control={control}
            name="description"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppTextField
                label="Kratka napomena (neobvezno)"
                maxLength={240}
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Detalj koji ti može pomoći"
                style={styles.descriptionInput}
                value={value}
              />
            )}
          />
        </Surface>

        <Surface style={styles.formSection}>
          <View style={styles.sectionCopy}>
            <AppText variant="bodyLarge" weight="bold">
              Kategorija
            </AppText>
            <AppText tone="muted" variant="caption">
              Služi za brže pronalaženje i uredniji pregled.
            </AppText>
          </View>
          <Controller
            control={control}
            name="category"
            render={({ field: { onChange, value } }) => (
              <View style={styles.choiceGrid}>
                {ACTIVITY_CATEGORIES.map((category) => (
                  <ChoiceChip
                    key={category.id}
                    label={`${category.icon} ${category.label}`}
                    onPress={() => onChange(category.id)}
                    selected={value === category.id}
                  />
                ))}
              </View>
            )}
          />
        </Surface>

        <Surface style={styles.formSection}>
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewIcon,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: selectedColor,
                },
              ]}
            >
              <AppText style={styles.previewEmoji}>{selectedIcon}</AppText>
            </View>
            <View style={styles.sectionCopy}>
              <AppText variant="bodyLarge" weight="bold">
                Ikona i boja
              </AppText>
              <AppText tone="muted" variant="caption">
                Brzo prepoznavanje na ekranu Danas.
              </AppText>
            </View>
          </View>
          <Controller
            control={control}
            name="icon"
            render={({ field: { onChange, value } }) => (
              <View style={styles.iconGrid}>
                {ACTIVITY_ICONS.map((icon) => (
                  <Pressable
                    accessibilityLabel={`Ikona ${icon}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === icon }}
                    key={icon}
                    onPress={() => onChange(icon)}
                    style={({ pressed }) => [
                      styles.iconChoice,
                      {
                        backgroundColor:
                          value === icon
                            ? theme.colors.primarySoft
                            : theme.colors.surfaceMuted,
                        borderColor:
                          value === icon ? theme.colors.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <AppText style={styles.emoji}>{icon}</AppText>
                  </Pressable>
                ))}
              </View>
            )}
          />
          <Controller
            control={control}
            name="color"
            render={({ field: { onChange, value } }) => (
              <View style={styles.colorRow}>
                {ACTIVITY_COLORS.map((color) => (
                  <Pressable
                    accessibilityLabel={`Boja ${color}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === color }}
                    key={color}
                    onPress={() => onChange(color)}
                    style={({ pressed }) => [
                      styles.colorChoice,
                      {
                        backgroundColor: color,
                        borderColor:
                          value === color ? theme.colors.text : 'transparent',
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          />
        </Surface>

        <Surface style={styles.formSection}>
          <View style={styles.sectionCopy}>
            <AppText variant="bodyLarge" weight="bold">
              Raspored
            </AppText>
            <AppText tone="muted" variant="caption">
              Odaberi ritam koji odgovara stvarnoj njezi, bez umjetnih
              streakova.
            </AppText>
          </View>
          <Controller
            control={control}
            name="scheduleType"
            render={({ field: { onChange, value } }) => (
              <View style={styles.choiceGrid}>
                <ChoiceChip
                  label="Svaki dan"
                  onPress={() => onChange('daily_slots')}
                  selected={value === 'daily_slots'}
                />
                <ChoiceChip
                  label="Odabrani dani"
                  onPress={() => onChange('weekdays')}
                  selected={value === 'weekdays'}
                />
                <ChoiceChip
                  label="Svaki N dana"
                  onPress={() => onChange('interval')}
                  selected={value === 'interval'}
                />
                <ChoiceChip
                  label="Bez rasporeda"
                  onPress={() => onChange('unscheduled')}
                  selected={value === 'unscheduled'}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="startsOnLocalDate"
            render={({ field: { onBlur, onChange, value } }) => (
              <AppTextField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                label={
                  isEditing
                    ? 'Početak nove verzije rasporeda'
                    : 'Početak praćenja'
                }
                maxLength={10}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="GGGG-MM-DD"
                value={value}
              />
            )}
          />
          {errors.startsOnLocalDate?.message ? (
            <AppText tone="danger" variant="caption">
              {errors.startsOnLocalDate.message}
            </AppText>
          ) : (
            <AppText tone="subtle" variant="caption">
              {isEditing
                ? 'Promjena rasporeda vrijedi najranije od sutra; stara povijest ostaje netaknuta.'
                : 'Prvi dan od kojeg Higio planira termine.'}
            </AppText>
          )}

          {scheduleType === 'weekdays' ? (
            <Controller
              control={control}
              name="weekdays"
              render={({ field: { onChange, value } }) => (
                <View style={styles.sectionCopy}>
                  <AppText variant="label" weight="semibold">
                    Dani u tjednu
                  </AppText>
                  <View style={styles.weekdayRow}>
                    {WEEKDAY_OPTIONS.map((weekday) => {
                      const selected = value.includes(weekday.id);

                      return (
                        <Pressable
                          accessibilityLabel={`Dan ${weekday.id}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          key={weekday.id}
                          onPress={() =>
                            onChange(
                              selected
                                ? value.filter((day) => day !== weekday.id)
                                : [...value, weekday.id].sort(),
                            )
                          }
                          style={({ pressed }) => [
                            styles.weekday,
                            {
                              backgroundColor: selected
                                ? theme.colors.primary
                                : theme.colors.surfaceMuted,
                              opacity: pressed ? 0.72 : 1,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              color: selected
                                ? theme.colors.onPrimary
                                : theme.colors.textMuted,
                            }}
                            variant="label"
                            weight="bold"
                          >
                            {weekday.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {errors.weekdays?.message ? (
                    <AppText tone="danger" variant="caption">
                      {errors.weekdays.message}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
          ) : null}

          {scheduleType === 'interval' ? (
            <>
              <View style={styles.inlineFields}>
                <View style={styles.flexField}>
                  <Controller
                    control={control}
                    name="intervalEvery"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <AppTextField
                        keyboardType="number-pad"
                        label="Svakih"
                        maxLength={3}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                      />
                    )}
                  />
                </View>
                <Controller
                  control={control}
                  name="intervalUnit"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.intervalUnit}>
                      <AppText variant="label" weight="semibold">
                        Jedinica
                      </AppText>
                      <View style={styles.choiceGrid}>
                        <ChoiceChip
                          label="dana"
                          onPress={() => onChange('day')}
                          selected={value === 'day'}
                        />
                        <ChoiceChip
                          label="tjedana"
                          onPress={() => onChange('week')}
                          selected={value === 'week'}
                        />
                      </View>
                    </View>
                  )}
                />
              </View>
              {errors.intervalEvery?.message ? (
                <AppText tone="danger" variant="caption">
                  {errors.intervalEvery.message}
                </AppText>
              ) : null}
              <Controller
                control={control}
                name="firstDueLocalDate"
                render={({ field: { onBlur, onChange, value } }) => (
                  <AppTextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numbers-and-punctuation"
                    label="Prvi očekivani termin"
                    maxLength={10}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="GGGG-MM-DD"
                    value={value}
                  />
                )}
              />
              {errors.firstDueLocalDate?.message ? (
                <AppText tone="danger" variant="caption">
                  {errors.firstDueLocalDate.message}
                </AppText>
              ) : (
                <AppText tone="subtle" variant="caption">
                  Nakon izvršenja sljedeći termin računa se od stvarnog dana
                  izvršenja.
                </AppText>
              )}
            </>
          ) : null}

          {scheduleType === 'unscheduled' ? (
            <View
              style={[
                styles.infoCard,
                { backgroundColor: theme.colors.infoSurface },
              ]}
            >
              <AppText
                style={{ color: theme.colors.infoText }}
                variant="caption"
              >
                Aktivnost će biti među brzim aktivnostima. Nema propuštenih
                termina ni postotka uspješnosti i možeš je evidentirati više
                puta dnevno.
              </AppText>
            </View>
          ) : (
            <Controller
              control={control}
              name="dayParts"
              render={({ field: { onChange, value } }) => (
                <View style={styles.sectionCopy}>
                  <AppText variant="label" weight="semibold">
                    Dio dana
                  </AppText>
                  <View style={styles.choiceGrid}>
                    {DAY_PART_OPTIONS.map((dayPart) => {
                      const selected = value.includes(dayPart.id);

                      return (
                        <ChoiceChip
                          key={dayPart.id}
                          label={dayPart.label}
                          onPress={() =>
                            onChange(
                              scheduleType === 'interval'
                                ? [dayPart.id]
                                : selected
                                  ? value.filter((part) => part !== dayPart.id)
                                  : [...value, dayPart.id],
                            )
                          }
                          selected={selected}
                        />
                      );
                    })}
                  </View>
                  {errors.dayParts?.message ? (
                    <AppText tone="danger" variant="caption">
                      {errors.dayParts.message}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
          )}

          {activity?.nextExpectedLocalDate ? (
            <AppText tone="muted" variant="caption">
              Trenutačni sljedeći termin:{' '}
              {formatLocalDateShort(activity.nextExpectedLocalDate)}
            </AppText>
          ) : null}
        </Surface>

        <AppButton
          disabled={isSubmitting}
          label={isSubmitting ? 'Spremam…' : 'Spremi aktivnost'}
          onPress={() => void saveActivity()}
        />

        {statusActions.length > 0 ? (
          <Surface style={styles.formSection}>
            <View style={styles.sectionCopy}>
              <AppText variant="bodyLarge" weight="bold">
                Status aktivnosti
              </AppText>
              <AppText tone="muted" variant="caption">
                Pauziranje i arhiviranje ne brišu povijest.
              </AppText>
            </View>
            {statusActions.map((action) => (
              <AppButton
                key={action.status}
                label={action.label}
                onPress={() => setPendingStatusAction(action)}
                variant="secondary"
              />
            ))}
          </Surface>
        ) : null}
      </Screen>

      <AppSheet
        onClose={() => setPendingStatusAction(null)}
        title={pendingStatusAction?.title ?? 'Promijeni status'}
        visible={pendingStatusAction !== null}
      >
        <AppText tone="muted">{pendingStatusAction?.description}</AppText>
        <View style={styles.sheetActions}>
          <AppButton
            label="Odustani"
            onPress={() => setPendingStatusAction(null)}
            variant="secondary"
          />
          <AppButton
            label={pendingStatusAction?.label ?? 'Potvrdi'}
            onPress={() => void confirmStatusAction()}
          />
        </View>
      </AppSheet>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xxl,
    paddingBottom: spacing.huge,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  message: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  formSection: {
    gap: spacing.lg,
  },
  sectionCopy: {
    gap: spacing.xs,
  },
  descriptionInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flexField: {
    flex: 1,
    minWidth: 104,
  },
  infoCard: {
    borderRadius: radii.md,
    padding: spacing.md,
  },
  inlineFields: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  intervalUnit: {
    flex: 2,
    gap: spacing.sm,
    minWidth: 196,
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderLeftWidth: 4,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  previewEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconChoice: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    height: touchTarget,
    justifyContent: 'center',
    width: touchTarget,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  colorChoice: {
    borderRadius: radii.pill,
    borderWidth: 3,
    height: 40,
    width: 40,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  weekday: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    height: 40,
    justifyContent: 'center',
    maxWidth: 44,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
