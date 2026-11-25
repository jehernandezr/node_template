import { join } from 'node:path';
import { GeneratedFileWriter } from '../../generated-file-writer.js';
import { GeneratorSmoke } from '../../generator-smoke.js';
import { ModuleGenerator } from '../../module-generator.js';
import { NodeFileSystem } from '../../node-file-system.js';
import { ServiceGenerator } from '../../service-generator.js';
import { SkeletonVerifier } from '../../skeleton-verifier.js';
import { TemplateRenderer } from '../../template-renderer.js';
import { TemplateSource } from '../../template-source.js';
import { InMemoryFileSystem } from './in-memory-file-system.js';
import { InMemoryWorkspaceCopier } from './in-memory-workspace-copier.js';
import { RecordingCommandRunner } from './recording-command-runner.js';
import { UnchangedFormatter } from './unchanged-formatter.js';

/**
 * The generators with the real repository templates and an in-memory `backend/`, where they write. This way the
 * tests exercise the published templates without touching the disk.
 */
export class GeneratorWorkspace {
  static readonly BACKEND = '/backend';
  private static readonly TEMPLATES = join(
    __dirname,
    '..',
    '..',
    '..',
    'templates',
  );
  private static readonly REPOSITORY_BACKEND = join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    '..',
  );

  readonly backend = new InMemoryFileSystem();
  readonly writer = new GeneratedFileWriter(
    this.backend,
    new UnchangedFormatter(),
    GeneratorWorkspace.BACKEND,
  );
  private readonly templates = new TemplateSource(
    new NodeFileSystem(),
    GeneratorWorkspace.TEMPLATES,
  );
  private readonly renderer = new TemplateRenderer();
  readonly services = new ServiceGenerator(
    this.templates,
    this.renderer,
    this.writer,
  );
  readonly modules = new ModuleGenerator(
    this.templates,
    this.renderer,
    this.writer,
  );
  readonly verifier = new SkeletonVerifier(
    this.templates,
    this.services,
    this.writer,
  );

  readonly copy = new InMemoryFileSystem();
  readonly copier = new InMemoryWorkspaceCopier(this.copy, {
    tsconfig: '{"compilerOptions":{"paths":{}}}',
    eslintConfig: "...['tasks'].map(",
  });
  readonly runner = new RecordingCommandRunner();
  smoke = new GeneratorSmoke(this.copier, this.runner, this.copy);

  /** The text of a `backend/` file in memory. */
  file(path: string): Promise<string> {
    return this.backend.read(`${GeneratorWorkspace.BACKEND}/${path}`);
  }

  /** Copies the reference service files into memory as they are in the repository. */
  async copyReference(paths: readonly string[]): Promise<void> {
    const disk = new NodeFileSystem();
    for (const path of paths) {
      await this.backend.write(
        `${GeneratorWorkspace.BACKEND}/${path}`,
        await disk.read(join(GeneratorWorkspace.REPOSITORY_BACKEND, path)),
      );
    }
  }
}
