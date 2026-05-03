import React from 'react';
import { View, Text } from 'react-native';
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
    const { getByText } = render(<ConfigWarning />);
    const text = getByText('⚠️ 请先配置API');
    const style = text.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.color).toBe('#e8d5b7');
  });

  it('text content is "⚠️ 请先配置API"', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('container has correct static styles', () => {
    const { toJSON } = render(<ConfigWarning />);
    const container = toJSON();
    expect(container.type).toBe('View');
    expect(container.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignSelf: 'center',
        marginTop: 60,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        zIndex: 10,
      })
    );
  });

  it('Text has accessibilityLabel set', () => {
    const { getByLabelText } = render(<ConfigWarning />);
    expect(getByLabelText('⚠️ 请先配置API')).toBeTruthy();
  });
});