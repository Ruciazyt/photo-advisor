import React from 'react';
import { render } from '@testing-library/react-native';
import { ConfigWarning } from '../components/ConfigWarning';

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

describe('ConfigWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning text when visible (default)', () => {
    const { getByText } = render(<ConfigWarning />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('renders warning text when visible=true', () => {
    const { getByText } = render(<ConfigWarning visible={true} />);
    expect(getByText('⚠️ 请先配置API')).toBeTruthy();
  });

  it('returns null when visible=false', () => {
    const { toJSON } = render(<ConfigWarning visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when visible=false explicitly', () => {
    const { toJSON } = render(<ConfigWarning visible={false} />);
    expect(toJSON()).toBeNull();
  });
});
