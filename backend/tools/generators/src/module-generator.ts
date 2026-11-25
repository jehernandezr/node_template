import type { GeneratedFileWriter } from './generated-file-writer.js';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import { MarkedFile } from './marked-file.js';
import { NameForms } from './name-forms.js';
import type { TemplateRenderer } from './template-renderer.js';
import type { TemplateSource } from './template-source.js';

/**
 * Adds a module to a generated service: its layers, its facade with a fake, its migrations block and the lines
 * in `app.module.ts` and `database/shard-migrations.ts`, at the `// generated:modules` markers.
 */
export class ModuleGenerator {
  static readonly KIND = 'module';
  /** First migrations block of a service without modules: after the platform and identity ones. */
  static readonly FIRST_RANGE = 1_797_000_100_000;
  static readonly RANGE_STEP = 100_000;
  private static readonly RANGE_VALUE = /=\s*([\d_]+)\s*,/g;

  constructor(
    private readonly templates: TemplateSource,
    private readonly renderer: TemplateRenderer,
    private readonly writer: GeneratedFileWriter,
  ) {}

  /**
   * Computes all changes before writing: if a marker is missing or a file already exists, it writes nothing.
   * @throws GeneratorError `InvalidName`, `MissingService`, `MissingMarker` or `AlreadyExists`.
   */
  async generate(serviceName: string, moduleName: string): Promise<void> {
    const service = NameForms.of(serviceName);
    const module = NameForms.of(moduleName);
    const root = `apps/${service.kebab}`;
    if (!(await this.writer.exists(`${root}/project.json`))) {
      throw new GeneratorError(
        GeneratorErrorReason.MissingService,
        `The service ${service.kebab} does not exist in backend/apps`,
      );
    }
    const edits = [
      await this.rangeEdit(
        `${root}/src/shared/constants/migration-ranges.constants.ts`,
        module,
      ),
      await this.migrationsEdit(
        `${root}/src/database/shard-migrations.ts`,
        module,
      ),
      await this.appModuleEdit(`${root}/src/app.module.ts`, module),
    ];
    const templates = await this.templates.load(ModuleGenerator.KIND);
    await this.writer.writeNew(
      templates.map((template) => ({
        path: this.renderer.path(template.path, module, service),
        content: this.renderer.render(template.content, module, service),
      })),
    );
    for (const edit of edits) {
      await this.writer.overwrite(edit);
    }
  }

  private async rangeEdit(
    path: string,
    module: NameForms,
  ): Promise<{ path: string; content: string }> {
    const text = await this.writer.read(path);
    const used = [...text.matchAll(ModuleGenerator.RANGE_VALUE)].map((match) =>
      Number((match[1] ?? '').replaceAll('_', '')),
    );
    const next =
      used.length === 0
        ? ModuleGenerator.FIRST_RANGE
        : Math.max(...used) + ModuleGenerator.RANGE_STEP;
    const content = new MarkedFile(path, text)
      .insertBefore(
        'modules',
        `${module.pascal} = ${ModuleGenerator.grouped(next)},`,
      )
      .content();
    return { path, content };
  }

  private async migrationsEdit(
    path: string,
    module: NameForms,
  ): Promise<{ path: string; content: string }> {
    const list = `${module.camel}ModuleShardMigrations`;
    const content = new MarkedFile(path, await this.writer.read(path))
      .insertBefore(
        'modules:imports',
        `import { ${list} } from '../modules/${module.kebab}/infrastructure/persistence/migrations/index.js';`,
      )
      .insertBefore('modules', `...${list},`)
      .content();
    return { path, content };
  }

  private async appModuleEdit(
    path: string,
    module: NameForms,
  ): Promise<{ path: string; content: string }> {
    const content = new MarkedFile(path, await this.writer.read(path))
      .insertBefore(
        'modules:imports',
        `import { ${module.pascal}Module } from './modules/${module.kebab}/index.js';`,
      )
      .insertBefore('modules', `${module.pascal}Module,`)
      .content();
    return { path, content };
  }

  /** `1797000100000` as `1_797_000_100_000`, the way blocks are written by hand. */
  private static grouped(value: number): string {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '_');
  }
}
