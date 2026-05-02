/**
 * Tests for BubbleOverlay onBubbleAppear callback
 */

import React from 'react';

jest.mock('react-native-reanimated');
jest.mock('react-native-worklets');
import { render, fireEvent, act } from '@testing-library/react-native';
import { BubbleOverlay } from '../components/BubbleOverlay';
import { BubbleItem } from '../components/BubbleOverlay';

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

describe('BubbleOverlay onBubbleAppear', () => {
  const defaultProps = {
    visibleItems: [] as BubbleItem[],
    loading: false,
    onDismiss: jest.fn(),
    onDismissAll: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls onBubbleAppear with bubble text when bubble becomes visible', () => {
    const onBubbleAppear = jest.fn();
    const visibleItems = [makeItem({ id: 1, text: '构图偏右，建议左移' })];

    render(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={visibleItems}
        onBubbleAppear={onBubbleAppear}
      />
    );

    expect(onBubbleAppear).toHaveBeenCalledTimes(1);
    expect(onBubbleAppear).toHaveBeenCalledWith('构图偏右，建议左移');
  });

  it('calls onBubbleAppear once per bubble (not on re-renders)', () => {
    const onBubbleAppear = jest.fn();
    const item = makeItem({ id: 1, text: '测试文本' });
    const visibleItems = [item];

    const { rerender } = render(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={visibleItems}
        onBubbleAppear={onBubbleAppear}
      />
    );

    // Re-render with same items — should NOT call onBubbleAppear again
    rerender(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={visibleItems}
        onBubbleAppear={onBubbleAppear}
      />
    );

    expect(onBubbleAppear).toHaveBeenCalledTimes(1);
  });

  it('calls onBubbleAppear for each bubble when multiple bubbles appear', () => {
    const onBubbleAppear = jest.fn();
    const visibleItems = [
      makeItem({ id: 1, text: '第一条提示' }),
      makeItem({ id: 2, text: '第二条提示' }),
      makeItem({ id: 3, text: '第三条提示' }),
    ];

    render(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={visibleItems}
        onBubbleAppear={onBubbleAppear}
      />
    );

    expect(onBubbleAppear).toHaveBeenCalledTimes(3);
    expect(onBubbleAppear).toHaveBeenCalledWith('第一条提示');
    expect(onBubbleAppear).toHaveBeenCalledWith('第二条提示');
    expect(onBubbleAppear).toHaveBeenCalledWith('第三条提示');
  });

  it('does not throw when onBubbleAppear is not provided', () => {
    const visibleItems = [makeItem({ id: 1, text: '无回调测试' })];

    // Should not throw
    expect(() => {
      render(<BubbleOverlay {...defaultProps} visibleItems={visibleItems} />);
    }).not.toThrow();
  });

  it('does not call onBubbleAppear for hidden overlay', () => {
    const onBubbleAppear = jest.fn();
    const visibleItems = [makeItem({ id: 1, text: '不应该出现' })];

    render(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={visibleItems}
        onBubbleAppear={onBubbleAppear}
        hidden={true}
      />
    );

    expect(onBubbleAppear).not.toHaveBeenCalled();
  });

  it('does not call onBubbleAppear when only loading indicator is shown', () => {
    const onBubbleAppear = jest.fn();

    render(
      <BubbleOverlay
        {...defaultProps}
        visibleItems={[]}
        loading={true}
        onBubbleAppear={onBubbleAppear}
      />
    );

    expect(onBubbleAppear).not.toHaveBeenCalled();
  });
});
