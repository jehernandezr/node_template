import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ExportScanner } from '../export-scanner.mjs';
import { ImpactMapBuilder } from '../impact-map-builder.mjs';
import { StringKeyExtractor } from '../string-key-extractor.mjs';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../impact-map.mjs',
);

/** A throwaway git repository with a `main` branch and a change on top. */
class GitFixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'impact-map-'));
    this.git('init', '-q', '-b', 'main');
    this.git('config', 'user.email', 'fixture@example.com');
    this.git('config', 'user.name', 'Fixture');
  }

  /**
   * Writes a file.
   * @param {string} file Path from the root.
   * @param {string} text Content.
   * @returns {GitFixture} This fixture.
   */
  write(file, text) {
    mkdirSync(dirname(join(this.root, file)), { recursive: true });
    writeFileSync(join(this.root, file), text);
    return this;
  }

  /**
   * Commits everything.
   * @param {string} message Commit message.
   * @returns {GitFixture} This fixture.
   */
  commit(message) {
    this.git('add', '-A');
    this.git('commit', '-q', '-m', message);
    return this;
  }

  /**
   * Runs git in the fixture.
   * @param {...string} args Git arguments.
   * @returns {string} Its output.
   */
  git(...args) {
    return execFileSync('git', args, { cwd: this.root, encoding: 'utf8' });
  }

  /** Removes the repository. */
  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

describe('StringKeyExtractor', () => {
  it('classifies the identifiers of the changed lines only', () => {
    const found = new StringKeyExtractor().extract(
      [
        '--- a/x.ts',
        '+++ b/x.ts',
        "-  type: 'identity.user.created.v1',",
        "+  type: 'identity.user.registered.v1',",
        "+  code: 'IDENTITY.USER.SUSPENDED',",
        "+  const name = process.env['VALKEY_KEY_PREFIX'];",
        "+  const key = 'auth:epoch:user:';",
        "+  await client.get('/v1/billing/plans');",
        "+  const text = 'Hello there, friend';",
        "   type: 'tasks.task.created.v1',",
      ].join('\n'),
    );
    assert.deepEqual(
      Object.fromEntries([...found].map(([kind, set]) => [kind, [...set]])),
      {
        'event or message': [
          'identity.user.created.v1',
          'identity.user.registered.v1',
        ],
        'error code': ['IDENTITY.USER.SUSPENDED'],
        'environment variable': ['VALKEY_KEY_PREFIX'],
        'key prefix': ['auth:epoch:user:'],
        route: ['/v1/billing/plans'],
      },
    );
  });
});

describe('ExportScanner', () => {
  it('lists declared and re-exported names', () => {
    assert.deepEqual(
      new ExportScanner().exportsOf(
        "export abstract class Port {}\nexport enum Kind { A = 'a' }\nexport { Local as Remote, type Shape } from './x.js';\nclass Hidden {}\n",
      ),
      ['Port', 'Kind', 'Remote', 'Shape'],
    );
  });
});

describe('ImpactMapBuilder', () => {
  const fixture = new GitFixture();

  before(() => {
    fixture
      .write('lib/port.ts', 'export abstract class InvoicePort {}\n')
      .write(
        'lib/adapter.ts',
        "import { InvoicePort } from './port.js';\nexport class SqlInvoices extends InvoicePort {}\n",
      )
      .write('lib/consumer.ts', "const type = 'billing.invoice.paid.v1';\n")
      .commit('chore: base');
    fixture.git('checkout', '-q', '-b', 'change');
    fixture
      .write(
        'lib/port.ts',
        "export abstract class InvoicePort {}\nexport const PAID = 'billing.invoice.paid.v1';\n",
      )
      .commit('feat: change');
  });

  after(() => fixture.dispose());

  it('maps the importers and subtypes of a changed export and every use of a changed event name', () => {
    const map = new ImpactMapBuilder(fixture.root, 'main', {
      affected: () => ['billing'],
    }).build();

    const port = map.exports.find((entry) => entry.name === 'InvoicePort');
    assert.deepEqual(port.importers, ['lib/adapter.ts']);
    assert.deepEqual(port.subtypes, ['lib/adapter.ts']);
    assert.deepEqual(map.keys, [
      {
        kind: 'event or message',
        literal: 'billing.invoice.paid.v1',
        occurrences: ['lib/consumer.ts:1', 'lib/port.ts:2'],
      },
    ]);
    assert.match(ImpactMapBuilder.markdown(map), /Affected projects: billing/);
  });

  it('prints the map from the command line without Nx', () => {
    const result = spawnSync(
      process.execPath,
      [SCRIPT, '--no-nx', fixture.root],
      {
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /`InvoicePort` \(lib\/port\.ts\): importers lib\/adapter\.ts/,
    );
  });
});
