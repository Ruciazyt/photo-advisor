import React from 'react';
import { render, act } from '@testing-library/react-native';
import { useHaptics } from '../hooks/useHaptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

import * as Haptics from 'expo-haptics';

// Test wrapper component that calls the hook
function TestHapticComponent({
  onMount,
}: {
  onMount: (h: ReturnType<typeof useHaptics>) => void;
}) {
  const haptics = useHaptics();
  React.useEffect(() => {
    onMount(haptics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe('useHaptics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('triggers success haptic on triggerLevelHaptic', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.triggerLevelHaptic();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Success');
  });

  it('respects cooldown — second call within 1500ms is ignored', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.triggerLevelHaptic();
      capturedHaptics!.triggerLevelHaptic(); // should be ignored due to cooldown
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });

  it('level haptic fires again after cooldown expires', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.triggerLevelHaptic();
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1600);
    });

    act(() => {
      capturedHaptics!.triggerLevelHaptic();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
  });

  it('lightImpact triggers light impact', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.lightImpact();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith('Light');
  });

  it('mediumImpact triggers medium impact', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.mediumImpact();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith('Medium');
  });

  it('heavyImpact triggers heavy impact', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.heavyImpact();
    });

    expect(Haptics.impactAsync).toHaveBeenCalledWith('Heavy');
  });

  it('successNotification triggers success notification', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.successNotification();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Success');
  });

  it('warningNotification triggers warning notification', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.warningNotification();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Warning');
  });

  it('errorNotification triggers error notification', () => {
    let capturedHaptics: ReturnType<typeof useHaptics>;

    render(
      <TestHapticComponent
        onMount={(h) => {
          capturedHaptics = h;
        }}
      />
    );

    act(() => {
      capturedHaptics!.errorNotification();
    });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith('Error');
  });
});
