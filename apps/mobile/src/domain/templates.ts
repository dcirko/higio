import { OCCASIONAL_CARE } from '@/domain/occasional-care';
import type { ActivityDraft } from '@/domain/activities';
import type { LocalDate } from '@/domain/time';

export type ActivityTemplate = Omit<ActivityDraft, 'schedule'> & {
  id: string;
  schedule: Omit<
    ActivityDraft['schedule'],
    'firstDueLocalDate' | 'startsOnLocalDate'
  > & {
    firstDueAfterDays?: number;
  };
};

export type TemplatePack = {
  activities: ActivityTemplate[];
  description: string;
  icon: string;
  id: string;
  title: string;
};

export const TEMPLATE_PACKS: TemplatePack[] = [
  {
    id: 'occasional-care',
    title: 'Povremena njega',
    icon: '🪒',
    description:
      'Šišanje, brijanje i nokti: samo zadnji put, bez rokova i dnevnog cilja.',
    activities: OCCASIONAL_CARE.map((care, index) => ({
      id: ['haircut', 'beard-shave', 'intimate-shave', 'trim-nails'][index]!,
      name: care.name,
      category: care.category,
      icon: care.icon,
      color: '#42534D',
      description: '',
      schedule: {
        type: 'unscheduled',
        dayParts: ['anytime'],
        intervalEvery: null,
        intervalUnit: null,
        weekdays: [],
      },
    })),
  },
  {
    id: 'supplements',
    title: 'Suplementi',
    icon: '💊',
    description:
      'Tvoja dnevna evidencija unosa. Jedan dodir označava cijelu prikazanu dozu; količine možeš urediti. Nije preporuka uzimanja ili doziranja.',
    activities: [
      { id: 'creatine', name: 'Kreatin', doseLabel: '3 tablete' },
      { id: 'magnesium', name: 'Magnezij', doseLabel: '1 tableta' },
      { id: 'omega-3', name: 'Omega-3', doseLabel: '1 tableta' },
      { id: 'multivitamin', name: 'Multivitamin', doseLabel: '1 tableta' },
    ].map(({ id, name, doseLabel }) => ({
      id,
      name,
      category: 'supplements',
      icon: '💊',
      color: '#6750A4',
      description: '',
      schedule: {
        doseLabel,
        dayParts: ['day'],
        intervalEvery: null,
        intervalUnit: null,
        type: 'daily_slots',
        weekdays: [],
      },
    })),
  },
  {
    activities: [
      {
        category: 'oral-care',
        color: '#217D5C',
        description: '',
        icon: '🪥',
        id: 'brush-teeth',
        name: 'Pranje zubi',
        schedule: {
          dayParts: ['morning', 'evening'],
          intervalEvery: null,
          intervalUnit: null,
          type: 'daily_slots',
          weekdays: [],
        },
      },
    ],
    description: 'Pranje zubi ujutro i navečer.',
    icon: '🪥',
    id: 'oral-basics',
    title: 'Oralna njega',
  },
  {
    activities: [
      {
        category: 'body-care',
        color: '#386B9E',
        description: '',
        icon: '🚿',
        id: 'shower',
        name: 'Tuširanje',
        schedule: {
          dayParts: ['day'],
          intervalEvery: null,
          intervalUnit: null,
          type: 'daily_slots',
          weekdays: [],
        },
      },
      {
        category: 'personal-items',
        color: '#6750A4',
        description: '',
        icon: '🧺',
        id: 'change-towel',
        name: 'Promjena ručnika',
        schedule: {
          dayParts: ['anytime'],
          intervalEvery: null,
          intervalUnit: null,
          type: 'weekdays',
          weekdays: [7],
        },
      },
    ],
    description: 'Jednostavna dnevna njega i tjedni podsjetnik za ručnik.',
    icon: '🚿',
    id: 'body-basics',
    title: 'Tijelo',
  },
  {
    activities: [
      {
        category: 'hair-care',
        color: '#217D5C',
        description: '',
        icon: '🫧',
        id: 'hair-wash',
        name: 'Pranje kose',
        schedule: {
          dayParts: ['day'],
          intervalEvery: null,
          intervalUnit: null,
          type: 'weekdays',
          weekdays: [1, 4, 6],
        },
      },
    ],
    description: 'Početni raspored pranja kose.',
    icon: '🫧',
    id: 'hair-basics',
    title: 'Kosa',
  },
  {
    activities: [
      {
        category: 'skin-care',
        color: '#9C6415',
        description: '',
        icon: '🧴',
        id: 'skin-care',
        name: 'Njega kože',
        schedule: {
          dayParts: ['morning', 'evening'],
          intervalEvery: null,
          intervalUnit: null,
          type: 'daily_slots',
          weekdays: [],
        },
      },
    ],
    description:
      'Prilagodljivi jutarnji i večernji termini bez preporuke proizvoda.',
    icon: '🧴',
    id: 'skin-basics',
    title: 'Koža',
  },
  {
    activities: [
      {
        category: 'personal-items',
        color: '#6750A4',
        description: '',
        icon: '🛏️',
        id: 'change-linen',
        name: 'Promjena posteljine',
        schedule: {
          dayParts: ['anytime'],
          firstDueAfterDays: 14,
          intervalEvery: 14,
          intervalUnit: 'day',
          type: 'interval',
          weekdays: [],
        },
      },
      {
        category: 'personal-items',
        color: '#6750A4',
        description: '',
        icon: '🪥',
        id: 'replace-toothbrush',
        name: 'Zamjena četkice',
        schedule: {
          dayParts: ['anytime'],
          firstDueAfterDays: 90,
          intervalEvery: 90,
          intervalUnit: 'day',
          type: 'interval',
          weekdays: [],
        },
      },
    ],
    description: 'Početni intervali za osobne stvari koje lako zaboravimo.',
    icon: '🧺',
    id: 'personal-items',
    title: 'Osobne stvari',
  },
];

export function createDraftFromTemplate(
  template: ActivityTemplate,
  localDate: LocalDate,
  addCalendarDays: (date: LocalDate, days: number) => LocalDate,
): ActivityDraft {
  const firstDueLocalDate =
    template.schedule.type === 'interval'
      ? addCalendarDays(localDate, template.schedule.firstDueAfterDays ?? 0)
      : null;

  return {
    category: template.category,
    color: template.color,
    description: template.description,
    icon: template.icon,
    name: template.name,
    schedule: {
      doseLabel: template.schedule.doseLabel ?? null,
      dayParts: [...template.schedule.dayParts],
      firstDueLocalDate,
      intervalEvery: template.schedule.intervalEvery,
      intervalUnit: template.schedule.intervalUnit,
      startsOnLocalDate: localDate,
      type: template.schedule.type,
      weekdays: [...template.schedule.weekdays],
    },
  };
}
