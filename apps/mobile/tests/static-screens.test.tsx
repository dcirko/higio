import { render } from '@testing-library/react-native';

import HistoryScreen from '@/features/history/history-screen';
import InsightsScreen from '@/features/insights/insights-screen';
import MoreScreen from '@/features/more/more-screen';

describe('Phase 2 static screens', () => {
  it.each([
    ['Povijest', HistoryScreen],
    ['Statistika', InsightsScreen],
    ['Više', MoreScreen],
  ])('renders the %s screen', async (title, ScreenComponent) => {
    const view = await render(<ScreenComponent />);

    expect(view.getByRole('header', { name: title })).toBeOnTheScreen();
    view.unmount();
  });
});
