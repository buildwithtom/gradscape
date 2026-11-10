import { describe, it, expect } from 'vitest';
import {
  filterProgrammes,
  tuitionRange,
  changeFilterCurrency,
  initialFilters,
  programmes,
  convert,
  fullFee,
  toggleSelection,
  parseBackup,
  intakeLabel,
  matchReasons,
  defaultPriorities,
} from '../src/lib';
import { dateValue, catalogueSchema } from '../src/schema';
import { parseCsv, diff, writeCatalogue } from '../scripts/catalogue';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const rates = { NZD: 52.9, INR: 1 };
const f = { ...initialFilters, year: '' };
describe('programme catalogue', () => {
  it('imports every pathway, removes rankings, preserves nulls', () => {
    expect(programmes).toHaveLength(27);
    expect(programmes.every((p) => p.rank === null)).toBe(true);
    expect(programmes.find((p) => p.id === 'nmit-it-180')?.fee.amount).toBeNull();
  });
  it('sorts raw tuition with unknown and partial quotes last', () => {
    const rows = filterProgrammes(programmes, { ...f, sort: 'fee' }, rates);
    const values = rows.map(fullFee);
    const known = values.filter((v): v is number => v !== null);
    expect(known).toEqual([...known].sort((a, b) => a - b));
    expect(values.slice(-3)).toEqual([null, null, null]);
  });
  it('excludes partial amounts from full fee budgets', () => {
    const rows = filterProgrammes(programmes, { ...f, budget: '40000' }, rates);
    expect(rows.some((p) => p.id === 'sit-it-180')).toBe(false);
    expect(fullFee(programmes.find((p) => p.id === 'sit-it-180')!)).toBeNull();
  });
  it('filters every applicable campus', () => {
    const ids = filterProgrammes(programmes, { ...f, city: 'Napier' }, rates).map((p) => p.id);
    expect(ids).toEqual(['eit-it-180', 'eit-it-240']);
    expect(
      filterProgrammes(programmes, { ...f, city: 'Auckland' }, rates).some(
        (p) => p.id === 'nzse-bi-180',
      ),
    ).toBe(true);
    expect(
      filterProgrammes(programmes, { ...f, city: 'Christchurch' }, rates).some(
        (p) => p.id === 'whitecliffe-cyber-180',
      ),
    ).toBe(true);
  });
  it('matches month-only tentative dates; excludes unknowns for a year', () => {
    expect(
      filterProgrammes(programmes, { ...f, month: '03', year: '2027' }, rates).some(
        (p) => p.id === 'waikato-it-180',
      ),
    ).toBe(true);
    expect(
      filterProgrammes(programmes, { ...initialFilters, year: '2027' }, rates).some(
        (p) => p.id === 'nzse-bi-180',
      ),
    ).toBe(false);
    expect(filterProgrammes(programmes, f, rates).some((p) => p.id === 'nzse-bi-180')).toBe(true);
  });
  it('edits exchange rates without treating missing rates as zero', () => {
    expect(convert(100, 'NZD', 'INR', rates)).toBe(5290);
    expect(convert(100, 'NZD', 'INR', { NZD: 60, INR: 1 })).toBe(6000);
    expect(convert(100, 'AUD', 'INR', rates)).toBeNull();
    expect(convert(null, 'NZD', 'INR', rates)).toBeNull();
    const rows = filterProgrammes(
      programmes,
      { ...f, budget: '2200000', currency: 'INR' },
      { NZD: 60, INR: 1 },
    );
    expect(rows).toHaveLength(0);
  });
  it('limits selections to four and permits removal', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(toggleSelection(ids, 'e')).toEqual(ids);
    expect(toggleSelection(ids, 'a')).toEqual(['b', 'c', 'd']);
  });
  it('formats month-only and unknown starts honestly', () => {
    expect(intakeLabel({ date: '2027-03', precision: 'month', status: 'tentative' })).toBe(
      'Mar 2027',
    );
    expect(intakeLabel(undefined)).toBe('Start unconfirmed');
  });
  it('validates dates and duplicate stable IDs', () => {
    expect(dateValue.safeParse('2027-02-30').success).toBe(false);
    expect(dateValue.safeParse('2027-02').success).toBe(true);
    expect(catalogueSchema.safeParse([programmes[0], programmes[0]]).success).toBe(false);
  });
  it('provides reasons without admission probabilities', () => {
    expect(
      matchReasons(programmes[0], { ...defaultPriorities, budget: '1', countries: ['NZ'] }, rates),
    ).toEqual(['Matches your preferred country', 'Above your tuition budget']);
  });
});
describe('private backups', () => {
  it('round-trips notes and statuses', () => {
    const backup = {
      version: 1,
      items: [{ id: programmes[0].id, notes: 'Ask about prerequisites', status: 'Enquiry sent' }],
    };
    expect(parseBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
  });
  it('rejects unknown IDs, duplicate IDs and invalid status', () => {
    expect(() =>
      parseBackup({ version: 1, items: [{ id: 'missing', notes: '', status: 'To review' }] }),
    ).toThrow();
    expect(() =>
      parseBackup({ version: 1, items: [{ id: programmes[0].id, notes: '', status: 'bad' }] }),
    ).toThrow();
    const item = { id: programmes[0].id, notes: '', status: 'To review' };
    expect(() => parseBackup({ version: 1, items: [item, item] })).toThrow();
  });
});
describe('maintenance', () => {
  it('previews a valid fee change and writes deterministic public JSON', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sac-')), 'catalogue.json');
    const old = JSON.parse(fs.readFileSync('data/catalogue.json', 'utf8'));
    writeCatalogue(file, old);
    const next = structuredClone(old);
    next[0].fee.amount += 100;
    expect(diff(old, next).changed).toEqual([next[0].id]);
    writeCatalogue(file, next);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))[0].fee.amount).toBe(next[0].fee.amount);
    fs.rmSync(path.dirname(file), { recursive: true });
  });
  it('rejects invalid imports and unexpected removals without replacing catalogue', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sac-')), 'catalogue.json');
    const old = JSON.parse(fs.readFileSync('data/catalogue.json', 'utf8'));
    writeCatalogue(file, old);
    const before = fs.readFileSync(file, 'utf8');
    const invalid = structuredClone(old);
    invalid[0].fee.currency = 'bad';
    expect(() => writeCatalogue(file, invalid)).toThrow();
    expect(() => writeCatalogue(file, old.slice(1))).toThrow('Unexpected removals');
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
    fs.rmSync(path.dirname(file), { recursive: true });
  });
  it('rejects CSV with bad dates and unexpected private columns', () => {
    const blank = fs.readFileSync('data/catalogue-template.csv', 'utf8');
    expect(() => parseCsv(blank.replace('id,', 'privateNotes,'))).toThrow(
      'Missing template columns',
    );
  });
});

