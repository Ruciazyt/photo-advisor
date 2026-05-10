/**
 * Unit tests for src/utils/parsing.ts
 * Shared parsing utilities for converting raw AI suggestion strings into
 * structured BubbleItem and Keypoint objects.
 */

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
  KEYPOINT_ROUND_ROBIN,
  KEYPOINT_POSITION_MAP,
} from '../utils/parsing';
import type { BubbleItem, Keypoint } from '../types';

describe('parsing constants', () => {
  describe('BUBBLE_ROUND_ROBIN', () => {
    it('contains 4 positions in expected order', () => {
      expect(BUBBLE_ROUND_ROBIN).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
    });
  });

  describe('BUBBLE_POSITION_MAP', () => {
    it('maps Chinese position tags to BubblePosition values', () => {
      expect(BUBBLE_POSITION_MAP['[左上]']).toBe('top-left');
      expect(BUBBLE_POSITION_MAP['[右上]']).toBe('top-right');
      expect(BUBBLE_POSITION_MAP['[左下]']).toBe('bottom-left');
      expect(BUBBLE_POSITION_MAP['[右下]']).toBe('bottom-right');
      expect(BUBBLE_POSITION_MAP['[中间]']).toBe('center');
    });
  });

  describe('KEYPOINT_ROUND_ROBIN', () => {
    it('contains 5 positions in expected order', () => {
      expect(KEYPOINT_ROUND_ROBIN).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center']);
    });
  });

  describe('KEYPOINT_POSITION_MAP', () => {
    it('maps Chinese label strings to KeypointPosition values', () => {
      expect(KEYPOINT_POSITION_MAP['左上']).toBe('top-left');
      expect(KEYPOINT_POSITION_MAP['右上']).toBe('top-right');
      expect(KEYPOINT_POSITION_MAP['左下']).toBe('bottom-left');
      expect(KEYPOINT_POSITION_MAP['右下']).toBe('bottom-right');
      expect(KEYPOINT_POSITION_MAP['中间']).toBe('center');
    });
  });
});

describe('parseBubbleItemFromText', () => {
  it('returns a BubbleItem with auto-assigned position via round-robin', () => {
    const item = parseBubbleItemFromText('Some suggestion text', 0);
    expect(item.id).toBe(0);
    expect(item.text).toBe('Some suggestion text');
    expect(item.position).toBe('top-left'); // id=0 → BUBBLE_ROUND_ROBIN[0]
  });

  it('assigns positions round-robin based on id', () => {
    expect(parseBubbleItemFromText('text', 0).position).toBe('top-left');
    expect(parseBubbleItemFromText('text', 1).position).toBe('top-right');
    expect(parseBubbleItemFromText('text', 2).position).toBe('bottom-left');
    expect(parseBubbleItemFromText('text', 3).position).toBe('bottom-right');
    expect(parseBubbleItemFromText('text', 4).position).toBe('top-left'); // wraps around
  });

  it('overrides position when text contains explicit position tag', () => {
    expect(parseBubbleItemFromText('[左上] place subject here', 1).position).toBe('top-left');
    expect(parseBubbleItemFromText('[右上] adjust angle', 0).position).toBe('top-right');
    expect(parseBubbleItemFromText('[左下] watch the background', 2).position).toBe('bottom-left');
    expect(parseBubbleItemFromText('[右下] fill the frame', 3).position).toBe('bottom-right');
    expect(parseBubbleItemFromText('[中间] center the subject', 0).position).toBe('center');
  });

  it('uses first matching tag when multiple tags present', () => {
    const item = parseBubbleItemFromText('[左上][右上] text with multiple tags', 0);
    // Should match [左上] first since it's checked first in Object.entries iteration
    expect(item.position).toBe('top-left');
  });

  it('returns correct BubbleItem structure', () => {
    const item = parseBubbleItemFromText('Hello world', 5);
    expect(item).toHaveProperty('id', 5);
    expect(item).toHaveProperty('text', 'Hello world');
    expect(item).toHaveProperty('position');
  });
});

