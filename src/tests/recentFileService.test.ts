import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRecentFiles,
  addRecentFile,
  removeRecentFile,
  clearRecentFiles,
} from '../services/recentFileService';

beforeEach(() => {
  localStorage.clear();
});

describe('recentFileService', () => {
  it('returns empty array when no files stored', () => {
    expect(getRecentFiles()).toEqual([]);
  });

  it('adds a file', () => {
    addRecentFile({ path: '/a/file.md', fileName: 'file.md', lastOpenedAt: '2026-01-01T00:00:00.000Z' });
    const files = getRecentFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('/a/file.md');
  });

  it('deduplicates by path, moves to top on re-open', () => {
    addRecentFile({ path: '/a/file.md', fileName: 'file.md', lastOpenedAt: '2026-01-01T00:00:00.000Z' });
    addRecentFile({ path: '/b/other.md', fileName: 'other.md', lastOpenedAt: '2026-01-02T00:00:00.000Z' });
    addRecentFile({ path: '/a/file.md', fileName: 'file.md', lastOpenedAt: '2026-01-03T00:00:00.000Z' });
    const files = getRecentFiles();
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe('/a/file.md');
  });

  it('removes a file by path', () => {
    addRecentFile({ path: '/a/file.md', fileName: 'file.md', lastOpenedAt: '2026-01-01T00:00:00.000Z' });
    removeRecentFile('/a/file.md');
    expect(getRecentFiles()).toHaveLength(0);
  });

  it('clears all files', () => {
    addRecentFile({ path: '/a/file.md', fileName: 'file.md', lastOpenedAt: '2026-01-01T00:00:00.000Z' });
    addRecentFile({ path: '/b/other.md', fileName: 'other.md', lastOpenedAt: '2026-01-02T00:00:00.000Z' });
    clearRecentFiles();
    expect(getRecentFiles()).toHaveLength(0);
  });

  it('maintains sort order — newest first', () => {
    addRecentFile({ path: '/a.md', fileName: 'a.md', lastOpenedAt: '2026-01-01T00:00:00.000Z' });
    addRecentFile({ path: '/b.md', fileName: 'b.md', lastOpenedAt: '2026-01-02T00:00:00.000Z' });
    const files = getRecentFiles();
    expect(files[0].path).toBe('/b.md');
  });

  it('caps at 20 recent files', () => {
    for (let i = 0; i < 25; i++) {
      addRecentFile({ path: `/file${i}.md`, fileName: `file${i}.md`, lastOpenedAt: new Date().toISOString() });
    }
    expect(getRecentFiles()).toHaveLength(20);
  });
});
