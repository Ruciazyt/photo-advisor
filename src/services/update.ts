import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import axios from 'axios';

export interface ReleaseInfo {
  version: string;
  downloadUrl?: string;
  htmlUrl?: string;
  body?: string;
}

export const getAppVersion = (): string => {
  // Try native version first (available after native build)
  if (Application.nativeApplicationVersion) {
    return Application.nativeApplicationVersion;
  }
  // Fall back to app.json version (available in Expo managed workflow)
  const configVersion = Constants.expoConfig?.version;
  if (configVersion) return configVersion;
  // Hard fallback
  return '1.0.0';
};

export const checkForUpdate = async (): Promise<ReleaseInfo | null> => {
  try {
    const response = await axios.get(
      'https://api.github.com/repos/Ruciazyt/photo-advisor/releases/latest',
      { timeout: 8000 }
    );
    const data = response.data;
    if (data.tag_name) {
      const version = data.tag_name.startsWith('v') ? data.tag_name.slice(1) : data.tag_name;
      return {
        version,
        downloadUrl: data.html_url,
        htmlUrl: data.html_url,
        body: data.body || '',
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const compareVersions = (current: string, latest: string): number => {
  const c = current.split('.').map(Number);
  const l = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, l.length); i++) {
    const ci = c[i] || 0;
    const li = l[i] || 0;
    if (ci < li) return -1;
    if (ci > li) return 1;
  }
  return 0;
};

export const openReleasePage = (htmlUrl: string) => {
  Linking.openURL(htmlUrl);
};

export const downloadAndInstall = async (downloadUrl: string) => {
  Linking.openURL(downloadUrl);
};
