import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distConfigPath = resolve('dist', 'wrangler.json');

if (existsSync(distConfigPath)) {
  process.exit(0);
}

const config = {
  name: 'bloomit-admin',
  compatibility_date: '2026-05-01',
  observability: { enabled: true },
  compatibility_flags: ['nodejs_compat'],
  assets: {
    directory: '.',
    not_found_handling: 'single-page-application',
  },
};

writeFileSync(distConfigPath, JSON.stringify(config, null, 2));
console.log('[ensure-dist-wrangler] wrote', distConfigPath);
