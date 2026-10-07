import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { inspectPdf } from '@/lib/signing/pdf-validate';
import { detectFields } from '@/lib/signing/detect';
import { textContractPdf, rotatedContractPdf, scannedPdf } from './helpers/signing-fixtures';

const OUT = process.env.SIGNING_OUT_DIR ?? '/tmp/claude-0/-home-user-HOMEQUOTENET/3cc36b08-6590-446f-89d3-cf106ee1c87b/scratchpad/out';
it.skipIf(!process.env.WRITE_FIXTURES)('writes preview fixtures', async () => {
  mkdirSync(OUT, { recursive: true });
  for (const [name, bytes] of [['fx-text', await textContractPdf()], ['fx-rot90', await rotatedContractPdf(90)], ['fx-scan', await scannedPdf()]] as const) {
    writeFileSync(`${OUT}/${name}.pdf`, bytes);
    const i = await inspectPdf(bytes);
    writeFileSync(`${OUT}/${name}.json`, JSON.stringify({ pages: i.pages, fields: (await detectFields(bytes, i.geoms)).fields }));
  }
}, 60000);
