import { ServiceName } from '../../../infra/scripts/service-name.mjs';
import type { GeneratedFileWriter } from './generated-file-writer.js';
import { NameForms } from './name-forms.js';
import type { TemplateRenderer } from './template-renderer.js';
import type { TemplateFile, TemplateSource } from './template-source.js';

/**
 * Creates a service with the same structure as the others: the app, its contract with the move operations and the `dev`
 * tfvars of its `service-base` and `service` stacks. Returns the lines that must be added by hand to the shared files.
 */
export class ServiceGenerator {
  static readonly KIND = 'service';

  constructor(
    private readonly templates: TemplateSource,
    private readonly renderer: TemplateRenderer,
    private readonly writer: GeneratedFileWriter,
  ) {}

  /**
   * Generates a new service from the templates and registers it in the shared files.
   * @param name Name of the service, in kebab-case.
   * @returns The written paths.
   * @throws GeneratorError `InvalidName` if the name is not in kebab-case.
   * @throws GeneratorError `AlreadyExists` if any service file already exists.
   */
  async generate(name: string): Promise<string[]> {
    const forms = NameForms.of(name);
    const templates = await this.templates.load(ServiceGenerator.KIND);
    await this.writer.writeNew(this.render(templates, forms));
    return ServiceGenerator.sharedLines(forms);
  }

  /**
   * The files produced from the templates with the given name, without writing them.
   * @param templates Templates of a service.
   * @param forms Forms of the name.
   * @returns The rendered files.
   */
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
    const { kebab } = forms;
    const serviceName = new ServiceName(kebab).terraform;
    return [
      `backend/tsconfig.base.json (paths): "@contracts/${kebab}": ["./libs/contracts/${kebab}/src/index.ts"]`,
      `backend/eslint.config.mjs (depConstraints): '${kebab}' in the list of services with its scope:${kebab}`,
      `backend/infra/local/postgres/init.sql: CREATE DATABASE ${serviceName}_catalog, ${serviceName}_shard_0 and ${serviceName}_shard_1, each with the vector extension`,
      `backend/infra/terraform/listener-priorities.json: "${serviceName}" with a priority above every existing one`,
      `backend/infra/terraform/environments/dev/data/terraform.tfvars: ${serviceName} in db_services, with the shard count of the other services, and in valkey_services`,
      `backend/infra/terraform/environments/dev/global/terraform.tfvars: "${kebab}" in services, for its ECR repository`,
      `backend/.env.example: DB_CATALOG_NAME=${serviceName}_catalog to run ${kebab} locally`,
      `backend/tools/contracts-export/project.json (implicitDependencies): "contracts-${kebab}", then nx run contracts-export:export`,
      `backend/apps/identity/src/modules/tenant-moves/application/tenant-move-participants.ts: ${forms.pascal}TenantMoveOperations in ALL, so the MoveTenant saga moves its data`,
      `backend/apps/identity/src/modules/tenants/application/tenant-directory-followers.ts: ${forms.pascal}TenantDirectoryOperations in ALL, so registering a tenant also places it in ${kebab}`,
    ];
  }
}
