// Mock dependencies before importing component
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');
jest.mock('../../hooks/useDeviceOrientation');
jest.mock('../../hooks/useHaptics');
jest.mock('../../contexts/ThemeContext');
jest.mock('@expo/vector-icons');

import { render } from '@testing-library/react-native';
import { LevelIndicator } from '../LevelIndicator';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../contexts/ThemeContext';

// Setup mock implementations
const mockTriggerLevelHaptic = jest.fn();
const mockWarningNotification = jest.fn();

(useDeviceOrientation as jest.Mock).mockReturnValue({
  orientation: { pitch: 0, roll: 0 },
  available: false,
});

(useHaptics as jest.Mock).mockReturnValue({
  triggerLevelHaptic: mockTriggerLevelHaptic,
  warningNotification: mockWarningNotification,
});

(useTheme as jest.Mock).mockReturnValue({
  colors: {
    success: '#00C853',
    error: '#FF1744',
    warning: '#FFB300',
  },
});

describe('LevelIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDeviceOrientation as jest.Mock).mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: false,
    });
  });

  describe('when orientation not available', () => {
    it('returns null when orientation.available is false', () => {
      const { toJSON } = render(<LevelIndicator />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('when orientation is available', () => {
    beforeEach(() => {
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 0, roll: 0 },
        available: true,
      });
    });

    it('renders bubble indicator when orientation is available', () => {
      const { toJSON } = render(<LevelIndicator />);
      expect(toJSON()).not.toBeNull();
    });

    it('shows status text "水平" when device is level', () => {
      const { toJSON } = render(<LevelIndicator />);
      const jsonStr = JSON.stringify(toJSON());
      expect(jsonStr).toContain('水平');
    });

    it('shows status text "轻微倾斜" for slight tilt', () => {
      // pitch=10 is within MID_TILT(8) < 10 <= MAX_TILT(20) → slight
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 10, roll: 0 },
        available: true,
      });

      const { toJSON } = render(<LevelIndicator />);
      const jsonStr = JSON.stringify(toJSON());
      expect(jsonStr).toContain('轻微倾斜');
    });

    it('shows status text "倾斜" for severe tilt', () => {
      // pitch=25 > MAX_TILT(20) → tilted
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 25, roll: 0 },
        available: true,
      });

      const { toJSON } = render(<LevelIndicator />);
      const jsonStr = JSON.stringify(toJSON());
      expect(jsonStr).toContain('倾斜');
    });

    it('shows correct pitch and roll values', () => {
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 3.5, roll: -2.1 },
        available: true,
      });

      const { toJSON } = render(<LevelIndicator />);
      const jsonStr = JSON.stringify(toJSON());
      expect(jsonStr).toContain('俯仰');
      expect(jsonStr).toContain('3.5');
      expect(jsonStr).toContain('横滚');
      expect(jsonStr).toContain('-2.1');
    });

    it('triggers haptic when transitioning to level state', () => {
      // Start tilted
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 25, roll: 0 },
        available: true,
      });

      const { rerender } = render(<LevelIndicator />);

      // Transition to level
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 0, roll: 0 },
        available: true,
      });

      rerender(<LevelIndicator />);
      expect(mockTriggerLevelHaptic).toHaveBeenCalled();
    });

    it('triggers warning haptic when transitioning to tilted state', () => {
      // Start level
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 0, roll: 0 },
        available: true,
      });

      const { rerender } = render(<LevelIndicator />);

      // Transition to tilted
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 25, roll: 0 },
        available: true,
      });

      rerender(<LevelIndicator />);
      expect(mockWarningNotification).toHaveBeenCalled();
    });

    it('does not re-trigger haptic on same state', () => {
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 25, roll: 0 },
        available: true,
      });

      const { rerender } = render(<LevelIndicator />);
      mockWarningNotification.mockClear();

      // Re-render with same tilted state
      rerender(<LevelIndicator />);
      expect(mockWarningNotification).not.toHaveBeenCalled();
    });

    it('uses worst state when pitch and roll disagree', () => {
      // pitch=5 (level), roll=25 (tilted) → worst is tilted
      (useDeviceOrientation as jest.Mock).mockReturnValue({
        orientation: { pitch: 5, roll: 25 },
        available: true,
      });

      const { toJSON } = render(<LevelIndicator />);
      const jsonStr = JSON.stringify(toJSON());
      expect(jsonStr).toContain('倾斜');
    });

    it('renders with pointerEvents="none" for accessibility', () => {
      const { toJSON } = render(<LevelIndicator />);
      const tree = toJSON() as any;
      expect(tree.props.pointerEvents).toBe('none');
    });
  });
});
