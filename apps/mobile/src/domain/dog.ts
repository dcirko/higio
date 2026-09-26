import type { ActivityStore } from '@/domain/activities';
import type { TodayOccurrence } from '@/domain/today-store';
import { createDraftFromTemplate, type TemplatePack } from '@/domain/templates';
import { addCalendarDays, type LocalDate } from '@/domain/time';

export const DOG_PACK: TemplatePack = {
  id: 'dog',
  title: 'Pas',
  icon: '🐕',
  description:
    'Hrana i šetnja ujutro, tijekom dana i navečer. Zadnje kupanje i tableta protiv buha.',
  activities: [
    { id: 'dog-food', name: 'Hrana za psa', icon: '🍲', daily: true },
    { id: 'dog-walk', name: 'Šetnja psa', icon: '🐾', daily: true },
    { id: 'dog-bath', name: 'Kupanje psa', icon: '🛁', daily: false },
    { id: 'dog-flea', name: 'Tableta protiv buha', icon: '💊', daily: false },
  ].map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    category: 'pet-care',
    color: '#386B9E',
    description: '',
    schedule: {
      type: item.daily ? 'daily_slots' : 'unscheduled',
      dayParts: item.daily ? ['morning', 'day', 'evening'] : ['anytime'],
      intervalEvery: null,
      intervalUnit: null,
      weekdays: [],
    },
  })),
};

export function filterTodayScope(
  items: TodayOccurrence[],
  scope: 'personal' | 'dog',
) {
  return items.filter((item) =>
    scope === 'dog'
      ? item.category === 'pet-care'
      : item.category !== 'pet-care',
  );
}

export async function addDogRoutine(store: ActivityStore, date: LocalDate) {
  const existing = await store.listActivities();
  const names = new Set(
    existing
      .filter((a) => a.category === 'pet-care')
      .map((a) => a.name.trim().toLocaleLowerCase('hr')),
  );
  let added = 0;
  for (const template of DOG_PACK.activities) {
    if (names.has(template.name.toLocaleLowerCase('hr'))) continue;
    await store.createActivity(
      createDraftFromTemplate(template, date, addCalendarDays),
      date,
    );
    added++;
  }
  return added;
}
