import { z } from 'zod';
import { catalogueSchema, shortlistSchema, type Programme, type Backup } from './schema';
import raw from '../data/catalogue.json';
import campusCities from '../data/campus-cities.json';
export const cityName = (campus: string) =>
  (campusCities as Record<string, string>)[campus] ?? campus;
import checks from '../data/source-checks.json';
import { reviewReasons } from './review';
export const programmes = catalogueSchema.parse(raw).map((p) => {
  const check = checks.find((c) => c.id === p.id);
  if (!check) return p;
  return catalogueSchema.parse([
    {
      ...p,
      ...(check.id === 'auckland-it-180' &&
      p.intakes.map((i) => i.date).join('|') === '2027-03-01|2027-07-19'
        ? {
            intakes: p.intakes.map((i) => ({ ...i, status: 'confirmed' })),
            deadline: '2026-12-08',
            entry:
              '180-point pathway: an IT-related undergraduate degree; GPE 4.5. IELTS Academic 6.5, no band below 6.0, or an accepted alternative. Ask admissions to assess degree equivalence.',
            otherFees:
              '2027 student services fee: NZD 9.65 per point, separate from tuition. Books, insurance, travel and living costs are excluded.',
          }
        : {}),
      ...(check.id === 'canterbury-bis-180' && p.fee.amount === 59400 && p.fee.year === 2027
        ? { fee: { ...p.fee, label: 'Published' } }
        : {}),
      sources: [
        ...p.sources,
        {
          url: 'url' in check && typeof check.url === 'string' ? check.url : p.sources[0].url,
          status: check.status,
          lastVerifiedAt: check.lastVerifiedAt,
          facts: check.facts,
          note: check.note,
        },
      ],
    },
  ])[0];
});
export const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export const referenceDate = '2026-11-10';
export const fullFee = (p: Programme) => (p.fee.scope === 'full' ? p.fee.amount : null);
export const nextIntake = (p: Programme) =>
  [...p.intakes]
    .filter((i) => i.date && i.date >= referenceDate.slice(0, 7))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];
export function intakeLabel(i: Programme['intakes'][number] | undefined) {
  if (!i?.date) return 'Start unconfirmed';
  const [year, month, day] = i.date.split('-');
  return `${day ? Number(day) + ' ' : ''}${months[Number(month) - 1]} ${year}`;
}
export function convert(
  amount: number | null,
  from: string,
  to: string,
  rates: Record<string, number>,
) {
  if (amount === null) return null;
  if (from === to) return amount;
  if (!(rates[from] > 0 && rates[to] > 0)) return null;
  const converted = (amount * rates[from]) / rates[to];
  // Remove floating-point noise so switching currencies cannot drop a course exactly on budget.
  return Number.isFinite(converted) ? Number(converted.toPrecision(15)) : null;
}
export function money(amount: number | null, currency: string) {
  return amount === null
    ? 'Not available'
    : `${currency} ${new Intl.NumberFormat('en-NZ', { maximumFractionDigits: 0 }).format(amount)}`;
}
export { reviewRules, reviewReasons } from './review';
export interface Filters {
  country: string;
  search: string;
  city: string;
  provider: string;
  area: string;
  month: string;
  year: string;
  budget: string;
  review: boolean;
  sort: string;
  currency: string;
}
export const initialFilters: Filters = {
  country: 'NZ',
  search: '',
  city: '',
  provider: '',
  area: '',
  month: '',
  year: '',
  budget: '',
  review: false,
  sort: 'institution',
  currency: 'NZD',
};
// The range uses the whole country catalogue so its bounds stay still while filtering.
export function tuitionRange(rows: Programme[], currency: string, rates: Record<string, number>) {
  const amounts = rows
    .map((p) => convert(fullFee(p), p.fee.currency, currency, rates))
    .filter((amount): amount is number => amount !== null && Number.isFinite(amount));
  if (amounts.length === 0) return null;
  const highest = Math.max(...amounts);
  const increment = highest > 0 ? Math.max(1, 10 ** Math.floor(Math.log10(highest)) / 2) : 1;
  return { min: 0, max: Math.max(1, Math.ceil(highest / increment) * increment) };
}

