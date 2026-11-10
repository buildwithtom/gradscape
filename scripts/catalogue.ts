import fs from 'node:fs';
import Papa from 'papaparse';
import { reviewReasons } from '../src/review';
import { catalogueSchema, type Programme } from '../src/schema';
export const headers = [
  'id',
  'country',
  'institution',
  'title',
  'campuses',
  'providerType',
  'studyArea',
  'qualification',
  'programmeType',
  'credits',
  'durationMonths',
  'intakeText',
  'intakeDates',
  'intakeStatuses',
  'feeAmount',
  'feeCurrency',
  'feeScope',
  'feeYear',
  'feeLabel',
  'feeBasis',
  'sourceUrl',
  'verification',
  'lastVerifiedAt',
  'entry',
  'deadline',
  'otherFees',
];
const num = (v: string) => (v === '' ? null : Number(v));
export function parseCsv(text: string): Programme[] {
  const csv = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v: string) => v.trim(),
  });
  if (csv.errors.length) throw new Error(csv.errors.map((e) => e.message).join('; '));
  if (headers.some((h) => !csv.meta.fields?.includes(h)))
    throw new Error('Missing template columns');
  if (csv.meta.fields?.some((h) => !headers.includes(h)))
    throw new Error('Unexpected columns: use the public template only');
  return catalogueSchema
    .parse(
      csv.data.map((r) => ({
        id: r.id,
        country: r.country,
        institution: r.institution,
        title: r.title,
        campuses: r.campuses.split('|'),
        providerType: r.providerType,
        studyArea: r.studyArea,
        qualification: r.qualification,
        programmeType: r.programmeType,
        credits: num(r.credits),
        durationMonths: num(r.durationMonths),
        intakeText: r.intakeText,
        intakes: r.intakeDates.split('|').map((date, i) => ({
          date: date === 'unknown' ? null : date,
          precision: date === 'unknown' ? 'unknown' : date.length === 7 ? 'month' : 'day',
          status: r.intakeStatuses.split('|')[i],
        })),
        fee: {
          amount: num(r.feeAmount),
          currency: r.feeCurrency,
          scope: r.feeScope,
          year: num(r.feeYear),
          label: r.feeLabel,
          basis: r.feeBasis,
          calculation:
            r.feeBasis.includes('× 1.5') && r.feeAmount
              ? `NZD ${(Number(r.feeAmount) / 1.5).toFixed(2)} × 1.5 = NZD ${r.feeAmount}. Assumes constant annual rate for 180 credits; confirm the quote.`
              : null,
        },
        sources: [
          {
            url: r.sourceUrl,
            status: r.verification,
            lastVerifiedAt: r.lastVerifiedAt || null,
            facts: ['programme', 'campuses', 'intakes', 'fee', 'entry'],
          },
        ],
        entry: r.entry,
        deadline: r.deadline || null,
        otherFees: r.otherFees,
        rank: null,
        rankingEdition: null,
      })),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function diff(old: Programme[], next: Programme[]) {
  return {
    added: next.filter((n) => !old.some((o) => o.id === n.id)).map((n) => n.id),
    changed: next
      .filter((n) => old.some((o) => o.id === n.id && JSON.stringify(o) !== JSON.stringify(n)))
      .map((n) => n.id),
    removed: old.filter((o) => !next.some((n) => n.id === o.id)).map((n) => n.id),
    flagged: next.filter((n) => reviewReasons(n).length > 0).map((n) => n.id),
  };
}
export function writeCatalogue(file: string, rows: Programme[], allowRemovals = false) {
  const valid = catalogueSchema.parse(rows);
  const old = fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Programme[]) : [];
  const changes = diff(old, valid);
  if (changes.removed.length && !allowRemovals)
    throw new Error('Unexpected removals; review preview and pass --allow-removals explicitly.');
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(valid, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return changes;
}
if (process.argv[1]?.endsWith('catalogue.ts')) {
  const [mode, input = 'data/import/catalogue.csv'] = process.argv.slice(2);
  const file = 'data/catalogue.json';
  try {
    if (mode === 'export') {
      const rows = catalogueSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
      const out = rows.map((p) =>
        Object.fromEntries(
          headers.map((h) => [
            h,
            (
              {
                id: p.id,
                country: p.country,
                institution: p.institution,
                title: p.title,
                campuses: p.campuses.join('|'),
                providerType: p.providerType,
                studyArea: p.studyArea,
                qualification: p.qualification,
                programmeType: p.programmeType,
                credits: p.credits,
                durationMonths: p.durationMonths,
                intakeText: p.intakeText,
                intakeDates: p.intakes.map((i) => i.date ?? 'unknown').join('|'),
                intakeStatuses: p.intakes.map((i) => i.status).join('|'),
                feeAmount: p.fee.amount,
                feeCurrency: p.fee.currency,
                feeScope: p.fee.scope,
                feeYear: p.fee.year,
                feeLabel: p.fee.label,
                feeBasis: p.fee.basis,
                sourceUrl: p.sources[0].url,
                verification: p.sources[0].status,
                lastVerifiedAt: p.sources[0].lastVerifiedAt,
                entry: p.entry,
                deadline: p.deadline,
                otherFees: p.otherFees,
              } as Record<string, unknown>
            )[h] ?? '',
          ]),
        ),
      );
      fs.writeFileSync(input, Papa.unparse(out, { newline: '\n' }) + '\n');
      console.log('Exported editable public template to ' + input);
    } else if (mode === 'preview' || mode === 'write') {
      const next = parseCsv(fs.readFileSync(input, 'utf8'));
      const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
      console.log(JSON.stringify(diff(old, next), null, 2));
      if (mode === 'write') writeCatalogue(file, next, process.argv.includes('--allow-removals'));
    } else throw new Error('Use preview, write or export [CSV path]');
  } catch (e) {
    console.error(String(e));
    process.exitCode = 1;
  }
}
