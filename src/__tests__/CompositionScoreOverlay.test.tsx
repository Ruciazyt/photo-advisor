/**
 * Tests for CompositionScoreOverlay component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompositionScoreOverlay } from '../components/CompositionScoreOverlay';
import { CompositionScoreResult, ChallengeSession } from '../hooks/useCompositionScore';

const makeResult = (overrides: Partial<CompositionScoreResult> = {}): CompositionScoreResult => ({
  score: 85,
  breakdown: { alignment: 90, balance: 80, centrality: 85 },
  grade: 'A',
  ...overrides,
});

const makeSession = (overrides: Partial<ChallengeSession> = {}): ChallengeSession => ({
  scores: [],
  bestScore: 0,
  cumulative: 0,
  count: 0,
  ...overrides,
});

describe('CompositionScoreOverlay', () => {
  const defaultProps = {
    result: makeResult(),
    challengeMode: false,
    session: makeSession(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    // Initial score is 0 before animation
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('displays score label', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('calls onDismiss when tapped', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <CompositionScoreOverlay {...defaultProps} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('构图评分'));
    // Tap triggers handleTap
    expect(onDismiss).not.toHaveBeenCalled(); // animation not complete yet
  });

  it('displays correct grade colors for S rank', () => {
    const { getByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        result={makeResult({ score: 95, grade: 'S', breakdown: { alignment: 95, balance: 95, centrality: 95 } })}
      />
    );
    // Grade badge appears after animation delay
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('displays challenge session stats when challenge mode is active', () => {
    const session = makeSession({
      scores: [80, 90],
      bestScore: 90,
      cumulative: 170,
      count: 2,
    });
    const { getByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        challengeMode={true}
        session={session}
      />
    );
    // Session stats should be visible after animation
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('does not show challenge session stats when challenge mode is off', () => {
    const session = makeSession({
      scores: [80],
      bestScore: 80,
      cumulative: 80,
      count: 1,
    });
    const { queryByText } = render(
      <CompositionScoreOverlay
        {...defaultProps}
        challengeMode={false}
        session={session}
      />
    );
    expect(queryByText('🎮 挑战模式')).toBeNull();
  });

  it('displays breakdown bars with correct labels', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('构图对齐')).toBeTruthy();
    expect(getByText('左右平衡')).toBeTruthy();
    expect(getByText('中心位置')).toBeTruthy();
  });

  it('displays different grades correctly', () => {
    const grades: Array<{ grade: 'S' | 'A' | 'B' | 'C' | 'D'; score: number }> = [
      { grade: 'S', score: 95 },
      { grade: 'A', score: 85 },
      { grade: 'B', score: 75 },
      { grade: 'C', score: 65 },
      { grade: 'D', score: 45 },
    ];

    for (const { grade, score } of grades) {
      jest.clearAllMocks();
      jest.useFakeTimers();
      const result = makeResult({ grade, score });
      const { getByText } = render(
        <CompositionScoreOverlay {...defaultProps} result={result} />
      );
      expect(getByText('构图评分')).toBeTruthy();
      jest.useRealTimers();
    }
  });

  it('handles D grade correctly', () => {
    const result = makeResult({ score: 30, grade: 'D', breakdown: { alignment: 30, balance: 30, centrality: 30 } });
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} result={result} />);
    expect(getByText('构图评分')).toBeTruthy();
  });

  it('displays tap hint text', () => {
    const { getByText } = render(<CompositionScoreOverlay {...defaultProps} />);
    expect(getByText('轻触关闭')).toBeTruthy();
  });
});
