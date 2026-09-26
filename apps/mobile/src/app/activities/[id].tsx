import { useLocalSearchParams } from 'expo-router';

import ActivityEditorScreen from '@/features/activities/activity-editor-screen';

export default function EditActivityRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ActivityEditorScreen activityId={id} />;
}
