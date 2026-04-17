/**
 * Unit tests for src/utils/parsing.ts
 * Single source of truth for all AI suggestion parsing.
 */

import {
  parseBubbleItemFromText,
  parseBubbleItemsFromTexts,
  parseBubbleItems,
  parseKeypointFromText,
  parseKeypointsFromTexts,
  labelToKeypointPosition,
  BUBBLE_ROUND_ROBIN,
  KEYPOINT_POSITION_MAP,
} from '../utils/parsing';
import type { BubblePosition, KeypointPosition } from '../types';

// ============================================================
// BubbleItem parsing
// ============================================================

describe('parseBubbleItemFromText', () => {
  it('parses bubble item with explicit position tag [左上]', () => {
    const item = parseBubbleItemFromText('[左上] 将主体放在左侧三分线附近', 0);
    expect(item.position).toBe('top-left');
    expect(item.text).toBe('[左上] 将主体放在左侧三分线附近');
    expect(item.id).toBe(0);
  });

  it('parses bubble item with [右上] tag', () => {
    const item = parseBubbleItemFromText('[右上] 右侧留白更平衡', 1);
    expect(item.position).toBe('top-right');
  });

  it('parses bubble item with [左下] tag', () => {
    const item = parseBubbleItemFromText('[左下] 尝试低角度拍摄', 2);
    expect(item.position).toBe('bottom-left');
  });

  it('parses bubble item with [右下] tag', () => {
    const item = parseBubbleItemFromText('[右下] 将趣味中心放在右下', 3);
    expect(item.position).toBe('bottom-right');
  });

  it('parses bubble item with [中间] tag', () => {
    const item = parseBubbleItemFromText('[中间] 保持主体在画面中心', 4);
    expect(item.position).toBe('center');
  });

  it('round-robins through positions for plain text (no tag)', () => {
    // id=0 → top-left, id=1 → top-right, id=2 → bottom-left, id=3 → bottom-right
    expect(parseBubbleItemFromText('这是一条普通建议', 0).position).toBe('top-left');
    expect(parseBubbleItemFromText('这是一条普通建议', 1).position).toBe('top-right');
    expect(parseBubbleItemFromText('这是一条普通建议', 2).position).toBe('bottom-left');
    expect(parseBubbleItemFromText('这是一条普通建议', 3).position).toBe('bottom-right');
  });

  it('plain text wraps around after 4 items', () => {
    expect(parseBubbleItemFromText('普通建议', 4).position).toBe('top-left');
    expect(parseBubbleItemFromText('普通建议', 5).position).toBe('top-right');
  });

  it('explicit tag takes priority over round-robin for plain text id=0', () => {
    // Even though id=0 would give top-left via round-robin, explicit [右上] wins
    const item = parseBubbleItemFromText('[右上] 右侧构图更好', 0);
    expect(item.position).toBe('top-right');
  });

  it('assigns correct id', () => {
    expect(parseBubbleItemFromText('内容', 42).id).toBe(42);
  });

  it('preserves full text including tag', () => {
    const item = parseBubbleItemFromText('[左上] 主体在左侧', 0);
    expect(item.text).toBe('[左上] 主体在左侧');
  });
});

describe('parseBubbleItemsFromTexts', () => {
  it('filters out empty strings', () => {
    const items = parseBubbleItemsFromTexts(['[左上] 第一条', '', '  ', '[右上] 第三条']);
    expect(items.length).toBe(2);
    expect(items[0].text).toBe('[左上] 第一条');
    expect(items[1].text).toBe('[右上] 第三条');
  });

  it('assigns sequential ids starting from 0', () => {
    const items = parseBubbleItemsFromTexts(['第一条', '第二条', '第三条']);
    expect(items[0].id).toBe(0);
    expect(items[1].id).toBe(1);
    expect(items[2].id).toBe(2);
  });

  it('round-robins positions across multiple items', () => {
    const items = parseBubbleItemsFromTexts(['第一', '第二', '第三', '第四', '第五']);
    expect(items[0].position).toBe('top-left');
    expect(items[1].position).toBe('top-right');
    expect(items[2].position).toBe('bottom-left');
    expect(items[3].position).toBe('bottom-right');
    expect(items[4].position).toBe('top-left'); // wraps
  });

  it('returns empty array for empty input', () => {
    expect(parseBubbleItemsFromTexts([])).toEqual([]);
  });

  it('handles whitespace-only strings', () => {
    const items = parseBubbleItemsFromTexts(['内容', '   ', '\t', '更多内容']);
    expect(items.length).toBe(2);
  });
});

