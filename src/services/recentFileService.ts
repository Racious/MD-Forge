import type { RecentFile } from '../domain/markdown.types';

const STORAGE_KEY = 'mdforge_recent_files';
const MAX_RECENT = 20;

export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentFile[]) : [];
  } catch {
    return [];
  }
}

export function addRecentFile(file: RecentFile): void {
  const files = getRecentFiles().filter((f) => f.path !== file.path);
  files.unshift({ ...file, lastOpenedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files.slice(0, MAX_RECENT)));
}

export function removeRecentFile(path: string): void {
  const files = getRecentFiles().filter((f) => f.path !== path);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function clearRecentFiles(): void {
  localStorage.removeItem(STORAGE_KEY);
}
