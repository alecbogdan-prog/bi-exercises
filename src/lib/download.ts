import { sampleModel } from '../engine/dataset';
import type { Scalar } from '../engine/model';
import type { Project } from '../projects/projects';

const cell = (v: Scalar): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One CSV file per table of the sample model, keys included so the relationships can be rebuilt. */
/** One CSV per table of a model (the bike shop by default). */
export function modelCsvFiles(model = sampleModel()): { name: string; content: string }[] {
  return model.tables.map((t) => {
    const cols = t.columns.map((c) => c.name);
    const lines = [cols.map(cell).join(','), ...t.rows.map((r) => cols.map((c) => cell(r[c] as Scalar)).join(','))];
    return { name: `${t.name}.csv`, content: lines.join('\n') };
  });
}

/** A plain-text brief with every step, to rebuild the project in Power BI Desktop. */
export function projectBrief(p: Project): string {
  const lines = [
    `${p.title}: project brief`,
    '',
    `From ${p.brief.from.name} (${p.brief.from.role}):`,
    `"${p.brief.message}"`,
    '',
    'Data: load the CSV files from this download into Power BI Desktop (Get data → Text/CSV).',
    'Relationships: Sales[ProductID] → Product[ProductID], Sales[CustomerID] → Customer[CustomerID], Sales[Order Date] → Date[Date], Sales[StoreID] → Store[StoreID], Targets[Month Start] → Date[Date], Targets[StoreID] → Store[StoreID].',
    '',
    'Steps:',
    ...p.steps.flatMap((s, i) => [`${i + 1}. ${s.title}: ${s.scenario?.deliver ?? ''}`, ...s.task.map((t) => `   - ${t.replace(/\*\*|`/g, '')}`)]),
    '',
    'Check your numbers against the finished dashboard on the website.',
  ];
  return lines.join('\n');
}

/** Starts a browser download of a text file. */
export function downloadText(name: string, content: string, type = 'text/csv'): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- a tiny ZIP writer (stored, no compression), so the whole download is one file ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Builds a .zip archive (no compression) from text files. */
export function zipFiles(files: { name: string; content: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = enc.encode(file.name);
    const data = enc.encode(file.content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const centralSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let pos = 0;
  for (const a of all) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

/** Starts a browser download of binary data. */
export function downloadBytes(name: string, bytes: Uint8Array, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