describe('parseBubbleItemsFromTexts', () => {
  it('returns empty array for empty input', () => {
    expect(parseBubbleItemsFromTexts([])).toEqual([]);
  });

  it('filters out empty strings', () => {
    const result = parseBubbleItemsFromTexts(['first', '', '  ', 'second']);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe('first');
    expect(result[1].text).toBe('second');
  });

  it('parses all non-empty items with incrementing ids', () => {
    const result = parseBubbleItemsFromTexts(['item a', 'item b', 'item c']);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(2);
  });

  it('handles single item', () => {
    const result = parseBubbleItemsFromTexts(['only one']);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('only one');
    expect(result[0].id).toBe(0);
  });

  it('parses explicit position tags', () => {
    const result = parseBubbleItemsFromTexts(['[右上] look here', 'then here']);
    expect(result[0].position).toBe('top-right'); // explicit tag overrides round-robin
    expect(result[1].position).toBe('top-right'); // id=1 → round-robin[1] = 'top-right'
  });
});

describe('parseBubbleItems (alias)', () => {
  it('parseBubbleItems is an alias for parseBubbleItemsFromTexts', () => {
    expect(parseBubbleItems).toBe(parseBubbleItemsFromTexts);
  });
});

describe('labelToKeypointPosition', () => {
  it('maps Chinese labels to KeypointPosition values', () => {
    expect(labelToKeypointPosition('左上')).toBe('top-left');
    expect(labelToKeypointPosition('右上')).toBe('top-right');
    expect(labelToKeypointPosition('左下')).toBe('bottom-left');
    expect(labelToKeypointPosition('右下')).toBe('bottom-right');
    expect(labelToKeypointPosition('中间')).toBe('center');
  });

  it('returns center for unknown labels', () => {
    expect(labelToKeypointPosition('random')).toBe('center');
    expect(labelToKeypointPosition('')).toBe('center');
  });

  it('matches partial strings (includes check)', () => {
    // The function uses label.includes(tag), so partial matches work
    expect(labelToKeypointPosition('左上角')).toBe('top-left');
    expect(labelToKeypointPosition('右上部分')).toBe('top-right');
  });
});

describe('parseKeypointFromText', () => {
  it('parses valid keypoint text in "[标签] 内容" format', () => {
    const kp = parseKeypointFromText('[主体] 放在画面中央', 0);
    expect(kp).not.toBeNull();
    expect(kp!.id).toBe(0);
    expect(kp!.label).toBe('主体');
    expect(kp!.instruction).toBe('放在画面中央');
    expect(kp!.position).toBe('center');
  });

  it('returns null for text without bracketed label', () => {
    expect(parseKeypointFromText('no bracket here', 0)).toBeNull();
    expect(parseKeypointFromText('plain text', 1)).toBeNull();
    expect(parseKeypointFromText('', 0)).toBeNull();
  });

  it('extracts position from label via labelToKeypointPosition', () => {
    expect(parseKeypointFromText('[左上] 靠左一点', 0)!.position).toBe('top-left');
    expect(parseKeypointFromText('[右上] 靠右一点', 0)!.position).toBe('top-right');
    expect(parseKeypointFromText('[左下] 往下一点', 0)!.position).toBe('bottom-left');
    expect(parseKeypointFromText('[右下] 往右下', 0)!.position).toBe('bottom-right');
  });

  it('handles whitespace in label and instruction', () => {
    // Label and instruction are trimmed after extraction, but the [ must be at start of string
    const kp = parseKeypointFromText('[ 主体 ]   放在画面中央  ', 0);
    expect(kp).not.toBeNull();
    expect(kp!.label).toBe('主体');
    expect(kp!.instruction).toBe('放在画面中央');
  });

  it('sets instruction to undefined when instruction is empty', () => {
    const kp = parseKeypointFromText('[主体]', 0);
    expect(kp).not.toBeNull();
    expect(kp!.label).toBe('主体');
    expect(kp!.instruction).toBeUndefined();
  });

  it('returns null for text that starts with ] (malformed bracket)', () => {
    expect(parseKeypointFromText('[missing opening', 0)).toBeNull();
  });

  it('returns correct Keypoint structure for valid input', () => {
    const kp = parseKeypointFromText('[前景] add foreground interest', 7);
    expect(kp).toHaveProperty('id', 7);
    expect(kp).toHaveProperty('label', '前景');
    expect(kp).toHaveProperty('position', 'center');
    expect(kp).toHaveProperty('instruction', 'add foreground interest');
  });
});

