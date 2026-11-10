import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Papa from 'papaparse';
import { parseCsv, diff, writeCatalogue } from '../scripts/catalogue';
it('exports an editable CSV, previews a valid edit, and rejects invalid dates without writing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sac-import-'));
  const csvFile = path.join(dir, 'catalogue.csv');
  const output = path.join(dir, 'catalogue.json');
  try {
    execFileSync(process.execPath, ['--import', 'tsx', 'scripts/catalogue.ts', 'export', csvFile]);
    const original = JSON.parse(fs.readFileSync('data/catalogue.json', 'utf8'));
    const csv = fs.readFileSync(csvFile, 'utf8');
    expect(parseCsv(csv)).toEqual(original);
    const table = Papa.parse<Record<string, string>>(csv, {
      header: true,
      skipEmptyLines: true,
    }).data;
    table[0].feeAmount = String(Number(table[0].feeAmount) + 100);
    const changed = Papa.unparse(table, { newline: '\n' });
    const valid = parseCsv(changed);
    expect(diff(original, valid).changed).toEqual([original[0].id]);
    writeCatalogue(output, valid);
    const before = fs.readFileSync(output, 'utf8');
    table[0].intakeDates = '2027-02-30';
    table[0].intakeStatuses = 'tentative';
    expect(() =>
      writeCatalogue(output, parseCsv(Papa.unparse(table, { newline: '\n' }))),
    ).toThrow();
    expect(fs.readFileSync(output, 'utf8')).toBe(before);
    table[0].intakeDates = '2027-02';
    table[0].feeCurrency = 'ZZZ';
    expect(() => parseCsv(Papa.unparse(table, { newline: '\n' }))).toThrow();
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
