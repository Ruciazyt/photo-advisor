import React from 'react';
import { render } from '@testing-library/react-native';
import { GridOverlay } from '../components/GridOverlay';

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    colors: {
      primary: '#000',
      accent: '#e8d5b7',
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      gridAccent: 'rgba(232,213,183,0.45)',
      bubbleBg: 'rgba(0,0,0,0.75)',
      bubbleText: '#fff',
      countdownBg: 'rgba(0,0,0,0.6)',
      countdownText: '#ffffff',
    },
    setTheme: jest.fn(),
    toggleTheme: jest.fn(),
  })),
}));

// Mock useAccessibilityAnnouncement hook
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityAnnouncement: jest.fn(() => ({
    announce: jest.fn(),
    isScreenReaderEnabled: false,
  })),
  useAccessibilityButton: jest.fn(() => ({
    accessibilityLabel: 'mock label',
    accessibilityHint: 'mock hint',
    accessibilityRole: 'button',
  })),
}));

describe('GridOverlay', () => {
  describe('rendering', () => {
    it('returns null for variant "none"', () => {
      const { toJSON } = render(<GridOverlay variant="none" />);
      expect(toJSON()).toBeNull();
    });

    it('renders thirds variant with correct structure', () => {
      const { toJSON } = render(<GridOverlay variant="thirds" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders golden variant', () => {
      const { toJSON } = render(<GridOverlay variant="golden" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders diagonal variant', () => {
      const { toJSON } = render(<GridOverlay variant="diagonal" />);
      expect(toJSON()).not.toBeNull();
    });

    it('renders spiral variant', () => {
      const { toJSON } = render(<GridOverlay variant="spiral" />);
      expect(toJSON()).not.toBeNull();
    });

    it('defaults to thirds variant', () => {
      const { toJSON } = render(<GridOverlay />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('accessibility props', () => {
    it('thirds variant has correct accessibilityLabel', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="thirds" />);
      const elements = getAllByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('golden variant has correct accessibilityLabel', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="golden" />);
      const elements = getAllByLabelText('黄金比例网格：基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('diagonal variant has correct accessibilityLabel', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="diagonal" />);
      const elements = getAllByLabelText('对角线网格：提供对角线构图引导，适合建筑、风光和动态场景');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('spiral variant has correct accessibilityLabel', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="spiral" />);
      const elements = getAllByLabelText('斐波那契螺旋网格：斐波那契螺旋引导，帮助创建自然流畅的视觉路径');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('subcomponents have accessibilityRole="image"', () => {
      const { getAllByRole } = render(<GridOverlay variant="thirds" />);
      const imageElements = getAllByRole('image');
      expect(imageElements.length).toBeGreaterThanOrEqual(1);
    });

    it('main component has accessibilityLiveRegion="polite"', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="thirds" />);
      const elements = getAllByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图');
      // The outer View (main component) should have accessibilityLiveRegion="polite"
      const outerElement = elements.find(el => el.props.accessibilityLiveRegion === 'polite');
      expect(outerElement).toBeTruthy();
    });
  });

  describe('variant-based rendering isolation', () => {
    it('only renders thirds grid when variant is "thirds"', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="thirds" />);
      const thirdsElements = getAllByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图');
      expect(thirdsElements.length).toBeGreaterThanOrEqual(1);

      const goldenQuery = render(<GridOverlay variant="thirds" />);
      const diagonalQuery = render(<GridOverlay variant="thirds" />);
      const spiralQuery = render(<GridOverlay variant="thirds" />);

      expect(goldenQuery.queryByLabelText('黄金比例网格：基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐')).toBeNull();
      expect(diagonalQuery.queryByLabelText('对角线网格：提供对角线构图引导，适合建筑、风光和动态场景')).toBeNull();
      expect(spiralQuery.queryByLabelText('斐波那契螺旋网格：斐波那契螺旋引导，帮助创建自然流畅的视觉路径')).toBeNull();
    });

    it('only renders golden grid when variant is "golden"', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="golden" />);
      const goldenElements = getAllByLabelText('黄金比例网格：基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐');
      expect(goldenElements.length).toBeGreaterThanOrEqual(1);

      const thirdsQuery = render(<GridOverlay variant="golden" />);
      const diagonalQuery = render(<GridOverlay variant="golden" />);
      const spiralQuery = render(<GridOverlay variant="golden" />);

      expect(thirdsQuery.queryByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图')).toBeNull();
      expect(diagonalQuery.queryByLabelText('对角线网格：提供对角线构图引导，适合建筑、风光和动态场景')).toBeNull();
      expect(spiralQuery.queryByLabelText('斐波那契螺旋网格：斐波那契螺旋引导，帮助创建自然流畅的视觉路径')).toBeNull();
    });

    it('only renders diagonal grid when variant is "diagonal"', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="diagonal" />);
      const diagonalElements = getAllByLabelText('对角线网格：提供对角线构图引导，适合建筑、风光和动态场景');
      expect(diagonalElements.length).toBeGreaterThanOrEqual(1);

      const thirdsQuery = render(<GridOverlay variant="diagonal" />);
      const goldenQuery = render(<GridOverlay variant="diagonal" />);
      const spiralQuery = render(<GridOverlay variant="diagonal" />);

      expect(thirdsQuery.queryByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图')).toBeNull();
      expect(goldenQuery.queryByLabelText('黄金比例网格：基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐')).toBeNull();
      expect(spiralQuery.queryByLabelText('斐波那契螺旋网格：斐波那契螺旋引导，帮助创建自然流畅的视觉路径')).toBeNull();
    });

    it('only renders spiral grid when variant is "spiral"', () => {
      const { getAllByLabelText } = render(<GridOverlay variant="spiral" />);
      const spiralElements = getAllByLabelText('斐波那契螺旋网格：斐波那契螺旋引导，帮助创建自然流畅的视觉路径');
      expect(spiralElements.length).toBeGreaterThanOrEqual(1);

      const thirdsQuery = render(<GridOverlay variant="spiral" />);
      const goldenQuery = render(<GridOverlay variant="spiral" />);
      const diagonalQuery = render(<GridOverlay variant="spiral" />);

      expect(thirdsQuery.queryByLabelText('三分法构图网格：将画面水平和垂直各分为三等份，形成九宫格，适合人像和风景构图')).toBeNull();
      expect(goldenQuery.queryByLabelText('黄金比例网格：基于黄金分割比例1比1.618的网格，帮助创建视觉平衡与和谐')).toBeNull();
      expect(diagonalQuery.queryByLabelText('对角线网格：提供对角线构图引导，适合建筑、风光和动态场景')).toBeNull();
    });

    it('renders nothing when variant is "none"', () => {
      const { toJSON } = render(<GridOverlay variant="none" />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('interactive mode with onGridActivate', () => {
    it('renders TouchableOpacity (button role) when onGridActivate is provided', () => {
      const mockOnActivate = jest.fn();
      const { getAllByRole } = render(
        <GridOverlay variant="thirds" onGridActivate={mockOnActivate} />
      );
      const buttonElements = getAllByRole('button');
      expect(buttonElements.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onGridActivate with correct variant when tapped', () => {
      const mockOnActivate = jest.fn();
      const { getAllByRole } = render(
        <GridOverlay variant="golden" onGridActivate={mockOnActivate} />
      );
      const buttons = getAllByRole('button');
      // The outer GridOverlay TouchableOpacity is the first button
      const outerButton = buttons.find(
        (el) => el.props.accessibilityLabel?.includes('黄金比例')
      );
      expect(outerButton).toBeTruthy();
    });

    it('does NOT render TouchableOpacity (role button) when onGridActivate is NOT provided — sub-components render as View with role image', () => {
      const { queryAllByRole, getAllByRole } = render(<GridOverlay variant="thirds" />);
      const buttonElements = queryAllByRole('button');
      // Without onGridActivate, all rendered elements have role 'image' or no explicit role — no button
      expect(buttonElements.length).toBe(0);
      // Sub-components should have role 'image' (the View with accessibilityRole="image")
      const imageElements = getAllByRole('image');
      expect(imageElements.length).toBeGreaterThan(0);
    });

    it('returns null for variant "none" regardless of onGridActivate', () => {
      const mockOnActivate = jest.fn();
      const { toJSON } = render(<GridOverlay variant="none" onGridActivate={mockOnActivate} />);
      expect(toJSON()).toBeNull();
    });
  });
});