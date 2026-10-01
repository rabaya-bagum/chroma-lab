import { router } from 'expo-router';
import { goBack } from '../../src/utils/navigation';

jest.mock('expo-router', () => ({
  router: { canGoBack: jest.fn(), back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

const mocked = router as unknown as Record<'canGoBack' | 'back' | 'replace', jest.Mock>;

describe('goBack', () => {
  beforeEach(() => jest.clearAllMocks());

  it('goes back when there is history', () => {
    mocked.canGoBack.mockReturnValue(true);
    goBack();
    expect(mocked.back).toHaveBeenCalledTimes(1);
    expect(mocked.replace).not.toHaveBeenCalled();
  });

  it('lands on Home instead of raising GO_BACK when there is nothing to go back to', () => {
    mocked.canGoBack.mockReturnValue(false);
    goBack();
    expect(mocked.back).not.toHaveBeenCalled();
    expect(mocked.replace).toHaveBeenCalledWith('/');
  });
});
