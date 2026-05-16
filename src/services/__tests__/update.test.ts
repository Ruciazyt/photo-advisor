/**
 * Tests for update service — app version checking and release info.
 */

import { Linking, Alert } from 'react-native';

// Mock Linking and Alert
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
  showUpdateDialog,
  downloadAndInstall,
  openReleasePage,
} from '../update';
import type { ReleaseInfo } from '../../types';

const mockLinking = Linking as jest.Mocked<typeof Linking>;
const mockAlert = Alert as jest.Mocked<typeof Alert>;

describe('update service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAppVersion', () => {
    it('returns a non-empty version string', () => {
      const version = getAppVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('returns consistent version across calls', () => {
      const v1 = getAppVersion();
      const v2 = getAppVersion();
      expect(v1).toBe(v2);
    });
  });

  describe('compareVersions', () => {
    it('returns 0 for identical versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('v1.0.0', 'v1.0.0')).toBe(0);
    });

    it('returns positive when v2 > v1 (v2 is newer)', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '2.0.0')).toBeGreaterThan(0);
    });

    it('returns negative when v1 > v2 (v1 is newer)', () => {
      expect(compareVersions('1.0.1', '1.0.0')).toBeLessThan(0);
      expect(compareVersions('1.1.0', '1.0.0')).toBeLessThan(0);
      expect(compareVersions('2.0.0', '1.0.0')).toBeLessThan(0);
    });

    it('handles "v" prefix', () => {
      expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('v1.0.0', '1.0.1')).toBe(1); // v2>v1 → positive
    });

    it('handles missing components (treats missing as 0)', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.0')).toBe(0);
    });

    it('handles non-numeric components', () => {
      expect(compareVersions('abc', 'def')).toBe(0); // both become [0,0,0]
      expect(compareVersions('1.0.0', 'abc')).toBeLessThan(0); // 1.0.0 > 0.0.0
    });

    it('compares major.minor.patch correctly', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBe(1);  // v2>v1 → positive
      expect(compareVersions('1.2.3', '1.3.0')).toBe(1);  // v2>v1 → positive
      expect(compareVersions('1.2.3', '2.0.0')).toBe(1);  // v2>v1 → positive
    });
  });

  describe('checkForUpdate', () => {
    it('returns null when API returns non-ok status', async () => {
      // Mock fetch to return a failed response
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await checkForUpdate();
      expect(result).toBeNull();
    });

    it('returns null when network error occurs', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await checkForUpdate();
      expect(result).toBeNull();
    });

    it('parses release data correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          tag_name: 'v1.2.0',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.0',
          published_at: '2026-04-01T10:00:00Z',
          body: 'Bug fixes and new features',
          assets: [
            { name: 'app-release.apk', browser_download_url: 'https://example.com/app.apk' },
          ],
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await checkForUpdate();

      expect(result).not.toBeNull();
      expect(result!.tagName).toBe('v1.2.0');
      expect(result!.version).toBe('1.2.0');
      expect(result!.htmlUrl).toBe('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.0');
      expect(result!.publishedAt).toBe('2026-04-01T10:00:00Z');
      expect(result!.body).toBe('Bug fixes and new features');
      expect(result!.downloadUrl).toBe('https://example.com/app.apk');
    });

    it('extracts .apk asset download URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          tag_name: 'v1.1.0',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.1.0',
          published_at: '2026-04-01T00:00:00Z',
          body: '',
          assets: [
            { name: 'app-release.apk', browser_download_url: 'https://dl.example.com/app.apk' },
            { name: 'readme.txt', browser_download_url: 'https://dl.example.com/readme.txt' },
          ],
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await checkForUpdate();

      expect(result!.downloadUrl).toBe('https://dl.example.com/app.apk');
    });

    it('returns null downloadUrl when no .apk asset exists', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          tag_name: 'v1.0.9',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.0.9',
          published_at: '2026-01-01T00:00:00Z',
          body: 'No APK in this release',
          assets: [
            { name: 'readme.txt', browser_download_url: 'https://dl.example.com/readme.txt' },
          ],
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await checkForUpdate();

      expect(result!.downloadUrl).toBeNull();
    });

    it('handles missing/empty fields in release data', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          tag_name: '',
          html_url: '',
          published_at: '',
          body: '',
          assets: [],
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await checkForUpdate();

      expect(result).not.toBeNull();
      expect(result!.tagName).toBe('');
      expect(result!.version).toBe('');
      expect(result!.htmlUrl).toBe('');
      expect(result!.publishedAt).toBe('');
      expect(result!.body).toBe('');
      expect(result!.downloadUrl).toBeNull();
    });

    it('strips "v" prefix from tag_name for version field', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          tag_name: 'v2.0.0',
          html_url: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v2.0.0',
          published_at: '2026-01-01T00:00:00Z',
          body: '',
          assets: [],
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as unknown as typeof fetch;

      const result = await checkForUpdate();

      expect(result!.version).toBe('2.0.0');
      expect(result!.tagName).toBe('v2.0.0');
    });
  });

  describe('showUpdateDialog', () => {
    it('calls Alert.alert with correct arguments', () => {
      const release: ReleaseInfo = {
        tagName: 'v1.2.0',
        version: '1.2.0',
        downloadUrl: 'https://example.com/app.apk',
        htmlUrl: 'https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.0',
        publishedAt: '2026-04-01T10:00:00Z',
        body: 'Bug fixes',
      };

      const onUpdate = jest.fn();
      const onLater = jest.fn();

      showUpdateDialog(release, onUpdate, onLater);

      expect(mockAlert.alert).toHaveBeenCalledWith(
        '发现新版本',
        expect.stringContaining('1.2.0'),
        expect.arrayContaining([
          expect.objectContaining({ text: '稍后', style: 'cancel', onPress: onLater }),
          expect.objectContaining({ text: '下载更新', onPress: onUpdate }),
        ]),
        { cancelable: false }
      );
    });

    it('includes formatted date in dialog message', () => {
      const release: ReleaseInfo = {
        tagName: 'v1.2.0',
        version: '1.2.0',
        downloadUrl: 'https://example.com/app.apk',
        htmlUrl: '',
        publishedAt: '2026-04-01T10:00:00Z',
        body: '',
      };

      showUpdateDialog(release, jest.fn(), jest.fn());

      const alertCall = mockAlert.alert.mock.calls[0];
      const message: string = alertCall[1];
      // Date should be formatted in zh-CN locale
      expect(message).toContain('2026');
    });
  });

  describe('downloadAndInstall', () => {
    it('opens URL when canOpenURL is true', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockResolvedValue(undefined);

      await downloadAndInstall('https://example.com/app.apk');

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith('https://example.com/app.apk');
      expect(mockLinking.openURL).toHaveBeenCalledWith('https://example.com/app.apk');
    });

    it('shows error Alert when canOpenURL is false', async () => {
      mockLinking.canOpenURL.mockResolvedValue(false);

      await downloadAndInstall('https://example.com/app.apk');

      expect(mockLinking.canOpenURL).toHaveBeenCalledWith('https://example.com/app.apk');
      expect(mockLinking.openURL).not.toHaveBeenCalled();
      expect(mockAlert.alert).toHaveBeenCalledWith('错误', '无法打开下载链接');
    });

    it('shows error Alert when openURL throws', async () => {
      mockLinking.canOpenURL.mockResolvedValue(true);
      mockLinking.openURL.mockRejectedValue(new Error('Open failed'));

      await downloadAndInstall('https://example.com/app.apk');

      expect(mockAlert.alert).toHaveBeenCalledWith('错误', '下载失败，请稍后重试');
    });
  });

  describe('openReleasePage', () => {
    it('calls Linking.openURL with the given url', async () => {
      mockLinking.openURL.mockResolvedValue(undefined);

      await openReleasePage('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.0');

      expect(mockLinking.openURL).toHaveBeenCalledWith('https://github.com/Ruciazyt/photo-advisor/releases/tag/v1.2.0');
    });

    it('does not throw when openURL fails', async () => {
      mockLinking.openURL.mockRejectedValue(new Error('Failed to open'));

      // Should not throw
      await expect(
        openReleasePage('https://github.com/invalid-url')
      ).resolves.not.toThrow();
    });
  });
});