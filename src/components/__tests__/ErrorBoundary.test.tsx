/**
 * Tests for ErrorBoundary component
 */

import React, { Component, ReactNode } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock the logger to prevent console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    for: jest.fn(() => ({
      error: jest.fn(),
    })),
  },
}));

// Mock ThemeContext for ErrorFallback which uses useTheme
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      background: '#000000',
      text: '#ffffff',
      textSecondary: '#888888',
      error: '#ef4444',
      accent: '#e8d5b7',
    },
  })),
}));

// Simple functional child that throws based on prop
function ThrowChild({ shouldThrow, children }: { shouldThrow?: boolean; children?: ReactNode }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <>{children}</>;
}

// Simple normal child for non-error tests
function NormalChild({ text }: { text: string }) {
  return <>{text}</>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('rendering children', () => {
    it('renders children when no error occurs', () => {
      const { toJSON } = render(
        <ErrorBoundary>
          <NormalChild text="Hello World" />
        </ErrorBoundary>
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Hello World');
    });

    it('renders null when no children provided', () => {
      const { toJSON } = render(<ErrorBoundary />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('error fallback UI', () => {
    it('shows fallback UI when child throws', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowChild shouldThrow>Content</ThrowChild>
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });

    it('shows retry button in fallback', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowChild shouldThrow>Content</ThrowChild>
        </ErrorBoundary>
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('shows warning icon in fallback', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowChild shouldThrow>Content</ThrowChild>
        </ErrorBoundary>
      );

      expect(getByText('⚠️')).toBeTruthy();
    });

    it('retry button is pressable', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowChild shouldThrow>Content</ThrowChild>
        </ErrorBoundary>
      );

      const button = getByText('Retry');
      expect(() => fireEvent.press(button)).not.toThrow();
    });
  });

  describe('retry functionality', () => {
    it('retry button triggers error reset mechanism', () => {
      // When retry is pressed, the error boundary's setState is called
      // to reset hasError to false. If the child still throws,
      // the error boundary catches again and shows fallback.
      const { getByText } = render(
        <ErrorBoundary>
          <ThrowChild shouldThrow={true}>Content</ThrowChild>
        </ErrorBoundary>
      );

      // Fallback shown initially
      expect(getByText('Something went wrong')).toBeTruthy();

      // Press retry
      fireEvent.press(getByText('Retry'));

      // Since shouldThrow is still true, error boundary catches again
      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });

  describe('component class structure', () => {
    it('ErrorBoundary is a class component', () => {
      expect(ErrorBoundary.prototype).toBeInstanceOf(Component);
    });

    it('has getDerivedStateFromError static method', () => {
      const cb = ErrorBoundary as any;
      expect(typeof cb.getDerivedStateFromError).toBe('function');
    });
  });
});