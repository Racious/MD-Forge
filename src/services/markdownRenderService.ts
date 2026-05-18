import MarkdownIt from "markdown-it";
// @ts-ignore
import taskLists from "markdown-it-task-lists";
// @ts-ignore
import anchor from "markdown-it-anchor";
import DOMPurify from "dompurify";

function slugifyHeading(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\wÀ-￿-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

const md = new MarkdownIt({
  html: true,
  xhtmlOut: false,
  breaks: false,
  langPrefix: "language-",
  linkify: true,
  typographer: false,
})
  .use(anchor, { permalink: false, slugify: slugifyHeading })
  .use(taskLists, { enabled: true, label: true });

// data: URI 不做 URL 編碼，避免 base64 中的 +/= 被破壞
const defaultNormalizeLink = md.normalizeLink.bind(md);
md.normalizeLink = (url: string) => {
  if (url.startsWith('data:')) return url;
  return defaultNormalizeLink(url);
};

const defaultFence = md.renderer.rules.fence!.bind(md.renderer.rules);
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token.info.trim() === "mermaid") {
    const code = token.content.trim();
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="mermaid-source">${escaped}</pre>`;
  }
  return defaultFence(tokens, idx, options, env, self);
};

export interface TocEntry {
  level: number;
  text: string;
  slug: string;
}

export function extractToc(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`~]/g, "").trim();
      entries.push({ level, text, slug: slugifyHeading(text) });
    }
  }
  return entries;
}

export function renderMarkdown(content: string): string {
  const raw = md.render(content);
  // 保留排版用 HTML（details、align 等），移除危險標籤與事件屬性
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['details', 'summary'],
    ADD_ATTR: ['align', 'target'],
  }) as string;
}

export function buildHtmlDocument(title: string, renderedHtml: string): string {
  const t = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #24292e; }
    code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
    pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #dfe2e5; margin: 0; padding: 0 1rem; color: #6a737d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #dfe2e5; padding: 6px 13px; }
    th { background: #f6f8fa; font-weight: 600; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #e1e4e8; }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
}
