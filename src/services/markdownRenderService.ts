import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
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

function getHeadingText(tokens: Token[]): string {
  return tokens
    .filter(token => token.type === 'text' || token.type === 'code_inline')
    .map(token => token.content)
    .join('');
}

const md = new MarkdownIt({
  html: true,
  xhtmlOut: false,
  breaks: false,
  langPrefix: "language-",
  linkify: true,
  typographer: false,
})
  .use(anchor, {
    permalink: false,
    slugify: slugifyHeading,
    getTokensText: getHeadingText,
  })
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
  line: number;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

function extractTocFromTokens(tokens: Token[], content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const sourceLines = content.split(/\r?\n/);

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'heading_open' || !/^#{1,6}$/.test(token.markup)) continue;

    const sourceLine = token.map?.[0];
    if (sourceLine === undefined || !/^(#{1,6})\s+/.test(sourceLines[sourceLine] ?? '')) {
      continue;
    }

    const inlineToken = tokens[index + 1];
    const parsedText = inlineToken?.children ? getHeadingText(inlineToken.children) : '';
    const text = parsedText || inlineToken?.content || '';
    // markdown-it-anchor assigns every h1-h6 a document-unique id during md.parse().
    // Without that id, a TOC href cannot target the rendered heading safely.
    const slug = token.attrGet('id');
    if (slug === null) continue;
    const line = sourceLine + 1;

    entries.push({
      level: Number(token.tag.slice(1)),
      text,
      slug,
      line,
    });
  }

  return entries;
}

function sanitizeRenderedHtml(raw: string): string {
  // 保留排版用 HTML（details、align 等），移除危險標籤與事件屬性
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['details', 'summary'],
    ADD_ATTR: ['align', 'target'],
  }) as string;
}

export function renderMarkdownWithToc(content: string): RenderedMarkdown {
  const env = {};
  const tokens = md.parse(content, env);
  const raw = md.renderer.render(tokens, md.options, env);

  return {
    html: sanitizeRenderedHtml(raw),
    toc: extractTocFromTokens(tokens, content),
  };
}

// Compatibility helper. App rendering should use renderMarkdownWithToc() to parse once.
export function extractToc(content: string): TocEntry[] {
  return extractTocFromTokens(md.parse(content, {}), content);
}

export function renderMarkdown(content: string): string {
  return renderMarkdownWithToc(content).html;
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
