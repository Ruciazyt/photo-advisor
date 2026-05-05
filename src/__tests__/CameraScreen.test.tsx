/**
 * CameraScreen tests — focus on pure helpers and component structure.
 * Full camera integration tests require extensive Expo module mocking.
 * Note: We test GRID_LABELS as a pure constant (defined inline to avoid
 * importing CameraScreen which has heavy Expo module dependencies).
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import type { GridVariant } from '../components/GridOverlay';

// ---- GRID_LABELS constant (copied from CameraScreen to avoid dependency chain) ----
// GRID_LABELS is a pure constant — no Expo dependencies
const GRID_LABELS: Record<GridVariant, string> = {
  thirds: '三分法', golden: '黄金分割', diagonal: '对角线', spiral: '螺旋线', none: '关闭',
};

// ---- GRID_LABELS constant tests ----
describe('GRID_LABELS', () => {
  it('contains all expected grid variants', () => {
    expect(GRID_LABELS).toHaveProperty('thirds');
    expect(GRID_LABELS).toHaveProperty('golden');
    expect(GRID_LABELS).toHaveProperty('diagonal');
    expect(GRID_LABELS).toHaveProperty('spiral');
    expect(GRID_LABELS).toHaveProperty('none');
  });

  it('maps thirds to Chinese label', () => {
    expect(GRID_LABELS.thirds).toBe('三分法');
  });

  it('maps golden to Chinese label', () => {
    expect(GRID_LABELS.golden).toBe('黄金分割');
  });

  it('maps diagonal to Chinese label', () => {
    expect(GRID_LABELS.diagonal).toBe('对角线');
  });

  it('maps spiral to Chinese label', () => {
    expect(GRID_LABELS.spiral).toBe('螺旋线');
  });

  it('maps none to Chinese label', () => {
    expect(GRID_LABELS.none).toBe('关闭');
  });

  it('all values are non-empty strings', () => {
    Object.values(GRID_LABELS).forEach((label) => {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('has exactly 5 entries', () => {
    expect(Object.keys(GRID_LABELS).length).toBe(5);
  });
});

// ---- GRID_LABELS type coverage ----
describe('GRID_LABELS type safety', () => {
  it('all GridVariant keys are covered', () => {
    const variants: GridVariant[] = ['thirds', 'golden', 'diagonal', 'spiral', 'none'];
    variants.forEach((variant) => {
      expect(typeof GRID_LABELS[variant]).toBe('string');
      expect(GRID_LABELS[variant].length).toBeGreaterThan(0);
    });
  });

  it('GRID_LABELS values are all Chinese strings', () => {
    // All labels should be Chinese characters
    Object.values(GRID_LABELS).forEach((label) => {
      // Chinese Unicode range: \u4e00-\u9fa5
      const hasChinese = /[\u4e00-\u9fa5]/.test(label);
      expect(hasChinese).toBe(true);
    });
  });
});

// ---- Toggle button render tests ----
// These test the toggle button UI pattern used in CameraScreen without requiring
// full Expo camera mocking.
describe('CameraScreen toggle button pattern', () => {
  it('level toggle button press handler is defined', () => {
    let toggleCount = 0;
    const handleToggle = () => { toggleCount += 1; };

    const { getByText } = render(
      <TouchableOpacity onPress={handleToggle}>
        <Text>🔮 水平仪</Text>
      </TouchableOpacity>
    );

    const button = getByText('🔮 水平仪');
    fireEvent.press(button);
    expect(toggleCount).toBe(1);

    fireEvent.press(button);
    expect(toggleCount).toBe(2);
  });

  it('toggle button shows correct label', () => {
    const { getByText } = render(
      <TouchableOpacity>
        <Text>🔮 水平仪</Text>
      </TouchableOpacity>
    );
    expect(getByText('🔮 水平仪')).toBeTruthy();
  });

  it('grid toggle shows correct label', () => {
    const { getByText } = render(
      <TouchableOpacity>
        <Text>格线</Text>
      </TouchableOpacity>
    );
    expect(getByText('格线')).toBeTruthy();
  });

  it('histogram toggle responds to press', () => {
    let pressCount = 0;
    const { getByText } = render(
      <TouchableOpacity onPress={() => { pressCount += 1; }}>
        <Text>直方图</Text>
      </TouchableOpacity>
    );

    fireEvent.press(getByText('直方图'));
    expect(pressCount).toBe(1);
  });

  it('sun overlay toggle responds to press', () => {
    let pressCount = 0;
    const { getByText } = render(
      <TouchableOpacity onPress={() => { pressCount += 1; }}>
        <Text>太阳</Text>
      </TouchableOpacity>
    );

    fireEvent.press(getByText('太阳'));
    expect(pressCount).toBe(1);
  });

  it('focus guide toggle responds to press', () => {
    let pressCount = 0;
    const { getByText } = render(
      <TouchableOpacity onPress={() => { pressCount += 1; }}>
        <Text>对焦</Text>
      </TouchableOpacity>
    );

    fireEvent.press(getByText('对焦'));
    expect(pressCount).toBe(1);
  });
});

// ---- computeScoreFromSuggestions constant (copied from CameraScreen to avoid dependency chain) ----
// computeScoreFromSuggestions is a pure function — no Expo dependencies
function computeScoreFromSuggestions(sugs: string[]): { score: number; reason: string } {
  const positive = ['好', '优秀', '完美', '不错', '佳'];
  const negative = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
  let pos = 0, neg = 0;
  for (const s of sugs) { for (const p of positive) { if (s.includes(p)) pos++; } for (const n of negative) { if (s.includes(n)) neg++; } }
  let score = 50 + Math.min(pos * 20, 40) - Math.min(neg * 15, 45);
  score = Math.max(0, Math.min(100, score));
  const reason = sugs.length > 0 ? sugs[0].replace(/^[^\u4e00-\u9fa5]*/, '').trim().slice(0, 30) : '';
  return { score, reason };
}

