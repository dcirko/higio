export type DayPart = 'Jutro' | 'Tijekom dana' | 'Večer';

export type SampleActivity = {
  id: string;
  icon: string;
  lastDone: string;
  part: DayPart;
  slotLabel: string;
  title: string;
};

export const DAY_PARTS: DayPart[] = ['Jutro', 'Tijekom dana', 'Večer'];

export const SAMPLE_ACTIVITIES: SampleActivity[] = [
  {
    id: 'brush-morning',
    icon: '🪥',
    lastDone: 'Posljednji put jučer u 08:06',
    part: 'Jutro',
    slotLabel: 'Jutarnji termin',
    title: 'Pranje zubi',
  },
  {
    id: 'wash-face',
    icon: '💧',
    lastDone: 'Posljednji put jučer u 08:12',
    part: 'Jutro',
    slotLabel: 'Jutarnji termin',
    title: 'Umivanje',
  },
  {
    id: 'shower',
    icon: '🚿',
    lastDone: 'Posljednji put jučer u 19:40',
    part: 'Tijekom dana',
    slotLabel: 'Danas',
    title: 'Tuširanje',
  },
  {
    id: 'hair-wash',
    icon: '🫧',
    lastDone: 'Posljednji put prije 3 dana',
    part: 'Tijekom dana',
    slotLabel: 'Planirano danas',
    title: 'Pranje kose',
  },
  {
    id: 'skin-evening',
    icon: '🧴',
    lastDone: 'Posljednji put jučer u 22:18',
    part: 'Večer',
    slotLabel: 'Večernji termin',
    title: 'Njega kože',
  },
  {
    id: 'brush-evening',
    icon: '🪥',
    lastDone: 'Posljednji put jučer u 22:22',
    part: 'Večer',
    slotLabel: 'Večernji termin',
    title: 'Pranje zubi',
  },
];
