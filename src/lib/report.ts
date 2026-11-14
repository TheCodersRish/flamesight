/** Download a structured PDF report the user can present or share. */

type PdfBlock =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'body'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'spacer' };

function toPdfText(text: string): string {
  return text
    .replace(/[•·]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

function escapePdf(text: string): string {
  return toPdfText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${cur} ${words[i]}`;
    if (next.length <= maxChars) cur = next;
    else {
      lines.push(cur);
      cur = words[i];
    }
  }
  lines.push(cur);
  return lines;
}

function isHeading(line: string, next: string | undefined): boolean {
  if (!line || line.startsWith(' ') || line.startsWith('\t')) return false;
  if (/^[•\-\*]/.test(line)) return false;
  if (line.includes(':') && line.length > 60) return false;
  if (line.length > 48) return false;
  // Short standalone labels, or a short line followed by indented/blank content
  if (/^(Settings|Result|Simpler wording|Plain English|Technical notes|Closest NASA tests|Answer|Matching investigations|Caveats|Question|Data)$/i.test(line)) {
    return true;
  }
  if (next !== undefined && (next === '' || next.startsWith(' ') || next.startsWith('\t') || /^[•\-]/.test(next.trim()))) {
    return line.length <= 40 && !line.includes('.');
  }
  return false;
}

function parseReport(body: string): PdfBlock[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: PdfBlock[] = [];
  let i = 0;

  if (lines[0]?.trim()) {
    blocks.push({ kind: 'title', text: lines[0].trim() });
    i = 1;
  }

  while (i < lines.length && lines[i].trim()) {
    blocks.push({ kind: 'meta', text: lines[i].trim() });
    i++;
  }

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      blocks.push({ kind: 'spacer' });
      i++;
      continue;
    }

    const next = lines[i + 1];
    if (isHeading(trimmed, next?.trim() === '' ? '' : next)) {
      blocks.push({ kind: 'heading', text: trimmed });
      i++;
      continue;
    }

    if (/^[•\-\*]/.test(trimmed) || raw.startsWith('  ') || raw.startsWith('\t')) {
      blocks.push({ kind: 'bullet', text: trimmed.replace(/^[•\-\*]\s*/, '') });
      i++;
      continue;
    }

    blocks.push({ kind: 'body', text: trimmed });
    i++;
  }

  return blocks;
}

function buildPdf(blocks: PdfBlock[]): Uint8Array {
  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const marginX = 56;
  const marginTop = 72;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;
  const charWidth = 0.5; // approx for Helvetica at size 1

  // Palette (RGB 0-1)
  const flame = '0.95 0.45 0.16';
  const flameDeep = '0.82 0.32 0.10';
  const ink = '0.08 0.10 0.16';
  const slate = '0.22 0.27 0.36';
  const muted = '0.42 0.48 0.58';
  const soft = '0.97 0.97 0.98';
  const rule = '0.88 0.90 0.93';

  const pages: string[][] = [[]];
  let y = pageHeight - marginTop;

  const ensureSpace = (needed: number) => {
    if (y - needed < marginBottom) {
      pages.push([]);
      y = pageHeight - marginTop;
    }
  };

  const draw = (ops: string) => {
    pages[pages.length - 1].push(ops);
  };

  // Brand header band + accent stripe (first page content starts below)
  draw(`${flame} rg`);
  draw(`0 ${pageHeight - 36} ${pageWidth} 36 re f`);
  draw(`${flameDeep} rg`);
  draw(`0 ${pageHeight - 40} ${pageWidth} 4 re f`);
  draw('1 1 1 rg');
  draw('BT /F2 13 Tf 56 766 Td (FlameSight) Tj ET');
  draw('BT /F1 9 Tf 470 766 Td (Fire Safety Report) Tj ET');

  // Soft left rail for visual polish
  draw(`${soft} rg`);
  draw(`0 40 10 ${pageHeight - 80} re f`);

  let sawMeta = false;

  for (const block of blocks) {
    if (block.kind === 'spacer') {
      y -= 12;
      continue;
    }

    if (block.kind === 'title') {
      const lines = wrapText(block.text, Math.floor(contentWidth / (13 * charWidth)));
      ensureSpace(lines.length * 22 + 16);
      draw(`${ink} rg`);
      for (const line of lines) {
        draw(`BT /F2 18 Tf ${marginX} ${y} Td (${escapePdf(line)}) Tj ET`);
        y -= 22;
      }
      y -= 4;
      // Accent underline with short flame bar + soft rule
      draw(`${flame} rg`);
      draw(`${marginX} ${y + 6} 72 3 re f`);
      draw(`${rule} rg`);
      draw(`${marginX + 80} ${y + 7} ${contentWidth - 80} 1 re f`);
      y -= 16;
      continue;
    }

    if (block.kind === 'meta') {
      const lines = wrapText(block.text, Math.floor(contentWidth / (9 * charWidth)));
      ensureSpace(lines.length * 13 + 4);
      draw(`${muted} rg`);
      for (const line of lines) {
        draw(`BT /F1 9 Tf ${marginX} ${y} Td (${escapePdf(line)}) Tj ET`);
        y -= 13;
      }
      sawMeta = true;
      continue;
    }

    if (sawMeta) {
      // Divider after meta block once we leave it
      ensureSpace(14);
      draw(`${rule} rg`);
      draw(`${marginX} ${y + 4} ${contentWidth} 0.8 re f`);
      y -= 10;
      sawMeta = false;
    }

    if (block.kind === 'heading') {
      y -= 10;
      const lines = wrapText(block.text, Math.floor(contentWidth / (11.5 * charWidth)));
      const bandH = lines.length * 16 + 14;
      ensureSpace(bandH + 8);
      // Soft section band
      draw(`${soft} rg`);
      draw(`${marginX - 8} ${y - bandH + 18} ${contentWidth + 16} ${bandH} re f`);
      // Flame accent bar
      draw(`${flame} rg`);
      draw(`${marginX - 8} ${y - bandH + 18} 4 ${bandH} re f`);
      draw(`${ink} rg`);
      for (const line of lines) {
        draw(`BT /F2 12 Tf ${marginX + 8} ${y} Td (${escapePdf(line)}) Tj ET`);
        y -= 16;
      }
      y -= 10;
      continue;
    }

    if (block.kind === 'bullet') {
      const lines = wrapText(block.text, Math.floor((contentWidth - 22) / (9.5 * charWidth)));
      ensureSpace(lines.length * 13.5 + 4);
      // Diamond-ish bullet (rotated square look via small filled rect)
      draw(`${flame} rg`);
      draw(`${marginX + 2} ${y + 1.5} 4 4 re f`);
      draw(`${slate} rg`);
      for (let li = 0; li < lines.length; li++) {
        draw(`BT /F1 9.5 Tf ${marginX + 16} ${y} Td (${escapePdf(lines[li])}) Tj ET`);
        y -= 13.5;
      }
      y -= 3;
      continue;
    }

    // body
    const lines = wrapText(block.text, Math.floor(contentWidth / (10 * charWidth)));
    ensureSpace(lines.length * 14.5 + 4);
    draw(`${slate} rg`);
    for (const line of lines) {
      draw(`BT /F1 10 Tf ${marginX} ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 14.5;
    }
    y -= 3;
  }

  // Page chrome: header strip on continuation pages, footer rule + page numbers
  for (let p = 0; p < pages.length; p++) {
    const chrome: string[] = [];

    if (p > 0) {
      chrome.push(`${flame} rg`);
      chrome.push(`0 ${pageHeight - 22} ${pageWidth} 22 re f`);
      chrome.push('1 1 1 rg');
      chrome.push('BT /F2 9 Tf 56 778 Td (FlameSight) Tj ET');
      chrome.push('BT /F1 8 Tf 500 778 Td (Report) Tj ET');
      chrome.push(`${soft} rg`);
      chrome.push(`0 40 10 ${pageHeight - 62} re f`);
    }

    chrome.push(`${rule} rg`);
    chrome.push(`${marginX} 42 ${contentWidth} 0.75 re f`);
    chrome.push(`${muted} rg`);
    const disclaimer = 'NASA PSI data  ·  Educational tool, not a safety certification.';
    chrome.push(`BT /F1 8 Tf ${marginX} 28 Td (${escapePdf(disclaimer)}) Tj ET`);
    const label = `Page ${p + 1} of ${pages.length}`;
    chrome.push(`BT /F1 8 Tf ${pageWidth - marginX - label.length * 4.5} 28 Td (${escapePdf(label)}) Tj ET`);

    pages[p] = [...chrome, ...pages[p]];
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;

  const push = (s: string | Uint8Array) => {
    const bytes = typeof s === 'string' ? encoder.encode(s) : s;
    chunks.push(bytes);
    size += bytes.length;
  };

  push('%PDF-1.4\n');

  const objects: (string | null)[] = [null]; // 1-indexed

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  // Pages object filled later
  objects.push(''); // placeholder for pages
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  for (let p = 0; p < pages.length; p++) {
    const contentId = objects.length;
    contentObjIds.push(contentId);
    const stream = pages[p].join('\n');
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);

    const pageId = objects.length;
    pageObjIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
  }

  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;

  for (let i = 1; i < objects.length; i++) {
    offsets[i] = size;
    push(`${i} 0 obj\n${objects[i]}\nendobj\n`);
  }

  const xrefPos = size;
  push(`xref\n0 ${objects.length}\n`);
  push('0000000000 65535 f \n');
  for (let i = 1; i < objects.length; i++) {
    push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export function downloadReport(filename: string, body: string) {
  const blocks = parseReport(body);
  const pdf = buildPdf(blocks);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = filename.replace(/\.txt$/i, '').replace(/\.pdf$/i, '');
  a.download = `${base}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}
