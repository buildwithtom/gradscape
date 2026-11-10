import { z } from 'zod';
export const dateValue = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-([0-2]\d|3[01]))?$/)
  .refine(
    (v) =>
      v.length === 7
        ? /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
        : !Number.isNaN(Date.parse(v + 'T00:00:00Z')) &&
          new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v,
    'Invalid calendar date',
  );
export const sourceSchema = z
  .object({
    url: z
      .string()
      .url()
      .refine((v) => v.startsWith('https://'), 'HTTPS required'),
    status: z.enum(['unverified', 'verified', 'conflict']),
    lastVerifiedAt: z.string().date().nullable(),
    facts: z.array(z.string()),
    note: z.string().optional(),
  })
  .refine(
    (s) => s.status === 'unverified' || s.lastVerifiedAt !== null,
    'Checked sources require a check date',
  );
export const programmeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  country: z.string().regex(/^[A-Z]{2}$/),
  institution: z.string().min(1),
  title: z.string().min(1),
  campuses: z.array(z.string().min(1)).min(1),
  providerType: z.string().min(1),
  studyArea: z.string().min(1),
  qualification: z.string().min(1),
  programmeType: z.string().min(1),
  credits: z.number().positive().nullable(),
  durationMonths: z.number().positive().nullable(),
  intakeText: z.string(),
  intakes: z
    .array(
      z
        .object({
          date: dateValue.nullable(),
          precision: z.enum(['day', 'month', 'unknown']),
          status: z.enum(['confirmed', 'tentative', 'unknown']),
        })
        .superRefine((i, c) => {
          if (
            (i.date === null) !== (i.precision === 'unknown') ||
            (i.date !== null && i.precision !== (i.date.length === 7 ? 'month' : 'day')) ||
            (i.date === null && i.status !== 'unknown')
          )
            c.addIssue({ code: 'custom', message: 'Intake date, precision and status disagree' });
        }),
    )
    .min(1),
  fee: z.object({
    amount: z.number().nonnegative().nullable(),
    currency: z.enum(['NZD', 'INR', 'AUD', 'CAD', 'GBP', 'USD', 'EUR']),
    scope: z.enum(['full', 'annual', 'partial']),
    year: z.number().int().min(2020).max(2100).nullable(),
    label: z.enum(['Published', 'Estimated', 'Annual only', 'Unverified']),
    basis: z.string(),
    calculation: z.string().nullable(),
  }),
  sources: z.array(sourceSchema).min(1),
  entry: z.string(),
  deadline: dateValue.nullable(),
  otherFees: z.string(),
  rank: z.null(),
  rankingEdition: z.null(),
});
export const catalogueSchema = z.array(programmeSchema).superRefine((rows, c) => {
  const ids = new Set();
  rows.forEach((r, i) => {
    if (ids.has(r.id))
      c.addIssue({ code: 'custom', path: [i, 'id'], message: 'Duplicate stable ID' });
    ids.add(r.id);
  });
});
export type Programme = z.infer<typeof programmeSchema>;
export const statuses = [
  'To review',
  'Enquiry sent',
  'Applying',
  'Applied',
  'Offer received',
  'Closed',
] as const;
export const shortlistSchema = z
  .object({
    version: z.literal(1),
    items: z
      .array(z.object({ id: z.string(), notes: z.string().max(20000), status: z.enum(statuses) }))
      .max(1000),
  })
  .superRefine((v, c) => {
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      c.addIssue({ code: 'custom', message: 'Duplicate shortlist IDs' });
  });
export type Backup = z.infer<typeof shortlistSchema>;
