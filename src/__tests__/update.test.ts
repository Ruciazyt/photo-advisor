/**
 * Tests for src/services/update.ts
 * Covers: getAppVersion, compareVersions, checkForUpdate, downloadAndInstall, openReleasePage
 */

// Mock Linking and Alert before importing update module
jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

import {
  getAppVersion,
  compareVersions,
  checkForUpdate,
  downloadAndInstall,
  openReleasePage,
  showUpdateDialog,
} from '../services/update';
import type { ReleaseInfo } from '../types';

const mockLinking = require('react-native').Linking;
const mockAlert = require('react-native').Alert;
const realFetch = globalThis.fetch;

describe('getAppVersion', () => {
  it('returns a non-empty version string', () => {
    const version = getAppVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });
});

describe('compareVersions', () => {
  it('returns 1 when v2 is greater than v1', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.1')).toBe(1);
  });

  it('returns -1 when v1 is greater than v2', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(-1);
    expect(compareVersions('1.1.0', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.1', '1.0.0')).toBe(-1);
  });

  it('returns 0 when versions are equal', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  it('handles version strings with v prefix', () => {
    expect(compareVersions('v1.0.0', 'v2.0.0')).toBe(1);
    expect(compareVersions('v2.0.0', 'v1.0.0')).toBe(-1);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
  });

  it('handles versions with different segment counts', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(1); // 1.0 < 1.0.1
    // compareVersions only compares first 3 segments; 4th segment is ignored
    expect(compareVersions('1.0.0.1', '1.0.0')).toBe(0); // both [1,0,0]
  });

  it('treats non-numeric segments as 0', () => {
    // 'abc' parses to [0,0,0]; '1.0.0' parses to [1,0,0]; 1.0.0 > abc
    expect(compareVersions('abc', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', 'abc')).toBe(-1);
  });
});

describe('checkForUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('returns null on fetch error', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await checkForUpdate();
    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });

    const result = await checkForUpdate();
    expect(result).toBeNull();
  });

  it('parses release info from GitHub API response', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          tag_name: 'v1.2.3',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.3',
          published_at: '2026-04-01T12:00:00Z',
          body: 'Bug fixes and improvements',
          assets: [{ name: 'app.apk', browser_download_url: 'https://example.com/app.apk' }],
        }),
    });

    const result = await checkForUpdate();
    expect(result).not.toBeNull();
    if (result) {
      expect(result.tagName).toBe('v1.2.3');
      expect(result.version).toBe('1.2.3');
      expect(result.downloadUrl).toBe('https://example.com/app.apk');
      expect(result.htmlUrl).toBe('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.3');
      expect(result.publishedAt).toBe('2026-04-01T12:00:00Z');
      expect(result.body).toBe('Bug fixes and improvements');
    }
  });

  it('handles missing assets gracefully (no apk)', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          tag_name: 'v1.0.0',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.0.0',
          published_at: '2026-01-01T00:00:00Z',
          body: 'Initial release',
          assets: [],
        }),
    });

    const result = await checkForUpdate();
    expect(result).not.toBeNull();
    if (result) {
      expect(result.downloadUrl).toBeNull();
    }
  });

  it('strips v prefix from tag_name for version field', async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          tag_name: 'v2.0.0',
          html_url: 'https://example.com',
          published_at: '2026-01-01T00:00:00Z',
          body: '',
          assets: [],
        }),
    });

    const result = await checkForUpdate();
    expect(result?.version).toBe('2.0.0');
  });
});

describe('downloadAndInstall', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn();
  });


  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('opens URL when Linking.canOpenURL returns true', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockResolvedValue(undefined);

    await downloadAndInstall('https://example.com/apk');
    expect(mockLinking.canOpenURL).toHaveBeenCalledWith('https://example.com/apk');
    expect(mockLinking.openURL).toHaveBeenCalledWith('https://example.com/apk');
  });

  it('shows alert when Linking.canOpenURL returns false', async () => {
    mockLinking.canOpenURL.mockResolvedValue(false);

    await downloadAndInstall('https://bad-url.com');
    expect(mockAlert.alert).toHaveBeenCalledWith('错误', '无法打开下载链接');
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('shows alert on error during openURL', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockRejectedValue(new Error('Open failed'));

    await downloadAndInstall('https://example.com/apk');
    expect(mockAlert.alert).toHaveBeenCalledWith('错误', '下载失败，请稍后重试');
  });
});

