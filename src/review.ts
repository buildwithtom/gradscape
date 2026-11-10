import type { Programme } from './schema';
export const reviewRules = { feeYear: 2027, requireAllGroupsVerified: true };
export function reviewReasons(p: Programme) {
  const reasons: string[] = [];
  if (p.sources.some((s) => s.status === 'conflict'))
    reasons.push('Conflicting official fee quote');
  if (reviewRules.requireAllGroupsVerified && p.sources.some((s) => s.status === 'unverified'))
    reasons.push('Imported facts need source verification');
  if (p.intakes.some((i) => i.status !== 'confirmed')) reasons.push('Intake needs confirmation');
  if (
    p.fee.amount === null ||
    p.fee.scope !== 'full' ||
    p.fee.label !== 'Published' ||
    p.fee.year !== reviewRules.feeYear
  )
    reasons.push('Fee needs confirmation');
  return reasons;
}
