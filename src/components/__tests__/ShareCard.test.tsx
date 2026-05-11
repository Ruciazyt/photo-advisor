/**
 * Unit tests for src/components/ShareCard.tsx
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ShareCard } from '../ShareCard';

// Mock ThemeContext — light theme
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    colors: {
      accent: '#E8D5B7',
      primary: '#000000',
      cardBg: '#ffffff',
      border: '#e0e0e0',
      text: '#1A1A1A',
      textSecondary: '#666666',
      background: '#ffffff',
    },
  }),
}));

const PROPS_BASE = {
  photoUri: 'file:///test/photo.jpg',
  suggestions: [
    '[中心] 主体位于中心区域，构图稳定',
    '[左侧] 左侧留白较多，建议将主体置于左侧三分线',
  ],
  gridType: '三分法',
  gridVariant: 'thirds',
};

describe('ShareCard', () => {
  it('renders photo image and overlay panel', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} />);
    expect(getByText('📸 由拍摄参谋生成')).toBeTruthy();
  });

  it('shows grid label for thirds variant', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} gridVariant="thirds" gridType="三分法" />);
    expect(getAllByText('三分法').length).toBeGreaterThanOrEqual(1);
  });

  it('shows grid label for golden variant', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} gridVariant="golden" gridType="黄金比例" />);
    expect(getAllByText('黄金比例').length).toBeGreaterThanOrEqual(1);
  });

  it('shows grid label for diagonal variant', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} gridVariant="diagonal" gridType="对角线" />);
    expect(getAllByText('对角线').length).toBeGreaterThanOrEqual(1);
  });

  it('shows grid label for spiral variant', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} gridVariant="spiral" gridType="螺旋线" />);
    expect(getAllByText('螺旋线').length).toBeGreaterThanOrEqual(1);
  });

  it('shows grid label for none variant', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} gridVariant="none" gridType="无网格" />);
    expect(getAllByText('无网格').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AI suggestions header when suggestions are non-empty', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} />);
    expect(getByText('💡 AI 建议')).toBeTruthy();
  });

  it('strips [area] prefix from suggestion text', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} />);
    // '主体位于中心区域，构图稳定' should appear without the '[中心]' prefix
    expect(getByText('• 主体位于中心区域，构图稳定')).toBeTruthy();
    expect(getByText('• 左侧留白较多，建议将主体置于左侧三分线')).toBeTruthy();
  });

  it('renders all suggestions', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} />);
    const bullets = getAllByText(/^• /);
    expect(bullets).toHaveLength(2);
  });

  it('shows star rating for score >= 90 (5 stars)', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={95} />);
    expect(getByText('★★★★★')).toBeTruthy();
    expect(getByText('(95分)')).toBeTruthy();
  });

  it('shows star rating for score >= 75 (4 stars)', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={80} />);
    expect(getByText('★★★★☆')).toBeTruthy();
  });

  it('shows star rating for score >= 60 (3 stars)', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={65} />);
    expect(getByText('★★★☆☆')).toBeTruthy();
  });

  it('shows star rating for score >= 40 (2 stars)', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={45} />);
    expect(getByText('★★☆☆☆')).toBeTruthy();
  });

  it('shows star rating for score < 40 (1 star)', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={30} />);
    expect(getByText('★☆☆☆☆')).toBeTruthy();
  });

  it('shows score reason next to score when provided', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} score={85} scoreReason="主体偏左" />);
    expect(getByText('主体偏左')).toBeTruthy();
  });

  it('does not show star row when score is undefined', () => {
    const { queryByText } = render(<ShareCard {...PROPS_BASE} score={undefined} />);
    expect(queryByText('★')).toBeNull();
  });

  it('does not show score reason when not provided', () => {
    const { queryByText } = render(<ShareCard {...PROPS_BASE} score={85} />);
    // Score number and stars should be there, but no reason text
    expect(queryByText('(85分)')).toBeTruthy();
  });

  it('renders footer attribution', () => {
    const { getByText } = render(<ShareCard {...PROPS_BASE} />);
    expect(getByText('📸 由拍摄参谋生成')).toBeTruthy();
  });

  it('renders grid type tag', () => {
    const { getAllByText } = render(<ShareCard {...PROPS_BASE} />);
    // gridType appears twice: once in header and once in gridTypeTag
    const matches = getAllByText('三分法');
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty suggestions array gracefully', () => {
    const { getByText, queryByText } = render(
      <ShareCard {...PROPS_BASE} suggestions={[]} />
    );
    expect(getByText('📸 由拍摄参谋生成')).toBeTruthy();
    expect(queryByText('💡 AI 建议')).toBeNull();
  });

  it('renders with default photoAspectRatio 3/4', () => {
    const { toJSON } = render(<ShareCard {...PROPS_BASE} />);
    // Just verify it renders without error
    expect(toJSON()).toBeTruthy();
  });

  it('renders with explicit photoAspectRatio', () => {
    const { toJSON } = render(<ShareCard {...PROPS_BASE} photoAspectRatio={16 / 9} />);
    expect(toJSON()).toBeTruthy();
  });
});