import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { identityContract } from '@contracts/identity';
import { SystemRolePermissions } from '../shared/constants/system-roles.constants.js';
import { AccessMatrix } from './utils/index.js';

/** The document lives with the repository docs, outside the project. */
const DOCUMENT = join(
  __dirname,
  '../../../../../docs/identity/access-matrix.md',
);

describe('identity access matrix document', () => {
  const matrix = new AccessMatrix(
    Object.values(identityContract.routes),
    SystemRolePermissions,
  );

  it('has no public route outside the approved list', () => {
    expect(matrix.unapprovedPublicRoutes()).toEqual([]);
  });

  it('matches the routes of the contract', () => {
    const expected = matrix.render();
    if (process.env['UPDATE_ACCESS_MATRIX'] === 'true') {
      writeFileSync(DOCUMENT, expected);
    }

    expect(readFileSync(DOCUMENT, 'utf8')).toBe(expected);
  });
});