describe('parseKeypointsFromTexts', () => {
  it('returns empty array for empty input', () => {
    expect(parseKeypointsFromTexts([])).toEqual([]);
  });

  it('filters out empty strings', () => {
    const result = parseKeypointsFromTexts(['[主体] first', '', '  ', '[背景] second']);
    expect(result.length).toBe(2);
    expect(result[0].label).toBe('主体');
    expect(result[1].label).toBe('背景');
  });

  it('filters out unparseable items', () => {
    const result = parseKeypointsFromTexts(['[主体] good', 'bad line', '[前景] also good']);
    expect(result.length).toBe(2);
  });

  it('assigns incrementing ids only to valid parseable items', () => {
    const result = parseKeypointsFromTexts(['[A] first', 'skip', '[B] second', 'also skip', '[C] third']);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe(0);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(2);
  });

  it('handles all valid keypoint types', () => {
    const texts = [
      '[左上] top-left',
      '[右上] top-right',
      '[左下] bottom-left',
      '[右下] bottom-right',
      '[中间] center',
    ];
    const result = parseKeypointsFromTexts(texts);
    expect(result.length).toBe(5);
    expect(result.map(r => r.position)).toEqual([
      'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center',
    ]);
  });
});

describe('computeScoreFromSuggestions', () => {
  it('returns base score of 50 for empty array', () => {
    const { score, reason } = computeScoreFromSuggestions([]);
    expect(score).toBe(50);
    expect(reason).toBe('');
  });

  it('increases score for positive keywords', () => {
    const { score } = computeScoreFromSuggestions(['这个不错', '构图优秀', '光线好']);
    // Each suggestion: '不错' (+20), '优秀' (+20), '好' (+20) = +60
    // 50 + 60 = 110 → clamped to 100
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('decreases score for negative keywords', () => {
    const { score } = computeScoreFromSuggestions(['欠曝了', '过曝', '构图倾斜']);
    // -15 * 3 = -45 → 50 - 45 = 5
    expect(score).toBe(5);
  });

  it('caps positive contribution at +40 (2 keywords max)', () => {
    // Each positive keyword adds up to +20, capped at +40 (2 keywords)
    const texts = ['好', '不错', '佳', '完美', '优秀'];
    const { score } = computeScoreFromSuggestions(texts);
    // 5 positives, but only +40 cap applied → 50 + 40 = 90
    expect(score).toBe(90);
  });

  it('caps negative contribution at -45 (3 keywords max)', () => {
    // Each negative keyword subtracts up to 15, capped at -45 (3 keywords)
    const texts = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
    const { score } = computeScoreFromSuggestions(texts);
    // 5 negatives, but only -45 cap applied → 50 - 45 = 5
    expect(score).toBe(5);
  });

  it('combines positive and negative keywords', () => {
    const { score } = computeScoreFromSuggestions(['好', '欠曝']);
    // +20 - 15 = +5 → 50 + 5 = 55
    expect(score).toBe(55);
  });

  it('caps positive contribution at 40 (2 keywords max)', () => {
    // Each positive keyword adds up to +20, capped at +40 (2 keywords)
    const texts = ['好', '不错', '佳', '完美', '优秀'];
    const { score } = computeScoreFromSuggestions(texts);
    // 5 positives, but only +40 cap applied → 50 + 40 = 90
    expect(score).toBe(90);
  });

  it('caps negative contribution at 45 (3 keywords max)', () => {
    // Each negative keyword subtracts up to 15, capped at -45 (3 keywords)
    const texts = ['欠曝', '过曝', '倾斜', '偏移', '不足'];
    const { score } = computeScoreFromSuggestions(texts);
    // 5 negatives, but only -45 cap applied → 50 - 45 = 5
    expect(score).toBe(5);
  });

  it('extracts reason from first suggestion', () => {
    const { reason } = computeScoreFromSuggestions(['[主体] 放在中央', 'some other text']);
    // Removes leading non-Chinese characters, then takes first 30 chars
    expect(reason).toBe('主体] 放在中央'.slice(0, 30));
  });

  it('returns empty reason for empty suggestions', () => {
    const { reason } = computeScoreFromSuggestions([]);
    expect(reason).toBe('');
  });

  it('handles suggestions without bracket prefix for reason extraction', () => {
    const { reason } = computeScoreFromSuggestions(['构图不错']);
    // strip leading non-Chinese → '构图不错' → first 30 chars
    expect(reason).toBe('构图不错');
  });

  it('returns score and reason together', () => {
    const result = computeScoreFromSuggestions(['[主体] 调整构图']);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('reason');
    expect(typeof result.score).toBe('number');
    expect(typeof result.reason).toBe('string');
  });
});