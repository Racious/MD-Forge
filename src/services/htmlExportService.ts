import { renderMarkdown, buildHtmlDocument } from './markdownRenderService';
import { saveHtmlFile } from './fileSystemService';

export async function exportAsHtml(title: string, content: string): Promise<string | null> {
  const rendered = renderMarkdown(content);
  const html = buildHtmlDocument(title, rendered);
  const defaultName = title.replace(/\.(md|markdown|mdx)$/i, '') + '.html';
  return saveHtmlFile(html, defaultName);
}
