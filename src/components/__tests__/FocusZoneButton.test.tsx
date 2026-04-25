import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusZoneButton } from '../FocusZoneButton';
import { FOCUS_ZONES } from '../FocusGuideOverlay';

describe('FocusZoneButton', () => {
  const mockZone = FOCUS_ZONES[0];
  const mockStyle = {};
  const mockLabelStyle = {};
  const mockSubStyle = {};
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders zone label and sub text', () => {
    const { getByText } = render(
      <FocusZoneButton
        zone={mockZone}
        style={mockStyle}
        labelStyle={mockLabelStyle}
        subStyle={mockSubStyle}
        onPress={mockOnPress}
      />
    );
    expect(getByText(mockZone.label)).toBeTruthy();
    expect(getByText(mockZone.sub)).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(
      <FocusZoneButton
        zone={mockZone}
        style={mockStyle}
        labelStyle={mockLabelStyle}
        subStyle={mockSubStyle}
        onPress={mockOnPress}
      />
    );
    fireEvent.press(getByText(mockZone.label));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('applies custom style prop', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <FocusZoneButton
        zone={mockZone}
        style={customStyle}
        labelStyle={mockLabelStyle}
        subStyle={mockSubStyle}
        onPress={mockOnPress}
      />
    );
    expect(getByText(mockZone.label)).toBeTruthy();
  });

  it('renders all three focus zones correctly', () => {
    FOCUS_ZONES.forEach(zone => {
      const { getByText } = render(
        <FocusZoneButton
          zone={zone}
          style={mockStyle}
          labelStyle={mockLabelStyle}
          subStyle={mockSubStyle}
          onPress={mockOnPress}
        />
      );
      expect(getByText(zone.label)).toBeTruthy();
      expect(getByText(zone.sub)).toBeTruthy();
    });
  });
});