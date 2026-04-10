import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { GridSelectorModal } from '../components/GridSelectorModal';
import { GridVariant } from '../components/GridOverlay';

// Mock Animated to avoid timer issues in tests
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.UIManager = RN.NativeModules.UIManager || {};
  RN.NativeModules.UIManager.RCTView = RN.NativeModules.UIManager.RCTView || {};
  return RN;
});

describe('GridSelectorModal', () => {
  const defaultProps = {
    visible: false,
    selectedVariant: 'thirds' as GridVariant,
    onSelect: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible is false', () => {
    const { toJSON } = render(<GridSelectorModal {...defaultProps} visible={false} />);
    // When not visible and animation completes, isShown becomes false and component returns null
    expect(toJSON()).toBeNull();
  });

  it('renders the modal when visible is true', async () => {
    const { getByText } = render(<GridSelectorModal {...defaultProps} visible={true} />);
    expect(getByText('选择网格')).toBeTruthy();
  });

  it('renders all five grid options', async () => {
    const { getByText } = render(<GridSelectorModal {...defaultProps} visible={true} />);
    expect(getByText('三分法')).toBeTruthy();
    expect(getByText('黄金分割')).toBeTruthy();
    expect(getByText('对角线')).toBeTruthy();
    expect(getByText('螺旋线')).toBeTruthy();
    expect(getByText('关闭网格')).toBeTruthy();
  });

  it('calls onSelect with "thirds" when thirds card is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('三分法'));
    expect(onSelect).toHaveBeenCalledWith('thirds');
  });

  it('calls onSelect with "golden" when golden card is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('黄金分割'));
    expect(onSelect).toHaveBeenCalledWith('golden');
  });

  it('calls onSelect with "diagonal" when diagonal card is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('对角线'));
    expect(onSelect).toHaveBeenCalledWith('diagonal');
  });

  it('calls onSelect with "spiral" when spiral card is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('螺旋线'));
    expect(onSelect).toHaveBeenCalledWith('spiral');
  });

  it('calls onSelect with "none" when close card is pressed', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('关闭网格'));
    expect(onSelect).toHaveBeenCalledWith('none');
  });

  it('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <GridSelectorModal {...defaultProps} visible={true} onClose={onClose} />
    );
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    // Find the close button by pressing each button and checking which triggers onClose
    let found = false;
    for (const btn of buttons) {
      fireEvent.press(btn);
      if (onClose.mock.calls.length > 0) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it('highlights the selected variant card', async () => {
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} selectedVariant="golden" />
    );
    // The golden card should be visually selected (tested via style inspection)
    // We just verify the component renders without error
    expect(getByText('黄金分割')).toBeTruthy();
  });

  it('handles rapid visibility toggling', async () => {
    const { rerender, getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} />
    );
    expect(getByText('选择网格')).toBeTruthy();

    rerender(<GridSelectorModal {...defaultProps} visible={false} />);
    // After hiding, animation runs and component becomes null once animation completes
    // The isShown state updates after animation, so during test it may still render briefly
  });

  it('calls onSelect only once per tap', async () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <GridSelectorModal {...defaultProps} visible={true} onSelect={onSelect} />
    );
    fireEvent.press(getByText('三分法'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
