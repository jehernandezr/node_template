import { join } from 'node:path';
import type { CommandRunner } from './command-runner.js';
import type { FileSystem } from './file-system.js';
import { NameForms } from './name-forms.js';
import { SharedFileEdits } from './shared-file-edits.js';
import type { WorkspaceCopier } from './workspace-copier.js';

/**
 * Prueba de humo de los generadores: en una copia del workspace genera un servicio y un módulo, agrega las líneas
 * compartidas que el generador pide y corre `lint`, `test`, `typecheck` y `build` de los dos proyectos generados.
 * La copia se borra en todos los caminos.
 */
export class GeneratorSmoke {
  static readonly SERVICE = 'smoke-probe';
  static readonly MODULE = 'probe-items';
  static readonly TARGETS = ['lint', 'test', 'typecheck', 'build'] as const;
  private static readonly GENERATOR = [
    'tsx',
    '--tsconfig',
    'tools/generators/tsconfig.lib.json',
    'tools/generators/src/main.ts',
  ];

  constructor(
    private readonly copier: WorkspaceCopier,
    private readonly runner: CommandRunner,
    private readonly files: FileSystem,
  ) {}

  /** @returns el código de salida del primer paso que falla, o 0. */
  async run(): Promise<number> {
    const root = await this.copier.copy();
    try {
      return await this.runIn(root);
    } finally {
      await this.copier.remove(root);
    }
  }

  private async runIn(root: string): Promise<number> {
    const backend = join(root, 'backend');
    const service = NameForms.of(GeneratorSmoke.SERVICE);
    const generate = [
      ['service', `--name=${service.kebab}`],
      [
        'module',
        `--service=${service.kebab}`,
        `--name=${GeneratorSmoke.MODULE}`,
      ],
    ];
    for (const args of generate) {
      const code = await this.pnpm(backend, [
        'exec',
        ...GeneratorSmoke.GENERATOR,
        ...args,
      ]);
      if (code !== 0) {
        return code;
      }
    }
    await this.edit(join(backend, 'tsconfig.base.json'), (text) =>
      SharedFileEdits.withContractAlias(text, service),
    );
    await this.edit(join(backend, 'eslint.config.mjs'), (text) =>
      SharedFileEdits.withServiceScope(text, service),
    );
    return this.pnpm(root, [
      'exec',
      'nx',
      'run-many',
      `--targets=${GeneratorSmoke.TARGETS.join(',')}`,
      `--projects=${service.kebab},contracts-${service.kebab}`,
      '--parallel=1',
      '--skip-nx-cache',
      '--outputStyle=static',
    ]);
  }

  private pnpm(cwd: string, args: readonly string[]): Promise<number> {
    return this.runner.run({
      command: 'pnpm',
      args,
      cwd,
      // La copia es desechable: sin daemon ni caché remota, Nx no deja procesos ni datos fuera de ella.
      env: { NX_DAEMON: 'false', NX_NO_CLOUD: 'true' },
      // tsx deja en el entorno el tsconfig con que corre este proceso, una ruta relativa que en la copia no existe.
      unset: ['TSX_TSCONFIG_PATH'],
    });
  }

  private async edit(
    path: string,
    change: (text: string) => string,
  ): Promise<void> {
    await this.files.write(path, change(await this.files.read(path)));
  }
}
