import { Linking, Alert } from 'react-native';
import type { ReleaseInfo } from '../types';

import pkg from '../../app.json';
const APP_VERSION: string = pkg.expo.version;

const REPO_OWNER = 'Ruciazyt';
const REPO_NAME = 'photo-advisor';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

export const getAppVersion = (): string => APP_VERSION;

const parseVersion = (v: string): number[] => {
  const normalized = v.startsWith('v') ? v.slice(1) : v;
  const parts = normalized.split(/[.\-_]/).map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
};

export const compareVersions = (v1: string, v2: string): number => {
  const p1 = parseVersion(v1);
  const p2 = parseVersion(v2);
  for (let i = 0; i < 3; i++) {
    if (p2[i] !== p1[i]) return p2[i] > p1[i] ? 1 : -1;
  }
  return 0;
};

export const checkForUpdate = async (): Promise<ReleaseInfo | null> => {
  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.error('[update] Failed to fetch release info:', response.status);
      return null;
    }

    const data = await response.json();

    const tagName: string = data.tag_name || '';
    const htmlUrl: string = data.html_url || '';
    const publishedAt: string = data.published_at || '';
    const body: string = data.body || '';

    let downloadUrl: string | null = null;
    if (data.assets && Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((asset: { name: string }) =>
        asset.name.endsWith('.apk')
      );
      if (apkAsset) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    const version = tagName.startsWith('v') ? tagName.slice(1) : tagName;

    return {
      tagName,
      version,
      downloadUrl,
      htmlUrl,
      publishedAt,
      body,
    };
  } catch (error) {
    console.error('[update] Error checking for update:', error);
    return null;
  }
};

export const showUpdateDialog = (
  release: ReleaseInfo,
  onUpdate: () => void,
  onLater: () => void
) => {
  const message = `发现新版本: ${release.version}\n\n更新时间: ${new Date(release.publishedAt).toLocaleDateString('zh-CN')}`;

  Alert.alert(
    '发现新版本',
    message,
    [
      {
        text: '稍后',
        style: 'cancel',
        onPress: onLater,
      },
      {
        text: '下载更新',
        onPress: onUpdate,
      },
    ],
    { cancelable: false }
  );
};

export const downloadAndInstall = async (url: string): Promise<void> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('错误', '无法打开下载链接');
    }
  } catch (error) {
    console.error('[update] Error opening download URL:', error);
    Alert.alert('错误', '下载失败，请稍后重试');
  }
};

export const openReleasePage = async (url: string): Promise<void> => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('[update] Error opening release page:', error);
  }
};
