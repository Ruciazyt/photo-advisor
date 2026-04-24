import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleToggle } from '../AccessibleToggle';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      accent: '#e8d5b7',
      textSecondary: '#aaa',
      cardBg: '#111',
      border: '#333',
    },
  })),
}));

describe('AccessibleToggle', () => {
  it('renders without crashing', () => {
    const { root } = render(
      <AccessibleToggle label="语音反馈" hint="关闭语音反馈" toggled={false} onPress={() => {}} />
    );
    expect(root).toBeTruthy();
  });

  it('renders the TouchableOpacity with correct accessibility props', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="语音反馈" hint="关闭语音反馈" toggled={false} onPress={() => {}} />
    );
    const toggle = getByLabelText('语音反馈');
    expect(toggle.props.accessibilityRole).toBe('switch');
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    expect(toggle.props.accessibilityHint).toBe('关闭语音反馈');
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <AccessibleToggle label="水平仪" hint="打开水平仪" toggled={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText('水平仪'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('onPress is called exactly once per press', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <AccessibleToggle label="水平仪" hint="打开水平仪" toggled={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText('水平仪'));
    fireEvent.press(getByLabelText('水平仪'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('has correct accessibilityRole=switch', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="深色模式" hint="切换深色模式" toggled={false} onPress={() => {}} />
    );
    expect(getByLabelText('深色模式').props.accessibilityRole).toBe('switch');
  });

  it('passes label as accessibilityLabel', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="直方图" hint="打开直方图" toggled={false} onPress={() => {}} />
    );
    expect(getByLabelText('直方图')).toBeTruthy();
  });

  it('passes hint as accessibilityHint', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="对焦峰值" hint="关闭对焦峰值" toggled={true} onPress={() => {}} />
    );
    const toggle = getByLabelText('对焦峰值');
    expect(toggle.props.accessibilityHint).toBe('关闭对焦峰值');
  });

  it('toggled=true sets accessibilityState.checked=true', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="太阳位置" hint="关闭太阳位置" toggled={true} onPress={() => {}} />
    );
    expect(getByLabelText('太阳位置').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('toggled=false sets accessibilityState.checked=false', () => {
    const { getByLabelText } = render(
      <AccessibleToggle label="太阳位置" hint="打开太阳位置" toggled={false} onPress={() => {}} />
    );
    expect(getByLabelText('太阳位置').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('label and toggled state are accessible in the same render', () => {
    const { getByLabelText, rerender } = render(
      <AccessibleToggle label="语音反馈" hint="关闭语音反馈" toggled={false} onPress={() => {}} />
    );
    expect(getByLabelText('语音反馈').props.accessibilityState).toMatchObject({ checked: false });

    rerender(
      <AccessibleToggle label="语音反馈" hint="打开语音反馈" toggled={true} onPress={() => {}} />
    );
    expect(getByLabelText('语音反馈').props.accessibilityState).toMatchObject({ checked: true });
    expect(getByLabelText('语音反馈').props.accessibilityHint).toBe('打开语音反馈');
  });

  it('multiple presses all trigger onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <AccessibleToggle label="测试" hint="测试提示" toggled={false} onPress={onPress} />
    );
    fireEvent.press(getByLabelText('测试'));
    fireEvent.press(getByLabelText('测试'));
    fireEvent.press(getByLabelText('测试'));
    expect(onPress).toHaveBeenCalledTimes(3);
  });
});
