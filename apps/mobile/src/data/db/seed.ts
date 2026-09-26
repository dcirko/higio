import { eq } from 'drizzle-orm';

import type { HigioDatabase } from '@/data/db/client';
import {
  activities,
  activityStateVersions,
  scheduleSlots,
  scheduleVersions,
  scheduleWeekdays,
  settings,
} from '@/data/db/schema';
import { APP_TIME_ZONE, type LocalDate } from '@/domain/time';

const STARTER_SEED_KEY = 'starter_seed_v2';

const IDS = {
  activities: {
    brushTeeth: '9dfb6529-b9ad-4aa5-a35c-e8f3e8fc569c',
    hairWash: '01d1f43e-e069-4ed2-a8df-068a8081cbaa',
    nails: 'f5ba80c7-8e4e-4d7c-80ea-220738d8063f',
    shave: 'c04aa9c5-a2b5-49f0-80f6-c17a7a7fd508',
    shower: 'b091d634-b031-4d65-9c78-68442ca78b48',
    skinCare: '0f67165a-d867-4ec9-af93-a7fbd0ba9906',
    washFace: 'a3f35f43-b277-4fcf-a09f-c5ac95b69474',
  },
  states: {
    brushTeeth: 'a8e3daea-46ea-4f58-9120-a4e1fcf24713',
    hairWash: 'c316ea58-dad4-4b39-b4bb-13233f0d1aab',
    nails: '85008167-7f62-4ce2-a5c1-e3be2dcf2416',
    shave: '80843393-735f-46b9-8384-6304419af60e',
    shower: '2abe265d-9dfc-49c8-8201-e1dd058a162d',
    skinCare: 'ba3c5e71-1772-4840-be18-a8090709fadc',
    washFace: 'c23f4a5a-4b55-4304-a454-a1d61ff9ff35',
  },
  schedules: {
    brushTeeth: 'bd9a6859-e38d-4b98-9257-f3d5ef9faf83',
    hairWash: '489327e6-2f73-4bb1-bbe7-43c3cc4cad36',
    nails: '426f83b9-2826-46bd-860e-067802526913',
    shave: 'b909798b-f040-419d-9e9a-25c8ddf0d71b',
    shower: '060f16c1-c1d4-4d20-9d37-1b7c8cd2241a',
    skinCare: '71a120ed-c460-413f-830e-0bfcc6ef4cac',
    washFace: '0694ae56-23c8-45f8-afd1-1424e62cd3ea',
  },
  slots: {
    brushEvening: '64b6c825-f27e-4648-975b-62ff34f7b06a',
    brushMorning: '4707e702-d72e-4914-989b-0297e0408a12',
    hairWash: 'ad55c4c8-e389-420c-a202-a4d62ca9b4d0',
    nails: '2f2b6ab6-0e5b-4079-91d3-d5623ddc1a35',
    shower: 'c436ad3d-031c-4b05-ac40-e27a23fce300',
    skinCare: '756164c6-3019-483d-b862-e18da8b65b47',
    washFace: 'b23dfbe9-4832-4a31-9a39-a45e112a301c',
  },
} as const;

