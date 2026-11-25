#!/usr/bin/env node
// Checks the rules of backend-structure, backend-code and backend-testing.
// Usage: node check-structure.mjs [--all | --changed] [repository root]
//   --changed (default) checks only the files changed against HEAD, including new ones.
//   --all checks all of backend/.
// Exits with code 1 and the list of violations if it finds any.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

class BackendStructureCheck {
  static IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.nx',
    'coverage',
    'out-tsc',
  ]);
  static TEST_FILE = /\.(int-)?spec\.ts$/;
  static INFRA_IN_DOMAIN =
    /from\s+['"](@nestjs\/|typeorm|pg['"/]|@aws-sdk\/|iovalkey|express)/;
  static OUTER_LAYER = /from\s+['"](\.\.\/)+(infrastructure|presentation)\//;
  // Integration tests: the suffix is `.int-spec.ts`; `*.integration.spec.ts` would run as a unit test.
  static MISNAMED_INTEGRATION_TEST = /\.integration\.spec\.ts$/;
  // The library core does not know NestJS: only `src/nest/` imports it.
  static NEST_GUARDED_AREA =
    /^backend\/libs\/(platform|contracts|shared)\/.+\.ts$/;
  static NEST_FOLDER = /\/src\/nest\//;
  static NEST_IMPORT =
    /(?:from|import)\s*\(?\s*['"](?:@nestjs\/[^'"]*|@platform\/[\w-]+\/nest)['"]/;
  // Files where an exported function is the declared shape of the API, not a loose script.
  static FUNCTION_EXCEPTIONS = [
    {
      pattern: /^backend\/libs\/contracts\/[^/]+\/src\/kit\/define-[\w-]+\.ts$/,
      reason: 'declarative define* factories of contracts',
    },
    {
      pattern: /^backend\/libs\/contracts\/[^/]+\/src\/kit\/error-catalog\.ts$/,
      reason: 'defineErrorCatalog of contracts',
    },
    {
      pattern: /^backend\/libs\/platform\/config\/src\/(env|secret)\.ts$/,
      reason: 'zod schemas of env.ts and secret()',
    },
    {
      pattern: /^backend\/tools\/[^/]+\/src\/main\.ts$/,
      reason: 'main() of the tools',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/kit\/field-errors\.ts$/,
      reason: 'contract DSL utilities',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/kit\/message-definition\.ts$/,
      reason: 'contract DSL utilities',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/schemas\/pagination\.schema\.ts$/,
      reason: 'parameterized zod schema of the contract DSL',
    },
    {
      pattern: /^backend\/libs\/platform\/primitives\/src\/call-outcome\.ts$/,
      reason: 'pure type guards',
    },
    {
      pattern:
        /^backend\/libs\/platform\/messaging\/src\/topology\/contract-topology\.ts$/,
      reason: 'declarative topology factory over contracts',
    },
    {
      pattern:
        /^backend\/libs\/platform\/persistence\/src\/metadata\/entity-metadata\.ts$/,
      reason: 'Audited decorator and its reader',
    },
  ];
  static LOOSE_EXPORTED_FUNCTION =
    /^export\s+(async\s+)?function\s+\w+|^export\s+const\s+\w+\s*(:[^=]+)?=\s*(async\s+)?(\([^)]*\)|\w+)\s*=>/m;

  constructor(root, mode) {
    this.root = root;
    this.mode = mode;
    this.violations = [];
  }

  run() {
    const files =
      this.mode === '--all'
        ? this.allBackendFiles()
        : this.changedBackendFiles();
    for (const file of files) this.checkFile(file);
    if (this.mode === '--all') this.checkTree();
    return this.violations;
  }

  changedBackendFiles() {
    const git = (args) =>
      execFileSync('git', args, { cwd: this.root, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    const changed = new Set([
      ...git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return [...changed].filter(
      (f) => f.startsWith('backend/') && existsSync(join(this.root, f)),
    );
  }

  allBackendFiles() {
    // Only tracked or new files: ignored artifacts do not count as code.
    return execFileSync(
      'git',
      ['ls-files', '-co', '--exclude-standard', 'backend/'],
      { cwd: this.root, encoding: 'utf8' },
    )
      .split('\n')
      .filter((f) => f && existsSync(join(this.root, f)));
  }

  checkFile(file) {
    const inCodeProject = /^backend\/(libs|apps|tools|e2e)\//.test(file);
    if (inCodeProject && /\/src\/lib\//.test(file)) {
      this.add(file, 'code goes directly in src/, without src/lib/');
    }
    if (
      BackendStructureCheck.TEST_FILE.test(file) &&
      !/\/(__tests__|e2e)\//.test(file)
    ) {
      this.add(
        file,
        'tests go in a __tests__/ folder next to the code they test',
      );
    }
    if (
      inCodeProject &&
      /\/src\/(.+\/)?(testing|test|support)\//.test(file) &&
      !/\/__tests__\//.test(file)
    ) {
      this.add(
        file,
        'test utilities go in __tests__/utils, not in a separate testing folder',
      );
    }
    if (/^backend\/libs\/.+\/package\.json$/.test(file)) {
      this.add(
        file,
        'libraries have no package.json: they are imported through TypeScript aliases',
      );
    }
    if (inCodeProject && /\/dist\//.test(file)) {
      this.add(
        file,
        'each app build goes in backend/dist/<app>, never inside a project',
      );
    }
    if (BackendStructureCheck.MISNAMED_INTEGRATION_TEST.test(file)) {
      this.add(
        file,
        'integration tests are named *.int-spec.ts: *.integration.spec.ts would run as a unit test',
      );
    }
    if (file.endsWith('.ts')) this.checkNestBoundary(file);
    if (file.endsWith('.ts') && !BackendStructureCheck.TEST_FILE.test(file))
      this.checkSource(file);
  }

  // With --changed only new lines count: moving a file does not force refactoring it,
  // but what is written today does follow the rules.
  sourceToCheck(file) {
    const full = readFileSync(join(this.root, file), 'utf8');
    if (this.mode === '--all') return full;
    this.addedLines ??= this.readAddedLines();
    this.untracked ??= new Set(
      execFileSync(
        'git',
        ['ls-files', '--others', '--exclude-standard', 'backend/'],
        { cwd: this.root, encoding: 'utf8' },
      )
        .split('\n')
        .filter(Boolean),
    );
    // A new untracked file is checked whole; one moved without changes contributes no lines.
    return this.untracked.has(file) ? full : (this.addedLines.get(file) ?? '');
  }

  // A single diff of the whole tree, so git detects moved files as renames.
  readAddedLines() {
    const diff = execFileSync(
      'git',
      ['diff', '-U0', '-M', 'HEAD', '--', 'backend/'],
      {
        cwd: this.root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      },
    );
    const added = new Map();
    let current = null;
    for (const line of diff.split('\n')) {
      if (line.startsWith('+++ ')) {
        current = line.startsWith('+++ b/') ? line.slice(6) : null;
        if (current) added.set(current, '');
      } else if (current && line.startsWith('+')) {
        added.set(current, `${added.get(current)}${line.slice(1)}\n`);
      }
    }
    return added;
  }

  // Includes tests: those for Nest code live in src/nest/__tests__.
  checkNestBoundary(file) {
    if (
      !BackendStructureCheck.NEST_GUARDED_AREA.test(file) ||
      BackendStructureCheck.NEST_FOLDER.test(file)
    )
      return;
    if (BackendStructureCheck.NEST_IMPORT.test(this.sourceToCheck(file))) {
      this.add(
        file,
        'outside src/nest/, do not import @nestjs/* or a @platform/<lib>/nest sub-entry',
      );
    }
  }

  checkSource(file) {
    const text = this.sourceToCheck(file);
    if (/\/domain\//.test(file)) {
      if (BackendStructureCheck.INFRA_IN_DOMAIN.test(text)) {
        this.add(
          file,
          'domain/ does not import NestJS, TypeORM, pg, AWS or other infrastructure',
        );
      }
      if (
        /from\s+['"](\.\.\/)+application\//.test(text) ||
        BackendStructureCheck.OUTER_LAYER.test(text)
      ) {
        this.add(
          file,
          'domain/ does not depend on application/, infrastructure/ or presentation/',
        );
      }
    }
    if (
      /\/application\//.test(file) &&
      BackendStructureCheck.OUTER_LAYER.test(text)
    ) {
      this.add(
        file,
        'application/ does not depend on infrastructure/ or presentation/',
      );
    }
    const allowsFunctions =
      /\/(utils|__tests__|migrations)\//.test(file) ||
      /(index|\.config|main|worker|migrate|instrumentation)\.ts$/.test(file) ||
      BackendStructureCheck.FUNCTION_EXCEPTIONS.some((e) =>
        e.pattern.test(file),
      );
    if (
      !allowsFunctions &&
      BackendStructureCheck.LOOSE_EXPORTED_FUNCTION.test(text)
    ) {
      this.add(
        file,
        'exports loose functions: behavior goes in classes with injected dependencies',
      );
    }
  }

  checkTree() {
    const nodeModules = [];
    const walk = (dir, depth) => {
      if (depth > 6) return;
      for (const name of readdirSync(dir)) {
        if (name === '.git' || name === '.claude') continue;
        const full = join(dir, name);
        if (!statSync(full).isDirectory()) continue;
        if (name === 'node_modules') {
          nodeModules.push(relative(this.root, full) || 'node_modules');
          continue;
        }
        walk(full, depth + 1);
      }
    };
    walk(this.root, 0);
    for (const area of ['libs', 'apps', 'tools', 'e2e']) {
      const base = join(this.root, 'backend', area);
      if (existsSync(base)) this.findDist(base);
    }
    if (nodeModules.length > 1) {
      this.add(
        nodeModules.join(', '),
        'there must be a single node_modules, at the root',
      );
    }
  }

  findDist(dir) {
    for (const name of readdirSync(dir)) {
      if (BackendStructureCheck.IGNORED_DIRS.has(name)) continue;
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (name === 'dist')
        this.add(
          relative(this.root, full),
          'each app build goes in backend/dist/<app>',
        );
      else this.findDist(full);
    }
  }

  add(file, rule) {
    this.violations.push(`${file}: ${rule}`);
  }
}

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('--')) ?? '--changed';
const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
const violations = new BackendStructureCheck(root, mode).run();
if (violations.length > 0) {
  console.error(
    `Backend rules violated (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