describe('openReleasePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinking.openURL.mockResolvedValue(undefined);
  });

  it('opens the provided URL', async () => {
    await openReleasePage('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.0.0');
    expect(mockLinking.openURL).toHaveBeenCalledWith('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.0.0');
  });

  it('does not throw on error (silent failure)', async () => {
    mockLinking.openURL.mockRejectedValue(new Error('Failed to open'));
    await expect(openReleasePage('https://bad.com')).resolves.toBeUndefined();
  });
});

describe('showUpdateDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.alert.mockClear();
  });

  const makeRelease = (overrides: Partial<ReleaseInfo> = {}): ReleaseInfo => ({
    tagName: 'v1.0.0',
    version: '1.0.0',
    downloadUrl: 'https://example.com/app.apk',
    htmlUrl: 'https://github.com/example/repo/releases/tag/v1.0.0',
    publishedAt: '2026-04-01T12:00:00Z',
    body: 'Bug fixes',
    ...overrides,
  });

  it('calls Alert.alert with correct title and message', () => {
    const release = makeRelease({ version: '1.2.3', publishedAt: '2026-04-15T10:00:00Z' });
    showUpdateDialog(release, jest.fn(), jest.fn());
    expect(mockAlert.alert).toHaveBeenCalledTimes(1);
    const [title, message] = mockAlert.alert.mock.calls[0];
    expect(title).toBe('发现新版本');
    expect(message).toContain('1.2.3');
  });

  it('includes formatted publish date in message', () => {
    const release = makeRelease({ publishedAt: '2026-04-15T10:00:00Z' });
    showUpdateDialog(release, jest.fn(), jest.fn());
    const [, message] = mockAlert.alert.mock.calls[0];
    // Local date of 2026-04-15T10:00:00Z in zh-CN
    expect(message).toContain('2026');
  });

  it('shows 稍后 button that calls onLater callback', () => {
    const onLater = jest.fn();
    const onUpdate = jest.fn();
    const release = makeRelease();
    showUpdateDialog(release, onUpdate, onLater);

    const [, , buttons] = mockAlert.alert.mock.calls[0];
    // First button is 稍后 (cancel)
    const cancelBtn = buttons.find((b: any) => b.text === '稍后');
    expect(cancelBtn).toBeDefined();
    expect(cancelBtn.style).toBe('cancel');
    cancelBtn.onPress();
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('shows 下载更新 button that calls onUpdate callback', () => {
    const onLater = jest.fn();
    const onUpdate = jest.fn();
    const release = makeRelease();
    showUpdateDialog(release, onUpdate, onLater);

    const [, , buttons] = mockAlert.alert.mock.calls[0];
    const updateBtn = buttons.find((b: any) => b.text === '下载更新');
    expect(updateBtn).toBeDefined();
    updateBtn.onPress();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
  });

  it('passes cancelable:false to Alert.alert', () => {
    const release = makeRelease();
    showUpdateDialog(release, jest.fn(), jest.fn());
    const [, , , options] = mockAlert.alert.mock.calls[0];
    expect(options).toEqual({ cancelable: false });
  });

  it('renders message with newline between version and date', () => {
    const release = makeRelease({ version: '2.0.0', publishedAt: '2026-03-01T00:00:00Z' });
    showUpdateDialog(release, jest.fn(), jest.fn());
    const [, message] = mockAlert.alert.mock.calls[0];
    // Message format: "发现新版本: {version}\n\n更新时间: {date}"
    expect(message).toMatch(/发现新版本: 2\.0\.0/);
    expect(message).toMatch(/更新时间:/);
  });
});
