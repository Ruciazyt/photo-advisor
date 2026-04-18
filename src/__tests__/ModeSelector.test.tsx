/**
 * Tests for ModeSelector component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ModeSelector } from '../components/ModeSelector';
import type { CameraMode } from '../components/ModeSelector';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#007AFF',
      primary: '#FFFFFF',
    },
  }),
}));

// Mock useAccessibilityButton hook
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityButton: ({ label, hint, role }: { label: string; hint: string; role: string }) => ({
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
  }),
}));

describe('ModeSelector', () => {
  const defaultProps = {
    selectedMode: 'photo' as CameraMode,
    onModeChange: jest.fn(),
  };

  const modes: CameraMode[] = ['photo', 'scan', 'video', 'portrait'];
  const modeLabels: Record<CameraMode, string> = {
    photo: '拍照',
    scan: '扫码',
    video: '视频',
    portrait: '人像',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 mode buttons', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} />);
    modes.forEach((mode) => {
      expect(getByText(modeLabels[mode])).toBeTruthy();
    });
  });

  it('renders exactly 4 mode buttons', () => {
    const { getAllByRole } = render(<ModeSelector {...defaultProps} />);
    // All buttons have role='tab' from useAccessibilityButton
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('calls onModeChange with correct mode when button is pressed', () => {
    const onModeChange = jest.fn();
    const { getByText } = render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

    modes.forEach((mode) => {
      fireEvent.press(getByText(modeLabels[mode]));
      expect(onModeChange).toHaveBeenCalledWith(mode);
    });
  });

  it('selected mode has correct accessibility state', () => {
    const { getAllByRole } = render(<ModeSelector {...defaultProps} selectedMode="video" />);
    const tabs = getAllByRole('tab');
    // Third button (index 2) should be 'video' and selected
    expect(tabs[2].props.accessibilityState.selected).toBe(true);
    // Others should not be selected
    expect(tabs[0].props.accessibilityState.selected).toBe(false);
    expect(tabs[1].props.accessibilityState.selected).toBe(false);
    expect(tabs[3].props.accessibilityState.selected).toBe(false);
  });

  it('each mode button has correct accessibility label and hint', () => {
    const { getAllByRole } = render(<ModeSelector {...defaultProps} />);
    const tabs = getAllByRole('tab');

    modes.forEach((mode, index) => {
      expect(tabs[index].props.accessibilityLabel).toBe(`${modeLabels[mode]}模式`);
      expect(tabs[index].props.accessibilityHint).toBe(`切换到${modeLabels[mode]}模式`);
    });
  });

  it('each mode button has role tab', () => {
    const { getAllByRole } = render(<ModeSelector {...defaultProps} />);
    const tabs = getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab.props.accessibilityRole).toBe('tab');
    });
  });

  it('handles rapid successive presses correctly', () => {
    const onModeChange = jest.fn();
    const { getByText } = render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);

    const photoBtn = getByText(modeLabels.photo);
    fireEvent.press(photoBtn);
    fireEvent.press(photoBtn);
    fireEvent.press(photoBtn);

    // Should be called 3 times (no debouncing implemented, each press fires)
    expect(onModeChange).toHaveBeenCalledTimes(3);
  });

  it('switches selected state when selectedMode prop changes', () => {
    const { rerender, getAllByRole } = render(
      <ModeSelector {...defaultProps} selectedMode="photo" />
    );
    let tabs = getAllByRole('tab');
    expect(tabs[0].props.accessibilityState.selected).toBe(true);

    rerender(<ModeSelector {...defaultProps} selectedMode="portrait" />);
    tabs = getAllByRole('tab');
    expect(tabs[0].props.accessibilityState.selected).toBe(false);
    expect(tabs[3].props.accessibilityState.selected).toBe(true);
  });

  it('renders all modes as unselected when selectedMode is not any mode', () => {
    // @ts-ignore - testing edge case with invalid mode
    const { getAllByRole } = render(<ModeSelector {...defaultProps} selectedMode={null} />);
    const tabs = getAllByRole('tab');
    tabs.forEach((tab) => {
      expect(tab.props.accessibilityState.selected).toBe(false);
    });
  });
});
