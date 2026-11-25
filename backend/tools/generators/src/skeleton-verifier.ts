import type { GeneratedFileWriter } from './generated-file-writer.js';
import { NameForms } from './name-forms.js';
import { ServiceGenerator } from './service-generator.js';
import type { TemplateSource } from './template-source.js';

/**
 * Checks that the service template does not drift from the reference service: it generates it with the tasks name and
 * compares byte for byte the bootstrap and configuration files, which have no domain.
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

  /** The paths the template does not reproduce identically, or does not generate. Empty if everything matches. */
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
