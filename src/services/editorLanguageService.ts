import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { json } from '@codemirror/lang-json';
import { sql, StandardSQL } from '@codemirror/lang-sql';
import { yaml, yamlLanguage } from '@codemirror/lang-yaml';
import { oneDark, oneDarkTheme } from '@codemirror/theme-one-dark';
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { DocumentType } from '../domain/markdown.types';

export function documentLanguage(type: DocumentType): Extension {
  switch (type) {
    case 'markdown': return markdown();
    case 'json': return json();
    case 'sql': return sql({ dialect: StandardSQL });
    case 'yaml': return yaml();
    case 'text': return [];
  }
}

function yamlHighlight(dark: boolean): HighlightStyle {
  return HighlightStyle.define([
    { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: dark ? '#79c0ff' : '#0550ae', fontWeight: '600' },
    { tag: [tags.content, tags.string], color: dark ? '#a5d6a7' : '#116329' },
    { tag: tags.comment, color: dark ? '#a0aaba' : '#57606a', fontStyle: 'italic' },
    { tag: tags.labelName, color: dark ? '#d2a8ff' : '#8250df' },
    { tag: [tags.typeName, tags.keyword], color: dark ? '#ffa657' : '#953800' },
    { tag: tags.special(tags.string), color: dark ? '#7ee3de' : '#0a626b' },
    { tag: [tags.meta, tags.punctuation], color: dark ? '#cad3df' : '#424a53' },
  ], { scope: yamlLanguage });
}

const yamlDarkHighlight = yamlHighlight(true);
const yamlLightHighlight = yamlHighlight(false);

export function documentTheme(dark: boolean, type: DocumentType = 'markdown'): Extension {
  if (type === 'yaml') {
    return [dark ? oneDarkTheme : [], syntaxHighlighting(dark ? yamlDarkHighlight : yamlLightHighlight)];
  }
  return [dark ? oneDark : [], syntaxHighlighting(defaultHighlightStyle, { fallback: true })];
}

export function documentFont(size: number): Extension {
  return EditorView.theme({
    '&': { fontSize: `${size}px`, height: '100%', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' },
    '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
  });
}
