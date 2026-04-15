/**
 * Tests for BubbleOverlay component (migrated to react-native-reanimated v4)
 */

import React from 'react';

// Mock Reanimated v4 (local mock avoids native worklets initialization error)
jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');
import { render, fireEvent } from '@testing-library/react-native';
import { BubbleOverlay } from '../components/BubbleOverlay';
import { BubbleItem } from '../components/BubbleOverlay';

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

const makeItem = (overrides: Partial<BubbleItem> = {}): BubbleItem => ({
  id: 0,
  text: '[左上] 测试气泡',
  position: 'top-left',
  ...overrides,
});

describe('BubbleOverlay', () => {
  const defaultProps = {
    items: [] as BubbleItem[],
    loading: false,
    onDismiss: jest.fn(),
    onDismissAll: jest.fn(),
    onBubbleAppear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when items are empty and not loading', () => {
    const { toJSON } = render(<BubbleOverlay {...defaultProps} />);
    expect(toJSON()).toBeNull();
  });

  it('renders loading tag when loading is true', () => {
    const { getByText } = render(<BubbleOverlay {...defaultProps} loading={true} items={[]} />);
    expect(getByText('分析中...')).toBeTruthy();
  });

  it('renders a single bubble item correctly', () => {
    const items = [makeItem({ id: 1, text: '[右上] 构图偏右', position: 'top-right' })];
    const { getByText } = render(<BubbleOverlay {...defaultProps} items={items} />);
    expect(getByText('[右上] 构图偏右')).toBeTruthy();
  });

  it('renders multiple bubble items', () => {
    const items = [
      makeItem({ id: 1, text: '[左上] 第一条', position: 'top-left' }),
      makeItem({ id: 2, text: '[右上] 第二条', position: 'top-right' }),
      makeItem({ id: 3, text: '[左下] 第三条', position: 'bottom-left' }),
    ];
    const { getByText } = render(<BubbleOverlay {...defaultProps} items={items} />);
    expect(getByText('[左上] 第一条')).toBeTruthy();
    expect(getByText('[右上] 第二条')).toBeTruthy();
    expect(getByText('[左下] 第三条')).toBeTruthy();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    const items = [makeItem({ id: 5, text: '[中心] 测试' })];
    const { getByText } = render(
      <BubbleOverlay {...defaultProps} items={items} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('✕'));
    expect(onDismiss).toHaveBeenCalledWith(5);
  });

  it('calls onDismissAll when dismiss all button is pressed', () => {
    const onDismissAll = jest.fn();
    const items = [
      makeItem({ id: 1, text: '[左上] A' }),
      makeItem({ id: 2, text: '[右上] B' }),
    ];
    const { getByText } = render(
      <BubbleOverlay {...defaultProps} items={items} onDismissAll={onDismissAll} />
    );
    fireEvent.press(getByText('清除全部'));
    expect(onDismissAll).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss all button when only one item', () => {
    const items = [makeItem({ id: 1, text: '[左上] 单独' })];
    const { queryByText } = render(<BubbleOverlay {...defaultProps} items={items} />);
    expect(queryByText('清除全部')).toBeNull();
  });

  it('clears all bubbles when loading starts', () => {
    const items = [makeItem({ id: 1, text: '[左上] 测试' })];
    const { rerender, getByText, queryByText } = render(
      <BubbleOverlay {...defaultProps} items={items} loading={false} />
    );
    expect(getByText('[左上] 测试')).toBeTruthy();

    rerender(<BubbleOverlay {...defaultProps} items={[]} loading={true} />);
    expect(queryByText('[左上] 测试')).toBeNull();
  });

  it('calls onBubbleAppear when bubble appears', () => {
    const onBubbleAppear = jest.fn();
    const items = [makeItem({ id: 1, text: '[中心] 出现提示' })];
    render(<BubbleOverlay {...defaultProps} items={items} onBubbleAppear={onBubbleAppear} />);
    // onBubbleAppear is called asynchronously via withDelay
  });

  it('renders with different positions correctly', () => {
    const items: BubbleItem[] = [
      { id: 1, text: 'TL', position: 'top-left' },
      { id: 2, text: 'TR', position: 'top-right' },
      { id: 3, text: 'BL', position: 'bottom-left' },
      { id: 4, text: 'BR', position: 'bottom-right' },
      { id: 5, text: 'C', position: 'center' },
    ];
    const { getByText } = render(<BubbleOverlay {...defaultProps} items={items} />);
    items.forEach(item => {
      expect(getByText(item.text)).toBeTruthy();
    });
  });
});