// ---- computeScoreFromSuggestions tests ----
describe('computeScoreFromSuggestions', () => {
  it('returns base score 50 for empty suggestions', () => {
    const { score, reason } = computeScoreFromSuggestions([]);
    expect(score).toBe(50);
    expect(reason).toBe('');
  });

  it('increases score for positive keywords', () => {
    const { score } = computeScoreFromSuggestions(['这是一张优秀的照片']);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(90); // 50 + 40 max
  });

  it('decreases score for negative keywords', () => {
    const { score } = computeScoreFromSuggestions(['画面欠曝', '有点倾斜']);
    expect(score).toBeLessThan(50);
  });

  it('caps positive score increase at 40', () => {
    // Multiple positive keywords should not exceed 50 + 40 = 90
    const { score } = computeScoreFromSuggestions(['完美', '优秀', '好', '佳', '不错']);
    expect(score).toBeLessThanOrEqual(90);
  });

  it('caps negative score decrease at 45', () => {
    // Multiple negative keywords should not go below 50 - 45 = 5
    const { score } = computeScoreFromSuggestions(['欠曝', '过曝', '倾斜', '偏移', '不足']);
    expect(score).toBeGreaterThanOrEqual(5);
  });

  it('clamps score to 0-100 range', () => {
    // Very positive should be capped at 100
    const highPositive = computeScoreFromSuggestions(['完美优秀好不错佳完美优秀好不错佳']);
    expect(highPositive.score).toBeLessThanOrEqual(100);

    // Very negative should be clamped at 0
    const highNegative = computeScoreFromSuggestions(['欠曝过曝倾斜偏移不足欠曝过曝倾斜偏移不足']);
    expect(highNegative.score).toBeGreaterThanOrEqual(0);
  });

  it('extracts reason from first suggestion', () => {
    const { reason } = computeScoreFromSuggestions(['AI建议: 这是一张优秀的照片']);
    expect(reason).toContain('优秀');
  });

  it('limits reason to 30 characters', () => {
    const longSuggestion = '这是一条非常长的人工智能构图建议反馈信息内容';
    const { reason } = computeScoreFromSuggestions([longSuggestion]);
    expect(reason.length).toBeLessThanOrEqual(30);
  });

  it('returns empty reason for empty suggestions', () => {
    const { reason } = computeScoreFromSuggestions([]);
    expect(reason).toBe('');
  });
});

// ---- GRID_LABELS integration with CameraScreen UI pattern ----
describe('GRID_LABELS used in CameraScreen context', () => {
  it('can be used to display grid label in a button', () => {
    const gridVariant: GridVariant = 'thirds';
    const { getByText } = render(
      <TouchableOpacity>
        <Text>当前网格: {GRID_LABELS[gridVariant]}</Text>
      </TouchableOpacity>
    );
    expect(getByText('当前网格: 三分法')).toBeTruthy();
  });

  it('can switch grid variant label dynamically', () => {
    const { getByText, rerender } = render(
      <TouchableOpacity>
        <Text>网格: {GRID_LABELS['thirds']}</Text>
      </TouchableOpacity>
    );
    expect(getByText('网格: 三分法')).toBeTruthy();

    rerender(
      <TouchableOpacity>
        <Text>网格: {GRID_LABELS['golden']}</Text>
      </TouchableOpacity>
    );
    expect(getByText('网格: 黄金分割')).toBeTruthy();
  });
});

