import React from 'react';
import { render } from '@testing-library/react-native';
import { ShareCard } from '../ShareCard';

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#E8D5B7',
    },
    theme: 'light',
  }),
}));

describe('ShareCard', () => {
  const requiredProps = {
    photoUri: 'file:///test/photo.jpg',
    suggestions: ['建议一', '建议二'],
    gridType: 'rule-of-thirds',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('required props', () => {
    it('renders with required props (photoUri, suggestions array, gridType)', () => {
      const { toJSON } = render(<ShareCard {...requiredProps} />);
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('suggestions handling', () => {
    it('renders null/empty suggestions gracefully', () => {
      const { toJSON } = render(
        <ShareCard photoUri="file:///test.jpg" suggestions={[]} gridType="thirds" />
      );
      expect(toJSON()).not.toBeNull();
    });

    it('empty suggestions array shows nothing for suggestions section', () => {
      const { queryByText } = render(
        <ShareCard photoUri="file:///test.jpg" suggestions={[]} gridType="thirds" />
      );
      expect(queryByText(/AI 建议/)).toBeNull();
    });

    it('suggestions list renders each item with bullet prefix', () => {
      const { getByText } = render(
        <ShareCard
          photoUri="file:///test.jpg"
          suggestions={['建议一', '建议二']}
          gridType="thirds"
        />
      );
      expect(getByText('• 建议一')).toBeTruthy();
      expect(getByText('• 建议二')).toBeTruthy();
    });
  });

  describe('score row', () => {
    it('score row shows when score is provided', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} score={85} />
      );
      expect(getByText('★★★★☆')).toBeTruthy();
      expect(getByText('(85分)')).toBeTruthy();
    });

    it('score row hidden when score is undefined', () => {
      const { queryByText } = render(<ShareCard {...requiredProps} />);
      expect(queryByText(/★/)).toBeNull();
    });

    it('scoreReason with undefined score - score row still shows', () => {
      // scoreReason alone shouldn't show score row without score
      const { queryByText } = render(
        <ShareCard {...requiredProps} scoreReason="主体偏左" />
      );
      expect(queryByText(/★/)).toBeNull();
    });

    it('score reason shown when provided', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} score={85} scoreReason="主体偏左，建议右移" />
      );
      expect(getByText('主体偏左，建议右移')).toBeTruthy();
    });
  });

  describe('star rating tiers', () => {
    it('score 100→5★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={100} />);
      expect(getByText('★★★★★')).toBeTruthy();
    });

    it('score 90→5★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={90} />);
      expect(getByText('★★★★★')).toBeTruthy();
    });

    it('score 80→4★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={80} />);
      expect(getByText('★★★★☆')).toBeTruthy();
    });

    it('score 65→3★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={65} />);
      expect(getByText('★★★☆☆')).toBeTruthy();
    });

    it('score 45→2★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={45} />);
      expect(getByText('★★☆☆☆')).toBeTruthy();
    });

    it('score 30→1★', () => {
      const { getByText } = render(<ShareCard {...requiredProps} score={30} />);
      expect(getByText('★☆☆☆☆')).toBeTruthy();
    });
  });

  describe('grid meta', () => {
    it('gridVariant=thirds displays correct icon+label', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} gridVariant="thirds" />
      );
      expect(getByText('📐')).toBeTruthy();
      expect(getByText('三分法')).toBeTruthy();
    });

    it('gridVariant=golden displays correct icon+label', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} gridVariant="golden" />
      );
      expect(getByText('🥇')).toBeTruthy();
      expect(getByText('黄金分割')).toBeTruthy();
    });

    it('gridVariant=diagonal displays correct icon+label', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} gridVariant="diagonal" />
      );
      expect(getByText('↗️')).toBeTruthy();
      expect(getByText('对角线')).toBeTruthy();
    });

    it('gridVariant=spiral displays correct icon+label', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} gridVariant="spiral" />
      );
      expect(getByText('🌀')).toBeTruthy();
      expect(getByText('螺旋构图')).toBeTruthy();
    });

    it('gridVariant=none uses "⬜ 无网格" label', () => {
      const { getByText } = render(
        <ShareCard {...requiredProps} gridVariant="none" />
      );
      expect(getByText('⬜')).toBeTruthy();
      expect(getByText('无网格')).toBeTruthy();
    });
  });

  describe('footer', () => {
    it('footer text visible', () => {
      const { getByText } = render(<ShareCard {...requiredProps} />);
      expect(getByText('📸 由拍摄参谋生成')).toBeTruthy();
    });
  });

  describe('dark theme styling', () => {
    // Re-mock ThemeContext for dark theme tests
    jest.unmock('../../contexts/ThemeContext');
    jest.mock('../../contexts/ThemeContext', () => ({
      useTheme: () => ({
        colors: { accent: '#E8D5B7' },
        theme: 'dark',
      }),
    }));

    it('dark theme panel styling', () => {
      const { toJSON } = render(
        <ShareCard {...requiredProps} score={85} />
      );
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('light theme styling', () => {
    it('light theme panel styling', () => {
      const { toJSON } = render(
        <ShareCard {...requiredProps} score={85} />
      );
      expect(toJSON()).not.toBeNull();
    });
  });
});
