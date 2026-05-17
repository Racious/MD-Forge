export type ViewMode = 'edit' | 'preview' | 'split';

export type ThemeMode = 'light' | 'dark';

export type SupportedMarkdownExtension = 'md' | 'markdown' | 'mdx';

export interface MarkdownDocument {
  path: string | null;
  fileName: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  lastOpenedAt?: string;
  lastSavedAt?: string;
}

export interface RecentFile {
  path: string;
  fileName: string;
  lastOpenedAt: string;
}

export interface Tab {
  id: string;
  document: MarkdownDocument;
}

export interface EditorSettings {
  theme: ThemeMode;
  viewMode: ViewMode;
  autoSave: boolean;
  wordWrap: boolean;
  fontSize: number;
}
