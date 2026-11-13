import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { ASYNCAPI_PATH, buildAsyncApi } from './build-asyncapi.js';
import { buildExport } from './build-export.js';
import { buildTopology, TOPOLOGY_PATH } from './build-topology.js';
import { contracts } from './registry.js';

const CONTRACTS_DIR = resolve('libs/contracts');

const USAGE =
  'Uso: contracts-export <export|check|topology-export|topology-check>';

/** Qué archivos genera cada modo y si los escribe o solo los compara. */
const MODES: Readonly<
  Record<string, { readonly write: boolean; readonly topologyOnly: boolean }>
> = {
  export: { write: true, topologyOnly: false },
  check: { write: false, topologyOnly: false },
  'topology-export': { write: true, topologyOnly: true },
  'topology-check': { write: false, topologyOnly: true },
};

interface Artifact {
  readonly path: string;
  readonly value: unknown;
}

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

function artifacts(topologyOnly: boolean): Artifact[] {
  const topology: Artifact = {
    path: resolve(TOPOLOGY_PATH),
    value: buildTopology(contracts),
  };
  if (topologyOnly) return [topology];
  return [
    ...[...buildExport(contracts)].map(([service, value]) => ({
      path: exportPath(service),
      value,
    })),
    topology,
    { path: resolve(ASYNCAPI_PATH), value: buildAsyncApi(contracts) },
  ];
}

async function main(mode: string | undefined): Promise<number> {
  const options = mode === undefined ? undefined : MODES[mode];
  if (!options) {
    console.error(USAGE);
    return 2;
  }
  const missing = unregisteredDirs();
  if (missing.length > 0) {
    console.error(
      `Carpetas de libs/contracts sin contrato en tools/contracts-export/src/registry.ts: ${missing.join(', ')}`,
    );
    return 1;
  }
  const drift: string[] = [];
  for (const { path, value } of artifacts(options.topologyOnly)) {
    const content = await render(path, value);
    if (options.write) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      console.log(`Escrito ${path}`);
    } else if (!existsSync(path) || readFileSync(path, 'utf8') !== content) {
      drift.push(path);
    }
  }
  if (drift.length > 0) {
    console.error(
      `Los archivos generados no coinciden con los contratos en TypeScript:\n${drift
        .map((p) => `  ${p}`)
        .join(
          '\n',
        )}\nEjecuta: pnpm nx run contracts-export:export (y regenera el Dart con dart run contracts_gen en front/).`,
    );
    return 1;
  }
  if (!options.write) console.log('Archivos generados al día.');
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
