import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusZoneSelector } from '../components/FocusZoneSelector';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      cardBg: '#1a1a1a',
      border: '#333333',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#e8d5b7',
      modeSelectorBg: '#2a2a2a',
    },
  }),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) =>
      React.createElement('MockIonicons', { name, size, color }),
  };
});

describe('FocusZoneSelector', () => {
  const defaultProps = {
    visible: true,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false', () => {
    const { toJSON } = render(<FocusZoneSelector {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders modal panel when visible=true', () => {
    const { toJSON } = render(<FocusZoneSelector {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders title "选择对焦区域"', () => {
    const { getByText } = render(<FocusZoneSelector {...defaultProps} />);
    expect(getByText('选择对焦区域')).toBeTruthy();
  });

  it('renders all 3 focus zones (远景, 标准, 近拍)', () => {
    const { getByText } = render(<FocusZoneSelector {...defaultProps} />);
    expect(getByText('远景')).toBeTruthy();
    expect(getByText('标准')).toBeTruthy();
    expect(getByText('近拍')).toBeTruthy();
  });

  it('renders zone sub-labels', () => {
    const { getByText } = render(<FocusZoneSelector {...defaultProps} />);
    expect(getByText('∞')).toBeTruthy();
    expect(getByText('~3m')).toBeTruthy();
    expect(getByText('~0.5m')).toBeTruthy();
  });

  it('renders zone descriptions', () => {
    const { getByText } = render(<FocusZoneSelector {...defaultProps} />);
    expect(getByText('风景/建筑')).toBeTruthy();
    expect(getByText('人文/抓拍')).toBeTruthy();
    expect(getByText('微距/特写')).toBeTruthy();
  });

  it('renders cancel button', () => {
    const { getByText } = render(<FocusZoneSelector {...defaultProps} />);
    expect(getByText('取消')).toBeTruthy();
  });

  it('calls onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FocusZoneSelector {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByText('取消'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect with correct depth when 远景 is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <FocusZoneSelector {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('远景'));
    expect(onSelect).toHaveBeenCalledWith(0.95);
  });

  it('calls onSelect with correct depth when 标准 is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <FocusZoneSelector {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('标准'));
    expect(onSelect).toHaveBeenCalledWith(0.5);
  });

  it('calls onSelect with correct depth when 近拍 is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <FocusZoneSelector {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('近拍'));
    expect(onSelect).toHaveBeenCalledWith(0.1);
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <FocusZoneSelector {...defaultProps} onClose={onClose} />
    );
    fireEvent.press(getByTestId('focus-zone-backdrop'), {});
    expect(onClose).toHaveBeenCalled();
  });
});
