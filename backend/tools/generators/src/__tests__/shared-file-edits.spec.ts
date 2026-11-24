import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GeneratorErrorReason } from '../generator-error.js';
import { NameForms } from '../name-forms.js';
import { SharedFileEdits } from '../shared-file-edits.js';

const INVENTORY = NameForms.of('inventory');
const REPOSITORY_BACKEND = join(__dirname, '..', '..', '..', '..');

describe('SharedFileEdits', () => {
  it('adds the alias of the contract and keeps the others', () => {
    const edited = JSON.parse(
      SharedFileEdits.withContractAlias(
        JSON.stringify({
          compilerOptions: { strict: true, paths: { '@a/b': ['./b.ts'] } },
        }),
        INVENTORY,
      ),
    ) as { compilerOptions: { strict: boolean; paths: object } };

    expect(edited.compilerOptions).toEqual({
      strict: true,
      paths: {
        '@a/b': ['./b.ts'],
        '@contracts/inventory': ['./libs/contracts/inventory/src/index.ts'],
      },
    });
  });

  it('adds the service to the list that shares the boundary rule of the services', () => {
    expect(
      SharedFileEdits.withServiceScope(
        "  ...['tasks', 'billing'].map(\n",
        INVENTORY,
      ),
    ).toBe("  ...['tasks', 'billing', 'inventory'].map(\n");
  });

  it('finds that list in the ESLint configuration of the repository', () => {
    const config = readFileSync(
      join(REPOSITORY_BACKEND, 'eslint.config.mjs'),
      'utf8',
    );

    expect(SharedFileEdits.withServiceScope(config, INVENTORY)).toContain(
      "'billing', 'inventory'].map(",
    );
  });

  it('refuses an ESLint configuration without the list', () => {
    expect(() =>
      SharedFileEdits.withServiceScope('export default [];', INVENTORY),
    ).toThrow(
      expect.objectContaining({ reason: GeneratorErrorReason.MissingMarker }),
    );
  });
});
