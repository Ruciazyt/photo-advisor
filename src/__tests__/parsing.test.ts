/**
 * Unit tests for src/utils/parsing.ts
 * Tests parseBubbleItemFromText, parseBubbleItemsFromTexts,
 * parseKeypointFromText, parseKeypointsFromTexts, labelToKeypointPosition.
 */

import {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  parseBubbleItems,
  labelToKeypointPosition,
  parseKeypointFromText,
  parseKeypointsFromTexts,
  BUBBLE_POSITION_MAP,
  KEYPOINT_POSITION_MAP,
} from '../utils/parsing';

describe('parseBubbleItemFromText', () => {
  it('assigns round-robin positions when no explicit tag', () => {
    // id 0 → top-left, id 1 → top-right, id 2 → bottom-left, id 3 → bottom-right
    const b0 = parseBubbleItemFromText('照片构图不错', 0);
    expect(b0.position).toBe('top-left');

    const b1 = parseBubbleItemFromText('照片构图不错', 1);
    expect(b1.position).toBe('top-right');

    const b2 = parseBubbleItemFromText('照片构图不错', 2);
    expect(b2.position).toBe('bottom-left');

    const b3 = parseBubbleItemFromText('照片构图不错', 3);
    expect(b3.position).toBe('bottom-right');
  });

  it('round-robin cycles back for id=4 (second cycle starts at top-left)', () => {
    // BUBBLE_ROUND_ROBIN has 4 positions: ['top-left','top-right','bottom-left','bottom-right']
    // id % 4 = 0 → second cycle starts at top-left
    const b4 = parseBubbleItemFromText('照片构图不错', 4);
    expect(b4.position).toBe('top-left');

    const b5 = parseBubbleItemFromText('照片构图不错', 5);
    expect(b5.position).toBe('top-right');

    const b6 = parseBubbleItemFromText('照片构图不错', 6);
    expect(b6.position).toBe('bottom-left');

    const b7 = parseBubbleItemFromText('照片构图不错', 7);
    expect(b7.position).toBe('bottom-right');
  });

  it('parses explicit [左上] tag', () => {
    const b = parseBubbleItemFromText('[左上] 将主体放在左侧', 0);
    expect(b.position).toBe('top-left');
    expect(b.text).toBe('[左上] 将主体放在左侧');
  });

  it('parses explicit [右上] tag', () => {
    const b = parseBubbleItemFromText('[右上] 画面略微偏右', 0);
    expect(b.position).toBe('top-right');
  });

  it('parses explicit [左下] tag', () => {
    const b = parseBubbleItemFromText('[左下] 底部留白过多', 0);
    expect(b.position).toBe('bottom-left');
  });

  it('parses explicit [右下] tag', () => {
    const b = parseBubbleItemFromText('[右下] 右侧空间不足', 0);
    expect(b.position).toBe('bottom-right');
  });

  it('parses explicit [中间] tag', () => {
    const b = parseBubbleItemFromText('[中间] 主体居中但略显偏上', 0);
    expect(b.position).toBe('center');
  });

  it('explicit tag takes precedence over round-robin', () => {
    // Even with id=99 (would be 'center' via round-robin), [左上] forces top-left
    const b = parseBubbleItemFromText('[左上] 主体靠左', 99);
    expect(b.position).toBe('top-left');
  });

  it('preserves the original text unchanged', () => {
    const text = '[左上] 测试文字内容';
    const b = parseBubbleItemFromText(text, 0);
    expect(b.text).toBe(text);
    expect(b.id).toBe(0);
  });
});

describe('parseBubbleItemsFromTexts (and parseBubbleItems alias)', () => {
  it('returns empty array for empty input', () => {
    expect(parseBubbleItemsFromTexts([])).toEqual([]);
  });

  it('filters out empty/whitespace-only strings', () => {
    const result = parseBubbleItemsFromTexts(['有效建议', '  ', '', '  \n  ']);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('有效建议');
  });

  it('assigns sequential ids starting from 0', () => {
    const result = parseBubbleItemsFromTexts(['建议1', '建议2', '建议3']);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(2);
  });

  it('parses position tags correctly', () => {
    const result = parseBubbleItemsFromTexts(['[右上] 靠右', '[左下] 靠下']);
    expect(result[0].position).toBe('top-right');
    expect(result[1].position).toBe('bottom-left');
  });

  it('parseBubbleItems is an alias for parseBubbleItemsFromTexts', () => {
    const input = ['[中间] 居中', '靠边'];
    expect(parseBubbleItems(input)).toEqual(parseBubbleItemsFromTexts(input));
  });
});

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
    expect(labelToKeypointPosition('随机文字')).toBe('center');
    expect(labelToKeypointPosition('')).toBe('center');
  });

  it('partial match works (label contains the key)', () => {
    expect(labelToKeypointPosition('左上区域')).toBe('top-left');
    expect(labelToKeypointPosition('这是左上角的说明')).toBe('top-left');
  });
});

