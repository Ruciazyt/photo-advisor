import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SunToggleButton } from '../../components/SunPositionOverlay';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

// ThemeContext — dark theme (default)
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      sunColor: '#FFB800',
      topBarBg: '#1A1A1A',
      topBarBorderInactive: 'rgba(255,255,255,0.1)',
      topBarTextSecondary: 'rgba(255,255,255,0.5)',
      sunToggleActiveBg: 'rgba(255,184,0,0.2)',
      sunToggleActiveBorder: '#FFB800',
    },
  })),
}));

// Ionicons mock
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: function MockIonicons({ name, size, color }: { name: string; size: number; color: string }) {
      return React.createElement(Text, { testID: `icon-${name}` }, `${name}(${size})`);
    },
  };
});

// useAccessibilityButton mock
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SunToggleButton', () => {
  let useTheme: jest.Mock;
  let useAccessibilityButton: jest.Mock;

  beforeEach(() => {
    useTheme = require('../../contexts/ThemeContext').useTheme;
    useAccessibilityButton = require('../../hooks/useAccessibility').useAccessibilityButton;
    useAccessibilityButton.mockClear();
    useAccessibilityButton.mockReturnValue({
      accessibilityLabel: '太阳位置',
      accessibilityRole: 'button',
      accessibilityHint: undefined,
      accessibilityState: { disabled: false },
    });
  });

  describe('rendering', () => {
    it('renders correctly with visible=false', () => {
      const onPress = jest.fn();
      const { getByText } = render(<SunToggleButton visible={false} onPress={onPress} />);
      expect(getByText('太阳')).toBeTruthy();
    });

    it('renders correctly with visible=true', () => {
      const onPress = jest.fn();
      const { getByText } = render(<SunToggleButton visible={true} onPress={onPress} />);
      expect(getByText('太阳')).toBeTruthy();
    });
  });

  describe('accessibility props', () => {
    it('passes accessibilityLabel "太阳位置" to useAccessibilityButton', () => {
      const onPress = jest.fn();
      render(<SunToggleButton visible={false} onPress={onPress} />);
      expect(useAccessibilityButton).toHaveBeenCalledWith(
        expect.objectContaining({ label: '太阳位置' })
      );
    });

    it('passes hint "打开太阳位置显示" when visible=false', () => {
      const onPress = jest.fn();
      render(<SunToggleButton visible={false} onPress={onPress} />);
      expect(useAccessibilityButton).toHaveBeenCalledWith(
        expect.objectContaining({ hint: '打开太阳位置显示' })
      );
    });

    it('passes hint "关闭太阳位置显示" when visible=true', () => {
      const onPress = jest.fn();
      render(<SunToggleButton visible={true} onPress={onPress} />);
      expect(useAccessibilityButton).toHaveBeenCalledWith(
        expect.objectContaining({ hint: '关闭太阳位置显示' })
      );
    });

    it('passes accessibilityRole "button" to useAccessibilityButton', () => {
      const onPress = jest.fn();
      render(<SunToggleButton visible={false} onPress={onPress} />);
      expect(useAccessibilityButton).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'button' })
      );
    });

    it('spreads a11y props from useAccessibilityButton onto TouchableOpacity', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={true} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityLabel).toBe('太阳位置');
      expect(button.props.accessibilityRole).toBe('button');
    });

    it('sets accessibilityState.selected=false when visible=false', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={false} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityState.selected).toBe(false);
    });

    it('sets accessibilityState.selected=true when visible=true', () => {
      const onPress = jest.fn();
      const { UNSAFE_root } = render(<SunToggleButton visible={true} onPress={onPress} />);
      const button = UNSAFE_root.findByProps({ accessibilityRole: 'button' });
      expect(button.props.accessibilityState.selected).toBe(true);
    });
  });

  describe('interaction', () => {
    it('calls onPress when the button is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<SunToggleButton visible={false} onPress={onPress} />);
      fireEvent.press(getByText('太阳'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});