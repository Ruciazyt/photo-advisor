import { useAnimationFrameTimer, TIMER_INTERVAL_MS } from '../hooks/useAnimationFrameTimer';

describe('useAnimationFrameTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('compiles without errors', () => {
    expect(useAnimationFrameTimer).toBeDefined();
  });

  it('exports TIMER_INTERVAL_MS constant', () => {
    expect(TIMER_INTERVAL_MS).toBe(500);
  });
});
