/**
 * Tests for GridSelectorModal component (migrated to react-native-reanimated v4)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GridSelectorModal } from '../components/GridSelectorModal';
import type { GridVariant } from '../types';

// Mock Reanimated v4 (local mock avoids native worklets initialization error)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('GridSelectorModal', () => {
  const defaultProps = {
    visible: false,
    selectedVariant: 'thirds' as GridVariant,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(<GridSelectorModal {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders the modal when visible is true', () => {
    const { getByText } = render(<GridSelectorModal {...defaultProps} visible={true} />);
    expect(getByText('选择网格')).toBeTruthy();
  });

  it('renders all five grid options', () => {
    const { getByText } = render(<GridSelectorModal {...defaultProps} visible={true} />);
    expect(getByText('三分法')).toBeTruthy();
    expect(getByText('黄金分割')).toBeTruthy();
    expect(getByText('对角线')).toBeTruthy();
    expect(getByText('螺旋线')).toBeTruthy();
    expect(getByText('关闭网格')).toBeTruthy();
  });

  it('calls onSelect with "thirds" when thirds card is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('三分法'));
    expect(onSelect).toHaveBeenCalledWith('thirds');
  });

  it('calls onSelect with "golden" when golden card is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('黄金分割'));
    expect(onSelect).toHaveBeenCalledWith('golden');
  });

  it('calls onSelect with "diagonal" when diagonal card is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('对角线'));
    expect(onSelect).toHaveBeenCalledWith('diagonal');
  });

  it('calls onSelect with "spiral" when spiral card is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('螺旋线'));
    expect(onSelect).toHaveBeenCalledWith('spiral');
  });

  it('calls onSelect with "none" when close card is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('关闭网格'));
    expect(onSelect).toHaveBeenCalledWith('none');
  });

  it('calls onSelect only once per tap', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('三分法'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('highlights the selected variant card', () => {
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} selectedVariant="golden" />
    );
    expect(getByText('黄金分割')).toBeTruthy();
  });
});
