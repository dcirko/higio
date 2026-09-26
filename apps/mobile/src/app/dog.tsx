import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useActivityStore } from '@/data/activity-store-context';
import { AppButton, AppText } from '@/design-system/components';
import { addDogRoutine } from '@/domain/dog';
import { getCurrentZagrebLocalDate } from '@/domain/time';
import TodayScreen from '@/features/today/today-screen';

export default function DogScreen() {
  const store = useActivityStore();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function setup() {
    if (busy) return;
    setBusy(true);
    try {
      const count = await addDogRoutine(store, getCurrentZagrebLocalDate());
      setMessage(
        count
          ? 'Rutina je dodana. Evidentiraj svaki termin jednim dodirom.'
          : 'Osnovne aktivnosti već postoje. Raspored možeš urediti u Aktivnostima.',
      );
    } catch {
      setMessage(
        'Dodavanje nije dovršeno. Pokušaj ponovno; postojeći unosi ostaju sačuvani.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <TodayScreen
      scope="dog"
      introduction={
        <View style={{ gap: 12 }}>
          <AppButton
            label="Natrag"
            variant="secondary"
            onPress={() => router.back()}
          />
          <AppText tone="muted">
            Hrana i šetnja triput dnevno. Kupanje i tableta protiv buha
            prikazuju samo zadnje evidentiranje.
          </AppText>
          <AppButton
            label="Dodaj osnovnu rutinu za psa"
            disabled={busy}
            onPress={() => void setup()}
          />
          {message ? (
            <AppText accessibilityLiveRegion="polite">{message}</AppText>
          ) : null}
        </View>
      }
    />
  );
}
