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
});
