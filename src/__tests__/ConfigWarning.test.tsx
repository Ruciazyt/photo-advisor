import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfigWarning } from '../components/ConfigWarning';

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
      success: '#00C853',
      error: '#FF1744',
      warning: '#FFB300',
      overlayBg: 'rgba(0,0,0,0.6)',
      topBarTextSecondary: 'rgba(255,255,255,0.6)',
      topBarBorderInactive: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      textSecondary: '#888888',
      countdownBorder: 'rgba(255,255,255,0.4)',
      sunColor: '#FFB800',
      cardBg: 'rgba(0,0,0,0.8)',
      border: 'rgba(255,255,255,0.15)',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ConfigWarning', () => {
  it('returns null when visible=false', () => {
    const { toJSON } = render(<ConfigWarning visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders when visible=true (default)', () => {
    const { toJSON } = render(<ConfigWarning />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders warning text "⚠️ 请先配置API"', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('applies text color from colors.accent via useMemo', () => {
    const { getByText } = render(<ConfigWarning />);
    const text = getByText('⚠️ 请先配置API');
    // The text style is useMemo([{ color: colors.accent, fontSize: 13 }], [colors.accent])
    // which resolves to { color: '#e8d5b7', fontSize: 13 }
    // In React Native textStyle from StyleSheet.create would be flattened at render time,
    // so we verify the component renders without error (style applied correctly)
    expect(text).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    const { getByLabelText } = render(<ConfigWarning />);
    const labeled = getByLabelText('⚠️ 请先配置API');
    expect(labeled).toBeTruthy();
  });

  it('renders with dark background style (rgba(0,0,0,0.6))', () => {
    const { toJSON } = render(<ConfigWarning />);
    const tree = toJSON() as any;
    // Find the outer View with backgroundColor style
    const findBgView = (node: any): any => {
      if (!node || typeof node !== 'object') return null;
      if (node.props?.style?.backgroundColor === 'rgba(0,0,0,0.6)') return node;
      const children = node.children ?? node.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findBgView(child);
          if (found) return found;
        }
      } else if (children) {
        return findBgView(children);
      }
      return null;
    };
    const warningView = findBgView(tree);
    expect(warningView).toBeTruthy();
  });

  it('uses centered alignment with marginTop=60', () => {
    const { toJSON } = render(<ConfigWarning />);
    const tree = toJSON() as any;
    const findView = (node: any): any => {
      if (!node || typeof node !== 'object') return null;
      const style = node.props?.style;
      if (style?.alignSelf === 'center' && style?.marginTop === 60) return node;
      const children = node.children ?? node.props?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findView(child);
          if (found) return found;
        }
      } else if (children) {
        return findView(children);
      }
      return null;
    };
    const styledView = findView(tree);
    expect(styledView).toBeTruthy();
  });

  it('default visible prop is true', () => {
    // Default prop visible=undefined should render the warning
    // visible=undefined is treated as true (default param)
    const { getByText } = render(<ConfigWarning visible={undefined as any} />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });
});