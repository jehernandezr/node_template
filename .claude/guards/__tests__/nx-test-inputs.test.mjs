import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const NX = JSON.parse(readFileSync(join(ROOT, 'nx.json'), 'utf8'));
const PATHS = JSON.parse(
  readFileSync(join(ROOT, 'backend/tsconfig.base.json'), 'utf8'),
).compilerOptions.paths;
const TEST_UTILS_GLOB = '{projectRoot}/src/**/__tests__/utils/**/*';

describe('nx.json test inputs', () => {
  it('keeps the test utilities of a project in the testUtils named input', () => {
    assert.ok(
      NX.namedInputs.testUtils?.includes(TEST_UTILS_GLOB),
      `namedInputs.testUtils must include ${TEST_UTILS_GLOB}`,
    );
  });

  it('places every test-utils alias where the testUtils named input reaches', () => {
    const outside = Object.entries(PATHS)
      .filter(([alias]) => alias.endsWith('/test-utils'))
      .flatMap(([alias, targets]) =>
        targets
          .filter((target) => !/\/src\/(.+\/)?__tests__\/utils\//.test(target))
          .map((target) => `${alias} -> ${target}`),
      );
    assert.deepEqual(outside, []);
  });

  for (const target of ['test', 'test-int']) {
    it(`hashes the test utilities of the dependencies into ${target}`, () => {
      const defaults = [NX.targetDefaults[target] ?? []].flat();
      const jest = defaults.filter(
        (entry) =>
          !entry.filter?.plugin || entry.filter.plugin === '@nx/jest/plugin',
      );
      const inputs = jest.at(-1)?.inputs ?? [];
      assert.ok(
        inputs.includes('^testUtils') || inputs.includes('^default'),
        `targetDefaults.${target}.inputs must include ^testUtils, or a dependency harness change replays a cached result`,
      );
    });
  }

  it('hashes the shared backend lint config and its guards into lint', () => {
    const lint = [NX.targetDefaults.lint ?? []]
      .flat()
      .filter(
        (entry) =>
          !entry.filter?.plugin || entry.filter.plugin === '@nx/eslint/plugin',
      )
      .at(-1);
    const inputs = lint?.inputs ?? [];
    for (const file of [
      '{workspaceRoot}/backend/eslint.config.mjs',
      '{workspaceRoot}/backend/eslint.comments.mjs',
      '{workspaceRoot}/backend/eslint.guards.mjs',
      '{workspaceRoot}/backend/eslint.baseline.json',
    ]) {
      assert.ok(
        inputs.includes(file) ||
          inputs.includes('{workspaceRoot}/backend/eslint.*'),
        `targetDefaults.lint.inputs must cover ${file}, or a new guard replays cached lint results`,
      );
    }
  });
});
