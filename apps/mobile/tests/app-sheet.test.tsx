import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard, TextInput } from 'react-native';

import { AppSheet } from '@/design-system/components/app-sheet';

function EditSheet() {
  const [visible, setVisible] = useState(true);
  const [time, setTime] = useState('10:55');
  return (
    <AppSheet
      onClose={() => setVisible(false)}
      title="Ispravak"
      visible={visible}
    >
      <TextInput
        accessibilityLabel="Vrijeme"
        onChangeText={setTime}
        value={time}
      />
    </AppSheet>
  );
}

afterEach(() => jest.restoreAllMocks());

it('dismisses the keyboard on Android Back without discarding the draft, then allows closing', async () => {
  const isVisible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const { getByLabelText, getByTestId, queryByLabelText } = await render(
    <EditSheet />,
  );
  await fireEvent.changeText(getByLabelText('Vrijeme'), '10:30');

  await fireEvent(getByTestId('app-sheet-modal'), 'requestClose');
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(getByLabelText('Vrijeme')).toHaveProp('value', '10:30');

  isVisible.mockReturnValue(false);
  await fireEvent(getByTestId('app-sheet-modal'), 'requestClose');
  expect(queryByLabelText('Vrijeme')).toBeNull();
});
