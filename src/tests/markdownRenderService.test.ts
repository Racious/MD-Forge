import { describe, it, expect } from 'vitest';
import { renderMarkdown, buildHtmlDocument } from '../services/markdownRenderService';

describe('renderMarkdown', () => {
  it('renders headings', () => {
    const html = renderMarkdown('# Hello');
    expect(html).toContain('id="hello"');
    expect(html).toContain('>Hello</h1>');
  });

  it('renders bold and italic', () => {
    const html = renderMarkdown('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders unordered list', () => {
    const html = renderMarkdown('- item one\n- item two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>item one</li>');
  });

  it('renders ordered list', () => {
    const html = renderMarkdown('1. first\n2. second');
    expect(html).toContain('<ol>');
  });

  it('renders blockquote', () => {
    const html = renderMarkdown('> quote text');
    expect(html).toContain('<blockquote>');
  });

  it('renders inline code', () => {
    const html = renderMarkdown('use `code` here');
    expect(html).toContain('<code>code</code>');
  });

  it('renders code block', () => {
    const html = renderMarkdown('```\nconst x = 1;\n```');
    expect(html).toContain('<pre>');
    expect(html).toContain('<code>');
  });

  it('renders table', () => {
    const html = renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>a</th>');
  });

  it('renders horizontal rule', () => {
    const html = renderMarkdown('---');
    expect(html).toContain('<hr');
  });

  it('does not inject raw HTML when html option is false', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
  });
});

describe('buildHtmlDocument', () => {
  it('wraps content in full HTML document', () => {
    const doc = buildHtmlDocument('Test', '<p>hello</p>');
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<title>Test</title>');
    expect(doc).toContain('<p>hello</p>');
  });

  it('escapes special chars in title', () => {
    const doc = buildHtmlDocument('<bad>', '<p/>');
    expect(doc).toContain('&lt;bad&gt;');
    expect(doc).not.toContain('<bad>');
  });
});
