import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const reportPath = resolve('coverage/lcov.info');
const report = readFileSync(reportPath, 'utf8');

writeFileSync(
  reportPath,
  report.replace(/^SF:src\//gm, 'SF:frontend/src/'),
);
