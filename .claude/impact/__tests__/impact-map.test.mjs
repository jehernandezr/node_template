import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CoupledPaths } from '../coupled-paths.mjs';
import { ExportScanner } from '../export-scanner.mjs';
import { ImpactMapBuilder } from '../impact-map-builder.mjs';
import { ModuleResolver } from '../module-resolver.mjs';
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

describe('StringKeyExtractor of the front and the infrastructure', () => {
  const extract = (lines) =>
    Object.fromEntries(
      [...new StringKeyExtractor().extract(lines.join('\n'))].map(
        ([kind, set]) => [kind, [...set]],
      ),
    );

  it('does not take node: or package: specifiers for key prefixes', () => {
    assert.deepEqual(
      extract([
        '+++ b/x.mjs',
        "+import { describe } from 'node:test';",
        "+import 'package:ui/ui.dart';",
      ]),
      {},
    );
  });

  it('reads ARB keys, routes and repository bindings in the front', () => {
    assert.deepEqual(
      extract([
        '+++ b/front/packages/i18n/lib/l10n/app_en.arb',
        '+  "tasksTitle": "Tasks",',
        '+  "@tasksTitle": {},',
        '+++ b/front/microfrontends/tasks/lib/src/routes.dart',
        "+  static const detail = '/tasks/:id';",
        '+++ b/front/microfrontends/tasks/lib/src/data/tasks_data.dart',
        '+  static final RepositoryBinding<TasksRepository> repository =',
      ]),
      {
        'ARB key': ['tasksTitle'],
        'front route': ['/tasks/:id'],
        'repository binding': ['TasksRepository'],
      },
    );
  });

  it('reads Terraform variables and outputs, topology entries and workflow jobs', () => {
    assert.deepEqual(
      extract([
        '+++ b/backend/infra/terraform/stacks/service/variables.tf',
        '+variable "worker_min_count" {',
        '+++ b/backend/infra/terraform/stacks/service/outputs.tf',
        '-output "api_url" {',
        '+++ b/backend/infra/terraform/topology.json',
        '+  "billing.invoices": {',
        '+++ b/.github/workflows/ci.yml',
        '+  coverage:',
      ]),
      {
        'Terraform variable': ['worker_min_count'],
        'Terraform output': ['api_url'],
        'topology entry': ['billing.invoices'],
        'workflow job': ['coverage'],
      },
    );
  });
});

describe('CoupledPaths', () => {
  it('drags the generated Dart along with a contract change and the jobs along with a workflow change', () => {
    assert.deepEqual(
      new CoupledPaths()
        .of([
          'backend/libs/contracts/billing/src/events/invoice-paid.ts',
          '.github/workflows/ci.yml',
          'docs/adr/README.md',
        ])
        .map((entry) => entry.coupled),
      ['front/packages/contracts/lib/**', 'ci-ok and branch protection'],
    );
  });
});

describe('ModuleResolver', () => {
  const fixture = new GitFixture();

  before(() => {
    fixture
      .write(
        'backend/tsconfig.base.json',
        JSON.stringify({
          compilerOptions: {
            paths: {
              '@platform/kernel': ['./libs/platform/kernel/src/index.ts'],
              '@platform/kernel/*': ['./libs/platform/kernel/src/*'],
            },
          },
        }),
      )
      .write('front/packages/ui/pubspec.yaml', 'name: ui\n')
      .commit('chore: base');
  });

  after(() => fixture.dispose());

  it('reaches a module through a relative path, an alias barrel and a Dart package', () => {
    const resolver = new ModuleResolver(fixture.root);
    assert.equal(resolver.reaches('a/b.ts', '../c/port.js', 'c/port.ts'), true);
    assert.equal(
      resolver.reaches(
        'backend/apps/x/src/main.ts',
        '@platform/kernel',
        'backend/libs/platform/kernel/src/ids/id.ts',
      ),
      true,
    );
    assert.equal(
      resolver.reaches(
        'front/apps/web/lib/main.dart',
        'package:ui/ui.dart',
        'front/packages/ui/lib/src/button.dart',
      ),
      true,
    );
  });

  it('does not reach a module through a registry package or a node: module', () => {
    const resolver = new ModuleResolver(fixture.root);
    assert.equal(resolver.reaches('a/b.mjs', 'node:test', 'test.mjs'), false);
    assert.equal(resolver.reaches('a/b.ts', 'typeorm', 'typeorm.ts'), false);
  });
});

describe('ExportScanner', () => {
  it('lists the exports of a CommonJS module and the public types of a Dart library', () => {
    const scanner = new ExportScanner();
    assert.deepEqual(
      scanner.exportsOf(
        'class JestTestServers {}\nmodule.exports = { JestTestServers, start: run };\n',
        'jest.servers.cjs',
      ),
      ['JestTestServers', 'start'],
    );
    assert.deepEqual(
      scanner.exportsOf(
        'final class RepositoryBinding<T> {}\nclass _Hidden {}\nabstract interface class Port {}\n',
        'lib/src/binding.dart',
      ),
      ['RepositoryBinding', 'Port'],
    );
  });

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

describe('ImpactMapBuilder importers', () => {
  const fixture = new GitFixture();

  before(() => {
    fixture
      .write('guards/rule.mjs', 'export class Rule {}\n')
      .write('front/rules/rule.mjs', 'export class Rule {}\n')
      .write(
        'front/rules/comment-rule.mjs',
        "import { Rule } from './rule.mjs';\nexport class CommentRule extends Rule {}\n",
      )
      .write(
        'guards/gate.mjs',
        "import { Rule } from './rule.mjs';\nexport const rules = [Rule];\n",
      )
      .write(
        'guards/servers.cjs',
        'class Servers {}\nmodule.exports = { Servers };\n',
      )
      .write(
        'guards/setup.cjs',
        "const { Servers } = require('./servers.cjs');\nmodule.exports = () => new Servers();\n",
      )
      .commit('chore: base');
    fixture.git('checkout', '-q', '-b', 'change');
    fixture
      .write('guards/rule.mjs', 'export class Rule {\n  id = 1;\n}\n')
      .write(
        'guards/gate.mjs',
        "import { Rule } from './rule.mjs';\nexport const rules = [Rule, Rule];\n",
      )
      .write(
        'guards/servers.cjs',
        'class Servers {\n  up = true;\n}\nmodule.exports = { Servers };\n',
      )
      .commit('feat: change');
  });

  after(() => fixture.dispose());

  it('counts only the files whose imports reach the declaring module and marks those in the diff', () => {
    const map = new ImpactMapBuilder(fixture.root, 'main', {
      affected: () => [],
    }).build();
    const rule = map.exports.find(
      (entry) => entry.name === 'Rule' && entry.file === 'guards/rule.mjs',
    );

    assert.deepEqual(rule.importers, ['guards/gate.mjs']);
    assert.deepEqual(rule.importersInDiff, ['guards/gate.mjs']);
    assert.match(
      ImpactMapBuilder.markdown(map),
      /`Rule` \(guards\/rule\.mjs\): importers guards\/gate\.mjs \(in diff\)/,
    );
  });

  it('follows a require of a CommonJS module', () => {
    const map = new ImpactMapBuilder(fixture.root, 'main', {
      affected: () => [],
    }).build();

    assert.deepEqual(
      map.exports.find((entry) => entry.name === 'Servers').importers,
      ['guards/setup.cjs'],
    );
  });
});