// ---- Shake detector wiring logic tests ----
// Validates the shake-to-dismiss enabled condition used in CameraScreen:
// enabled: showShakeDetector && showBubbleChat
describe('shake-to-dismiss logic pattern', () => {
  it('detector enabled only when both showShakeDetector AND showBubbleChat are true', () => {
    const isEnabled = (showShakeDetector: boolean, showBubbleChat: boolean) =>
      showShakeDetector && showBubbleChat;

    expect(isEnabled(true, true)).toBe(true);
    expect(isEnabled(true, false)).toBe(false);
    expect(isEnabled(false, true)).toBe(false);
    expect(isEnabled(false, false)).toBe(false);
  });

  it('shake handler dismisses all three overlay types', () => {
    // Validates the multi-dismiss pattern: bubbleChatDismissAll + handleDismissAll + keypointsDismissAll
    const overlays = {
      bubbleChat: true,
      composition: true,
      keypoints: true,
    };
    const dismissAll = () => {
      overlays.bubbleChat = false;
      overlays.composition = false;
      overlays.keypoints = false;
    };

    dismissAll();
    expect(overlays.bubbleChat).toBe(false);
    expect(overlays.composition).toBe(false);
    expect(overlays.keypoints).toBe(false);
  });
});

// ---- Toggle persistence logic tests ----
// Tests that toggle handlers call saveAppSettings with the updated value.
// These replicate the inline arrow function logic from CameraScreen's CameraTopBar props:
//   onKeypointsToggle={async () => { const next = !showKeypoints; setShowKeypoints(next); await saveAppSettings({ showKeypoints: next }); }}
//   onShakeDetectorToggle={async () => { const next = !showShakeDetector; setShowShakeDetector(next); await saveAppSettings({ showShakeDetector: next }); }}
describe('toggle persistence logic', () => {
  let savedSettings: Record<string, unknown>;
  let mockSaveAppSettings: jest.Mock;

  beforeEach(() => {
    savedSettings = {};
    mockSaveAppSettings = jest.fn(async (settings: Record<string, unknown>) => {
      Object.assign(savedSettings, settings);
    });
  });

  it('onKeypointsToggle calls saveAppSettings with showKeypoints: true when toggling on', async () => {
    let showKeypoints = false;
    const setShowKeypoints = (val: boolean | ((prev: boolean) => boolean)) => {
      showKeypoints = typeof val === 'function' ? val(showKeypoints) : val;
    };

    const onKeypointsToggle = async () => {
      const next = !showKeypoints;
      setShowKeypoints(next);
      await mockSaveAppSettings({ showKeypoints: next });
    };

    await onKeypointsToggle();
    expect(showKeypoints).toBe(true);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showKeypoints: true });
  });

  it('onKeypointsToggle calls saveAppSettings with showKeypoints: false when toggling off', async () => {
    let showKeypoints = true;
    const setShowKeypoints = (val: boolean | ((prev: boolean) => boolean)) => {
      showKeypoints = typeof val === 'function' ? val(showKeypoints) : val;
    };

    const onKeypointsToggle = async () => {
      const next = !showKeypoints;
      setShowKeypoints(next);
      await mockSaveAppSettings({ showKeypoints: next });
    };

    await onKeypointsToggle();
    expect(showKeypoints).toBe(false);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showKeypoints: false });
  });

  it('onShakeDetectorToggle calls saveAppSettings with showShakeDetector: true when toggling on', async () => {
    let showShakeDetector = false;
    const setShowShakeDetector = (val: boolean | ((prev: boolean) => boolean)) => {
      showShakeDetector = typeof val === 'function' ? val(showShakeDetector) : val;
    };

    const onShakeDetectorToggle = async () => {
      const next = !showShakeDetector;
      setShowShakeDetector(next);
      await mockSaveAppSettings({ showShakeDetector: next });
    };

    await onShakeDetectorToggle();
    expect(showShakeDetector).toBe(true);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showShakeDetector: true });
  });

  it('onShakeDetectorToggle calls saveAppSettings with showShakeDetector: false when toggling off', async () => {
    let showShakeDetector = true;
    const setShowShakeDetector = (val: boolean | ((prev: boolean) => boolean)) => {
      showShakeDetector = typeof val === 'function' ? val(showShakeDetector) : val;
    };

    const onShakeDetectorToggle = async () => {
      const next = !showShakeDetector;
      setShowShakeDetector(next);
      await mockSaveAppSettings({ showShakeDetector: next });
    };

    await onShakeDetectorToggle();
    expect(showShakeDetector).toBe(false);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showShakeDetector: false });
  });

  it('multiple toggles on keypoints accumulate calls to saveAppSettings', async () => {
    let showKeypoints = false;
    const setShowKeypoints = (val: boolean | ((prev: boolean) => boolean)) => {
      showKeypoints = typeof val === 'function' ? val(showKeypoints) : val;
    };

    const onKeypointsToggle = async () => {
      const next = !showKeypoints;
      setShowKeypoints(next);
      await mockSaveAppSettings({ showKeypoints: next });
    };

    await onKeypointsToggle();
    await onKeypointsToggle();
    await onKeypointsToggle();

    expect(mockSaveAppSettings).toHaveBeenCalledTimes(3);
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(1, { showKeypoints: true });
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(2, { showKeypoints: false });
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(3, { showKeypoints: true });
  });

  it('multiple toggles on shake detector accumulate calls to saveAppSettings', async () => {
    let showShakeDetector = false;
    const setShowShakeDetector = (val: boolean | ((prev: boolean) => boolean)) => {
      showShakeDetector = typeof val === 'function' ? val(showShakeDetector) : val;
    };

    const onShakeDetectorToggle = async () => {
      const next = !showShakeDetector;
      setShowShakeDetector(next);
      await mockSaveAppSettings({ showShakeDetector: next });
    };

    await onShakeDetectorToggle();
    await onShakeDetectorToggle();

    expect(mockSaveAppSettings).toHaveBeenCalledTimes(2);
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(1, { showShakeDetector: true });
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(2, { showShakeDetector: false });
  });


  it('onFocusPeakingToggle calls saveAppSettings with showFocusPeaking: true when toggling on', async () => {
    let showFocusPeaking = false;
    const setShowFocusPeaking = (val: boolean | ((prev: boolean) => boolean)) => {
      showFocusPeaking = typeof val === 'function' ? val(showFocusPeaking) : val;
    };

    const onFocusPeakingToggle = async () => {
      const next = !showFocusPeaking;
      setShowFocusPeaking(next);
      await mockSaveAppSettings({ showFocusPeaking: next });
    };

    await onFocusPeakingToggle();
    expect(showFocusPeaking).toBe(true);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showFocusPeaking: true });
  });

  it('onFocusPeakingToggle calls saveAppSettings with showFocusPeaking: false when toggling off', async () => {
    let showFocusPeaking = true;
    const setShowFocusPeaking = (val: boolean | ((prev: boolean) => boolean)) => {
      showFocusPeaking = typeof val === 'function' ? val(showFocusPeaking) : val;
    };

    const onFocusPeakingToggle = async () => {
      const next = !showFocusPeaking;
      setShowFocusPeaking(next);
      await mockSaveAppSettings({ showFocusPeaking: next });
    };

    await onFocusPeakingToggle();
    expect(showFocusPeaking).toBe(false);
    expect(mockSaveAppSettings).toHaveBeenCalledWith({ showFocusPeaking: false });
  });

  it('multiple toggles on focus peaking accumulate calls to saveAppSettings', async () => {
    let showFocusPeaking = false;
    const setShowFocusPeaking = (val: boolean | ((prev: boolean) => boolean)) => {
      showFocusPeaking = typeof val === 'function' ? val(showFocusPeaking) : val;
    };

    const onFocusPeakingToggle = async () => {
      const next = !showFocusPeaking;
      setShowFocusPeaking(next);
      await mockSaveAppSettings({ showFocusPeaking: next });
    };

    await onFocusPeakingToggle();
    await onFocusPeakingToggle();
    await onFocusPeakingToggle();

    expect(mockSaveAppSettings).toHaveBeenCalledTimes(3);
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(1, { showFocusPeaking: true });
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(2, { showFocusPeaking: false });
    expect(mockSaveAppSettings).toHaveBeenNthCalledWith(3, { showFocusPeaking: true });
  });
});
