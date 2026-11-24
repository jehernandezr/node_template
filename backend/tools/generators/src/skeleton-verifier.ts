import type { GeneratedFileWriter } from './generated-file-writer.js';
import { NameForms } from './name-forms.js';
import { ServiceGenerator } from './service-generator.js';
import type { TemplateSource } from './template-source.js';

/**
 * Comprueba que la plantilla de servicio no se aparte del servicio de referencia: la genera con el nombre de tasks y
 * compara byte a byte los archivos de arranque y configuración, que no tienen dominio.
 */
export class SkeletonVerifier {
  static readonly REFERENCE = 'tasks';
  static readonly COMPARED: readonly string[] = [
    'project.json',
    'eslint.config.mjs',
    'jest.config.cjs',
    '.spec.swcrc',
    'tsconfig.json',
    'tsconfig.lib.json',
    'tsconfig.spec.json',
    'src/main.ts',
    'src/worker.ts',
    'src/lambda.ts',
    'src/migrate.ts',
    'src/instrumentation.ts',
  ].map((path) => `apps/${SkeletonVerifier.REFERENCE}/${path}`);

  constructor(
    private readonly templates: TemplateSource,
    private readonly generator: ServiceGenerator,
    private readonly writer: GeneratedFileWriter,
  ) {}

  /** Las rutas que la plantilla no reproduce igual, o que no genera. Vacío si todo coincide. */
  async differences(): Promise<string[]> {
    const rendered = new Map(
      this.generator
        .render(
          await this.templates.load(ServiceGenerator.KIND),
          NameForms.of(SkeletonVerifier.REFERENCE),
        )
        .map((file) => [file.path, file.content]),
    );
    const differences: string[] = [];
    for (const path of SkeletonVerifier.COMPARED) {
      if (rendered.get(path) !== (await this.writer.read(path))) {
        differences.push(path);
      }
    }
    return differences;
  }
}
