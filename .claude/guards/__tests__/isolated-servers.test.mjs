import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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
