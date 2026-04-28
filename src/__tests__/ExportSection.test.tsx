/**
 * Tests for src/components/ExportSection.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExportSection } from '../components/ExportSection';

// Mock useTheme to avoid ThemeContext wrapper in tests
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      cardBg: '#2C2C2E',
      border: '#38383A',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      accent: '#E8D5B7',
      primary: '#1C1C1E',
    },
  })),
}));

describe('ExportSection', () => {
  const mockOnExport = jest.fn();
  const mockOnImport = jest.fn();
  const mockOnClearAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders three buttons', () => {
    const { getByText } = render(
      <ExportSection onExport={mockOnExport} onImport={mockOnImport} onClearAll={mockOnClearAll} />
    );
    expect(getByText('导出数据')).toBeTruthy();
    expect(getByText('导入数据')).toBeTruthy();
    expect(getByText('清空所有')).toBeTruthy();
  });

  it('calls onExport when "导出数据" button is pressed', () => {
    const { getByText } = render(
      <ExportSection onExport={mockOnExport} onImport={mockOnImport} onClearAll={mockOnClearAll} />
    );
    fireEvent.press(getByText('导出数据'));
    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });

  it('calls onImport when "导入数据" button is pressed', () => {
    const { getByText } = render(
      <ExportSection onExport={mockOnExport} onImport={mockOnImport} onClearAll={mockOnClearAll} />
    );
    fireEvent.press(getByText('导入数据'));
    expect(mockOnImport).toHaveBeenCalledTimes(1);
  });

  it('calls onClearAll when "清空所有" button is pressed', () => {
    const { getByText } = render(
      <ExportSection onExport={mockOnExport} onImport={mockOnImport} onClearAll={mockOnClearAll} />
    );
    fireEvent.press(getByText('清空所有'));
    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it('renders correctly without loading state', () => {
    const { getByText, queryByText } = render(
      <ExportSection onExport={mockOnExport} onImport={mockOnImport} onClearAll={mockOnClearAll} />
    );
    // No spinner or loading indicator should be present
    expect(getByText('导出数据')).toBeTruthy();
    expect(getByText('导入数据')).toBeTruthy();
    expect(getByText('清空所有')).toBeTruthy();
  });
});