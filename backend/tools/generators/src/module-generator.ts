import type { GeneratedFileWriter } from './generated-file-writer.js';
import { GeneratorError, GeneratorErrorReason } from './generator-error.js';
import { MarkedFile } from './marked-file.js';
import { NameForms } from './name-forms.js';
import type { TemplateRenderer } from './template-renderer.js';
import type { TemplateSource } from './template-source.js';

/**
 * Agrega un módulo a un servicio generado: sus capas, su fachada con un fake, su bloque de migraciones y las líneas
 * en `app.module.ts` y `database/shard-migrations.ts`, en los marcadores `// generated:modules`.
 */
export class ModuleGenerator {
  static readonly KIND = 'module';
  /** Primer bloque de migraciones de un servicio sin módulos: después de los de la plataforma y de identity. */
  static readonly FIRST_RANGE = 1_797_000_100_000;
  static readonly RANGE_STEP = 100_000;
  private static readonly RANGE_VALUE = /=\s*([\d_]+)\s*,/g;

  constructor(
    private readonly templates: TemplateSource,
    private readonly renderer: TemplateRenderer,
    private readonly writer: GeneratedFileWriter,
  ) {}

  /**
   * Calcula todos los cambios antes de escribir: si falta un marcador o un archivo ya existe, no escribe nada.
   * @throws GeneratorError `InvalidName`, `MissingService`, `MissingMarker` o `AlreadyExists`.
   */
  async generate(serviceName: string, moduleName: string): Promise<void> {
    const service = NameForms.of(serviceName);
    const module = NameForms.of(moduleName);
    const root = `apps/${service.kebab}`;
    if (!(await this.writer.exists(`${root}/project.json`))) {
      throw new GeneratorError(
        GeneratorErrorReason.MissingService,
        `No existe el servicio ${service.kebab} en backend/apps`,
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

  /** `1797000100000` como `1_797_000_100_000`, como se escriben los bloques a mano. */
  private static grouped(value: number): string {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '_');
  }
}
