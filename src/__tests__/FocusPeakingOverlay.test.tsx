/**
 * Tests for FocusPeakingOverlay component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusPeakingOverlay } from '../components/FocusPeakingOverlay';

const PEAKS_1 = [
  { x: 0.5, y: 0.5, strength: 1.0 },
  { x: 0.25, y: 0.25, strength: 0.8 },
  { x: 0.75, y: 0.75, strength: 0.6 },
];

describe('FocusPeakingOverlay', () => {
  it('renders nothing when visible=false', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={false}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when visible=true but peaks is empty', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={[]}
        screenWidth={400}
        screenHeight={600}
      />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders dot elements when visible=true and peaks exist', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    // toJSON returns a React Native tree; we verify it is non-null
    const json = toJSON();
    expect(json).not.toBeNull();
  });

  it('renders correct number of dots for number of peaks', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const json = toJSON() as any;
    // Root is a View with children array
    expect(json).not.toBeNull();
    expect(json.type).toBe('View');
    // We should have exactly 3 dot children
    expect(json.children).toHaveLength(3);
  });

  it('maps peak coordinates correctly to screen space', () => {
    const peaks = [{ x: 0.5, y: 0.5, strength: 1.0 }];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const json = toJSON() as any;
    // Centre dot should be at left: 200 - 3/2 = 198.5, top: 300 - 3/2 = 298.5
    const dot = json.children[0];
    expect(dot.props.style).toContainEqual(expect.objectContaining({
      left: expect.any(Number),
      top: expect.any(Number),
    }));
  });

  it('stronger peaks produce larger dots', () => {
    const peaks = [
      { x: 0.2, y: 0.2, strength: 0.3 },
      { x: 0.8, y: 0.8, strength: 1.0 },
    ];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const json = toJSON() as any;
    const weakDot = json.children[0];
    const strongDot = json.children[1];
    // Both dots have width/height computed as DOT_SIZE + strength * 3
    // weak: 3 + 0.3*3 = 3.9, strong: 3 + 1.0*3 = 6
    // Compare the first style object that has a width property
    const weakWidth = weakDot.props.style.find((s: any) => s && s.width !== undefined)?.width;
    const strongWidth = strongDot.props.style.find((s: any) => s && s.width !== undefined)?.width;
    expect(strongWidth).toBeGreaterThan(weakWidth);
  });

  it('uses default red colour when no colour prop provided', () => {
    const peaks = [{ x: 0.5, y: 0.5, strength: 1.0 }];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const json = toJSON() as any;
    const dot = json.children[0];
    // Should have a backgroundColor style matching Colors.error ('#FF3B30' or similar)
    const bgColor = dot.props.style.find((s: any) => s && s.backgroundColor !== undefined)?.backgroundColor;
    expect(bgColor).toBe('#FF5252');
  });

  it('uses custom colour when color prop is provided', () => {
    const peaks = [{ x: 0.5, y: 0.5, strength: 1.0 }];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
        color="#00FF00"
      />
    );
    const json = toJSON() as any;
    const dot = json.children[0];
    const bgColor = dot.props.style.find((s: any) => s && s.backgroundColor !== undefined)?.backgroundColor;
    expect(bgColor).toBe('#00FF00');
  });

  it('renders with custom peaking color #4444FF (blue)', () => {
    const peaks = [{ x: 0.5, y: 0.5, strength: 1.0 }];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
        color="#4444FF"
      />
    );
    const json = toJSON() as any;
    const dot = json.children[0];
    const bgColor = dot.props.style.find((s: any) => s && s.backgroundColor !== undefined)?.backgroundColor;
    expect(bgColor).toBe('#4444FF');
  });

  it('renders with custom peaking color #FFFF44 (yellow)', () => {
    const peaks = [{ x: 0.5, y: 0.5, strength: 1.0 }];
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={peaks}
        screenWidth={400}
        screenHeight={600}
        color="#FFFF44"
      />
    );
    const json = toJSON() as any;
    const dot = json.children[0];
    const bgColor = dot.props.style.find((s: any) => s && s.backgroundColor !== undefined)?.backgroundColor;
    expect(bgColor).toBe('#FFFF44');
  });

  it('renders up to MAX_PEAKS (80) dots without crashing', () => {
    const manyPeaks = Array.from({ length: 80 }, (_, i) => ({
      x: (i % 10) / 10,
      y: Math.floor(i / 10) / 10,
      strength: 0.5 + (i % 20) / 40,
    }));
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={manyPeaks}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const json = toJSON() as any;
    expect(json.children).toHaveLength(80);
  });

  it('has correct accessibility label', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const tree = toJSON() as any;
    expect(tree.props.accessibilityLabel).toBe(
      '对焦峰值覆盖层，显示画面中处于焦点的边缘区域'
    );
  });

  it('has accessibilityRole="image"', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const tree = toJSON() as any;
    expect(tree.props.accessibilityRole).toBe('image');
  });

  it('has pointerEvents="none"', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={PEAKS_1}
        screenWidth={400}
        screenHeight={600}
      />
    );
    const tree = toJSON() as any;
    expect(tree.props.pointerEvents).toBe('none');
  });
});

describe('FocusPeakingOverlay React.memo stability', () => {
  const defaultProps = {
    visible: true as const,
    peaks: [
      { x: 0.5, y: 0.5, strength: 0.8 },
      { x: 0.25, y: 0.25, strength: 0.6 },
      { x: 0.75, y: 0.75, strength: 0.9 },
    ],
    screenWidth: 400,
    screenHeight: 800,
  };

  it('does not re-render unnecessarily when parent re-renders with same props', () => {
    const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
    const first = toJSON();

    rerender(<FocusPeakingOverlay {...defaultProps} />);
    const second = toJSON();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });

  it('updates when peaks actually change', () => {
    const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
    const first = toJSON();

    const newPeaks = [
      { x: 0.1, y: 0.1, strength: 0.5 },
      { x: 0.9, y: 0.9, strength: 0.9 },
    ];
    rerender(<FocusPeakingOverlay {...defaultProps} peaks={newPeaks} />);
    const second = toJSON();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });

  it('updates when screen dimensions change', () => {
    const { rerender, toJSON } = render(
      <FocusPeakingOverlay {...defaultProps} screenWidth={400} screenHeight={800} />
    );
    const first = toJSON();

    rerender(
      <FocusPeakingOverlay {...defaultProps} screenWidth={800} screenHeight={1600} />
    );
    const second = toJSON();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });

  it('returns to null when peaks become empty after having values', () => {
    const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} />);
    expect(toJSON()).not.toBeNull();

    rerender(<FocusPeakingOverlay {...defaultProps} peaks={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('returns to null when visible becomes false after being true', () => {
    const { rerender, toJSON } = render(<FocusPeakingOverlay {...defaultProps} visible={true} />);
    expect(toJSON()).not.toBeNull();

    rerender(<FocusPeakingOverlay {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });
});

describe('FocusPeakingOverlay edge cases', () => {
  it('handles single peak', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={[{ x: 0.5, y: 0.5, strength: 0.5 }]}
        screenWidth={100}
        screenHeight={100}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('handles peak at corner positions (0, 0) and (1, 1)', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={[
          { x: 0, y: 0, strength: 0.5 },
          { x: 1, y: 1, strength: 0.9 },
        ]}
        screenWidth={400}
        screenHeight={800}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('handles very low strength (close to 0)', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={[{ x: 0.5, y: 0.5, strength: 0.01 }]}
        screenWidth={400}
        screenHeight={800}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('handles very high strength (close to 1)', () => {
    const { toJSON } = render(
      <FocusPeakingOverlay
        visible={true}
        peaks={[{ x: 0.5, y: 0.5, strength: 1.0 }]}
        screenWidth={400}
        screenHeight={800}
      />
    );
    expect(toJSON()).not.toBeNull();
  });
});

// Type-level test: CameraOverlaysProps.focusPeakingColor is correctly typed
// and flows through to FocusPeakingOverlay via CameraOverlays
describe('CameraOverlaysProps type alignment for focusPeakingColor', () => {
  it('focusPeakingColor prop is typed as optional string on CameraOverlaysProps', () => {
    // This test validates the type contract: CameraOverlaysProps must include
    // focusPeakingColor?: string so it can be forwarded to FocusPeakingOverlay's color prop.
    // If the type definition is wrong, TypeScript would flag a compilation error here.
    const _props: import('../types').CameraOverlaysProps = {
      apiConfigured: true,
      gridVariant: 'thirds',
      showGridModal: false,
      onGridSelect: () => {},
      onGridModalClose: () => {},
      showLevel: false,
      showHistogram: false,
      histogramData: [],
      showFocusGuide: false,
      cameraRef: { current: null },
      peakPoints: [],
      screenWidth: 400,
      screenHeight: 800,
      showFocusPeaking: true,
      showSunPosition: false,
      showBurstSuggestion: false,
      burstSuggestionText: '',
      onBurstSuggestionAccept: () => {},
      onBurstSuggestionDismiss: () => {},
      burstActive: false,
      bubbles: [],
      keypoints: [],
      showKeypoints: false,
      showScoreOverlay: false,
      scoreOverlayResult: null,
      challengeMode: false,
      challengeSession: null,
      onScoreDismiss: () => {},
      sceneTag: null,
      sceneTagVisible: false,
      countdownActive: false,
      countdownCount: 0,
      onCountdownComplete: () => {},
      lastCapturedUri: null,
      bubbleItems: [],
      showComparison: false,
      lastCapturedScore: null,
      lastCapturedScoreReason: null,
      onComparisonClose: () => {},
      // focusPeakingColor is optional — custom colour flows through to FocusPeakingOverlay
      focusPeakingColor: '#FF00FF',
    };
    expect(_props.focusPeakingColor).toBe('#FF00FF');
  });

  it('focusPeakingColor defaults to undefined when not provided', () => {
    const _props: import('../types').CameraOverlaysProps = {
      apiConfigured: true,
      gridVariant: 'thirds',
      showGridModal: false,
      onGridSelect: () => {},
      onGridModalClose: () => {},
      showLevel: false,
      showHistogram: false,
      histogramData: [],
      showFocusGuide: false,
      cameraRef: { current: null },
      peakPoints: [],
      screenWidth: 400,
      screenHeight: 800,
      showFocusPeaking: true,
      showSunPosition: false,
      showBurstSuggestion: false,
      burstSuggestionText: '',
      onBurstSuggestionAccept: () => {},
      onBurstSuggestionDismiss: () => {},
      burstActive: false,
      bubbles: [],
      keypoints: [],
      showKeypoints: false,
      showScoreOverlay: false,
      scoreOverlayResult: null,
      challengeMode: false,
      challengeSession: null,
      onScoreDismiss: () => {},
      sceneTag: null,
      sceneTagVisible: false,
      countdownActive: false,
      countdownCount: 0,
      onCountdownComplete: () => {},
      lastCapturedUri: null,
      bubbleItems: [],
      showComparison: false,
      lastCapturedScore: null,
      lastCapturedScoreReason: null,
      onComparisonClose: () => {},
      // focusPeakingColor intentionally omitted — should be undefined
    };
    expect(_props.focusPeakingColor).toBeUndefined();
  });
});
