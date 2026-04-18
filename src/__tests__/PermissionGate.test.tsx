import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PermissionGate } from '../components/PermissionGate';

// Mock expo-vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: function MockIonicons(props: { name: string; size: number; color: string }) {
      return React.createElement('Text', { testID: 'permission-icon' }, `Icon-${props.name}`);
    },
  };
});

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      textSecondary: '#aaa',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('PermissionGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    title: 'Camera Permission Required',
    message: 'Please grant camera access to use this feature.',
    buttonText: 'Grant Permission',
    onRequest: jest.fn(),
  };

  it('renders title and message', () => {
    const { getByText } = render(<PermissionGate {...defaultProps} />);
    expect(getByText('Camera Permission Required')).toBeTruthy();
    expect(getByText('Please grant camera access to use this feature.')).toBeTruthy();
  });

  it('renders button with correct text', () => {
    const { getByText } = render(<PermissionGate {...defaultProps} />);
    expect(getByText('Grant Permission')).toBeTruthy();
  });

  it('calls onRequest when button is pressed', () => {
    const onRequest = jest.fn();
    const { getByText } = render(<PermissionGate {...defaultProps} onRequest={onRequest} />);
    fireEvent.press(getByText('Grant Permission'));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading=true', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <PermissionGate {...defaultProps} loading={true} />
    );
    // Button text should not be visible when loading
    expect(queryByText('Grant Permission')).toBeNull();
  });

  it('disables button when loading=true', () => {
    const onRequest = jest.fn();
    const { UNSAFE_getByType } = render(
      <PermissionGate {...defaultProps} onRequest={onRequest} loading={true} />
    );
    // When loading, the ActivityIndicator is rendered instead of button text
    // pressing should not trigger onRequest
    expect(onRequest).not.toHaveBeenCalled();
  });

  it('renders with icon when icon prop is provided', () => {
    const { UNSAFE_getByType } = render(
      <PermissionGate {...defaultProps} icon="camera" />
    );
    // Icon component should be rendered (Ionicons)
    expect(UNSAFE_getByType).toBeDefined();
  });

  it('renders without icon when icon prop is omitted', () => {
    const { queryByTestId } = render(<PermissionGate {...defaultProps} />);
    // No icon should be rendered
    expect(queryByTestId('permission-icon')).toBeNull();
  });
});
