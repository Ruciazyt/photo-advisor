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
    const { getByText } = render(<ConfigWarning />);
    const text = getByText('⚠️ 请先配置API');
    const style = text.props.style;
    // style may be an array — flatten to check
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.color).toBe('#e8d5b7');
  });

  it('text content is "⚠️ 请先配置API"', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });
});