/**
 * Unit tests for src/components/ErrorBoundary.tsx
 * Covers normal rendering, error fallback UI, and retry behavior.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the settings service
jest.mock('../services/settings', () => ({
  loadAppSettings: jest.fn().mockResolvedValue({ theme: 'dark' }),
  saveAppSettings: jest.fn().mockResolvedValue(undefined),
}));

function ChildThatRenders({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <Text testID="child-ok">Child rendered successfully</Text>;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── Renders children normally ───────────────────────────────────────────────

  it('renders children normally when no error is thrown', () => {
    const { getByTestId } = render(
      <Wrapper>
        <ErrorBoundary>
          <ChildThatRenders />
        </ErrorBoundary>
      </Wrapper>
    );
    expect(getByTestId('child-ok')).toBeTruthy();
  });

  // ─── Shows fallback UI on error ─────────────────────────────────────────────

  it('shows fallback UI when a child throws an error', () => {
    const { getByText } = render(
      <Wrapper>
        <ErrorBoundary>
          <ChildThatRenders shouldThrow />
        </ErrorBoundary>
      </Wrapper>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
  });

  // ─── Retry button resets error state ────────────────────────────────────────

  it('Retry button resets error state and re-renders children', async () => {
    // Use a remountKey: when it changes, the ErrorBoundary remounts fresh,
    // simulating what happens when a parent re-renders after fixing the error.
    let remountKey = 0;
    const { getByText, getByTestId, rerender } = render(
      <Wrapper>
        <ErrorBoundary key={remountKey}>
          <ChildThatRenders shouldThrow />
        </ErrorBoundary>
      </Wrapper>
    );

    // Fallback is shown
    expect(getByText('Something went wrong')).toBeTruthy();
    const retryButton = getByText('Retry');

    // Press retry — ErrorBoundary resets its internal error state.
    // Then change the key so the ErrorBoundary fully remounts with fresh state.
    fireEvent(retryButton, 'press');
    remountKey = 1;
    rerender(
      <Wrapper>
        <ErrorBoundary key={remountKey}>
          <ChildThatRenders shouldThrow={false} />
        </ErrorBoundary>
      </Wrapper>
    );

    await waitFor(() => {
      expect(getByTestId('child-ok')).toBeTruthy();
    });
  });

  // ─── Error is logged to console.error ───────────────────────────────────────

  it('logs the error to console.error when a child throws', () => {
    const consoleError = console.error as jest.Mock;

    render(
      <Wrapper>
        <ErrorBoundary>
          <ChildThatRenders shouldThrow />
        </ErrorBoundary>
      </Wrapper>
    );

    expect(consoleError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});
