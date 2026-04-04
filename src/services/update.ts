import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Linking from 'expo-linking';

export interface ReleaseInfo {
  version: string;
  downloadUrl?: string;
  htmlUrl?: string;
}

export const getAppVersion = (): string => {
  return Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';
};

// For now, just return current version - update checking can be added later
// when you have a GitHub releases or custom backend
export const checkForUpdate = async (): Promise<ReleaseInfo | null> => {
  return null; // No auto-update server configured yet
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
