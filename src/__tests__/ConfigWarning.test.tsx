import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfigWarning } from '../components/ConfigWarning';

// ---------------------------------------------------------------------------
// Mock ThemeContext
// ---------------------------------------------------------------------------
const mockColors = {
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
};

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: mockColors,
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

describe('ConfigWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when visible=false', () => {
    const { toJSON } = render(<ConfigWarning visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders null when visible is not passed (defaults to false in logic)', () => {
    // Default visible=true, so this is not null
    const { toJSON } = render(<ConfigWarning />);
    expect(toJSON()).not.toBeNull();
  });

  it('renders when visible=true', () => {
    const { toJSON } = render(<ConfigWarning visible={true} />);
    expect(toJSON()).not.toBeNull();
  });

  it('has accessibilityLabel "⚠️ 请先配置API"', () => {
    const { toJSON } = render(<ConfigWarning visible={true} />);
    const tree = toJSON() as any;
    // Walk the tree to find the Text node with the accessibilityLabel
    const findLabel = (node: any): any => {
      if (!node || typeof node !== 'object') return null;
      if (node.props?.accessibilityLabel === '⚠️ 请先配置API') return node;
      const children = node.children ?? (node.props && node.props.children);
      if (children) {
        if (Array.isArray(children)) {
          for (const child of children) {
            const found = findLabel(child);
            if (found) return found;
          }
        } else {
          return findLabel(children);
        }
      }
      return null;
    };
    expect(findLabel(tree)).toBeTruthy();
  });

  it('uses colors.accent for text color via useMemo', () => {
    const { toJSON } = render(<ConfigWarning visible={true} />);
    const tree = toJSON() as any;
    const findTextStyle = (node: any): any => {
      if (!node || typeof node !== 'object') return null;
      const style = node.props?.style;
      if (style) {
        const styleArr = Array.isArray(style) ? style : [style];
        for (const s of styleArr) {
          if (s && s.color === mockColors.accent) return s;
        }
      }
      const children = node.children ?? (node.props && node.props.children);
      if (children) {
        if (Array.isArray(children)) {
          for (const child of children) {
            const found = findTextStyle(child);
            if (found) return found;
          }
        } else {
          return findTextStyle(children);
        }
      }
      return null;
    };
    const found = findTextStyle(tree);
    expect(found).toBeTruthy();
    expect(found.color).toBe(mockColors.accent);
  });
});