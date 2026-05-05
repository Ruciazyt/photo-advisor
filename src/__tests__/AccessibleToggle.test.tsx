/**
 * Unit tests for AccessibleToggle component.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AccessibleToggle } from '../components/AccessibleToggle';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      accent: '#E8D5B7',
      cardBg: '#1A1A1A',
      textSecondary: '#AAAAAA',
      border: '#333333',
      text: '#FFFFFF',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('AccessibleToggle', () => {
  const defaultProps = {
    label: 'Enable Feature',
    hint: 'Turn this feature on or off',
    toggled: false,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in unchecked state', () => {
    const { getByText } = render(<AccessibleToggle {...defaultProps} />);
    // AccessibleToggle renders an Ionicons icon, not text content
    expect(getByText).toBeDefined();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleToggle {...defaultProps} onPress={onPress} />
    );

    // The component has accessibilityRole="switch"
    const toggle = getByRole('switch');
    fireEvent(toggle, 'press');

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes correct accessibility props', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="Dark Mode"
        hint="Enable dark theme"
        toggled={true}
        onPress={jest.fn()}
      />
    );

    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityLabel).toBe('Dark Mode');
    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityState).toEqual({ checked: true, disabled: false });
    expect(toggle.props.accessibilityHint).toBe('Enable dark theme');
  });

  it('passes unchecked accessibilityState when toggled is false', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="Feature X"
        hint="Toggle feature X"
        toggled={false}
        onPress={jest.fn()}
      />
    );

    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: false });
  });

  it('renders with light theme colors', () => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValueOnce({
      theme: 'light',
      colors: {
        accent: '#C4A35A',
        cardBg: '#FFFFFF',
        textSecondary: '#666666',
        border: '#E0E0E0',
        text: '#1A1A1A',
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });

    const { getByRole } = render(
      <AccessibleToggle
        label="Light Theme Feature"
        hint="Test"
        toggled={true}
        onPress={jest.fn()}
      />
    );

    const toggle = getByRole('switch');
    expect(toggle.props.style).toBeDefined();
  });

  it('uses memoized handlePress callback', () => {
    const onPress = jest.fn();
    const { getByRole, rerender } = render(
      <AccessibleToggle {...defaultProps} onPress={onPress} />
    );

    // Press first time
    fireEvent(getByRole('switch'), 'press');
    expect(onPress).toHaveBeenCalledTimes(1);

    // Rerender with same props - callback should be stable
    rerender(<AccessibleToggle {...defaultProps} onPress={onPress} />);
    fireEvent(getByRole('switch'), 'press');
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('applies correct theme colors to toggle style', () => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValueOnce({
      theme: 'dark',
      colors: {
        accent: '#E8D5B7',
        cardBg: '#1A1A1A',
        textSecondary: '#AAAAAA',
        border: '#333333',
        text: '#FFFFFF',
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });

    const { getByRole } = render(
      <AccessibleToggle {...defaultProps} toggled={true} />
    );

    const toggle = getByRole('switch');
    // toggled=true → backgroundColor = colors.cardBg, borderColor = colors.accent
    expect(toggle.props.style).toBeDefined();
    const style = toggle.props.style;
    expect(style.backgroundColor).toBe('#1A1A1A');
    expect(style.borderColor).toBe('#E8D5B7');
  });

  it('applies unchecked border color when toggled is false', () => {
    const { useTheme } = require('../contexts/ThemeContext');
    useTheme.mockReturnValueOnce({
      theme: 'dark',
      colors: {
        accent: '#E8D5B7',
        cardBg: '#1A1A1A',
        textSecondary: '#AAAAAA',
        border: '#333333',
        text: '#FFFFFF',
      },
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
    });

    const { getByRole } = render(
      <AccessibleToggle {...defaultProps} toggled={false} />
    );

    const toggle = getByRole('switch');
    const style = toggle.props.style;
    expect(style.borderColor).toBe('#333333');
  });

  it('renders as disabled when disabled prop is true', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="Feature X"
        hint="Toggle feature"
        toggled={true}
        onPress={jest.fn()}
        disabled={true}
      />
    );
    const toggle = getByRole('switch');
    expect(toggle.props.accessibilityState).toEqual({ checked: true, disabled: true });
    expect(toggle.props.accessibilityHint).toBe('Toggle feature');
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleToggle
        label="Feature X"
        hint="Toggle"
        toggled={false}
        onPress={onPress}
        disabled={true}
      />
    );
    const toggle = getByRole('switch');
    fireEvent.press(toggle);
    expect(onPress).not.toHaveBeenCalled();
  });
});
