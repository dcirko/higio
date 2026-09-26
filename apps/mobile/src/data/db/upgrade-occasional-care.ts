import * as Crypto from 'expo-crypto';
import { eq, isNull } from 'drizzle-orm';
import type { HigioDatabase } from '@/data/db/client';
import {
  activities,
  activityStateVersions,
  scheduleVersions,
  settings,
} from '@/data/db/schema';
import {
  findOccasionalCare,
  normalizeCareName,
  OCCASIONAL_CARE,
} from '@/domain/occasional-care';
import {
  addCalendarDays,
  APP_TIME_ZONE,
  getCurrentZagrebLocalDate,
  type LocalDate,
} from '@/domain/time';

const KEY = 'upgrade.occasional-care.v1';

// One transaction, including its marker. Logs and old schedule/slot IDs remain intact.
export function upgradeOccasionalCare(
  database: HigioDatabase,
  today: LocalDate = getCurrentZagrebLocalDate(),
) {
  if (database.select().from(settings).where(eq(settings.key, KEY)).get())
    return;
  const now = new Date();
  database.transaction((tx) => {
    const rows = tx
      .select()
      .from(activities)
      .where(isNull(activities.deletedAtUtc))
      .all();
    for (const activity of rows) {
      const care = findOccasionalCare(activity.name);
      const floss = normalizeCareName(activity.name) === 'zubni konac';
      if (!care && !floss) continue;
      if (floss) {
        tx.update(activities)
          .set({ status: 'archived', updatedAtUtc: now })
          .where(eq(activities.id, activity.id))
          .run();
        for (const state of tx
          .select()
          .from(activityStateVersions)
          .where(eq(activityStateVersions.activityId, activity.id))
          .all()) {
          if (state.validToLocalDate !== null && state.validToLocalDate < today)
            continue;
          if (state.validFromLocalDate >= today) {
            tx.update(activityStateVersions)
              .set({ status: 'archived', updatedAtUtc: now })
              .where(eq(activityStateVersions.id, state.id))
              .run();
          } else {
            tx.update(activityStateVersions)
              .set({
                validToLocalDate: addCalendarDays(today, -1),
                updatedAtUtc: now,
              })
              .where(eq(activityStateVersions.id, state.id))
              .run();
          }
        }
        const states = tx
          .select()
          .from(activityStateVersions)
          .where(eq(activityStateVersions.activityId, activity.id))
          .all();
        const current = states.some((s) => s.validFromLocalDate === today);
        const nextStart = states
          .map((s) => s.validFromLocalDate)
          .filter((date) => date > today)
          .sort()[0];
        if (!current)
          tx.insert(activityStateVersions)
            .values({
              id: Crypto.randomUUID(),
              activityId: activity.id,
              status: 'archived',
              validFromLocalDate: today,
              validToLocalDate: nextStart
                ? addCalendarDays(nextStart, -1)
                : null,
            })
            .run();
      }
      if (care)
        tx.update(activities)
          .set({ name: care.name, updatedAtUtc: now })
          .where(eq(activities.id, activity.id))
          .run();
      for (const schedule of tx
        .select()
        .from(scheduleVersions)
        .where(eq(scheduleVersions.activityId, activity.id))
        .all()) {
        if (
          schedule.deletedAtUtc ||
          (schedule.validToLocalDate !== null &&
            schedule.validToLocalDate < today)
        )
          continue;
        tx.update(scheduleVersions)
          .set(
            schedule.validFromLocalDate < today
              ? {
                  validToLocalDate: addCalendarDays(today, -1),
                  updatedAtUtc: now,
                }
              : { deletedAtUtc: now, updatedAtUtc: now },
          )
          .where(eq(scheduleVersions.id, schedule.id))
          .run();
      }
      tx.insert(scheduleVersions)
        .values({
          id: Crypto.randomUUID(),
          activityId: activity.id,
          type: 'unscheduled',
          timezone: APP_TIME_ZONE,
          validFromLocalDate: today,
        })
        .run();
    }
    // Existing installations receive missing care entries. Fresh onboarding uses templates.
    if (rows.length > 0)
      for (const care of OCCASIONAL_CARE) {
        if (
          rows.some((row) => findOccasionalCare(row.name)?.name === care.name)
        )
          continue;
        const id = Crypto.randomUUID();
        tx.insert(activities)
          .values({
            id,
            name: care.name,
            icon: care.icon,
            category: care.category,
            color: '#42534D',
            sortOrder: now.getTime(),
          })
          .run();
        tx.insert(activityStateVersions)
          .values({
            id: Crypto.randomUUID(),
            activityId: id,
            status: 'active',
            validFromLocalDate: today,
          })
          .run();
        tx.insert(scheduleVersions)
          .values({
            id: Crypto.randomUUID(),
            activityId: id,
            type: 'unscheduled',
            timezone: APP_TIME_ZONE,
            validFromLocalDate: today,
          })
          .run();
      }
    tx.insert(settings)
      .values({ key: KEY, value: today, updatedAtUtc: now })
      .run();
  });
}
