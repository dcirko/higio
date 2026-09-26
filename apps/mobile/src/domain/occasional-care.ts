import type { LocalDate } from '@/domain/time';

export const OCCASIONAL_CARE = [
  {
    name: 'Šišanje kose',
    icon: '💇',
    category: 'hair-care',
    aliases: ['šišanje kose', 'šišanje', 'odlazak frizeru'],
  },
  {
    name: 'Brijanje brade',
    icon: '🪒',
    category: 'grooming',
    aliases: ['brijanje brade', 'brijanje'],
  },
  {
    name: 'Intimno brijanje',
    icon: '🪒',
    category: 'grooming',
    aliases: [
      'intimno brijanje',
      'brijanje oko penisa',
      'brijanje intimnog područja',
    ],
  },
  {
    name: 'Rezanje noktiju',
    icon: '✂️',
    category: 'nail-care',
    aliases: ['rezanje noktiju', 'šišanje noktiju'],
  },
] as const;

export function normalizeCareName(name: string) {
  return name
    .trim()
    .toLocaleLowerCase('hr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function findOccasionalCare(name: string) {
  return OCCASIONAL_CARE.find((care) =>
    care.aliases.some(
      (alias) => normalizeCareName(alias) === normalizeCareName(name),
    ),
  );
}

export function formatLastDone(localDate: LocalDate, localTime: string) {
  const [year, month, day] = localDate.split('-');
  return `Zadnji put: ${day}.${month}.${year}. u ${localTime}`;
}
