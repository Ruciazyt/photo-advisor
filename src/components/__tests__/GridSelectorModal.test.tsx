/**
 * Unit tests for src/components/GridSelectorModal.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GridSelectorModal } from '../GridSelectorModal';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#000000',
      cardBg: '#1a1a1a',
      border: '#333333',
      text: '#ffffff',
      textSecondary: '#888888',
      accent: '#e8d5b7',
      background: '#000000',
    },
  }),
}));

// Mock useAccessibility hooks
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(() => ({
    accessibilityLabel: 'mock-label',
    accessibilityHint: 'mock-hint',
    accessibilityRole: 'button',
  })),
  useAccessibilityReducedMotion: () => ({ reducedMotion: false }),
}));

// Mock useHaptics
const mockLightImpact = jest.fn();
jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    lightImpact: mockLightImpact,
    mediumImpact: jest.fn(),
    heavyImpact: jest.fn(),
    triggerLevelHaptic: jest.fn(),
    successNotification: jest.fn(),
    warningNotification: jest.fn(),
    errorNotification: jest.fn(),
  }),
}));

describe('GridSelectorModal', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(
      <GridSelectorModal
        visible={false}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders title and all 5 labels when visible is true', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    expect(getByText('选择网格')).toBeTruthy();
    expect(getByText('三分法')).toBeTruthy();
    expect(getByText('黄金分割')).toBeTruthy();
    expect(getByText('对角线')).toBeTruthy();
    expect(getByText('螺旋线')).toBeTruthy();
    expect(getByText('关闭网格')).toBeTruthy();
  });

  it('calls onSelect("thirds") when 三分法 card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="golden"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('三分法'));
    expect(mockOnSelect).toHaveBeenCalledWith('thirds');
  });

  it('calls onSelect("golden") when 黄金分割 card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('黄金分割'));
    expect(mockOnSelect).toHaveBeenCalledWith('golden');
  });

  it('calls onSelect("diagonal") when 对角线 card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('对角线'));
    expect(mockOnSelect).toHaveBeenCalledWith('diagonal');
  });

  it('calls onSelect("spiral") when 螺旋线 card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('螺旋线'));
    expect(mockOnSelect).toHaveBeenCalledWith('spiral');
  });

  it('calls onSelect("none") when 关闭网格 card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('关闭网格'));
    expect(mockOnSelect).toHaveBeenCalledWith('none');
  });

  it('triggers lightImpact haptic when a card is tapped', () => {
    const { getByText } = render(
      <GridSelectorModal
        visible={true}
        selectedVariant="thirds"
        onSelect={mockOnSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(getByText('黄金分割'));
    expect(mockLightImpact).toHaveBeenCalled();
  });
});