describe('tuition range and display currency', () => {
  it('uses only available full quotes and returns an empty state without quotes or rates', () => {
    const base = programmes[0];
    const rows = [
      { ...base, fee: { ...base.fee, amount: 45000 } },
      { ...base, fee: { ...base.fee, amount: 999999, scope: 'annual' as const } },
      { ...base, fee: { ...base.fee, amount: 999999, scope: 'partial' as const } },
      { ...base, fee: { ...base.fee, amount: null } },
    ];
    expect(tuitionRange(rows, 'NZD', rates)).toEqual({ min: 0, max: 45000 });
    expect(tuitionRange(rows, 'INR', rates)).toEqual({ min: 0, max: 2500000 });
    expect(tuitionRange([], 'NZD', rates)).toBeNull();
    expect(tuitionRange(rows, 'AUD', rates)).toBeNull();
  });
  it('keeps no maximum distinct from a zero budget and blocks missing conversion rates', () => {
    expect(changeFilterCurrency(f, 'INR', rates)?.budget).toBe('');
    expect(changeFilterCurrency({ ...f, budget: '0' }, 'INR', rates)?.budget).toBe('0');
    expect(changeFilterCurrency({ ...f, budget: '50000' }, 'INR', rates)?.budget).toBe('2645000');
    expect(changeFilterCurrency({ ...f, budget: '50000' }, 'AUD', rates)).toBeNull();
  });
  it('preserves exact fee boundaries and results through a currency round trip', () => {
    for (const p of programmes) {
      const amount = fullFee(p);
      if (amount === null) continue;
      const original = { ...f, budget: String(amount) };
      const converted = changeFilterCurrency(original, 'INR', rates)!;
      const back = changeFilterCurrency(converted, 'NZD', rates)!;
      const ids = (filters: typeof f) =>
        filterProgrammes(programmes, filters, rates).map((p) => p.id);
      expect(ids(converted)).toEqual(ids(original));
      expect(ids(back)).toEqual(ids(original));
    }
  });
});
