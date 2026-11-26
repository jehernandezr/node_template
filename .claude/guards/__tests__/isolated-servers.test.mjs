import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const REGISTRY = JSON.parse(
  readFileSync(join(ROOT, 'backend/isolated-server-suites.json'), 'utf8'),
);

/** The container suites of the backend and what each one says about its server. */
class ContainerSuites {
  static TAG = '@isolated-server';
  static SERVER_STATE =
    /\b(CREATE|ALTER|DROP)\s+(ROLE|USER|PUBLICATION|SUBSCRIPTION)\b|pg_create_logical_replication_slot|ALTER\s+SYSTEM|new\s+LogicalReplicationTransfer\b/i;
  static DEDICATED =
    /\b(IsolatedPostgresServer|RegionServers|TwoRegionLedger|DedicatedValkeyHost)\b/;

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
    this.files = execFileSync(
      'git',
      [
        'ls-files',
        '-co',
        '--exclude-standard',
        'backend/**/*.int-spec.ts',
        'backend/**/*.e2e-spec.ts',
      ],
      { cwd: root, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .map((file) => file.slice('backend/'.length));
  }

  /**
   * The text of a suite.
   * @param {string} suite Path from `backend/`.
   * @returns {string} Its source.
   */
  text(suite) {
    return readFileSync(join(this.root, 'backend', suite), 'utf8');
  }

  /**
   * Suites whose source carries the tag.
   * @returns {string[]} Paths from `backend/`.
   */
  tagged() {
    return this.files.filter((suite) =>
      this.text(suite).includes(ContainerSuites.TAG),
    );
  }

  /**
   * Test utilities whose statements change server-level state.
   * @returns {string[]} Paths from `backend/`.
   */
  utilitiesChangingServerState() {
    return execFileSync(
      'git',
      [
        'ls-files',
        '-co',
        '--exclude-standard',
        'backend/**/__tests__/utils/*.ts',
      ],
      { cwd: this.root, encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      .map((file) => file.slice('backend/'.length))
      .filter((file) => ContainerSuites.SERVER_STATE.test(this.text(file)));
  }

  /**
   * Code lines of a file that create a role, leaving out JSDoc that only names the statement.
   * @param {string} file Path from `backend/`.
   * @returns {string[]} The lines.
   */
  roleCreations(file) {
    return this.text(file)
      .split('\n')
      .filter((line) => !/^\s*(\*|\/\*\*)/.test(line))
      .filter((line) => /\bCREATE\s+ROLE\b/i.test(line));
  }

  /**
   * Suites whose own statements change server-level state.
   * @returns {string[]} Paths from `backend/`.
   */
  changingServerState() {
    return this.files.filter((suite) =>
      ContainerSuites.SERVER_STATE.test(this.text(suite)),
    );
  }
}

describe('backend/isolated-server-suites.json', () => {
  const suites = new ContainerSuites(ROOT);
  const listed = REGISTRY.suites.map((entry) => entry.suite).sort();

  it('lists exactly the suites tagged @isolated-server', () => {
    assert.deepEqual(listed, suites.tagged().sort());
  });

  it('lists every suite that changes roles, publications, subscriptions, slots or server settings', () => {
    assert.deepEqual(
      suites.changingServerState().filter((suite) => !listed.includes(suite)),
      [],
    );
  });

  it('starts a dedicated server in every listed suite', () => {
    assert.deepEqual(
      listed.filter(
        (suite) => !ContainerSuites.DEDICATED.test(suites.text(suite)),
      ),
      [],
    );
  });

  it('lists every test utility that changes server state with the reason it is safe on the shared server', () => {
    assert.deepEqual(
      suites.utilitiesChangingServerState().sort(),
      REGISTRY.sharedUtilities.map((entry) => entry.file).sort(),
    );
    assert.deepEqual(
      REGISTRY.sharedUtilities
        .filter((entry) => entry.reason.trim() === '')
        .map((entry) => entry.file),
      [],
    );
  });

  it('creates roles on the shared server only through TestDatabaseServer.ensureRole', () => {
    const ensureRole =
      'libs/platform/persistence/src/__tests__/utils/test-database-server.ts';
    const outsideListed = [
      ...suites.files.filter((suite) => !listed.includes(suite)),
      ...suites.utilitiesChangingServerState(),
    ];
    assert.deepEqual(
      outsideListed.filter(
        (file) => file !== ensureRole && suites.roleCreations(file).length > 0,
      ),
      [],
    );
    const method = /async ensureRole\([\s\S]*?\n {2}\}\n/.exec(
      suites.text(ensureRole),
    )?.[0];
    assert.equal(suites.roleCreations(ensureRole).length, 1);
    assert.match(method ?? '', /\bCREATE\s+ROLE\b/);
  });

  it('gives the isolated PostgreSQL the image and settings of the shared one', () => {
    const { JestTestServers } = createRequire(import.meta.url)(
      join(ROOT, 'backend/jest.servers.cjs'),
    );
    const isolated = suites.text(
      'libs/platform/persistence/src/__tests__/utils/isolated-postgres-server.ts',
    );
    const image = /IMAGE = '([^']+)'/.exec(isolated)?.[1];
    const settings = [
      ...(/SETTINGS = \[([\s\S]*?)\]/.exec(isolated)?.[1] ?? '').matchAll(
        /'([^']+)'/g,
      ),
    ].map((match) => match[1]);
    assert.equal(image, JestTestServers.POSTGRES_IMAGE);
    assert.deepEqual(settings, JestTestServers.POSTGRES_SETTINGS);
  });

  it('gives every listed suite a known category', () => {
    const known = Object.keys(REGISTRY.categories);
    assert.deepEqual(
      REGISTRY.suites
        .filter(
          (entry) =>
            entry.categories.length === 0 ||
            entry.categories.some((category) => !known.includes(category)),
        )
        .map((entry) => entry.suite),
      [],
    );
  });
});
