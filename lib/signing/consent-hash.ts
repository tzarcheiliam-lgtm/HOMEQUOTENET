import { createHash } from 'node:crypto';
import { CONSENT_TEXT, CONSENT_VERSION } from '@/lib/signing/constants';

/** Fingerprint of the exact consent wording shown to signers (recorded with each consent event). */
export const CONSENT_TEXT_SHA256 = createHash('sha256').update(CONSENT_VERSION + '\n' + CONSENT_TEXT.join('\n')).digest('hex');
