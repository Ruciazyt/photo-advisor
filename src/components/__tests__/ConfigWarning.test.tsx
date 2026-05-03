import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfigWarning } from '../ConfigWarning';

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      accent: '#e8d5b7',
    },
  })),
}));

describe('ConfigWarning', () => {
  it('renders warning text when visible=true (default)', () => {
    const { getByText } = render(<ConfigWarning visible={true} />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('renders warning text when visible is not specified (defaults to true)', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('returns null and does not render when visible=false', () => {
    const { toJSON } = render(<ConfigWarning visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('uses theme accent color for text style', () => {
    const { toJSON } = render(<ConfigWarning />);
    const textProps = toJSON().children[0].props;
    // style is an array: [{ color: accent, fontSize: 13 }]
    const textStyle = textProps.style;
    expect(textStyle).toBeInstanceOf(Array);
    const colorObj = textStyle.find((s: any) => s.color !== undefined);
    expect(colorObj.color).toBe('#e8d5b7');
  });

  it('text content is "⚠️ 请先配置API"', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('container has correct static styles (backgroundColor, borderRadius, zIndex, etc.)', () => {
    const { toJSON } = render(<ConfigWarning />);
    const containerStyle = toJSON().props.style;
    expect(containerStyle.backgroundColor).toBe('rgba(0,0,0,0.6)');
    expect(containerStyle.borderRadius).toBe(20);
    expect(containerStyle.zIndex).toBe(10);
    expect(containerStyle.alignSelf).toBe('center');
    expect(containerStyle.marginTop).toBe(60);
    expect(containerStyle.paddingHorizontal).toBe(16);
    expect(containerStyle.paddingVertical).toBe(8);
  });

  it('Text has accessibilityLabel set', () => {
    const { toJSON } = render(<ConfigWarning />);
    const textProps = toJSON().children[0].props;
    expect(textProps.accessibilityLabel).toBe('⚠️ 请先配置API');
  });
});