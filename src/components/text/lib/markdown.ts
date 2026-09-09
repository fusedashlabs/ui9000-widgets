import { html, type TemplateResult } from 'lit';

/** Safe markdown → Lit. No innerHTML; links/images restricted to http(s). */

const SAFE_HREF = /^https?:\/\//i;

function isSafeHref(href: string): boolean {
  return SAFE_HREF.test(href.trim());
}

function renderInline(text: string): TemplateResult[] {
  const nodes: TemplateResult[] = [];
  const re =
    /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(html`${text.slice(last, match.index)}`);
    }
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(html`<strong>${token.slice(2, -2)}</strong>`);
    } else if (token.startsWith('*') || token.startsWith('_')) {
      nodes.push(html`<em>${token.slice(1, -1)}</em>`);
    } else if (token.startsWith('`')) {
      nodes.push(html`<code>${token.slice(1, -1)}</code>`);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link && isSafeHref(link[2])) {
        nodes.push(
          html`<a href=${link[2]} target="_blank" rel="noopener noreferrer">${link[1]}</a>`,
        );
      } else {
        nodes.push(html`${token}`);
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(html`${text.slice(last)}`);
  return nodes.length ? nodes : [html`${text}`];
}

function flushParagraph(lines: string[], out: TemplateResult[]): void {
  const text = lines.join('\n').trim();
  if (!text) return;
  out.push(html`<p>${renderInline(text)}</p>`);
  lines.length = 0;
}

/** Client TextWidget markdown view — headings, lists, emphasis, code, http(s) links. */
export function renderMarkdown(source: string): TemplateResult {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: TemplateResult[] = [];
  const paragraph: string[] = [];
  let listItems: { ordered: boolean; text: string }[] | null = null;
  let fence: string[] | null = null;

  const flushList = () => {
    if (!listItems?.length) {
      listItems = null;
      return;
    }
    const items = listItems.map((item) => html`<li>${renderInline(item.text)}</li>`);
    blocks.push(
      listItems[0].ordered ? html`<ol>${items}</ol>` : html`<ul>${items}</ul>`,
    );
    listItems = null;
  };

  for (const line of lines) {
    if (fence) {
      if (line.startsWith('```')) {
        const code = fence.join('\n');
        blocks.push(html`<pre><code>${code}</code></pre>`);
        fence = null;
      } else {
        fence.push(line);
      }
      continue;
    }
    if (line.startsWith('```')) {
      flushParagraph(paragraph, blocks);
      flushList();
      fence = [];
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks);
      flushList();
      const title = heading[2];
      const level = heading[1].length;
      blocks.push(
        level === 1
          ? html`<h1>${renderInline(title)}</h1>`
          : level === 2
            ? html`<h2>${renderInline(title)}</h2>`
            : html`<h3>${renderInline(title)}</h3>`,
      );
      continue;
    }

    const ul = line.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushParagraph(paragraph, blocks);
      if (!listItems || listItems[0]?.ordered) {
        flushList();
        listItems = [];
      }
      listItems.push({ ordered: false, text: ul[1] });
      continue;
    }

    const ol = line.match(/^\d+[.)]\s+(.+)$/);
    if (ol) {
      flushParagraph(paragraph, blocks);
      if (!listItems || !listItems[0]?.ordered) {
        flushList();
        listItems = [];
      }
      listItems.push({ ordered: true, text: ol[1] });
      continue;
    }

    if (!line.trim()) {
      flushParagraph(paragraph, blocks);
      flushList();
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (fence) blocks.push(html`<pre><code>${fence.join('\n')}</code></pre>`);
  flushParagraph(paragraph, blocks);
  flushList();

  return html`<div class="md">${blocks}</div>`;
}
