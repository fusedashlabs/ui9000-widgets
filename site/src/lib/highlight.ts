/**
 * Minimal HTML highlighter for the embed snippet: comments, tags, attribute names and values.
 * Returns plain tokens whose text joins back to the exact input, so what is shown is what is copied.
 */
export type TokenKind = 'comment' | 'tag' | 'attr' | 'string' | 'punct' | 'text';

export interface Token {
  kind: TokenKind;
  text: string;
}

export function highlightHtml(source: string): Token[] {
  const tokens: Token[] = [];
  const push = (kind: TokenKind, text: string) => {
    if (!text) return;
    const last = tokens[tokens.length - 1];
    if (last && last.kind === kind) last.text += text;
    else tokens.push({ kind, text });
  };

  let i = 0;
  let inScript = false;
  while (i < source.length) {
    if (inScript) {
      const end = source.indexOf('</script>', i);
      const stop = end < 0 ? source.length : end;
      push('text', source.slice(i, stop));
      i = stop;
      inScript = false;
      continue;
    }
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i);
      const stop = end < 0 ? source.length : end + 3;
      push('comment', source.slice(i, stop));
      i = stop;
      continue;
    }
    const tagMatch = /^<\/?[a-zA-Z][\w-]*/.exec(source.slice(i));
    if (tagMatch) {
      const name = tagMatch[0];
      push('punct', name.startsWith('</') ? '</' : '<');
      push('tag', name.replace(/^<\/?/, ''));
      i += name.length;
      // Attributes until the closing >
      while (i < source.length && source[i] !== '>') {
        const rest = source.slice(i);
        const ws = /^\s+/.exec(rest);
        if (ws) {
          push('text', ws[0]);
          i += ws[0].length;
          continue;
        }
        const attr = /^[^\s=>/]+/.exec(rest);
        if (attr) {
          push('attr', attr[0]);
          i += attr[0].length;
          if (source[i] === '=') {
            push('punct', '=');
            i += 1;
            const quote = source[i];
            if (quote === '"' || quote === "'") {
              const end = source.indexOf(quote, i + 1);
              const stop = end < 0 ? source.length : end + 1;
              push('string', source.slice(i, stop));
              i = stop;
            }
          }
          continue;
        }
        push('punct', source[i]);
        i += 1;
      }
      if (source[i] === '>') {
        push('punct', '>');
        i += 1;
        if (/^<script\b/.test(name)) inScript = true;
      }
      continue;
    }
    const next = source.indexOf('<', i + 1);
    const stop = next < 0 ? source.length : next;
    push('text', source.slice(i, stop));
    i = stop;
  }
  return tokens;
}