export function seedStarterData(
  database: HigioDatabase,
  initialLocalDate: LocalDate,
) {
  const existingSeed = database
    .select()
    .from(settings)
    .where(eq(settings.key, STARTER_SEED_KEY))
    .get();

  if (existingSeed) {
    return;
  }

  const now = new Date();

  database.transaction((transaction) => {
    transaction
      .insert(activities)
      .values([
        {
          category: 'oral-care',
          color: '#217D5C',
          icon: '🪥',
          id: IDS.activities.brushTeeth,
          isPinned: true,
          name: 'Pranje zubi',
          sortOrder: 10,
        },
        {
          category: 'skin-care',
          color: '#386B9E',
          icon: '💧',
          id: IDS.activities.washFace,
          isPinned: true,
          name: 'Umivanje',
          sortOrder: 20,
        },
        {
          category: 'body-care',
          color: '#386B9E',
          icon: '🚿',
          id: IDS.activities.shower,
          isPinned: true,
          name: 'Tuširanje',
          sortOrder: 30,
        },
        {
          category: 'hair-care',
          color: '#217D5C',
          icon: '🫧',
          id: IDS.activities.hairWash,
          isPinned: true,
          name: 'Pranje kose',
          sortOrder: 40,
        },
        {
          category: 'skin-care',
          color: '#9C6415',
          icon: '🧴',
          id: IDS.activities.skinCare,
          isPinned: true,
          name: 'Njega kože',
          sortOrder: 50,
        },
        {
          category: 'nail-care',
          color: '#9C6415',
          icon: '✂️',
          id: IDS.activities.nails,
          isPinned: true,
          name: 'Rezanje noktiju',
          sortOrder: 60,
        },
        {
          category: 'grooming',
          color: '#42534D',
          icon: '🪒',
          id: IDS.activities.shave,
          isPinned: false,
          name: 'Brijanje',
          sortOrder: 70,
        },
      ])
      .onConflictDoNothing()
      .run();

    transaction
      .insert(activityStateVersions)
      .values(
        [
          {
            activityId: IDS.activities.brushTeeth,
            id: IDS.states.brushTeeth,
          },
          {
            activityId: IDS.activities.washFace,
            id: IDS.states.washFace,
          },
          { activityId: IDS.activities.shower, id: IDS.states.shower },
          {
            activityId: IDS.activities.hairWash,
            id: IDS.states.hairWash,
          },
          {
            activityId: IDS.activities.skinCare,
            id: IDS.states.skinCare,
          },
          { activityId: IDS.activities.nails, id: IDS.states.nails },
          { activityId: IDS.activities.shave, id: IDS.states.shave },
        ].map((state) => ({
          activityId: state.activityId,
          id: state.id,
          status: 'active' as const,
          validFromLocalDate: initialLocalDate,
        })),
      )
      .onConflictDoNothing()
      .run();

    transaction
      .insert(scheduleVersions)
      .values([
        {
          activityId: IDS.activities.brushTeeth,
          id: IDS.schedules.brushTeeth,
          timezone: APP_TIME_ZONE,
          type: 'daily_slots',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.washFace,
          id: IDS.schedules.washFace,
          timezone: APP_TIME_ZONE,
          type: 'daily_slots',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.shower,
          id: IDS.schedules.shower,
          timezone: APP_TIME_ZONE,
          type: 'daily_slots',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.hairWash,
          id: IDS.schedules.hairWash,
          timezone: APP_TIME_ZONE,
          type: 'weekdays',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.skinCare,
          id: IDS.schedules.skinCare,
          timezone: APP_TIME_ZONE,
          type: 'daily_slots',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.nails,
          firstDueLocalDate: initialLocalDate,
          id: IDS.schedules.nails,
          intervalEvery: 14,
          intervalUnit: 'day',
          timezone: APP_TIME_ZONE,
          type: 'interval',
          validFromLocalDate: initialLocalDate,
        },
        {
          activityId: IDS.activities.shave,
          id: IDS.schedules.shave,
          timezone: APP_TIME_ZONE,
          type: 'unscheduled',
          validFromLocalDate: initialLocalDate,
        },
      ])
      .onConflictDoNothing()
      .run();

    transaction
      .insert(scheduleSlots)
      .values([
        {
          dayPart: 'morning',
          id: IDS.slots.brushMorning,
          label: 'Jutarnji termin',
          preferredMinutes: 8 * 60,
          scheduleVersionId: IDS.schedules.brushTeeth,
          sortOrder: 10,
        },
        {
          dayPart: 'evening',
          id: IDS.slots.brushEvening,
          label: 'Večernji termin',
          preferredMinutes: 22 * 60,
          scheduleVersionId: IDS.schedules.brushTeeth,
          sortOrder: 10,
        },
        {
          dayPart: 'morning',
          id: IDS.slots.washFace,
          label: 'Jutarnji termin',
          preferredMinutes: 8 * 60 + 10,
          scheduleVersionId: IDS.schedules.washFace,
          sortOrder: 20,
        },
        {
          dayPart: 'day',
          id: IDS.slots.shower,
          label: 'Danas',
          preferredMinutes: null,
          scheduleVersionId: IDS.schedules.shower,
          sortOrder: 30,
        },
        {
          dayPart: 'day',
          id: IDS.slots.hairWash,
          label: 'Planirano danas',
          preferredMinutes: null,
          scheduleVersionId: IDS.schedules.hairWash,
          sortOrder: 40,
        },
        {
          dayPart: 'evening',
          id: IDS.slots.skinCare,
          label: 'Večernji termin',
          preferredMinutes: 21 * 60 + 45,
          scheduleVersionId: IDS.schedules.skinCare,
          sortOrder: 20,
        },
        {
          dayPart: 'anytime',
          id: IDS.slots.nails,
          label: 'Danas',
          preferredMinutes: null,
          scheduleVersionId: IDS.schedules.nails,
          sortOrder: 10,
        },
      ])
      .onConflictDoNothing()
      .run();

    transaction
      .insert(scheduleWeekdays)
      .values(
        [1, 4, 6].map((isoWeekday) => ({
          isoWeekday,
          scheduleVersionId: IDS.schedules.hairWash,
        })),
      )
      .onConflictDoNothing()
      .run();

    transaction
      .insert(settings)
      .values({
        key: STARTER_SEED_KEY,
        updatedAtUtc: now,
        value: JSON.stringify({
          createdAtUtc: now.toISOString(),
          initialLocalDate,
          version: 1,
        }),
      })
      .run();
  });
}
