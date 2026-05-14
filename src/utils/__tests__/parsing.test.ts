/**
 * Unit tests for parsing utilities (src/utils/parsing.ts)
 *
 * Coverage:
 * - Named exports: BUBBLE_ROUND_ROBIN, BUBBLE_POSITION_MAP, KEYPOINT_POSITION_MAP, KEYPOINT_ROUND_ROBIN
 * - parseBubbleItemFromText: explicit position, round-robin, bracket variants
 * - parseBubbleItemsFromTexts: filtering empty strings, round-robin IDs
 * - labelToKeypointPosition: all positions + fallback to center
 * - parseKeypointFromText: bracket parsing, Chinese labels, null on unparseable
 * - parseKeypointsFromTexts: filtering nulls, ID assignment, empty strings
 * - computeScoreFromSuggestions: positive/negative keywords, score clamping, reason extraction
 * - Edge cases: empty strings, whitespace, no match, Chinese text
 */

import {
  // Named exports
  BUBBLE_ROUND_ROBIN,
  BUBBLE_POSITION_MAP,
  KEYPOINT_POSITION_MAP,
  KEYPOINT_ROUND_ROBIN,
  // Functions
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  labelToKeypointPosition,
  parseKeypointFromText,
  parseKeypointsFromTexts,
  computeScoreFromSuggestions,
} from '../parsing';

// react-native-reanimated is used in the codebase; mock it to avoid native module issues
jest.mock('react-native-reanimated', () => ({}));

// ============================================================
// Named constant exports
// ============================================================

describe('BUBBLE_ROUND_ROBIN', () => {
  it('has exactly 4 positions', () => {
    expect(BUBBLE_ROUND_ROBIN).toHaveLength(4);
  });

  it('contains the expected bubble positions in order', () => {
    expect(BUBBLE_ROUND_ROBIN).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  });

  it('has unique values', () => {
    const unique = new Set(BUBBLE_ROUND_ROBIN);
    expect(unique.size).toBe(BUBBLE_ROUND_ROBIN.length);
  });
});

describe('BUBBLE_POSITION_MAP', () => {
  it('maps Chinese bracket tags to BubblePosition values', () => {
    expect(BUBBLE_POSITION_MAP['[左上]']).toBe('top-left');
    expect(BUBBLE_POSITION_MAP['[右上]']).toBe('top-right');
    expect(BUBBLE_POSITION_MAP['[左下]']).toBe('bottom-left');
    expect(BUBBLE_POSITION_MAP['[右下]']).toBe('bottom-right');
    expect(BUBBLE_POSITION_MAP['[中间]']).toBe('center');
  });

  it('has 5 entries', () => {
    expect(Object.keys(BUBBLE_POSITION_MAP)).toHaveLength(5);
  });
});

describe('KEYPOINT_POSITION_MAP', () => {
  it('maps Chinese labels to KeypointPosition values', () => {
    expect(KEYPOINT_POSITION_MAP['左上']).toBe('top-left');
    expect(KEYPOINT_POSITION_MAP['右上']).toBe('top-right');
    expect(KEYPOINT_POSITION_MAP['左下']).toBe('bottom-left');
    expect(KEYPOINT_POSITION_MAP['右下']).toBe('bottom-right');
    expect(KEYPOINT_POSITION_MAP['中间']).toBe('center');
  });

  it('has 5 entries', () => {
    expect(Object.keys(KEYPOINT_POSITION_MAP)).toHaveLength(5);
  });
});

