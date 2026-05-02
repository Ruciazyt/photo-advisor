/**
 * Tests for FocusPeakingPreview component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FocusPeakingPreview } from '../components/FocusPeakingPreview';

describe('FocusPeakingPreview', () => {
  it('renders with given color and sensitivity', () => {
    const { getByText } = render(
      <FocusPeakingPreview color="#FF4444" sensitivity="medium" />
    );
    expect(getByText('预览')).toBeTruthy();
    expect(getByText('#FF4444')).toBeTruthy();
    expect(getByText(/灵敏度/)).toBeTruthy();
  });

  it('shows correct sensitivity label for low', () => {
    const { getByText } = render(
      <FocusPeakingPreview color="#44FF44" sensitivity="low" />
    );
    expect(getByText(/灵敏度 低/)).toBeTruthy();
  });

  it('shows correct sensitivity label for high', () => {
    const { getByText } = render(
      <FocusPeakingPreview color="#4444FF" sensitivity="high" />
    );
    expect(getByText(/灵敏度 高/)).toBeTruthy();
  });

  it('renders a strip View with the correct background color', () => {
    const { toJSON } = render(
      <FocusPeakingPreview color="#FFFF44" sensitivity="medium" />
    );
    const json = toJSON();
    expect(json).toBeTruthy();
    // Find the strip by looking for a View with the color as backgroundColor
    const stripView = findStripView(json, '#FFFF44');
    expect(stripView).toBeTruthy();
  });

  it('renders the correct number of dots for low sensitivity (6)', () => {
    const { toJSON } = render(
      <FocusPeakingPreview color="#FF4444" sensitivity="low" />
    );
    const json = toJSON();
    const dotCount = countDots(json);
    expect(dotCount).toBe(6);
  });

  it('renders the correct number of dots for medium sensitivity (12)', () => {
    const { toJSON } = render(
      <FocusPeakingPreview color="#FF4444" sensitivity="medium" />
    );
    const json = toJSON();
    const dotCount = countDots(json);
    expect(dotCount).toBe(12);
  });

  it('renders the correct number of dots for high sensitivity (20)', () => {
    const { toJSON } = render(
      <FocusPeakingPreview color="#FF4444" sensitivity="high" />
    );
    const json = toJSON();
    const dotCount = countDots(json);
    expect(dotCount).toBe(20);
  });
});

// Helper: recursively find the strip View by background color
function findStripView(node: any, color: string): any {
  if (!node) return null;
  if (node.type === 'View' && node.props?.style) {
    const style = node.props.style;
    const arr = Array.isArray(style) ? style : [style];
    // Look for backgroundColor matching the prop color
    if (arr.some((s: any) => s?.backgroundColor === color)) {
      return node;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findStripView(child, color);
      if (found) return found;
    }
  }
  return null;
}

// Helper: recursively count dot Views (small circular border views)
function countDots(node: any): number {
  if (!node) return 0;
  if (node.type === 'View') {
    const style = node.props?.style;
    const s = Array.isArray(style) ? style : [style];
    // Dots have borderRadius: 3 and borderWidth: 1.5
    if (s.some((st: any) => st?.borderRadius === 3 && st?.borderWidth === 1.5)) {
      return 1;
    }
  }
  let count = 0;
  if (node.children) {
    for (const child of node.children) {
      count += countDots(child);
    }
  }
  return count;
}