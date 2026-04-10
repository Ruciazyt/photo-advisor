import React from 'react';
import { render } from '@testing-library/react-native';
import { LevelIndicator } from '../components/LevelIndicator';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';

// Mock the hook
jest.mock('../hooks/useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseDeviceOrientation = useDeviceOrientation as jest.MockedFunction<typeof useDeviceOrientation>;

describe('LevelIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when accelerometer is not available', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: false,
    });

    const { toJSON } = render(<LevelIndicator />);
    expect(toJSON()).toBeNull();
  });

  it('renders when accelerometer is available', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 0, roll: 0 },
      available: true,
    });

    const { toJSON } = render(<LevelIndicator />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows level state when tilt is within ±8°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 3, roll: 5 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('水平')).toBeTruthy();
    expect(getByText(/俯仰/)).toBeTruthy();
    expect(getByText(/横滚/)).toBeTruthy();
  });

  it('shows slight tilt state when tilt is between ±8° and ±20°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12, roll: 10 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('轻微倾斜')).toBeTruthy();
  });

  it('shows tilted state when tilt exceeds ±20°', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 25, roll: -22 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('倾斜')).toBeTruthy();
  });

  it('uses worst state when pitch and roll disagree', () => {
    // pitch is level (±8°), roll is tilted (>±20°)
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 3, roll: 25 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('倾斜')).toBeTruthy();
  });

  it('displays pitch and roll values with one decimal place', () => {
    mockUseDeviceOrientation.mockReturnValue({
      orientation: { pitch: 12.345, roll: -7.891 },
      available: true,
    });

    const { getByText } = render(<LevelIndicator />);
    expect(getByText('俯仰 12.3°')).toBeTruthy();
    expect(getByText('横滚 -7.9°')).toBeTruthy();
  });
});
