/**
 * Tests for src/components/ModeSelector.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ModeSelector } from '../ModeSelector';
import type { CameraMode } from '../types';

const mockColors = {
  accent: '#E8D5B7',
  primary: '#000000',
  modeSelectorBg: 'rgba(0,0,0,0.4)',
  modeSelectorUnselected: 'rgba(255,255,255,0.7)',
};
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: mockColors }),
}));

jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: ({ label, hint, role }: { label: string; hint: string; role: string }) => ({
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: role,
  }),
}));

const defaultProps = {
  selectedMode: 'photo' as CameraMode,
  onModeChange: jest.fn(),
};

describe('ModeSelector — component isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all four mode buttons', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} />);
    expect(getByText('拍照')).toBeTruthy();
    expect(getByText('扫码')).toBeTruthy();
    expect(getByText('视频')).toBeTruthy();
    expect(getByText('人像')).toBeTruthy();
  });

  it('calls onModeChange with correct mode when a mode button is pressed', () => {
    const onModeChange = jest.fn();
    const { getByText } = render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);
    fireEvent.press(getByText('视频'));
    expect(onModeChange).toHaveBeenCalledWith('video');
  });

  it('renders correctly with video mode selected', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} selectedMode="video" />);
    expect(getByText('视频')).toBeTruthy();
  });

  it('renders correctly with scan mode selected', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} selectedMode="scan" />);
    expect(getByText('扫码')).toBeTruthy();
  });

  it('renders correctly with portrait mode selected', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} selectedMode="portrait" />);
    expect(getByText('人像')).toBeTruthy();
  });

  it('renders with photo mode selected (default)', () => {
    const { getByText } = render(<ModeSelector {...defaultProps} />);
    expect(getByText('拍照')).toBeTruthy();
  });

  it('calls onModeChange for each non-default mode', () => {
    const onModeChange = jest.fn();
    const { getByText } = render(<ModeSelector {...defaultProps} onModeChange={onModeChange} />);
    fireEvent.press(getByText('扫码'));
    expect(onModeChange).toHaveBeenCalledWith('scan');
    fireEvent.press(getByText('人像'));
    expect(onModeChange).toHaveBeenCalledWith('portrait');
    fireEvent.press(getByText('拍照'));
    expect(onModeChange).toHaveBeenCalledWith('photo');
  });
});