export function changeFilterCurrency(f: Filters, currency: string, rates: Record<string, number>) {
  if (currency === f.currency) return f;
  const budget = f.budget === '' ? null : convert(Number(f.budget), f.currency, currency, rates);
  if (f.budget !== '' && budget === null) return null;
  return { ...f, currency, budget: budget === null ? '' : String(budget) };
}

export function filterProgrammes(rows: Programme[], f: Filters, rates: Record<string, number>) {
  const matched = rows.filter(
    (p) =>
      p.country === f.country &&
      (!f.search ||
        [p.institution, p.title, ...p.campuses]
          .join(' ')
          .toLowerCase()
          .includes(f.search.toLowerCase())) &&
      (!f.city || p.campuses.some((c) => cityName(c) === f.city)) &&
      (!f.provider || p.providerType === f.provider) &&
      (!f.area || p.studyArea === f.area) &&
      ((!f.month && !f.year) ||
        p.intakes.some(
          (i) =>
            i.date &&
            (!f.year || i.date.startsWith(f.year)) &&
            (!f.month || i.date.slice(5, 7) === f.month),
        )) &&
      (!f.budget ||
        (convert(fullFee(p), p.fee.currency, f.currency, rates) ?? Infinity) <= Number(f.budget)) &&
      (!f.review || reviewReasons(p).length > 0),
  );
  const key = (p: Programme): number | null =>
    f.sort === 'fee'
      ? convert(fullFee(p), p.fee.currency, f.currency, rates)
      : f.sort === 'duration'
        ? p.durationMonths
        : f.sort === 'rank'
          ? p.rank
          : nextIntake(p)?.date
            ? Number(nextIntake(p)?.date?.replaceAll('-', '').padEnd(8, '0'))
            : null;
  return matched.sort((a, b) =>
    f.sort === 'institution'
      ? a.institution.localeCompare(b.institution) || a.title.localeCompare(b.title)
      : key(a) === null
        ? key(b) === null
          ? a.id.localeCompare(b.id)
          : 1
        : key(b) === null
          ? -1
          : key(a)! - key(b)! || a.id.localeCompare(b.id),
  );
}
export function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((i) => i !== id) : ids.length < 4 ? [...ids, id] : ids;
}
export function parseBackup(value: unknown, rows = programmes): Backup {
  const parsed = shortlistSchema.parse(value);
  if (parsed.items.some((i) => !rows.some((p) => p.id === i.id)))
    throw new Error(
      'Backup includes unknown programme IDs. Update the catalogue before restoring.',
    );
  return parsed;
}
export const prioritiesSchema = z.object({
  countries: z.array(z.string()),
  areas: z.array(z.string()),
  budget: z.string(),
  currency: z.string(),
  intake: z.string(),
  maxDuration: z.string(),
});
export type Priorities = z.infer<typeof prioritiesSchema>;
export const defaultPriorities: Priorities = {
  countries: [],
  areas: [],
  budget: '',
  currency: 'NZD',
  intake: '',
  maxDuration: '',
};
export function matchReasons(p: Programme, pr: Priorities, rates: Record<string, number>) {
  const reasons: string[] = [];
  if (pr.countries.includes(p.country)) reasons.push('Matches your preferred country');
  if (pr.areas.includes(p.studyArea)) reasons.push('Matches your study area');
  if (pr.intake && p.intakes.some((i) => i.date?.startsWith(pr.intake)))
    reasons.push('Matches your target intake; check confirmation');
  if (pr.budget) {
    const fee = convert(fullFee(p), p.fee.currency, pr.currency, rates);
    reasons.push(
      fee === null
        ? 'Fee needs confirmation'
        : fee > Number(pr.budget)
          ? 'Above your tuition budget'
          : 'Within your tuition budget',
    );
  }
  if (pr.maxDuration && p.durationMonths !== null)
    reasons.push(
      p.durationMonths > Number(pr.maxDuration)
        ? 'Longer than your preferred duration'
        : 'Matches your preferred duration',
    );
  return reasons;
}
export function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
