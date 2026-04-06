/**
 * Minimal server-side Markdown to HTML renderer.
 * Handles headings, bold, italic, links, lists, code blocks, blockquotes, and HRs.
 * No external dependencies.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let inList: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html.push('</code></pre>');
        inCodeBlock = false;
      } else {
        if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
        html.push('<pre class="bg-slate-800/60 rounded-lg p-4 my-3 overflow-x-auto"><code>');
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      html.push(escapeHtml(line));
      html.push('\n');
      continue;
    }

    // Empty lines close lists
    if (line.trim() === '') {
      if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
      html.push('<hr />');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
      html.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.+)/);
    if (ulMatch) {
      if (inList !== 'ul') {
        if (inList) html.push('</ol>');
        html.push('<ul>');
        inList = 'ul';
      }
      html.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      if (inList !== 'ol') {
        if (inList) html.push('</ul>');
        html.push('<ol>');
        inList = 'ol';
      }
      html.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Paragraph
    if (inList) { html.push(inList === 'ul' ? '</ul>' : '</ol>'); inList = null; }
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inCodeBlock) html.push('</code></pre>');
  if (inList) html.push(inList === 'ul' ? '</ul>' : '</ol>');

  return html.join('\n');
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Bold + italic: ***text***
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text**
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code: `text`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  return out;
}