describe('parseBubbleItems (alias)', () => {
  it('returns same result as parseBubbleItemsFromTexts', () => {
    const inputs = ['[左上] 第一', '第二', '[右下] 第三'];
    expect(parseBubbleItems(inputs)).toEqual(parseBubbleItemsFromTexts(inputs));
  });
});

// ============================================================
// Keypoint parsing
// ============================================================

describe('parseKeypointFromText', () => {
  it('parses keypoint with label and instruction', () => {
    const kp = parseKeypointFromText('[左上] 将主体放在左侧三分线附近', 0);
    expect(kp).not.toBeNull();
    expect(kp!.id).toBe(0);
    expect(kp!.label).toBe('左上');
    expect(kp!.instruction).toBe('将主体放在左侧三分线附近');
    expect(kp!.position).toBe('top-left');
  });

  it('parses keypoint with center position', () => {
    const kp = parseKeypointFromText('[中间] 保持主体在画面中心', 1);
    expect(kp!.position).toBe('center');
    expect(kp!.label).toBe('中间');
  });

  it('parses keypoint with instruction only (no extra text)', () => {
    const kp = parseKeypointFromText('[右上] 右侧构图', 2);
    expect(kp!.instruction).toBe('右侧构图');
  });

  it('returns null for text without bracketed label format', () => {
    expect(parseKeypointFromText('这不是一个有效的格式', 0)).toBeNull();
  });

  it('returns null for empty text', () => {
    expect(parseKeypointFromText('', 0)).toBeNull();
  });

  it('assigns correct id', () => {
    const kp = parseKeypointFromText('[左上] 内容', 99);
    expect(kp!.id).toBe(99);
  });

  it('handles whitespace inside brackets', () => {
    const kp = parseKeypointFromText('[ 左上 ] 内容', 0);
    expect(kp).not.toBeNull();
    expect(kp!.label).toBe('左上');
  });
});

describe('parseKeypointsFromTexts', () => {
  it('filters out empty strings and null parses', () => {
    const kps = parseKeypointsFromTexts(['[左上] 第一', '', '无效格式', '[右下] 第四']);
    expect(kps.length).toBe(2);
    expect(kps[0].label).toBe('左上');
    expect(kps[1].label).toBe('右下');
  });

  it('assigns sequential ids starting from 0', () => {
    const kps = parseKeypointsFromTexts(['[左上] A', '[右上] B', '[中间] C']);
    expect(kps[0].id).toBe(0);
    expect(kps[1].id).toBe(1);
    expect(kps[2].id).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseKeypointsFromTexts([])).toEqual([]);
  });
});

describe('labelToKeypointPosition', () => {
  it('maps known labels to positions', () => {
    expect(labelToKeypointPosition('左上')).toBe('top-left');
    expect(labelToKeypointPosition('右上')).toBe('top-right');
    expect(labelToKeypointPosition('左下')).toBe('bottom-left');
    expect(labelToKeypointPosition('右下')).toBe('bottom-right');
    expect(labelToKeypointPosition('中间')).toBe('center');
  });

  it('returns center for unknown labels', () => {
    expect(labelToKeypointPosition('随机文本')).toBe('center');
    expect(labelToKeypointPosition('')).toBe('center');
  });

  it('matches partial strings (includes check)', () => {
    // Since it uses label.includes(tag), partial matches work
    expect(labelToKeypointPosition('左上角')).toBe('top-left');
    expect(labelToKeypointPosition('这是左上区域')).toBe('top-left');
  });
});

// ============================================================
// Shared constants
// ============================================================

describe('shared constants', () => {
  it('BUBBLE_ROUND_ROBIN has exactly 4 positions', () => {
    expect(BUBBLE_ROUND_ROBIN).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  });

  it('KEYPOINT_POSITION_MAP covers all 5 positions', () => {
    expect(Object.keys(KEYPOINT_POSITION_MAP)).toHaveLength(5);
    expect(KEYPOINT_POSITION_MAP['左上']).toBe('top-left');
    expect(KEYPOINT_POSITION_MAP['右上']).toBe('top-right');
    expect(KEYPOINT_POSITION_MAP['左下']).toBe('bottom-left');
    expect(KEYPOINT_POSITION_MAP['右下']).toBe('bottom-right');
    expect(KEYPOINT_POSITION_MAP['中间']).toBe('center');
  });
});
