/**
 * Creative upload validation.
 *
 * IMPORTANT - verification status: Meta's own creative-spec pages are rendered client-side and could not be
 * fetched in the build session, so the numbers below come from consistent secondary sources and the Marketing
 * API reference. Only limits that block files Meta clearly cannot use are ERRORS (wrong container, over the
 * widely documented size caps). Everything about "best" sizes and ratios is a WARNING with the reason shown.
 * Re-check against Meta's current Ads Guide before relying on a warning/threshold; the single place to edit
 * is the SPEC object. Nothing here crops, re-encodes or rewrites a file: failures are reported, never "fixed".
 */

export const SPEC = {
  verified: false as const,
  verifiedNote: 'Limits taken from secondary sources; confirm against Meta\'s current Ads Guide (see docs/meta-ads-setup.md).',
  image: {
    mimes: ['image/jpeg', 'image/png'] as const,
    maxBytes: 30 * 1024 * 1024,
    recommendedMinShortSide: 1080,
    // Feed-style ratios people commonly use: 1.91:1 (landscape) down to 4:5 (portrait).
    ratioMin: 4 / 5,
    ratioMax: 1.91,
  },
  video: {
    mimes: ['video/mp4', 'video/quicktime'] as const,
    maxBytes: 4 * 1024 * 1024 * 1024,
    minSeconds: 1,
    maxSecondsFeed: 241 * 60,
    maxSecondsReels: 90,
    recommendedMinShortSide: 720,
    ratioMin: 9 / 16,
    ratioMax: 1.91,
  },
} as const;

export type CreativeFacts = {
  kind: 'image' | 'video';
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
};

export type ValidationIssue = { code: string; message: string };
export type CreativeValidation = { errors: ValidationIssue[]; warnings: ValidationIssue[]; ok: boolean };

export function validateCreative(f: CreativeFacts): CreativeValidation {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (code: string, message: string) => errors.push({ code, message });
  const warn = (code: string, message: string) => warnings.push({ code, message });
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

  if (f.bytes <= 0) err('empty', 'The file is empty.');

  if (f.kind === 'image') {
    const s = SPEC.image;
    if (!(s.mimes as readonly string[]).includes(f.mime)) err('image_type', `Images must be JPG or PNG (this file is ${f.mime || 'unknown'}).`);
    if (f.bytes > s.maxBytes) err('image_size', `Image is ${mb(f.bytes)}; the limit is ${mb(s.maxBytes)}.`);
  } else {
    const s = SPEC.video;
    if (!(s.mimes as readonly string[]).includes(f.mime)) err('video_type', `Videos must be MP4 or MOV (this file is ${f.mime || 'unknown'}).`);
    if (f.bytes > s.maxBytes) err('video_size', `Video is ${mb(f.bytes)}; the limit is 4 GB.`);
    if (f.durationSeconds == null) err('video_duration_unknown', 'Could not read the video length from the file header. Re-export it as a standard MP4/MOV.');
    else {
      if (f.durationSeconds < s.minSeconds) err('video_too_short', `Video is ${f.durationSeconds.toFixed(1)}s; the minimum is ${s.minSeconds}s.`);
      if (f.durationSeconds > s.maxSecondsFeed) err('video_too_long', 'Video is longer than the 241-minute maximum.');
      else if (f.durationSeconds > s.maxSecondsReels) warn('video_reels_length', `Video is ${Math.round(f.durationSeconds)}s; longer than ${s.maxSecondsReels}s videos may not be eligible for Reels placements.`);
    }
  }

  if (f.width == null || f.height == null || f.width <= 0 || f.height <= 0) {
    if (f.kind === 'image') err('dimensions_unknown', 'Could not read the image dimensions from the file.');
    else warn('dimensions_unknown', 'Could not read the video dimensions from the file header.');
  } else {
    const short = Math.min(f.width, f.height);
    const s = f.kind === 'image' ? SPEC.image : SPEC.video;
    if (short < s.recommendedMinShortSide) warn('low_resolution', `Shortest side is ${short}px; ${s.recommendedMinShortSide}px or more is recommended, smaller files can look soft.`);
    const ratio = f.width / f.height;
    if (ratio < s.ratioMin - 0.01 || ratio > s.ratioMax + 0.01) {
      warn('aspect_ratio', `Aspect ratio ${ratio.toFixed(2)}:1 is outside the common ${s.ratioMin.toFixed(2)}–${s.ratioMax.toFixed(2)} range; Meta may crop or reject it for some placements.`);
    }
  }
  return { errors, warnings, ok: errors.length === 0 };
}

/** Names are shown to staff and written into Meta; strip control chars and bound the length. */
export function cleanCreativeName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
}

export function cleanTags(tags: string[]): string[] {
  const out = new Set<string>();
  for (const t of tags) {
    const c = t.toLowerCase().replace(/[^a-z0-9 _-]/g, '').trim().replace(/\s+/g, '-').slice(0, 32);
    if (c) out.add(c);
  }
  return [...out].slice(0, 12);
}

/** Server-checked: declared type, probed type and the client-reported facts must agree. */
export function reconcileDeclared(declared: { mime: string; width: number | null; height: number | null }, probed: { mime: string | null; width: number | null; height: number | null }): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!probed.mime) issues.push({ code: 'unrecognized_file', message: 'The file contents are not a recognizable JPG, PNG, MP4 or MOV.' });
  else if (probed.mime !== declared.mime) issues.push({ code: 'type_mismatch', message: `The file says it is ${declared.mime} but its contents are ${probed.mime}.` });
  if (probed.width != null && declared.width != null && probed.width !== declared.width) issues.push({ code: 'dimension_mismatch', message: 'Reported dimensions do not match the file; using the file\'s own values.' });
  return issues;
}
