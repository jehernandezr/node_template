import { GeneratorCommand, GeneratorExitCode } from '../generator-command.js';
import { SkeletonVerifier } from '../skeleton-verifier.js';
import { GeneratorSmoke } from '../generator-smoke.js';
import {
  GeneratorWorkspace,
  RecordingCommandRunner,
  RecordingOutput,
} from './utils/index.js';

function commandIn(workspace: GeneratorWorkspace, output: RecordingOutput) {
  return new GeneratorCommand(
    workspace.services,
    workspace.modules,
    workspace.verifier,
    workspace.smoke,
    output,
  );
}

describe('GeneratorCommand', () => {
  it('generates a service and lists the shared lines to add', async () => {
    const workspace = new GeneratorWorkspace();
    const output = new RecordingOutput();

    const code = await commandIn(workspace, output).run([
      'service',
      '--name=inventory',
    ]);

    expect(code).toBe(GeneratorExitCode.Success);
    await expect(
      workspace.file('apps/inventory/project.json'),
    ).resolves.toContain('"name": "inventory"');
    expect(
      output.infos.some((line) => line.includes('@contracts/inventory')),
    ).toBe(true);
  });

  it('generates a module inside a service', async () => {
    const workspace = new GeneratorWorkspace();
    const output = new RecordingOutput();
    await workspace.services.generate('inventory');

    const code = await commandIn(workspace, output).run([
      'module',
      '--service=inventory',
      '--name=suppliers',
    ]);

    expect(code).toBe(GeneratorExitCode.Success);
    await expect(
      workspace.file('apps/inventory/src/modules/suppliers/index.ts'),
    ).resolves.toContain('SuppliersFacade');
  });

  it('fails the verification and names the files that drifted', async () => {
    const workspace = new GeneratorWorkspace();
    const output = new RecordingOutput();
    await workspace.copyReference(SkeletonVerifier.COMPARED);
    await workspace.backend.write(
      `${GeneratorWorkspace.BACKEND}/apps/tasks/project.json`,
      '{}\n',
    );

    const code = await commandIn(workspace, output).run(['verify']);

    expect(code).toBe(GeneratorExitCode.Failure);
    expect(output.errors).toEqual([
      'The service template does not reproduce apps/tasks/project.json',
    ]);
  });

  it('passes the verification when tasks matches the template', async () => {
    const workspace = new GeneratorWorkspace();
    await workspace.copyReference(SkeletonVerifier.COMPARED);

    await expect(
      commandIn(workspace, new RecordingOutput()).run(['verify']),
    ).resolves.toBe(GeneratorExitCode.Success);
  });

  it.each([
    [[]],
    [['service']],
    [['module', '--name=x']],
    [['deploy']],
    [['service', '--label=x']],
  ])('answers with the usage to %p', async (args) => {
    const output = new RecordingOutput();

    const code = await commandIn(new GeneratorWorkspace(), output).run(args);

    expect(code).toBe(GeneratorExitCode.Usage);
    expect(output.errors.join('\n')).toContain('Usage:');
  });

  it('reports a generator refusal as a failure', async () => {
    const output = new RecordingOutput();

    const code = await commandIn(new GeneratorWorkspace(), output).run([
      'service',
      '--name=Inventory',
    ]);

    expect(code).toBe(GeneratorExitCode.Failure);
    expect(output.errors[0]).toContain('kebab-case');
  });

  it('runs the smoke test of the generators and reports whether the generated projects pass', async () => {
    const passing = new GeneratorWorkspace();
    const passed = new RecordingOutput();
    const failing = new GeneratorWorkspace();
    failing.smoke = new GeneratorSmoke(
      failing.copier,
      new RecordingCommandRunner(new Map([[3, 1]])),
      failing.copy,
    );
    const failed = new RecordingOutput();

    const success = await commandIn(passing, passed).run(['smoke']);
    const failure = await commandIn(failing, failed).run(['smoke']);

    expect(success).toBe(GeneratorExitCode.Success);
    expect(passed.infos.join('\n')).toContain(
      'lint, test, typecheck and build',
    );
    expect(failure).toBe(GeneratorExitCode.Failure);
    expect(failed.errors.join('\n')).toContain('exit 1');
  });
});