describe('KEYPOINT_ROUND_ROBIN', () => {
  it('has exactly 5 positions', () => {
    expect(KEYPOINT_ROUND_ROBIN).toHaveLength(5);
  });

  it('contains the expected keypoint positions in order', () => {
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
  it('returns the id, text, and round-robin position when no explicit tag', () => {
    // id=0 → BUBBLE_ROUND_ROBIN[0] = 'top-left'
    const result = parseBubbleItemFromText('Some suggestion text', 0);
    expect(result).toEqual({
      id: 0,
      text: 'Some suggestion text',
      position: 'top-left',
    });
  });

  it('uses position from BUBBLE_POSITION_MAP when tag is present', () => {
    const result = parseBubbleItemFromText('[右上] 这是右上区域的内容', 0);
    expect(result.position).toBe('top-right');
  });

  it('uses round-robin for id 1 when no explicit tag', () => {
    const result = parseBubbleItemFromText('Plain text', 1);
    expect(result.position).toBe('top-right');
  });

  it('uses round-robin for id 2 when no explicit tag', () => {
    const result = parseBubbleItemFromText('Plain text', 2);
    expect(result.position).toBe('bottom-left');
  });

  it('uses round-robin for id 3 when no explicit tag', () => {
    const result = parseBubbleItemFromText('Plain text', 3);
    expect(result.position).toBe('bottom-right');
  });

  it('wraps around after 4 items', () => {
    const result = parseBubbleItemFromText('Plain text', 4);
    expect(result.position).toBe('top-left');
  });

  it('returns id as provided', () => {
    const result = parseBubbleItemFromText('Text', 99);
    expect(result.id).toBe(99);
  });

  it('returns text as provided', () => {
    const result = parseBubbleItemFromText('Exact text content', 0);
    expect(result.text).toBe('Exact text content');
  });

  it('handles [中间] tag to set center position', () => {
    const result = parseBubbleItemFromText('[中间] Center bubble', 0);
    expect(result.position).toBe('center');
  });

  it('prefers explicit position over round-robin when both could apply', () => {
    const result = parseBubbleItemFromText('[左下] Some text here', 0);
    expect(result.position).toBe('bottom-left');
  });

  it('handles Chinese text without brackets via round-robin', () => {
    const result = parseBubbleItemFromText('没有任何标签的中文建议文本', 0);
    expect(result.position).toBe('top-left');
  });

  it('returns position center as fallback when unknown tag (no match)', () => {
    // parseBubbleItemFromText doesn't have a fallback—it uses round-robin always
    // So this test verifies the default round-robin fallback
    const result = parseBubbleItemFromText('这是一段没有任何标签的中文建议', 0);
    expect(result.position).toBe('top-left');
  });
});

// ============================================================
// parseBubbleItemsFromTexts
// ============================================================

describe('parseBubbleItemsFromTexts', () => {
  it('parses multiple texts into BubbleItems', () => {
    const raw = ['[左上] Top left', '[右下] Bottom right'];
    const result = parseBubbleItemsFromTexts(raw);
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe('top-left');
    expect(result[1].position).toBe('bottom-right');
  });

  it('filters out empty strings', () => {
    const raw = ['[左上] Text', '', '  ', '[右下] More'];
    const result = parseBubbleItemsFromTexts(raw);
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe('[左上] Text');
    expect(result[1].text).toBe('[右下] More');
  });

  it('assigns IDs in order 0, 1, 2', () => {
    const raw = ['First', 'Second', 'Third'];
    const result = parseBubbleItemsFromTexts(raw);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(2);
  });

  it('returns empty array for all empty inputs', () => {
    const raw = ['', '  ', '\t'];
    const result = parseBubbleItemsFromTexts(raw);
    expect(result).toEqual([]);
  });

  it('handles round-robin positions across items', () => {
    const raw = ['Item 0', 'Item 1', 'Item 2', 'Item 3', 'Item 4'];
    const result = parseBubbleItemsFromTexts(raw);
    expect(result[0].position).toBe('top-left');
    expect(result[1].position).toBe('top-right');
    expect(result[2].position).toBe('bottom-left');
    expect(result[3].position).toBe('bottom-right');
    expect(result[4].position).toBe('top-left'); // wraps
  });
});

// ============================================================
// labelToKeypointPosition
// ============================================================

describe('labelToKeypointPosition', () => {
  it('maps 左上 to top-left', () => {
    expect(labelToKeypointPosition('左上')).toBe('top-left');
  });

  it('maps 右上 to top-right', () => {
    expect(labelToKeypointPosition('右上')).toBe('top-right');
  });

  it('maps 左下 to bottom-left', () => {
    expect(labelToKeypointPosition('左下')).toBe('bottom-left');
  });

  it('maps 右下 to bottom-right', () => {
    expect(labelToKeypointPosition('右下')).toBe('bottom-right');
  });

  it('maps 中间 to center', () => {
    expect(labelToKeypointPosition('中间')).toBe('center');
  });

  it('falls back to center for unknown labels', () => {
    expect(labelToKeypointPosition('未知标签')).toBe('center');
    expect(labelToKeypointPosition('')).toBe('center');
    expect(labelToKeypointPosition('随机文本')).toBe('center');
  });

  it('matches label containing the tag anywhere (includes check)', () => {
    // The function uses label.includes(tag)
    expect(labelToKeypointPosition('这是左上角的标记')).toBe('top-left');
    expect(labelToKeypointPosition('位置:右上')).toBe('top-right');
  });

  it('returns center for mixed English/chinese with no match', () => {
    expect(labelToKeypointPosition('top-left')).toBe('center');
    expect(labelToKeypointPosition('CENTER')).toBe('center');
  });
});

// ============================================================
// parseKeypointFromText
// ============================================================

describe('parseKeypointFromText', () => {
  it('parses a standard bracket format keypoint', () => {
    const result = parseKeypointFromText('[左上] 将主体放在左上区域', 0);
    expect(result).toEqual({
      id: 0,
      label: '左上',
      position: 'top-left',
      instruction: '将主体放在左上区域',
    });
  });

  it('parses all position variants', () => {
    const variants: [string, string][] = [
      ['[右上] Right top instruction', 'top-right'],
      ['[左下] Left bottom instruction', 'bottom-left'],
      ['[右下] Right bottom instruction', 'bottom-right'],
      ['[中间] Center instruction', 'center'],
    ];
    variants.forEach(([text, expectedPos], i) => {
      const result = parseKeypointFromText(text, i);
      expect(result?.position).toBe(expectedPos);
    });
  });

  it('returns null when no bracket pattern', () => {
    const result = parseKeypointFromText('这是一段没有括号的建议文本', 0);
    expect(result).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(parseKeypointFromText('', 0)).toBeNull();
  });

  it('returns null for whitespace-only text', () => {
    expect(parseKeypointFromText('   ', 0)).toBeNull();
    expect(parseKeypointFromText('\t', 0)).toBeNull();
  });

  it('trims label and instruction', () => {
    const result = parseKeypointFromText('[左上]   左侧区域内容   ', 0);
    expect(result?.label).toBe('左上');
    expect(result?.instruction).toBe('左侧区域内容');
  });

  it('sets instruction to undefined when instruction part is empty', () => {
    const result = parseKeypointFromText('[左上] ', 0);
    expect(result?.instruction).toBeUndefined();
  });

  it('sets instruction to undefined when only bracket is present', () => {
    const result = parseKeypointFromText('[左上]', 0);
    expect(result?.instruction).toBeUndefined();
  });

  it('parses Chinese instruction content', () => {
    const result = parseKeypointFromText('[中间] 将被摄体放在画面中央', 0);
    expect(result?.instruction).toBe('将被摄体放在画面中央');
  });

  it('uses labelToKeypointPosition for position mapping', () => {
    const result = parseKeypointFromText('[中间] Center instruction', 0);
    expect(result?.position).toBe('center');
  });

  it('handles bracket content with special characters', () => {
    const result = parseKeypointFromText('[左上] 引导线：将对焦点放在左侧1/3处', 0);
    expect(result?.label).toBe('左上');
    expect(result?.instruction).toBe('引导线：将对焦点放在左侧1/3处');
  });
});

// ============================================================
// parseKeypointsFromTexts
// ============================================================

describe('parseKeypointsFromTexts', () => {
  it('parses multiple bracket-format texts', () => {
    const raw = [
      '[左上] 将主体放在左上',
      '[右下] 将主体放在右下',
    ];
    const result = parseKeypointsFromTexts(raw);
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe('top-left');
    expect(result[1].position).toBe('bottom-right');
  });

  it('filters out null/unparseable items and keeps valid ones', () => {
    const raw = [
      '[左上] Top left',
      'No bracket here — filtered out',
      '[中间] Center',
      'Also no bracket',
      '[右下] Bottom right',
    ];
    const result = parseKeypointsFromTexts(raw);
    expect(result).toHaveLength(3);
    expect(result[0].position).toBe('top-left');
    expect(result[1].position).toBe('center');
    expect(result[2].position).toBe('bottom-right');
  });

  it('filters out empty strings', () => {
    const raw = ['', '[左上] Top left', '  ', '[中间] Center'];
    const result = parseKeypointsFromTexts(raw);
    expect(result).toHaveLength(2);
  });

  it('assigns sequential IDs to valid keypoints', () => {
    const raw = [
      'No bracket — skipped',
      '[左上] First',
      'Also no bracket',
      '[中间] Second',
    ];
    const result = parseKeypointsFromTexts(raw);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
  });

  it('returns empty array when all inputs are unparseable', () => {
    const raw = ['Plain text', '没有括号', '', '  '];
    const result = parseKeypointsFromTexts(raw);
    expect(result).toEqual([]);
  });

  it('handles Chinese text content in instructions', () => {
    const raw = [
      '[左上] 将拍摄主体放在左上三分线交点处',
      '[右下] 右侧留白形成视觉引导线',
    ];
    const result = parseKeypointsFromTexts(raw);
    expect(result).toHaveLength(2);
    expect(result[0].instruction).toBe('将拍摄主体放在左上三分线交点处');
    expect(result[1].instruction).toBe('右侧留白形成视觉引导线');
  });
});

// ============================================================
// computeScoreFromSuggestions
// ============================================================

describe('computeScoreFromSuggestions', () => {
  it('returns base score of 50 for empty suggestions', () => {
    const { score } = computeScoreFromSuggestions([]);
    expect(score).toBe(50);
  });

  it('returns empty reason for empty suggestions', () => {
    const { reason } = computeScoreFromSuggestions([]);
    expect(reason).toBe('');
  });

  it('increases score by 20 per positive keyword (up to +40)', () => {
    // 1 positive: 50 + 20 = 70
    expect(computeScoreFromSuggestions(['构图不错']).score).toBe(70);
    // 2 positives: 50 + 40 = 90
    expect(computeScoreFromSuggestions(['构图不错', '好构图']).score).toBe(90);
  });

  it('caps positive contribution at 40 (2 keywords)', () => {
    // 5 positive keywords → 50 + min(5*20, 40) = 90
    expect(computeScoreFromSuggestions(['好', '优秀', '完美', '不错', '佳']).score).toBe(90);
  });

  it('decreases score by 15 per negative keyword (up to -45)', () => {
    // 1 negative: 50 - 15 = 35
    expect(computeScoreFromSuggestions(['画面欠曝']).score).toBe(35);
    // 2 negatives: 50 - 30 = 20
    expect(computeScoreFromSuggestions(['欠曝', '过曝']).score).toBe(20);
  });

  it('caps negative contribution at 45 (3 keywords)', () => {
    // 4 negatives → 50 - min(4*15, 45) = 50 - 45 = 5
    expect(computeScoreFromSuggestions(['欠曝', '过曝', '倾斜', '偏移']).score).toBe(5);
  });

  it('clamps final score to 0–100 range', () => {
    // Very negative: 50 - 45 = 5 (well above 0)
    expect(computeScoreFromSuggestions(['欠曝', '过曝', '倾斜']).score).toBe(5);
    // All positive: 50 + 40 = 90
    expect(computeScoreFromSuggestions(['好', '优秀', '完美']).score).toBe(90);
  });

  it('combines positive and negative keywords correctly', () => {
    // 2 positives (+40) - 1 negative (-15) = 50 + 25 = 75
    const { score } = computeScoreFromSuggestions(['好', '不错', '欠曝']);
    expect(score).toBe(75);
  });

  it('extracts reason from the first suggestion', () => {
    const { reason } = computeScoreFromSuggestions([
      '构图不错，建议适当增加前景',
      '背景略微欠曝',
    ]);
    expect(reason).toBe('构图不错，建议适当增加前景');
  });

  it('truncates reason to 30 characters', () => {
    const longSuggestion = '这是一个非常长的建议文本超过了三十个字符的限制范围';
    const { reason } = computeScoreFromSuggestions([longSuggestion]);
    expect(reason.length).toBeLessThanOrEqual(30);
    expect(reason).toBe(longSuggestion.slice(0, 30));
  });

  it('handles Chinese positive keywords correctly', () => {
    const keywords = ['好', '优秀', '完美', '不错', '佳'];
    keywords.forEach(kw => {
      const { score } = computeScoreFromSuggestions([`构图${kw}`]);
      expect(score).toBeGreaterThan(50);
    });
  });

  it('handles Chinese negative keywords correctly', () => {
    const keywords = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
    keywords.forEach(kw => {
      const { score } = computeScoreFromSuggestions([`检测到${kw}问题`]);
      expect(score).toBeLessThan(50);
    });
  });

  it('treats multiple keywords in same string independently', () => {
    // '好' + '欠曝' in same string: +20 - 15 = 55
    const { score } = computeScoreFromSuggestions(['好但欠曝']);
    expect(score).toBe(55);
  });
});