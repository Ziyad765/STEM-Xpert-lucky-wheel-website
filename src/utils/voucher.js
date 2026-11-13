/**
 * Authoritative mapping for DIDAC 2026 course voucher codes.
 * Exact specification:
 * - Virtual Lab AI -> AILAB100
 * - AI for Teachers Course -> DIDACAIT100
 * - Certified Skill Trainer Course -> SF100
 */
export function getExactVoucherCode(prizeOrLabel) {
  if (!prizeOrLabel) return 'DIDAC100';

  const label = typeof prizeOrLabel === 'string'
    ? prizeOrLabel
    : (prizeOrLabel.label || prizeOrLabel.shortLabel || prizeOrLabel.prizeWon?.label || '');

  const lower = label.toLowerCase();

  if (lower.includes('virtual') || lower.includes('robotics') || lower.includes('atl') || lower.includes('lab')) {
    return 'AILAB100';
  }

  if (lower.includes('teacher') || lower.includes('ait')) {
    return 'DIDACAIT100';
  }

  if (lower.includes('trainer') || lower.includes('skill') || lower.includes('facilitator')) {
    return 'SF100';
  }

  if (typeof prizeOrLabel === 'object' && prizeOrLabel.voucherCode && prizeOrLabel.voucherCode !== 'TRYAGAIN') {
    return prizeOrLabel.voucherCode;
  }

  return 'DIDAC100';
}
