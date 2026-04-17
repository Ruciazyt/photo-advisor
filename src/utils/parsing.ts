/**
 * src/utils/parsing.ts
 *
 * Shared parsing utilities for converting raw AI suggestion strings into
 * structured BubbleItem and Keypoint objects.
 *
 * This module is the single source of truth for all parsing logic.
 * Consumed by: BubbleOverlay, KeypointOverlay, useBubbleChat, useKeypoints.
 *
 * All durations used in animations triggered by these parsed items are
 * 60fps-aligned (multiples of ~16.67ms per frame).
 */

import type { BubbleItem, BubblePosition, Keypoint, KeypointPosition } from '../types';

// ============================================================
// Position maps (shared constants)
// ============================================================

/** Round-robin order for auto-assigning bubble positions */
export const BUBBLE_ROUND_ROBIN: BubblePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

/** Map from bubble position tag strings to BubblePosition values */
export const BUBBLE_POSITION_MAP: Record<string, BubblePosition> = {
  '[左上]': 'top-left',
  '[右上]': 'top-right',
  '[左下]': 'bottom-left',
  '[右下]': 'bottom-right',
  '[中间]': 'center',
};

/** Map from keypoint label strings to KeypointPosition values */
export const KEYPOINT_POSITION_MAP: Record<string, KeypointPosition> = {
  '左上': 'top-left',
  '右上': 'top-right',
  '左下': 'bottom-left',
  '右下': 'bottom-right',
  '中间': 'center',
};

/** Round-robin order for auto-assigning keypoint positions */
export const KEYPOINT_ROUND_ROBIN: KeypointPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];

// ============================================================
// BubbleItem parsing
// ============================================================

/**
 * Parse raw AI suggestion text into a BubbleItem.
 * Supports formats: "[区域] 内容" (explicit position) or plain "内容" (round-robin).
 */
export function parseBubbleItemFromText(text: string, id: number): BubbleItem {
  let position: BubblePosition = BUBBLE_ROUND_ROBIN[id % BUBBLE_ROUND_ROBIN.length];
  for (const [tag, pos] of Object.entries(BUBBLE_POSITION_MAP)) {
    if (text.includes(tag)) {
      position = pos;
      break;
    }
  }
  return { id, text, position };
}

/**
 * Parse an array of raw suggestion strings into BubbleItem[].
 * Filters out empty strings.
 */
export function parseBubbleItemsFromTexts(rawTexts: string[]): BubbleItem[] {
  return rawTexts
    .filter(text => text.trim().length > 0)
    .map((text, i) => parseBubbleItemFromText(text, i));
}

/**
 * Alias for parseBubbleItemsFromTexts for callers using the shorter name.
 */
export { parseBubbleItemsFromTexts as parseBubbleItems };

// ============================================================
// Keypoint parsing
// ============================================================

/**
 * Map a label string to a KeypointPosition.
 * Falls back to 'center' if no known tag is found.
 */
export function labelToKeypointPosition(label: string): KeypointPosition {
  for (const [tag, pos] of Object.entries(KEYPOINT_POSITION_MAP)) {
    if (label.includes(tag)) return pos;
  }
  return 'center';
}

/**
 * Parse raw AI suggestion text into a Keypoint (or null if unparseable).
 * Requires the "[标签] 内容" format with a bracketed label.
 */
export function parseKeypointFromText(text: string, id: number): Keypoint | null {
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return null;

  const label = match[1].trim();
  const instruction = match[2].trim();
  const position = labelToKeypointPosition(label);

  return { id, label, position, instruction: instruction || undefined };
}

/**
 * Parse an array of raw suggestion strings into Keypoint[].
 * Filters out empty strings and unparseable items.
 */
export function parseKeypointsFromTexts(rawTexts: string[]): Keypoint[] {
  const result: Keypoint[] = [];
  let id = 0;
  for (const text of rawTexts) {
    if (!text.trim()) continue;
    const kp = parseKeypointFromText(text, id);
    if (kp) {
      result.push(kp);
      id++;
    }
  }
  return result;
}
