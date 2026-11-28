import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { guardsPlugin } from '../../../../backend/eslint.guards.mjs';

/** Lints a snippet as if it lived at a path of the backend, with the guard rules only. */
class GuardRulesHarness {
  constructor() {
    this.linter = new Linter({ configType: 'flat' });
  }

  /**
   * Lists the guard rules a snippet breaks.
   * @param {string} filename Path of the snippet from the repository root.
   * @param {string} code TypeScript source.
   * @returns {string[]} The rule id of each report, in order.
   */
  reported(filename, code) {
    return this.linter
      .verify(
        code,
        [
          {
            files: ['**/*.ts'],
            languageOptions: { parser: tsParser },
            plugins: { guards: guardsPlugin },
            rules: {
              'guards/no-jest-doubles': 'error',
              'guards/no-new-collaborator': 'error',
              'guards/no-global-module': 'error',
              'guards/no-own-test-server': 'error',
              'guards/no-module-in-index': 'error',
            },
          },
        ],
        { filename: join(process.cwd(), filename) },
      )
      .map((message) => message.ruleId);
  }
}

const harness = new GuardRulesHarness();
const SPEC = 'backend/libs/platform/x/src/__tests__/x.spec.ts';
const CORE = 'backend/apps/tasks/src/modules/tasks/application/assign-task.ts';

describe('guards/no-jest-doubles', () => {
  it('rejects jest.fn, jest.spyOn, jest.mock and jest.replaceProperty', () => {
    assert.deepEqual(
      harness.reported(
        SPEC,
        "jest.mock('x');\nconst f = jest.fn();\njest.spyOn(Math, 'max');\njest.replaceProperty(process, 'env', {});\n",
      ),
      Array(4).fill('guards/no-jest-doubles'),
    );
  });

  it('accepts the Jest helpers that are not doubles', () => {
    assert.deepEqual(
      harness.reported(SPEC, 'jest.setTimeout(10);\njest.useFakeTimers();\n'),
      [],
    );
  });
});

describe('guards/no-new-collaborator', () => {
  it('rejects building a use case or repository by hand in application code', () => {
    assert.deepEqual(
      harness.reported(
        CORE,
        'const a = new TaskRepository();\nconst b = new AssignTaskUseCase(a);\n',
      ),
      ['guards/no-new-collaborator', 'guards/no-new-collaborator'],
    );
  });

  it('accepts value objects, errors and web platform classes', () => {
    assert.deepEqual(
      harness.reported(
        CORE,
        "const a = new Money(1);\nconst b = new Error('x');\nconst c = new AbortController();\n",
      ),
      [],
    );
  });

  it('accepts the files that compose the graph', () => {
    for (const file of [
      SPEC,
      'backend/apps/tasks/src/modules/tasks/tasks.module.ts',
      'backend/libs/platform/x/src/nest/x.providers.ts',
      'backend/libs/platform/x/src/x-store-selector.ts',
      'backend/apps/tasks/src/main.ts',
    ]) {
      assert.deepEqual(
        harness.reported(file, 'const a = new TaskRepository();\n'),
        [],
        file,
      );
    }
  });
});

describe('guards/no-own-test-server', () => {
  const harnessFile =
    'backend/libs/platform/x/src/__tests__/utils/orders-test-database.ts';

  it('rejects a harness that starts its own PostgreSQL or Valkey container', () => {
    assert.deepEqual(
      harness.reported(
        harnessFile,
        "const a = new PostgreSqlContainer('postgres:17');\nconst b = new GenericContainer('valkey/valkey-bundle:8.1');\nconst c = new GenericContainer(OrdersValkey.IMAGE);\n",
      ),
      Array(3).fill('guards/no-own-test-server'),
    );
  });

  it('accepts other containers and the hosts that need servers of their own', () => {
    assert.deepEqual(
      harness.reported(
        harnessFile,
        "const a = new GenericContainer('axllent/mailpit:v1.27');\n",
      ),
      [],
    );
    for (const file of [
      'backend/libs/platform/adapters/valkey/src/__tests__/utils/dedicated-valkey-host.ts',
      'backend/libs/platform/tenant-move/src/nest/__tests__/utils/region-servers.ts',
    ]) {
      assert.deepEqual(
        harness.reported(
          file,
          "const a = new PostgreSqlContainer('postgres:17-alpine');\nconst b = new GenericContainer(DedicatedValkeyHost.IMAGE);\n",
        ),
        [],
        file,
      );
    }
  });
});

describe('guards/no-global-module', () => {
  const module =
    "import { Global, Module } from '@nestjs/common';\n@Global()\n@Module({})\nexport class TasksSupportModule {}\n";

  it('rejects @Global() in a service module', () => {
    assert.deepEqual(
      harness.reported(
        'backend/apps/tasks/src/support/support.module.ts',
        module,
      ),
      ['guards/no-global-module'],
    );
  });

  it('accepts @Global() in a platform library', () => {
    assert.deepEqual(
      harness.reported('backend/libs/platform/x/src/nest/x.module.ts', module),
      [],
    );
  });
});

describe('guards/no-module-in-index', () => {
  const INDEX = 'backend/apps/notifications/src/modules/push/index.ts';

  it('rejects a module index.ts that re-exports a Nest module', () => {
    assert.deepEqual(
      harness.reported(
        INDEX,
        "export { PushModule } from './presentation/push.module.js';\nexport * from './presentation/other.module.js';\n",
      ),
      ['guards/no-module-in-index', 'guards/no-module-in-index'],
    );
  });

  it('accepts facades and types in index.ts and Nest modules in module.ts', () => {
    assert.deepEqual(
      harness.reported(
        INDEX,
        "export { PushFacade } from './application/push.facade.js';\nexport type { PushMessage } from './domain/push-message.js';\n",
      ),
      [],
    );
    assert.deepEqual(
      harness.reported(
        'backend/apps/notifications/src/modules/push/module.ts',
        "export { PushModule } from './presentation/push.module.js';\n",
      ),
      [],
    );
  });
});

describe('eslint.baseline.json', () => {
  const baseline = JSON.parse(
    readFileSync(join(process.cwd(), 'backend/eslint.baseline.json'), 'utf8'),
  );
  const patterns = {
    'no-global-module': /@Global\(\)/,
    'no-new-collaborator':
      /new [A-Z][A-Za-z0-9]*(UseCase|Repository|Facade|Service|Job|Consumer|Controller|Store|Publisher|Gateway|Handler|Client|Relay|Dispatcher|Scheduler)\(/,
  };

  it('lists only files that still break their rule, so the list can only shrink', () => {
    for (const [rule, files] of Object.entries(baseline)) {
      for (const file of files) {
        const text = readFileSync(join(process.cwd(), 'backend', file), 'utf8');
        assert.match(text, patterns[rule], `${file} no longer breaks ${rule}`);
      }
    }
  });

  it('does not grow past the count recorded when the rules were added', () => {
    assert.ok(baseline['no-global-module'].length <= 7);
    assert.ok(baseline['no-new-collaborator'].length <= 1);
  });
});
