import {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  parseBubbleItems,
  labelToKeypointPosition,
  parseKeypointFromText,
  parseKeypointsFromTexts,
  computeScoreFromSuggestions,
  BUBBLE_ROUND_ROBIN,
  BUBBLE_POSITION_MAP,
  KEYPOINT_POSITION_MAP,
  KEYPOINT_ROUND_ROBIN,
} from '../parsing';

jest.mock('react-native-reanimated', () => ({}));

describe('parsing utils', () => {
  // ============================================================
  // Named constant exports
  // ============================================================

  describe('BUBBLE_ROUND_ROBIN', () => {
    it('contains 4 positions in correct order', () => {
      expect(BUBBLE_ROUND_ROBIN).toEqual([
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]);
    });
  });

  describe('BUBBLE_POSITION_MAP', () => {
    it('maps all 5 Chinese tags to BubblePosition values', () => {
      expect(BUBBLE_POSITION_MAP['[左上]']).toBe('top-left');
      expect(BUBBLE_POSITION_MAP['[右上]']).toBe('top-right');
      expect(BUBBLE_POSITION_MAP['[左下]']).toBe('bottom-left');
      expect(BUBBLE_POSITION_MAP['[右下]']).toBe('bottom-right');
      expect(BUBBLE_POSITION_MAP['[中间]']).toBe('center');
    });
  });

  describe('KEYPOINT_POSITION_MAP', () => {
    it('maps all 5 Chinese labels to KeypointPosition values', () => {
      expect(KEYPOINT_POSITION_MAP['左上']).toBe('top-left');
      expect(KEYPOINT_POSITION_MAP['右上']).toBe('top-right');
      expect(KEYPOINT_POSITION_MAP['左下']).toBe('bottom-left');
      expect(KEYPOINT_POSITION_MAP['右下']).toBe('bottom-right');
      expect(KEYPOINT_POSITION_MAP['中间']).toBe('center');
    });
  });

  describe('KEYPOINT_ROUND_ROBIN', () => {
    it('contains 5 positions in correct order', () => {
      expect(KEYPOINT_ROUND_ROBIN).toEqual([
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
        'center',
      ]);
    });
  });

  // ============================================================
  // parseBubbleItemFromText
  // ============================================================

  describe('parseBubbleItemFromText', () => {
    it('parses explicit [左上] tag', () => {
      const item = parseBubbleItemFromText('[左上] 调整构图', 0);
      expect(item).toEqual({ id: 0, text: '[左上] 调整构图', position: 'top-left' });
    });

    it('parses explicit [右上] tag', () => {
      const item = parseBubbleItemFromText('[右上] 靠右站', 1);
      expect(item).toEqual({ id: 1, text: '[右上] 靠右站', position: 'top-right' });
    });

    it('parses explicit [左下] tag', () => {
      const item = parseBubbleItemFromText('[左下] 底部留白', 2);
      expect(item).toEqual({ id: 2, text: '[左下] 底部留白', position: 'bottom-left' });
    });

    it('parses explicit [右下] tag', () => {
      const item = parseBubbleItemFromText('[右下] 右侧边缘', 3);
      expect(item).toEqual({ id: 3, text: '[右下] 右侧边缘', position: 'bottom-right' });
    });

    it('parses explicit [中间] tag', () => {
      const item = parseBubbleItemFromText('[中间] 居中放置', 4);
      expect(item).toEqual({ id: 4, text: '[中间] 居中放置', position: 'center' });
    });

    it('falls back to round-robin when no tag is present', () => {
      // id=0 → BUBBLE_ROUND_ROBIN[0] = 'top-left'
      expect(parseBubbleItemFromText('some suggestion', 0).position).toBe('top-left');
      // id=1 → 'top-right'
      expect(parseBubbleItemFromText('some suggestion', 1).position).toBe('top-right');
      // id=2 → 'bottom-left'
      expect(parseBubbleItemFromText('some suggestion', 2).position).toBe('bottom-left');
      // id=3 → 'bottom-right'
      expect(parseBubbleItemFromText('some suggestion', 3).position).toBe('bottom-right');
      // id=4 → wraps around to 'top-left'
      expect(parseBubbleItemFromText('some suggestion', 4).position).toBe('top-left');
    });

    it('explicit tag takes precedence over round-robin', () => {
      // id=0 would be top-left, but [右下] overrides
      const item = parseBubbleItemFromText('[右下] 右侧', 0);
      expect(item.position).toBe('bottom-right');
    });

    it('handles Chinese text content', () => {
      const item = parseBubbleItemFromText('[左上] 光线优秀，构图完美', 0);
      expect(item.text).toBe('[左上] 光线优秀，构图完美');
      expect(item.position).toBe('top-left');
    });

    it('handles English text content', () => {
      const item = parseBubbleItemFromText('adjust composition here', 0);
      expect(item.text).toBe('adjust composition here');
      expect(item.id).toBe(0);
    });
  });

  // ============================================================
  // parseBubbleItemsFromTexts (and alias parseBubbleItems)
  // ============================================================

  describe('parseBubbleItemsFromTexts', () => {
    it('parses multiple texts with explicit positions', () => {
      const items = parseBubbleItemsFromTexts(['[左上] a', '[右下] b', '[中间] c']);
      expect(items).toHaveLength(3);
      expect(items[0].position).toBe('top-left');
      expect(items[1].position).toBe('bottom-right');
      expect(items[2].position).toBe('center');
    });

    it('filters out empty strings', () => {
      const items = parseBubbleItemsFromTexts(['[左上] a', '', '   ', '[中间] c']);
      expect(items).toHaveLength(2);
      expect(items[0].text).toBe('[左上] a');
      expect(items[1].text).toBe('[中间] c');
    });

    it('applies round-robin to plain texts', () => {
      const items = parseBubbleItemsFromTexts(['plain 1', 'plain 2', 'plain 3']);
      expect(items[0].position).toBe('top-left');
      expect(items[1].position).toBe('top-right');
      expect(items[2].position).toBe('bottom-left');
    });

    it('returns empty array for all-empty input', () => {
      expect(parseBubbleItemsFromTexts([])).toEqual([]);
      expect(parseBubbleItemsFromTexts(['', '  '])).toEqual([]);
    });

    it('preserves id as index among non-filtered items', () => {
      const items = parseBubbleItemsFromTexts(['[左上] a', '', 'plain c']);
      expect(items[0].id).toBe(0);
      expect(items[1].id).toBe(1); // plain text gets id=1
    });
  });

  describe('parseBubbleItems (alias)', () => {
    it('is the same function as parseBubbleItemsFromTexts', () => {
      expect(parseBubbleItems).toBe(parseBubbleItemsFromTexts);
    });
  });

  // ============================================================
  // labelToKeypointPosition
  // ============================================================

  describe('labelToKeypointPosition', () => {
    it('maps all known labels', () => {
      expect(labelToKeypointPosition('左上')).toBe('top-left');
      expect(labelToKeypointPosition('右上')).toBe('top-right');
      expect(labelToKeypointPosition('左下')).toBe('bottom-left');
      expect(labelToKeypointPosition('右下')).toBe('bottom-right');
      expect(labelToKeypointPosition('中间')).toBe('center');
    });

    it('returns center for unknown labels', () => {
      expect(labelToKeypointPosition('随机文本')).toBe('center');
      expect(labelToKeypointPosition('')).toBe('center');
      expect(labelToKeypointPosition('上部')).toBe('center');
    });

    it('matches labels that appear anywhere in the string', () => {
      expect(labelToKeypointPosition('前景左上区域')).toBe('top-left');
      expect(labelToKeypointPosition('右上角')).toBe('top-right');
    });
  });

  // ============================================================
  // parseKeypointFromText
  // ============================================================

  describe('parseKeypointFromText', () => {
    it('parses standard [标签] 内容 format', () => {
      const kp = parseKeypointFromText('[左上] 放置主体在这里', 0);
      expect(kp).toEqual({
        id: 0,
        label: '左上',
        position: 'top-left',
        instruction: '放置主体在这里',
      });
    });

    it('parses [中间] label', () => {
      const kp = parseKeypointFromText('[中间] 居中', 5);
      expect(kp).toEqual({
        id: 5,
        label: '中间',
        position: 'center',
        instruction: '居中',
      });
    });

    it('handles whitespace after bracket', () => {
      const kp = parseKeypointFromText('[右上]   稍微靠右   ', 1);
      expect(kp?.position).toBe('top-right');
      expect(kp?.instruction).toBe('稍微靠右');
    });

    it('returns null when no bracket pattern matches', () => {
      expect(parseKeypointFromText('plain text without brackets', 0)).toBeNull();
      expect(parseKeypointFromText('no opening bracket]', 1)).toBeNull();
      expect(parseKeypointFromText('[tag only', 2)).toBeNull();
    });

    it('handles empty instruction (content after bracket is empty)', () => {
      const kp = parseKeypointFromText('[左上]', 0);
      expect(kp?.label).toBe('左上');
      expect(kp?.instruction).toBeUndefined();
    });

    it('handles Chinese text in label and instruction', () => {
      const kp = parseKeypointFromText('[左下] 光线优秀构图完美', 0);
      expect(kp?.label).toBe('左下');
      expect(kp?.position).toBe('bottom-left');
      expect(kp?.instruction).toBe('光线优秀构图完美');
    });

    it('returns null for empty string', () => {
      expect(parseKeypointFromText('', 0)).toBeNull();
    });
  });

  // ============================================================
  // parseKeypointsFromTexts
  // ============================================================

  describe('parseKeypointsFromTexts', () => {
    it('parses valid keypoint texts', () => {
      const kps = parseKeypointsFromTexts(['[左上] a', '[右下] b']);
      expect(kps).toHaveLength(2);
      expect(kps[0].position).toBe('top-left');
      expect(kps[1].position).toBe('bottom-right');
    });

    it('filters out empty strings', () => {
      const kps = parseKeypointsFromTexts(['[左上] a', '', '   ', '[中间] c']);
      expect(kps).toHaveLength(2);
    });

    it('filters out unparseable items (no bracket)', () => {
      const kps = parseKeypointsFromTexts(['[左上] good', 'plain bad', '[中间] good too']);
      expect(kps).toHaveLength(2);
      expect(kps[0].id).toBe(0);
      expect(kps[1].id).toBe(1);
    });

    it('assigns sequential ids skipping invalid entries', () => {
      const kps = parseKeypointsFromTexts(['[左上] first', 'invalid', '[中间] third']);
      expect(kps).toHaveLength(2);
      expect(kps[0].id).toBe(0);
      expect(kps[1].id).toBe(1); // id=1 not 2 (invalid entry skipped)
    });

    it('returns empty array for all-empty input', () => {
      expect(parseKeypointsFromTexts([])).toEqual([]);
      expect(parseKeypointsFromTexts(['', '  '])).toEqual([]);
    });
  });

  // ============================================================
  // computeScoreFromSuggestions
  // ============================================================

  describe('computeScoreFromSuggestions', () => {
    it('returns base score of 50 with no suggestions', () => {
      const result = computeScoreFromSuggestions([]);
      expect(result.score).toBe(50);
      expect(result.reason).toBe('');
    });

    it('increases score for positive keywords', () => {
      // +20 per positive keyword, capped at +40
      const result = computeScoreFromSuggestions(['光线好', '构图不错']);
      expect(result.score).toBeGreaterThan(50);
      // 50 + min(2*20, 40) = 50+40 = 90
      expect(result.score).toBe(90);
    });

    it('decreases score for negative keywords', () => {
      // -15 per negative, capped at -45
      const result = computeScoreFromSuggestions(['有点欠曝', '构图不足']);
      // 50 - min(2*15, 45) = 50 - 30 = 20
      expect(result.score).toBe(20);
    });

    it('caps positive bonus at +40', () => {
      // 4 positive keywords → min(4*20, 40) = 40
      const result = computeScoreFromSuggestions(['好', '优秀', '完美', '不错']);
      expect(result.score).toBe(90); // 50+40
    });

    it('caps negative penalty at -45', () => {
      // 4 negative keywords → min(4*15, 45) = 45
      const result = computeScoreFromSuggestions(['欠曝', '过曝', '倾斜', '偏移']);
      expect(result.score).toBe(5); // 50-45
    });

    it('clips score to 0 minimum', () => {
      const result = computeScoreFromSuggestions(['欠曝', '过曝', '倾斜', '偏移', '不足']);
      // 5 negatives: 50 - min(5*15, 45) = 50-45 = 5 → but also clips above 100
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('clips score to 100 maximum', () => {
      const result = computeScoreFromSuggestions(['好', '优秀', '完美', '不错', '佳', '好', '优秀']);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('generates reason from first suggestion', () => {
      const result = computeScoreFromSuggestions(['[左上] 光线好构图完美', '构图中']);
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('reason is max 30 characters', () => {
      const longText = '这是一段很长的建议文本用于测试截断功能是否正常工作';
      const result = computeScoreFromSuggestions([longText]);
      expect(result.reason.length).toBeLessThanOrEqual(30);
    });

    it('handles mixed positive and negative', () => {
      const result = computeScoreFromSuggestions(['光线好但有点欠曝', '构图优秀', '稍微偏移']);
      // 2 positive, 2 negative → 50 + min(2*20,40) - min(2*15,45) = 50+40-30 = 60
      expect(result.score).toBe(60);
    });
  });
});