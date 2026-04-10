import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import Sharing from 'expo-sharing';

export interface ShareOptions {
  /** Local URI of the photo to share */
  photoUri: string;
  /** AI composition suggestions */
  suggestions: string[];
  /** Grid type label (e.g. "三分法") */
  gridType: string;
  /** Composition score 0-100, optional */
  score?: number;
  /** Grid variant key for icon selection */
  gridVariant?: string;
}

/**
 * Resize image to a sharing-friendly dimension (max 1920px on longest edge)
 * and save to cache directory.
 */
async function prepareImage(uri: string): Promise<string> {
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  return manipResult.uri;
}

function buildShareText(opts: ShareOptions): string {
  const { gridType, suggestions, score } = opts;

  const gridIcon: Record<string, string> = {
    thirds: '📐',
    golden: '🥇',
    diagonal: '↗️',
    spiral: '🌀',
    none: '⬜',
  };
  const icon = gridIcon[opts.gridVariant ?? 'thirds'] ?? '📐';

  const lines: string[] = [
    `${icon} 拍摄参谋 - 构图分析`,
    `─────────────────`,
    `网格: ${gridType}`,
  ];

  if (score !== undefined) {
    const stars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
    lines.push(`评分: ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} (${score}分)`);
  }

  if (suggestions.length > 0) {
    lines.push(``);
    lines.push(`💡 AI 建议:`);
    for (const s of suggestions) {
      const clean = s.replace(/^\[[^\]]+\]\s*/, '').trim();
      lines.push(`  • ${clean}`);
    }
  }

  lines.push(` `);
  lines.push(`📸 由拍摄参谋生成`);

  return lines.join('\n');
}

/**
 * Share the photo with AI composition suggestions.
 * Falls back gracefully if sharing is unavailable.
 */
export async function sharePhoto(opts: ShareOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: '当前设备不支持分享功能' };
    }

    // Prepare a resized image
    const imageUri = await prepareImage(opts.photoUri);

    const text = buildShareText(opts);

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/jpeg',
      dialogTitle: '分享构图分析',
    });

    // Clean up cache file after sharing
    try {
      await FileSystem.deleteAsync(imageUri, { idempotent: true });
    } catch {
      // Ignore cleanup errors
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}
