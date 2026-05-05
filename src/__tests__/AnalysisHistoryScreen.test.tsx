/**
 * Unit tests for src/screens/AnalysisHistoryScreen.tsx
 */

import React from 'react';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AnalysisHistoryScreen } from '../screens/AnalysisHistoryScreen';
import * as analysisHistoryService from '../services/analysisHistory';
import { useTheme } from '../contexts/ThemeContext';

jest.mock('../services/analysisHistory');
jest.mock('../contexts/ThemeContext');
jest.spyOn(Alert, 'alert');

const mockService = analysisHistoryService as jest.Mocked<typeof analysisHistoryService>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

const mockColors = {
  primary: '#000000',
  accent: '#E8D5B7',
  cardBg: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4CAF50',
  error: '#FF5252',
  warning: '#F59E0B',
  background: '#000000',
  sunColor: '#FFB800',
  gridAccent: 'rgba(232,213,183,0.35)',
};

function makeRecord(overrides: Partial<import('../types').AnalysisRecord> = {}): import('../types').AnalysisRecord {
  return {
    id: 'ana_' + Math.random().toString(36).slice(2, 9),
    imageUri: 'https://example.com/photo.jpg',
    analysisText: '构建优秀，光线充裕，画面清晰。',
    timestamp: '2026-05-05T10:30:00.000Z',
    tags: ['风景', '户外'],
    ...overrides,
  };
}

describe('AnalysisHistoryScreen', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({ theme: 'dark' as const, colors: mockColors, toggleTheme: jest.fn(), setTheme: jest.fn() });
    mockService.loadAnalysisHistory.mockResolvedValue([]);
    mockService.deleteAnalysisRecord.mockResolvedValue([]);
    mockService.clearAnalysisHistory.mockResolvedValue(undefined);
  });

  it('renders loading state initially', async () => {
    mockService.loadAnalysisHistory.mockReturnValue(new Promise(() => {}));

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    expect(screen.UNSAFE_getAllByType(require('react-native').ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('renders empty state when no records', async () => {
    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-title')).toBeTruthy();
    });
  });

  it('renders list of records', async () => {
    const records = [makeRecord({ id: 'ana_list1' }), makeRecord({ id: 'ana_list2' })];
    mockService.loadAnalysisHistory.mockResolvedValue(records);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('history-card-ana_list1')).toBeTruthy();
      expect(screen.getByTestId('history-card-ana_list2')).toBeTruthy();
    });
  });

  it('back button calls onBack', async () => {
    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-back')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-back'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('opens modal on card tap', async () => {
    const record = makeRecord({ id: 'ana_modal', analysisText: '测试完整分析文本内容' });
    mockService.loadAnalysisHistory.mockResolvedValue([record]);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('history-card-ana_modal')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('history-card-ana_modal'));

    await waitFor(() => {
      expect(screen.getByTestId('modal-analysis-text')).toBeTruthy();
    });
  });

  it('trash button calls deleteAnalysisRecord', async () => {
    const record = makeRecord({ id: 'ana_del' });
    mockService.loadAnalysisHistory.mockResolvedValue([record]);
    mockService.deleteAnalysisRecord.mockResolvedValue([]);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-ana_del')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('delete-ana_del'));

    expect(mockService.deleteAnalysisRecord).toHaveBeenCalledWith('ana_del');
  });

  it('enters select mode when select button is tapped', async () => {
    const records = [makeRecord({ id: 'ana_sel' })];
    mockService.loadAnalysisHistory.mockResolvedValue(records);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-select')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-select'));

    await waitFor(() => {
      expect(screen.getByTestId('btn-cancel')).toBeTruthy();
    });
  });

  it('shows clear all confirmation alert', async () => {
    const records = [makeRecord({ id: 'ana_clear' })];
    mockService.loadAnalysisHistory.mockResolvedValue(records);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-clear-all')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-clear-all'));

    expect(Alert.alert).toHaveBeenCalled();
    const callArgs = (Alert.alert as jest.Mock).mock.calls[0];
    expect(callArgs[0]).toBe('清空历史');
  });

  it('calls clearAnalysisHistory when confirmed', async () => {
    const records = [makeRecord({ id: 'ana_clear2' })];
    mockService.loadAnalysisHistory.mockResolvedValue(records);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('btn-clear-all')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('btn-clear-all'));

    const callArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const confirmBtn = callArgs[2].find((b: { text: string }) => b.text === '清空');
    await act(async () => { confirmBtn.onPress(); });

    expect(mockService.clearAnalysisHistory).toHaveBeenCalled();
  });

  it('renders correct header subtitle with count', async () => {
    const records = [
      makeRecord({ id: 'ana_c1' }),
      makeRecord({ id: 'ana_c2' }),
      makeRecord({ id: 'ana_c3' }),
    ];
    mockService.loadAnalysisHistory.mockResolvedValue(records);

    render(<AnalysisHistoryScreen onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('header-subtitle')).toBeTruthy();
      const subtitle = screen.getByTestId('header-subtitle');
      const children = subtitle.props.children;
      let text: string;
      if (typeof children === 'string') {
        text = children;
      } else if (Array.isArray(children)) {
        text = children.map(c => typeof c === 'number' ? String(c) : c).join('');
      } else {
        text = String(children);
      }
      // text e.g. "\\u5386\\u53f2\\u8bb0\\u5f55 · 3\\u6761" - check for count + unit
      expect(text).toMatch(/3.*\\u6761/);
    });
  });
});