describe('parseKeypointFromText', () => {
  it('parses [标签] 内容的 format correctly', () => {
    const result = parseKeypointFromText('[左上] 将主体放在左侧三分线', 0);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('左上');
    expect(result!.instruction).toBe('将主体放在左侧三分线');
    expect(result!.position).toBe('top-left');
    expect(result!.id).toBe(0);
  });

  it('returns null when no bracketed label is found', () => {
    expect(parseKeypointFromText('没有标签的建议', 0)).toBeNull();
    expect(parseKeypointFromText('[左上]有内容', 0)).not.toBeNull(); // has bracket
  });

  it('handles whitespace after bracket and before content', () => {
    const result = parseKeypointFromText('[右上]    稍微靠右    ', 0);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('右上');
    expect(result!.instruction).toBe('稍微靠右');
  });

  it('returns undefined for empty instruction (valid tag, no content)', () => {
    // [左上] has a valid label but no instruction text — not null, instruction is undefined
    const result = parseKeypointFromText('[左上]', 0);
    expect(result).not.toBeNull();
    expect(result!.label).toBe('左上');
    expect(result!.instruction).toBeUndefined();
    expect(result!.position).toBe('top-left');
  });

  it('returns null for blank-only text', () => {
    // '   ' does not match the [标签] 内容 format, so it returns null
    expect(parseKeypointFromText('   ', 0)).toBeNull();
    // Single space: still no [ bracket, so null
    expect(parseKeypointFromText(' ', 0)).toBeNull();
  });

  it('instruction is optional (undefined when empty)', () => {
    const result = parseKeypointFromText('[中间]主体居中', 0);
    expect(result).not.toBeNull();
    expect(result!.instruction).toBe('主体居中');
  });
});

describe('parseKeypointsFromTexts', () => {
  it('returns empty array for empty input', () => {
    expect(parseKeypointsFromTexts([])).toEqual([]);
  });

  it('filters out items that cannot be parsed', () => {
    const result = parseKeypointsFromTexts([
      '[左上] 有效',
      '无效标签',
      '[右下] 有效',
      '',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('左上');
    expect(result[1].label).toBe('右下');
  });

  it('assigns sequential ids only to parseable items', () => {
    // id should only increment for successfully parsed keypoints
    const result = parseKeypointsFromTexts([
      '[左上] 有效1',
      '跳过',
      '也跳过',
      '[右下] 有效2',
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1); // id=1 not 2 (only 2 parseable items)
  });

  it('filters out whitespace-only strings before parsing', () => {
    const result = parseKeypointsFromTexts(['[左上] 有效', '  ', '[右下] 也有效']);
    expect(result).toHaveLength(2);
  });

  it('returns empty when all items are unparseable', () => {
    const result = parseKeypointsFromTexts(['没有标签', '也是无效']);
    expect(result).toEqual([]);
  });
});

describe('BUBBLE_POSITION_MAP coverage', () => {
  it('contains all expected position tags', () => {
    expect(BUBBLE_POSITION_MAP).toEqual({
      '[左上]': 'top-left',
      '[右上]': 'top-right',
      '[左下]': 'bottom-left',
      '[右下]': 'bottom-right',
      '[中间]': 'center',
    });
  });
});

describe('KEYPOINT_POSITION_MAP coverage', () => {
  it('contains all expected label mappings', () => {
    expect(KEYPOINT_POSITION_MAP).toEqual({
      '左上': 'top-left',
      '右上': 'top-right',
      '左下': 'bottom-left',
      '右下': 'bottom-right',
      '中间': 'center',
    });
  });
});