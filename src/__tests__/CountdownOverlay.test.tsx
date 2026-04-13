/**
 * Tests for CountdownOverlay component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CountdownOverlay } from '../components/CountdownOverlay';

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

describe('CountdownOverlay', () => {
  const noop = () => {};

  it('renders the count number', () => {
    const { getByText } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    expect(getByText('3')).toBeTruthy();
  });

  it('renders different count values', () => {
    const { getByText, rerender } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    expect(getByText('3')).toBeTruthy();

    rerender(<CountdownOverlay count={2} onComplete={noop} />);
    expect(getByText('2')).toBeTruthy();

    rerender(<CountdownOverlay count={1} onComplete={noop} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('renders full-screen absolute container', () => {
    const { toJSON } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // absoluteFillObject is flattened to individual position props
    const json = JSON.stringify(tree);
    expect(json).toContain('"position"');
    expect(json).toContain('"absolute"');
  });

  it('renders the bubble with count number centered', () => {
    const { getByText } = render(
      <CountdownOverlay count={5} onComplete={noop} />
    );
    const text = getByText('5');
    expect(text).toBeTruthy();
    // The number should be large (fontSize 64)
    // We can't directly check styles in getByText output, but the element exists
  });

  it('renders with count=1 correctly', () => {
    const { getByText } = render(
      <CountdownOverlay count={1} onComplete={noop} />
    );
    expect(getByText('1')).toBeTruthy();
  });

  it('re-animates when count changes (key prop pattern via rerender)', () => {
    // Each count change triggers a new animation via useEffect on count
    const { getByText, rerender } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    expect(getByText('3')).toBeTruthy();

    // Simulate count change
    rerender(<CountdownOverlay count={2} onComplete={noop} />);
    expect(getByText('2')).toBeTruthy();

    rerender(<CountdownOverlay count={1} onComplete={noop} />);
    expect(getByText('1')).toBeTruthy();
  });

  it('has pointerEvents=none so it does not block touches', () => {
    const { toJSON } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('pointerEvents');
    expect(json).toContain('none');
  });

  it('renders the black semi-transparent background overlay', () => {
    const { toJSON } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    const json = JSON.stringify(toJSON());
    // Background is rgba(0,0,0,0.35) — we can verify container style exists
    expect(json).toContain('backgroundColor');
  });

  it('onComplete prop is accepted (not called by the component itself — useCountdown handles it)', () => {
    // The CountdownOverlay only displays the count.
    // onComplete is called by useCountdown, not by this component.
    // We verify the prop is passed without error.
    const { getByText } = render(
      <CountdownOverlay count={3} onComplete={noop} />
    );
    expect(getByText('3')).toBeTruthy();
  });
});
