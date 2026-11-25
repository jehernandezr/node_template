import { SkeletonVerifier } from '../skeleton-verifier.js';
import { GeneratorWorkspace } from './utils/index.js';

describe('SkeletonVerifier', () => {
  it('finds the startup and configuration files of tasks identical to the service template', async () => {
    const workspace = new GeneratorWorkspace();
    await workspace.copyReference(SkeletonVerifier.COMPARED);

    await expect(workspace.verifier.differences()).resolves.toEqual([]);
  });

  it('reports a file of tasks that drifted from the template', async () => {
    const workspace = new GeneratorWorkspace();
    await workspace.copyReference(SkeletonVerifier.COMPARED);
    const main = `${GeneratorWorkspace.BACKEND}/apps/tasks/src/main.ts`;
    await workspace.backend.write(
      main,
      `${await workspace.backend.read(main)}// another startup\n`,
    );

    await expect(workspace.verifier.differences()).resolves.toEqual([
      'apps/tasks/src/main.ts',
    ]);
  });
});
