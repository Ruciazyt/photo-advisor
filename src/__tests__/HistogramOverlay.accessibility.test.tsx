/**
 * Accessibility tests for HistogramOverlay component.
 * Verifies screen reader announcements and dynamic accessibilityLabel.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { HistogramOverlay } from '../components/HistogramOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// Spy on useAccessibilityAnnouncement — track calls without changing behaviour
const mockAnnounce = jest.fn();
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: () => ({
    announce: mockAnnounce,
    isScreenReaderEnabled: true,
  }),
  useAccessibilityReducedMotion: () => ({ reducedMotion: false }),
  useAccessibilityButton: jest.fn(),
}));

// ThemeContext mock (required by HistogramOverlay)
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    colors: {
      text: '#FFFFFF',
      textSecondary: '#888888',
      histogramBg: 'rgba(0,0,0,0.85)',
      histogramBorder: '#333333',
      histogramUnder: '#FF4444',
      histogramOver: '#FF8800',
      histogramBalanced: '#44FF44',
    },
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// toJSON helper to find the accessibility root node (accessibilityRole="image")
function findA11yRoot(json: any): any {
  if (!json) return null;
  if (json.props?.accessibilityRole === 'image') return json;
  if (Array.isArray(json)) return json.map(findA11yRoot).find((r) => r !== null);
  if (json.children) {
    for (const child of json.children) {
      const found = findA11yRoot(child);
      if (found) return found;
    }
  }
  return null;
}

function makeUnderexposedHistogram(): number[] {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < 32; i++) hist[i] = 1000;  // dark: 32000
  for (let i = 32; i < 208; i++) hist[i] = 1;   // mid: 176
  for (let i = 208; i < 256; i++) hist[i] = 0;  // bright: 0
  return hist;
}

function makeOverexposedHistogram(): number[] {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < 32; i++) hist[i] = 0;    // dark: 0
  for (let i = 32; i < 208; i++) hist[i] = 1;  // mid: 176
  for (let i = 208; i < 256; i++) hist[i] = 1000; // bright: 32000
  return hist;
}

function makeBalancedHistogram(): number[] {
  return new Array(256).fill(10);
}

// ---------------------------------------------------------------------------
// Tests — screen reader announcements
// ---------------------------------------------------------------------------

describe('HistogramOverlay accessibility — announcements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('announces "欠曝" warning when histogram is underexposed', () => {
    render(<HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={true} />);
    expect(mockAnnounce).toHaveBeenCalledWith(
      '直方图警告：欠曝，画面偏暗，建议增加曝光',
      'assertive'
    );
  });

  it('announces "过曝" warning when histogram is overexposed', () => {
    render(<HistogramOverlay histogramData={makeOverexposedHistogram()} visible={true} />);
    expect(mockAnnounce).toHaveBeenCalledWith(
      '直方图警告：过曝，画面高光溢出，建议降低曝光',
      'assertive'
    );
  });

  it('announces "直方图曝光正常" when histogram is balanced', () => {
    render(<HistogramOverlay histogramData={makeBalancedHistogram()} visible={true} />);
    expect(mockAnnounce).toHaveBeenCalledWith('直方图曝光正常', 'polite');
  });

  it('does not announce when visible=false', () => {
    render(<HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={false} />);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('announces only once per mount cycle (uses announcedRef)', () => {
    const { rerender } = render(
      <HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={true} />
    );
    expect(mockAnnounce).toHaveBeenCalledTimes(1);

    // Re-render with same props — should NOT announce again
    jest.clearAllMocks();
    rerender(<HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={true} />);
    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('re-announces after toggling visible off and on', () => {
    const { rerender } = render(
      <HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={true} />
    );
    expect(mockAnnounce).toHaveBeenCalledTimes(1);

    // Hide
    rerender(<HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={false} />);

    // Show again — should re-announce
    rerender(<HistogramOverlay histogramData={makeUnderexposedHistogram()} visible={true} />);
    expect(mockAnnounce).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Tests — dynamic accessibilityLabel
// ---------------------------------------------------------------------------

describe('HistogramOverlay accessibility — accessibilityLabel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets accessibilityLabel to "欠曝警告" when underexposed', () => {
    const hist = makeUnderexposedHistogram();
    const { toJSON } = render(<HistogramOverlay histogramData={hist} visible={true} />);
    const root = findA11yRoot(toJSON());
    expect(root.props.accessibilityLabel).toBe('直方图曝光分析：欠曝警告');
  });

  it('sets accessibilityLabel to "过曝警告" when overexposed', () => {
    const hist = makeOverexposedHistogram();
    const { toJSON } = render(<HistogramOverlay histogramData={hist} visible={true} />);
    const root = findA11yRoot(toJSON());
    expect(root.props.accessibilityLabel).toBe('直方图曝光分析：过曝警告');
  });

  it('sets accessibilityLabel to "曝光正常" when balanced', () => {
    const hist = makeBalancedHistogram();
    const { toJSON } = render(<HistogramOverlay histogramData={hist} visible={true} />);
    const root = findA11yRoot(toJSON());
    expect(root.props.accessibilityLabel).toBe('直方图曝光分析：曝光正常');
  });

  // Note: "欠曝和过曝同时检测到" requires dark ratio >55% AND bright ratio >55% simultaneously,
  // which is mathematically impossible (if dark>55%, bright<45%). The component logic is correct;
  // this test documents that the "both" label path is unreachable under normal conditions.
  it('sets accessibilityLabel to "过曝警告" when only bright ratio exceeds threshold', () => {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < 32; i++) hist[i] = 1;
    for (let i = 32; i < 208; i++) hist[i] = 1;
    for (let i = 208; i < 256; i++) hist[i] = 1000;
    const { toJSON } = render(<HistogramOverlay histogramData={hist} visible={true} />);
    const root = findA11yRoot(toJSON());
    expect(root.props.accessibilityLabel).toBe('直方图曝光分析：过曝警告');
  });
});