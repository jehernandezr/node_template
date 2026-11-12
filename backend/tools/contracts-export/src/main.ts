import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { buildExport } from './build-export.js';
import { contracts } from './registry.js';

const CONTRACTS_DIR = resolve('libs/contracts');

function exportPath(service: string): string {
  return join(CONTRACTS_DIR, service, 'export', 'contract.json');
}

async function render(path: string, value: unknown): Promise<string> {
  const config = (await resolveConfig(path)) ?? {};
  return format(JSON.stringify(value), {
    ...config,
    parser: 'json',
    filepath: path,
  });
}

function unregisteredDirs(): string[] {
  const registered = new Set(contracts.map((c) => c.service));
  return readdirSync(CONTRACTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !registered.has(entry.name))
    .map((entry) => entry.name);
}

async function main(mode: string | undefined): Promise<number> {
  if (mode !== 'export' && mode !== 'check') {
    console.error('Uso: contracts-export <export|check>');
    return 2;
  }
  const missing = unregisteredDirs();
  if (missing.length > 0) {
    console.error(
      `Carpetas de libs/contracts sin contrato en tools/contracts-export/src/registry.ts: ${missing.join(', ')}`,
    );
    return 1;
  }
  const exported = buildExport(contracts);
  const drift: string[] = [];
  for (const [service, value] of exported) {
    const path = exportPath(service);
    const content = await render(path, value);
    if (mode === 'export') {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      console.log(`Escrito ${path}`);
    } else if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
      drift.push(path);
    }
  }
  if (drift.length > 0) {
    console.error(
      `Los contratos exportados no coinciden con el TypeScript:\n${drift
        .map((p) => `  ${p}`)
        .join(
          '\n',
        )}\nEjecuta: pnpm nx run contracts-export:export (y regenera el Dart con dart run contracts_gen en front/).`,
    );
    return 1;
  }
  if (mode === 'check') console.log('Contratos exportados al día.');
  return 0;
}

main(process.argv[2]).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
