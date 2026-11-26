import { readFileSync } from 'node:fs';

/**
 * Guards for review findings that kept coming back: Jest mocks instead of class doubles, collaborators built with
 * `new` outside the composition root, `@Global()` modules outside the platform, and test harnesses that start their
 * own database server. A rule that could not be fixed
 * everywhere at once lists its remaining files in `eslint.baseline.json`; the list may only shrink.
 */
class GuardBaseline {
  static FILE = new URL('./eslint.baseline.json', import.meta.url);

  /**
   * @param {Record<string, string[]>} entries Files still allowed to break each rule, relative to `backend/`.
   */
  constructor(entries) {
    this.entries = entries;
  }

  /**
   * Reads the baseline next to this file.
   * @returns {GuardBaseline} The recorded exceptions.
   */
  static load() {
    return new GuardBaseline(
      JSON.parse(readFileSync(GuardBaseline.FILE, 'utf8')),
    );
  }

  /**
   * Tells whether a file is still allowed to break a rule.
   * @param {string} rule Rule name without the plugin prefix.
   * @param {string} filename Absolute or relative path of the linted file.
   * @returns {boolean} `true` when the baseline lists the file.
   */
  allows(rule, filename) {
    const file = filename.replaceAll('\\', '/');
    return (this.entries[rule] ?? []).some(
      (entry) => file.endsWith(`/backend/${entry}`) || file === entry,
    );
  }
}

/** The file kinds whose job is to build the object graph by hand. */
class CompositionFiles {
  static PATTERNS = [
    /\/__tests__\//,
    /\.(int-|e2e-|contract-)?spec\.ts$/,
    /\.module\.ts$/,
    /\/nest\//,
    /selector\.ts$/,
    /factory\.ts$/,
    /\/(main|worker|lambda|migrate|seed|tenant-move)\.ts$/,
  ];

  /**
   * Tells whether a file may build collaborators with `new`.
   * @param {string} filename Path of the linted file.
   * @returns {boolean} `true` for tests, Nest modules and wiring, selectors, factories and process entry points.
   */
  static includes(filename) {
    const file = filename.replaceAll('\\', '/');
    return CompositionFiles.PATTERNS.some((pattern) => pattern.test(file));
  }
}

/** Rejects `jest.fn`, `jest.spyOn`, `jest.mock` and their kin: a test double is a class that extends the port. */
class NoJestDoublesRule {
  static MEMBERS = new Set([
    'fn',
    'spyOn',
    'mock',
    'doMock',
    'unstable_mockModule',
    'mocked',
    'replaceProperty',
    'createMockFromModule',
  ]);

  meta = {
    type: 'problem',
    schema: [],
    messages: {
      double:
        '`jest.{{member}}` is not used: write a class double that extends the port, or assert on an observable outcome.',
    },
  };

  /**
   * Reports every member access to a Jest mocking helper.
   * @param {import('eslint').Rule.RuleContext} context Lint context.
   * @returns {import('eslint').Rule.RuleListener} The visitors.
   */
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'jest' &&
          node.property.type === 'Identifier' &&
          NoJestDoublesRule.MEMBERS.has(node.property.name)
        ) {
          context.report({
            node,
            messageId: 'double',
            data: { member: node.property.name },
          });
        }
      },
    };
  }
}

/**
 * Rejects `new` of an injectable collaborator (a use case, repository, facade, service, job, consumer, controller,
 * store, publisher, gateway, handler, client, relay, dispatcher or scheduler) outside the files that compose the
 * graph. The class is recognized by its name, which the naming rules of the backend fix.
 */
class NoNewCollaboratorRule {
  static PLATFORM_GLOBALS = new Set(['AbortController']);
  static ROLE =
    /^[A-Z][A-Za-z0-9]*(UseCase|Repository|Facade|Service|Job|Consumer|Controller|Store|Publisher|Gateway|Handler|Client|Relay|Dispatcher|Scheduler)$/;

  /**
   * @param {GuardBaseline} baseline Files still allowed to break the rule.
   */
  constructor(baseline) {
    this.baseline = baseline;
    this.meta = {
      type: 'problem',
      schema: [],
      messages: {
        collaborator:
          '`new {{name}}` builds an injectable collaborator by hand: receive it through the constructor and let the Nest module, a selector or a factory build it.',
      },
    };
  }

