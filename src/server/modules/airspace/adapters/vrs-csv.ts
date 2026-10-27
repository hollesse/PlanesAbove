// Minimal CSV reader for VRS standing-data files: strips the UTF-8 BOM, handles quoted fields, skips blank lines.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false; } else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { fields.push(cur); cur = ''; } else cur += ch;
    }
    fields.push(cur);
    rows.push(fields);
  }
  return rows;
}
