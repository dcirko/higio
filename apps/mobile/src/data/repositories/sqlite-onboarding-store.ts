import { count, eq } from 'drizzle-orm';

import type { HigioDatabase } from '@/data/db/client';
import { activities, settings } from '@/data/db/schema';
import { StoreEvents } from '@/data/store-events';
import type { OnboardingState, OnboardingStore } from '@/domain/onboarding';

const ONBOARDING_KEY = 'onboarding_v1';
const LEGACY_SEED_KEY = 'starter_seed_v2';

type StoredOnboarding = { completedAtUtc: string };

function readState(database: HigioDatabase): OnboardingState {
  const row = database
    .select()
    .from(settings)
    .where(eq(settings.key, ONBOARDING_KEY))
    .get();

  if (!row) return { completedAtUtc: null, isCompleted: false };

  const value = JSON.parse(row.value) as StoredOnboarding;
  return { completedAtUtc: new Date(value.completedAtUtc), isCompleted: true };
}

function writeCompleted(database: HigioDatabase, completedAtUtc = new Date()) {
  database
    .insert(settings)
    .values({
      key: ONBOARDING_KEY,
      updatedAtUtc: completedAtUtc,
      value: JSON.stringify({ completedAtUtc: completedAtUtc.toISOString() }),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAtUtc: completedAtUtc,
        value: JSON.stringify({ completedAtUtc: completedAtUtc.toISOString() }),
      },
    })
    .run();
}

/** Existing alpha installations already have activities and must not be sent
 * through onboarding after upgrading. Fresh installations remain empty. */
export function prepareOnboarding(database: HigioDatabase) {
  if (readState(database).isCompleted) return;

  const legacySeed = database
    .select()
    .from(settings)
    .where(eq(settings.key, LEGACY_SEED_KEY))
    .get();
  const activityCount =
    database.select({ value: count() }).from(activities).get()?.value ?? 0;

  if (legacySeed || activityCount > 0) writeCompleted(database);
}

export class SqliteOnboardingStore implements OnboardingStore {
  constructor(
    private readonly database: HigioDatabase,
    private readonly events: StoreEvents,
  ) {}

  async getState() {
    return readState(this.database);
  }

  async complete() {
    writeCompleted(this.database);
    this.events.emit();
  }

  subscribe(listener: () => void) {
    return this.events.subscribe(listener);
  }
}
