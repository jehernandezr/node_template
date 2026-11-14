import { AppBundler } from './app-bundler.js';
import { DecoratorMetadataPlugin } from './decorator-metadata-plugin.js';

const USAGE =
  'Uso: app-bundler <proyecto> <carpeta-del-proyecto> [--entry=src/otra-entrada.ts ...]';
const DEFAULT_ENTRY = 'src/main.ts';
const ENTRY_FLAG = '--entry=';

async function main(args: readonly string[]): Promise<number> {
  const [projectName, projectRoot, ...flags] = args;
  if (!projectName || !projectRoot) {
    console.error(USAGE);
    return 2;
  }
  const extraEntries = flags
    .filter((flag) => flag.startsWith(ENTRY_FLAG))
    .map((flag) => flag.slice(ENTRY_FLAG.length));
  const bundler = new AppBundler(process.cwd(), [
    new DecoratorMetadataPlugin().toPlugin(),
  ]);
  const outdir = await bundler.bundle({
    projectName,
    projectRoot,
    entryPoints: [DEFAULT_ENTRY, ...extraEntries],
  });
  console.log(`Empaquetado ${projectName} en ${outdir}`);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
