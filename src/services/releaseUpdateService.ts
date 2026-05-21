import { openUrl } from '@tauri-apps/plugin-opener';

const LATEST_RELEASE_API = 'https://api.github.com/repos/Racious/MD-Forge/releases/latest';
const RELEASES_PAGE = 'https://github.com/Racious/MD-Forge/releases/latest';
const DISMISSED_VERSION_KEY = 'md-forge.release-update.dismissed-version';

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name?: string;
}

export interface ReleaseUpdate {
  version: string;
  tagName: string;
  pageUrl: string;
  title: string;
}

function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left).split('.').map(Number);
  const rightParts = normalizeVersion(right).split('.').map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightValue = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

export async function checkLatestRelease(currentVersion = __APP_VERSION__): Promise<ReleaseUpdate | null> {
  const response = await fetch(LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check GitHub releases.');
  }

  const release = (await response.json()) as GitHubRelease;
  const latestVersion = normalizeVersion(release.tag_name);

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return null;
  }

  return {
    version: latestVersion,
    tagName: release.tag_name,
    pageUrl: release.html_url || RELEASES_PAGE,
    title: release.name || `MD Forge ${release.tag_name}`,
  };
}

export async function openLatestReleasePage(): Promise<void> {
  await openUrl(RELEASES_PAGE);
}

export async function checkReleaseAndOpenDownload(currentVersion = __APP_VERSION__): Promise<string> {
  const update = await checkLatestRelease(currentVersion);

  if (!update) {
    return 'MD Forge is up to date.';
  }

  const shouldOpen = window.confirm(
    `MD Forge ${update.version} is available. Open the GitHub release page to download it?`,
  );

  if (shouldOpen) {
    await openUrl(update.pageUrl);
    return `Opened download page for MD Forge ${update.version}.`;
  }

  return `Update ${update.version} is available.`;
}

export async function notifyPortableReleaseUpdate(): Promise<void> {
  try {
    const update = await checkLatestRelease();

    if (!update) {
      return;
    }

    if (localStorage.getItem(DISMISSED_VERSION_KEY) === update.version) {
      return;
    }

    const shouldOpen = window.confirm(
      `MD Forge ${update.version} is available. Open the GitHub release page to download it?`,
    );

    if (shouldOpen) {
      await openUrl(update.pageUrl);
      return;
    }

    localStorage.setItem(DISMISSED_VERSION_KEY, update.version);
  } catch (error) {
    console.debug('Portable release update check failed:', error);
  }
}
