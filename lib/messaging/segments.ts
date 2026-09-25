/**
 * SMS segment counting for cost estimates and length warnings. GSM-7 bodies
 * fit 160 chars in one segment (153 per part when concatenated); any
 * character outside GSM-7 switches the whole message to UCS-2 (70 / 67).
 * Extension-table characters cost two GSM-7 septets. Providers' own counts,
 * when reported, win over this estimate.
 */

const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_EXTENSION = '^{}\\[~]|€\f';

const BASIC = new Set(GSM7_BASIC);
const EXTENDED = new Set(GSM7_EXTENSION);

export interface SegmentInfo {
  encoding: 'GSM-7' | 'UCS-2';
  /** GSM-7 septets or UCS-2 code units. */
  units: number;
  segments: number;
}

export function countSmsSegments(body: string): SegmentInfo {
  if (body.length === 0) return { encoding: 'GSM-7', units: 0, segments: 0 };
  let septets = 0;
  for (const ch of body) {
    if (BASIC.has(ch)) septets += 1;
    else if (EXTENDED.has(ch)) septets += 2;
    else {
      // UCS-2 counts UTF-16 code units (emoji take two).
      const units = body.length;
      return { encoding: 'UCS-2', units, segments: units <= 70 ? 1 : Math.ceil(units / 67) };
    }
  }
  return { encoding: 'GSM-7', units: septets, segments: septets <= 160 ? 1 : Math.ceil(septets / 153) };
}
