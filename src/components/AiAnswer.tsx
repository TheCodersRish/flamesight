import type { ReactNode } from 'react';

/** Render a light Markdown-ish AI reply: paragraphs, lists, bold/italic/code, PSI citations. */
export default function AiAnswer({ text, className = '' }: { text: string; className?: string }) {
  const blocks = splitBlocks(text);
  if (!blocks.length) return null;

  return (
    <div className={`ai-answer space-y-2.5 text-sm leading-relaxed text-slate-100 ${className}`}>
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4 text-slate-200 marker:text-micro-300/80">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-4 text-slate-200 marker:text-micro-300/80">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'heading') {
          return (
            <p key={i} className="text-[13px] font-semibold tracking-wide text-white">
              {renderInline(block.text)}
            </p>
          );
        }
        return (
          <p key={i} className="text-slate-100">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

function splitBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    if (bullet) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (numbered) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*\d+[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[1].trim());
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const heading = line.match(/^\s{0,3}#{1,3}\s+(.+)$/);
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1].trim() });
      i += 1;
      continue;
    }

    // Gather consecutive non-list lines into one paragraph (single newlines → space).
    const parts: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) break;
      if (/^\s*[-*•]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^\s{0,3}#{1,3}\s+/.test(l)) break;
      parts.push(l.trim());
      i += 1;
    }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  // Bold, italic, code, then highlight (PSI-…) citations.
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\(PSI-[A-Za-z0-9-]+\))/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={key++} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-cyan-100">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('(PSI-')) {
      nodes.push(
        <span key={key++} className="font-medium text-micro-200">
          {token}
        </span>,
      );
    } else {
      nodes.push(token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
