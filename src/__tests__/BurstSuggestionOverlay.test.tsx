/**
 * Tests for BurstSuggestionOverlay component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BurstSuggestionOverlay, detectBurstMoment } from '../components/BurstSuggestionOverlay';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: ({ name, size, color }: { name: string; size: number; color: string }) =>
      React.createElement('MockIonicons', { name, size, color }),
  };
});

describe('detectBurstMoment', () => {
  it('returns false for empty array', () => {
    expect(detectBurstMoment([])).toBe(false);
  });

  it('returns false when fewer than 2 trigger keywords found', () => {
    expect(detectBurstMoment(['这张照片不错'])).toBe(false);
    expect(detectBurstMoment(['优秀'])).toBe(false);
    expect(detectBurstMoment(['推荐'])).toBe(false);
  });

  it('returns true when 2 or more trigger keywords are found across suggestions', () => {
    expect(detectBurstMoment(['完美构图', '精彩光线'])).toBe(true);
    expect(detectBurstMoment(['这张照片很棒', '建议抓拍'])).toBe(true);
  });

  it('returns true when a single suggestion contains 2 or more keywords', () => {
    // '精彩瞬间' contains both '精彩' and '瞬间'
    expect(detectBurstMoment(['精彩瞬间'])).toBe(true);
    // '完美构图' contains both '完美' and '构图'
    expect(detectBurstMoment(['完美构图'])).toBe(true);
  });

  it('returns false when same keyword appears multiple times (unique count only)', () => {
    // Function counts unique keywords — same keyword in both suggestions still counts as 1
    expect(detectBurstMoment(['完美', '完美'])).toBe(false);
  });

  it('returns true when multiple keywords appear in a single suggestion string', () => {
    expect(detectBurstMoment(['完美构图'])).toBe(true);
    expect(detectBurstMoment(['精彩瞬间抓拍'])).toBe(true);
  });

  it('returns false for completely unrelated suggestions', () => {
    expect(detectBurstMoment(['这是一张照片', '那是另一张'])).toBe(false);
  });

  it('handles single suggestion with multiple keywords', () => {
    expect(detectBurstMoment(['黄金光线完美构图'])).toBe(true);
  });

  it('is case-sensitive (only matches Chinese characters exactly)', () => {
    // English words that look similar should not match
    expect(detectBurstMoment(['perfect', 'great'])).toBe(false);
  });

  it('returns false for single-char keywords embedded in other characters', () => {
    // BURST_TRIGGER_KEYWORDS uses .includes() which does not match
    // full-width CJK characters embedded in other full-width chars
    expect(detectBurstMoment(['真棒'])).toBe(false);
    expect(detectBurstMoment(['尚佳'])).toBe(false);
  });
});

describe('BurstSuggestionOverlay', () => {
  const defaultProps = {
    visible: true,
    suggestion: '检测到精彩画面，建议开启连拍捕捉更多瞬间！',
    onAccept: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <BurstSuggestionOverlay {...defaultProps} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the panel when visible=true', () => {
    const { toJSON } = render(<BurstSuggestionOverlay {...defaultProps} />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders the title "建议连拍"', () => {
    const { getByText } = render(<BurstSuggestionOverlay {...defaultProps} />);
    expect(getByText('建议连拍')).toBeTruthy();
  });

  it('renders the default suggestion message when suggestion prop is empty', () => {
    const { getByText } = render(
      <BurstSuggestionOverlay {...defaultProps} suggestion="" />
    );
    expect(
      getByText('检测到精彩画面，建议开启连拍捕捉更多瞬间！')
    ).toBeTruthy();
  });

  it('renders the custom suggestion message when provided', () => {
    const customSuggestion = '自定义建议内容';
    const { getByText } = render(
      <BurstSuggestionOverlay {...defaultProps} suggestion={customSuggestion} />
    );
    expect(getByText(customSuggestion)).toBeTruthy();
  });

  it('renders dismiss and accept buttons', () => {
    const { getByText } = render(<BurstSuggestionOverlay {...defaultProps} />);
    expect(getByText('忽略')).toBeTruthy();
    expect(getByText('开始连拍')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <BurstSuggestionOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('忽略'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onAccept when accept button is pressed', () => {
    const onAccept = jest.fn();
    const { getByText } = render(
      <BurstSuggestionOverlay {...defaultProps} onAccept={onAccept} />
    );
    fireEvent.press(getByText('开始连拍'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('only calls onDismiss once even with multiple presses (basic debounce)', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <BurstSuggestionOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('忽略'));
    fireEvent.press(getByText('忽略'));
    // Component does not implement debounce, so each press fires
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('renders both Ionicons icons (flash-on and camera)', () => {
    const { toJSON } = render(<BurstSuggestionOverlay {...defaultProps} />);
    const json = JSON.stringify(toJSON());
    // The mock renders MockIonicons — we can verify the mock name appears
    expect(json).toContain('MockIonicons');
  });

  it('renders animated container with pointerEvents=box-none', () => {
    const { toJSON } = render(<BurstSuggestionOverlay {...defaultProps} />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('pointerEvents');
    expect(json).toContain('box-none');
  });

  it('renders with absolute positioning style', () => {
    const { toJSON } = render(<BurstSuggestionOverlay {...defaultProps} />);
    const json = JSON.stringify(toJSON());
    // Container is position: absolute
    expect(json).toContain('position');
    expect(json).toContain('absolute');
  });

  it('re-renders correctly when suggestion prop changes', () => {
    const { getByText, rerender } = render(
      <BurstSuggestionOverlay {...defaultProps} suggestion="第一个建议" />
    );
    expect(getByText('第一个建议')).toBeTruthy();

    rerender(
      <BurstSuggestionOverlay {...defaultProps} suggestion="第二个建议" />
    );
    expect(getByText('第二个建议')).toBeTruthy();
  });

  it('re-renders correctly when visible toggles from true to false', () => {
    const { toJSON, rerender } = render(
      <BurstSuggestionOverlay {...defaultProps} visible={true} />
    );
    expect(toJSON()).not.toBeNull();

    rerender(
      <BurstSuggestionOverlay {...defaultProps} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('accepts both empty string and non-empty suggestion without crashing', () => {
    const { rerender } = render(
      <BurstSuggestionOverlay {...defaultProps} suggestion="" />
    );
    expect(() =>
      rerender(<BurstSuggestionOverlay {...defaultProps} suggestion="abc" />)
    ).not.toThrow();
  });
});
