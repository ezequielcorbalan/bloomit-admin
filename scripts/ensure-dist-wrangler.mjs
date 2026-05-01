import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const distConfigPath = resolve(distDir, 'wrangler.json');
const assetsIgnorePath = resolve(distDir, '.assetsignore');

mkdirSync(distDir, { recursive: true });

const config = {
  name: 'bloomit-admin',
  compatibility_date: '2026-05-01',
  observability: { enabled: true },
  assets: {
    directory: '.',
    not_found_handling: 'single-page-application',
  },
};

writeFileSync(distConfigPath, JSON.stringify(config, null, 2));
writeFileSync(assetsIgnorePath, 'wrangler.json\n.assetsignore\n');
console.log('[ensure-dist-wrangler] wrote', distConfigPath);
console.log('[ensure-dist-wrangler] wrote', assetsIgnorePath);
