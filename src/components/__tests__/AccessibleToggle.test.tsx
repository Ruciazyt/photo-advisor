import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleToggle } from '../AccessibleToggle';

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
const mockColors = {
  accent: '#6B9AFF',
  cardBg: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.2)',
  textSecondary: 'rgba(255,255,255,0.6)',
};

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: mockColors }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIonicons({ name, size, color }: { name: string; size: number; color: string }) {
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AccessibleToggle', () => {
  it('renders correctly when toggled on', () => {
    const { toJSON } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={true}
        onPress={() => {}}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders correctly when toggled off', () => {
    const { toJSON } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={false}
        onPress={() => {}}
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={false}
        onPress={onPress}
      />
    );
    fireEvent.press(getByRole('switch'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole switch', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={false}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch')).toBeTruthy();
  });

  it('sets accessibilityState.checked based on toggled prop', () => {
    const { getByRole, rerender } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={false}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch').props.accessibilityState.checked).toBe(false);

    rerender(
      <AccessibleToggle
        label="语音反馈"
        toggled={true}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch').props.accessibilityState.checked).toBe(true);
  });

  it('uses default hint when toggled on', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={true}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch').props.accessibilityHint).toBe('关闭语音反馈');
  });

  it('uses default hint when toggled off', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={false}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch').props.accessibilityHint).toBe('打开语音反馈');
  });

  it('uses custom hint when provided', () => {
    const { getByRole } = render(
      <AccessibleToggle
        label="语音反馈"
        hint="自定义提示"
        toggled={false}
        onPress={() => {}}
      />
    );
    expect(getByRole('switch').props.accessibilityHint).toBe('自定义提示');
  });

  it('uses custom icon names when provided', () => {
    const { toJSON } = render(
      <AccessibleToggle
        label="语音反馈"
        toggled={true}
        onPress={() => {}}
        iconOn="volume-high"
        iconOff="volume-mute"
      />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('uses custom text when provided', () => {
    const { toJSON } = render(
      <AccessibleToggle
        label="主题"
        toggled={true}
        onPress={() => {}}
        textOn="浅色"
        textOff="深色"
      />
    );
    expect(toJSON()).not.toBeNull();
  });
});
