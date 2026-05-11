import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusZoneSelector } from '../FocusZoneSelector';
import { FOCUS_ZONES } from '../FocusGuideOverlay';

// Mock Ionicons to avoid icon rendering issues
jest.mock('@expo/vector-icons', () => ({
  Ionicons: function MockIcon({ name, size, color }: { name: string; size: number; color: string }) {
    return null;
  },
}));

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      cardBg: '#1a1a1a',
      border: '#333',
      accent: '#007AFF',
      text: '#fff',
      textSecondary: '#aaa',
      modeSelectorBg: '#2a2a2a',
    },
  }),
}));

describe('FocusZoneSelector', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnClose.mockClear();
  });

  it('renders nothing when visible=false', () => {
    const { queryByText } = render(
      <FocusZoneSelector visible={false} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    // Modal is not rendered
    expect(queryByText('选择对焦区域')).toBeNull();
  });

  it('renders header and title when visible=true', () => {
    const { getByText } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    expect(getByText('选择对焦区域')).toBeTruthy();
  });

  it('renders all focus zone options from FOCUS_ZONES', () => {
    const { getByText } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    FOCUS_ZONES.forEach(zone => {
      expect(getByText(zone.label)).toBeTruthy();
    });
  });

  it('calls onSelect with zone depth when a zone button is pressed', () => {
    const { getByText } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    fireEvent.press(getByText(FOCUS_ZONES[0].label));
    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(FOCUS_ZONES[0].depth);
  });

  it('calls onSelect with correct depth for each zone', () => {
    const { getByText } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    FOCUS_ZONES.forEach(zone => {
      mockOnSelect.mockClear();
      fireEvent.press(getByText(zone.label));
      expect(mockOnSelect).toHaveBeenCalledWith(zone.depth);
    });
  });

  it('calls onClose when backdrop is pressed', () => {
    const { getByTestId } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    fireEvent.press(getByTestId('focus-zone-backdrop'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is pressed', () => {
    const { getByText } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    fireEvent.press(getByText('取消'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders backdrop with correct testID', () => {
    const { getByTestId } = render(
      <FocusZoneSelector visible={true} onSelect={mockOnSelect} onClose={mockOnClose} />
    );
    expect(getByTestId('focus-zone-backdrop')).toBeTruthy();
  });
});
