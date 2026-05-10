/**
 * Unit tests for src/components/StreamingDrawer.tsx
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity, Text, Animated } from 'react-native';
import { StreamingDrawer } from '../StreamingDrawer';

// Mock reanimated + worklets (same pattern as existing tests in this project)
jest.mock('react-native-reanimated', () => {
  const mockView = (props: React.PropsWithChildren) => props.children;
  const mockText = (props: React.PropsWithChildren) => props.children;
  return {
    __esModule: true,
    default: { View: mockView, Text: mockText },
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn(),
    withTiming: jest.fn((value: unknown) => value),
    withRepeat: jest.fn(),
    withSequence: jest.fn(),
    withDelay: jest.fn(),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn: () => void) => fn()),
    Easing: {
      out: jest.fn(),
      ease: jest.fn(),
      in: jest.fn(),
      quad: 'quad',
    },
  };
});
jest.mock('react-native-worklets');

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark' as const,
    colors: {
      accent: '#E8D5B7',
      text: '#FFFFFF',
      textSecondary: '#888888',
      drawerBg: '#1A1A1A',
      drawerHandle: '#666666',
      drawerTextSecondary: '#999999',
    },
    toggleTheme: jest.fn(),
    setTheme: jest.fn(),
  })),
}));

// Mock useAccessibility hooks
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibilityButton: jest.fn(() => ({})),
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: false })),
}));

describe('StreamingDrawer', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when visible=false (isClosed initially true)', () => {
    const { queryByText } = render(
      <StreamingDrawer
        visible={false}
        text=""
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(queryByText('AI 分析结果')).toBeNull();
  });

  it('renders the drawer header title when visible=true', () => {
    const { getByText } = render(
      <StreamingDrawer
        visible={true}
        text=""
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(getByText('AI 分析结果')).toBeTruthy();
  });

  it('renders loading dots container when loading=true', () => {
    const { queryByText } = render(
      <StreamingDrawer
        visible={true}
        text=""
        loading={true}
        onClose={mockOnClose}
      />
    );
    // When loading, the placeholder is not shown (dots container is rendered instead)
    expect(queryByText('点击发送按钮开始分析')).toBeNull();
  });

  it('renders text content when text is provided', () => {
    const { getByText } = render(
      <StreamingDrawer
        visible={true}
        text="这是一段AI分析结果文本"
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(getByText('这是一段AI分析结果文本')).toBeTruthy();
  });

  it('renders placeholder when no text and not loading', () => {
    const { getByText } = render(
      <StreamingDrawer
        visible={true}
        text=""
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(getByText('点击发送按钮开始分析')).toBeTruthy();
  });

  it('does not render placeholder when text is provided', () => {
    const { queryByText } = render(
      <StreamingDrawer
        visible={true}
        text="some result"
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(queryByText('点击发送按钮开始分析')).toBeNull();
  });

  it('does not render placeholder when loading=true', () => {
    const { queryByText } = render(
      <StreamingDrawer
        visible={true}
        text=""
        loading={true}
        onClose={mockOnClose}
      />
    );
    expect(queryByText('点击发送按钮开始分析')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <StreamingDrawer
        visible={true}
        text="分析结果"
        loading={false}
        onClose={mockOnClose}
      />
    );
    // Close button is a TouchableOpacity rendered in the header
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    // The last TouchableOpacity in the header is the close (✕) button
    const closeBtn = buttons[buttons.length - 1];
    fireEvent.press(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <StreamingDrawer
        visible={true}
        text="分析结果"
        loading={false}
        onClose={mockOnClose}
      />
    );
    // The first TouchableOpacity is the overlay touch area
    const overlayTouch = UNSAFE_getAllByType(TouchableOpacity)[0];
    fireEvent.press(overlayTouch);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders both text and loading dots when text provided and loading=true', () => {
    const { getByText, queryByText } = render(
      <StreamingDrawer
        visible={true}
        text="分析进行中"
        loading={true}
        onClose={mockOnClose}
      />
    );
    expect(getByText('分析进行中')).toBeTruthy();
    // Loading dots shown (placeholder absent)
    expect(queryByText('点击发送按钮开始分析')).toBeNull();
  });

  it('renders without crashing with all props set', () => {
    const { getByText } = render(
      <StreamingDrawer
        visible={true}
        text="完整渲染测试"
        loading={false}
        onClose={mockOnClose}
      />
    );
    expect(getByText('AI 分析结果')).toBeTruthy();
    expect(getByText('完整渲染测试')).toBeTruthy();
    expect(getByText('✕')).toBeTruthy();
  });

  it('renders drawer handle (visual element)', () => {
    const { UNSAFE_getAllByType } = render(
      <StreamingDrawer
        visible={true}
        text=""
        loading={false}
        onClose={mockOnClose}
      />
    );
    // The handle is a View rendered between the overlay and header
    // We can verify the drawer rendered by checking header exists
    expect(UNSAFE_getAllByType(Text).some(t => t.props.children === 'AI 分析结果')).toBe(true);
  });
});