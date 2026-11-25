import type { GeneratedFileWriter } from './generated-file-writer.js';
import { NameForms } from './name-forms.js';
import type { TemplateRenderer } from './template-renderer.js';
import type { TemplateFile, TemplateSource } from './template-source.js';

/**
 * Crea un servicio con la estructura de los demás: la app, su contrato con las operaciones de traslado y los tfvars
 * de `dev`. Devuelve las líneas que hay que agregar a mano en los archivos compartidos.
 */
export class ServiceGenerator {
  static readonly KIND = 'service';

  constructor(
    private readonly templates: TemplateSource,
    private readonly renderer: TemplateRenderer,
    private readonly writer: GeneratedFileWriter,
  ) {}

  /**
   * @throws GeneratorError `InvalidName` si el nombre no está en kebab-case.
   * @throws GeneratorError `AlreadyExists` si algún archivo del servicio ya existe.
   */
  async generate(name: string): Promise<string[]> {
    const forms = NameForms.of(name);
    const templates = await this.templates.load(ServiceGenerator.KIND);
    await this.writer.writeNew(this.render(templates, forms));
    return ServiceGenerator.sharedLines(forms);
  }

  /** Los archivos que salen de las plantillas con el nombre dado, sin escribirlos. */
  render(
    templates: readonly TemplateFile[],
    forms: NameForms,
  ): { path: string; content: string }[] {
    return templates.map((template) => ({
      path: this.renderer.path(template.path, forms),
      content: this.renderer.render(template.content, forms),
    }));
  }

  private static sharedLines(forms: NameForms): string[] {
    const { kebab, snake } = forms;
    return [
      `backend/tsconfig.base.json (paths): "@contracts/${kebab}": ["./libs/contracts/${kebab}/src/index.ts"]`,
      `backend/eslint.config.mjs (depConstraints): '${kebab}' en la lista de servicios con su scope:${kebab}`,
      `backend/infra/local/postgres/init.sql: CREATE DATABASE ${snake}_shard_0; y ${snake}_shard_1; con la extensión vector`,
      `backend/.env.example: DB_DATABASES con ${snake}_shard_0 y ${snake}_shard_1 para correr ${kebab} en local`,
      `backend/tools/contracts-export/project.json (implicitDependencies): "contracts-${kebab}", y después nx run contracts-export:export`,
      `backend/apps/identity/src/modules/tenant-moves/application/tenant-move-participants.ts: ${forms.pascal}TenantMoveOperations en ALL, para que la saga MoveTenant traslade sus datos`,
      `backend/apps/identity/src/modules/tenants/application/tenant-directory-followers.ts: ${forms.pascal}TenantDirectoryOperations en ALL, para que el alta de un tenant lo ubique también en ${kebab}`,
    ];
  }
}