  /**
   * Reports each construction of a collaborator outside the composition files.
   * @param {import('eslint').Rule.RuleContext} context Lint context.
   * @returns {import('eslint').Rule.RuleListener} The visitors.
   */
  create(context) {
    if (
      CompositionFiles.includes(context.filename) ||
      this.baseline.allows('no-new-collaborator', context.filename)
    ) {
      return {};
    }
    return {
      NewExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          NoNewCollaboratorRule.ROLE.test(node.callee.name) &&
          !NoNewCollaboratorRule.PLATFORM_GLOBALS.has(node.callee.name)
        ) {
          context.report({
            node,
            messageId: 'collaborator',
            data: { name: node.callee.name },
          });
        }
      },
    };
  }
}

/** Rejects `@Global()` outside `libs/platform` (ADR 0037): a business module imports the modules it uses. */
class NoGlobalModuleRule {
  static PLATFORM = /\/libs\/platform\//;

  /**
   * @param {GuardBaseline} baseline Files still allowed to break the rule.
   */
  constructor(baseline) {
    this.baseline = baseline;
    this.meta = {
      type: 'problem',
      schema: [],
      messages: {
        global:
          '`@Global()` is only for platform modules: import the module whose providers you use.',
      },
    };
  }

  /**
   * Reports each `@Global()` decorator outside the platform libraries.
   * @param {import('eslint').Rule.RuleContext} context Lint context.
   * @returns {import('eslint').Rule.RuleListener} The visitors.
   */
  create(context) {
    const file = context.filename.replaceAll('\\', '/');
    if (
      NoGlobalModuleRule.PLATFORM.test(file) ||
      this.baseline.allows('no-global-module', file)
    ) {
      return {};
    }
    return {
      Decorator(node) {
        const expression = node.expression;
        if (
          expression.type === 'CallExpression' &&
          expression.callee.type === 'Identifier' &&
          expression.callee.name === 'Global'
        ) {
          context.report({ node, messageId: 'global' });
        }
      },
    };
  }
}

/**
 * Rejects a test harness that starts its own PostgreSQL or Valkey container (ADR 0047): suites share the servers the
 * Jest global setup starts and create their own databases on them. Only the hosts of a test that needs servers that do
 * not see each other start one.
 */
class NoOwnTestServerRule {
  static DEDICATED = [
    /\/adapters\/valkey\/src\/__tests__\/utils\/dedicated-valkey-host\.ts$/,
    /\/tenant-move\/src\/nest\/__tests__\/utils\/region-servers\.ts$/,
  ];
  static DATABASE_IMAGE = /postgres|valkey|redis/i;

  meta = {
    type: 'problem',
    schema: [],
    messages: {
      server:
        '`new {{name}}` starts a database server of its own: create databases on the shared server with `ShardedTestDatabase`, `TestDatabaseServer` or `ValkeyTestServer`, or pass a `DedicatedValkeyHost` when the test needs two servers.',
    },
  };

  /**
   * Reports each PostgreSQL container, and each generic container of a database image, outside the dedicated hosts.
   * @param {import('eslint').Rule.RuleContext} context Lint context.
   * @returns {import('eslint').Rule.RuleListener} The visitors.
   */
  create(context) {
    const file = context.filename.replaceAll('\\', '/');
    if (NoOwnTestServerRule.DEDICATED.some((pattern) => pattern.test(file))) {
      return {};
    }
    return {
      NewExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;
        const image = node.arguments[0];
        const database =
          name === 'PostgreSqlContainer' ||
          (name === 'GenericContainer' &&
            image !== undefined &&
            NoOwnTestServerRule.DATABASE_IMAGE.test(
              context.sourceCode.getText(image),
            ));
        if (database) {
          context.report({ node, messageId: 'server', data: { name } });
        }
      },
    };
  }
}

const baseline = GuardBaseline.load();

/** ESLint plugin with the guards of the backend. */
const guardsPlugin = {
  rules: {
    'no-jest-doubles': new NoJestDoublesRule(),
    'no-new-collaborator': new NoNewCollaboratorRule(baseline),
    'no-global-module': new NoGlobalModuleRule(baseline),
    'no-own-test-server': new NoOwnTestServerRule(),
  },
};

export { GuardBaseline, guardsPlugin };
