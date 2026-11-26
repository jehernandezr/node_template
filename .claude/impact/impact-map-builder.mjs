import { execFileSync } from 'node:child_process';
import { CoupledPaths } from './coupled-paths.mjs';
import { ExportScanner } from './export-scanner.mjs';
import { RepositorySearch } from './repository-search.mjs';
import { StringKeyExtractor } from './string-key-extractor.mjs';

/**
 * Builds the starting impact map of a diff for the reviewer: affected projects, importers and subtypes of every
 * export of a changed file (importers that the diff also changes are kept and marked), every occurrence of each
 * string-keyed identifier the diff changed, and the generated or configuration paths a changed path drags along.
 * Test files are skipped, but the shared test utilities (`__tests__/utils`, `test/utils`, `test_utils`) count as
 * sources, because other projects import them through their `test-utils` aliases.
 * What only reading reveals (DI tokens, payload shapes, migrations, docs) the reviewer adds on top.
 */
export class ImpactMapBuilder {
  static SOURCE = /\.(ts|mjs|cjs|js|dart)$/;
  static TEST = /(\.(int-|e2e-|contract-)?spec\.ts$|\.test\.mjs$|_test\.dart$)/;

  /**
   * @param {string} root Repository root.
   * @param {string} base Ref the branch is compared with.
   * @param {{ affected?: () => string[], head?: string }} [options] `affected` lists the Nx projects (by default it
   *   asks Nx); `head` is the tip of the change, `HEAD` by default.
   */
  constructor(root, base, options = {}) {
    this.root = root;
    this.base = base;
    this.head = options.head ?? 'HEAD';
    this.search = new RepositorySearch(root);
    this.exports = new ExportScanner();
    this.keys = new StringKeyExtractor();
    this.coupled = new CoupledPaths();
    this.affected = options.affected ?? (() => this.nxAffected());
  }

  /**
   * Collects the affected projects, the uses of every export of the changed files and the occurrences of every
   * string-keyed identifier the diff changed.
   * @returns {{ changed: string[], projects: string[], exports: object[], keys: object[], couplings: object[] }} The
   *   impact map.
   */
  build() {
    const changed = this.git([
      'diff',
      '--name-only',
      `${this.base}...${this.head}`,
    ]);
    const declared = changed
      .filter((file) => ImpactMapBuilder.SOURCE.test(file))
      .filter((file) => !ImpactMapBuilder.TEST.test(file))
      .flatMap((file) =>
        this.exports
          .exportsOf(this.read(file), file)
          .map((name) => ({ file, name })),
      );
    const uses = this.search.usesOf(declared);
    const inDiff = new Set(changed);
    const exports = declared.map(({ file, name }) => {
      const use = uses.get(RepositorySearch.keyOf(file, name));
      return {
        file,
        name,
        importers: use.importers,
        importersInDiff: use.importers.filter((other) => inDiff.has(other)),
        subtypes: use.subtypes,
      };
    });
    const diff = this.git([
      'diff',
      '--unified=0',
      `${this.base}...${this.head}`,
    ]).join('\n');
    const keys = [...this.keys.extract(diff)].flatMap(([kind, literals]) =>
      [...literals].map((literal) => ({
        kind,
        literal,
        occurrences: this.search.occurrences(
          literal,
          StringKeyExtractor.isWord(kind),
        ),
      })),
    );
    return {
      changed,
      projects: this.affected(),
      exports,
      keys,
      couplings: this.coupled.of(changed),
    };
  }

  /**
   * Renders the map as the Markdown section the review returns.
   * @param {ReturnType<ImpactMapBuilder['build']>} map Built map.
   * @returns {string} Markdown.
   */
  static markdown(map) {
    const list = (items) => (items.length === 0 ? 'none' : items.join(', '));
    const marked = (entry) =>
      list(
        entry.importers.map((file) =>
          entry.importersInDiff.includes(file) ? `${file} (in diff)` : file,
        ),
      );
    return [
      '## Impact map',
      '',
      `Affected projects: ${list(map.projects)}`,
      '',
      '### Exports of the changed files',
      '',
      ...map.exports.map(
        (entry) =>
          `- \`${entry.name}\` (${entry.file}): importers ${marked(entry)}; subtypes ${list(entry.subtypes)}`,
      ),
      '',
      '### String-keyed identifiers the diff changed',
      '',
      ...map.keys.map(
        (entry) =>
          `- ${entry.kind} \`${entry.literal}\`: ${list(entry.occurrences)}`,
      ),
      '',
      '### Paths the change drags along',
      '',
      ...map.couplings.map(
        (entry) =>
          `- ${entry.coupled} (${entry.reason}), from ${list(entry.files)}`,
      ),
      '',
      'Add what only reading shows: DI tokens and providers, payload shapes and consumers, outbox and saga steps, migrations and RLS, defaults, Problem Details, key TTLs, timeouts and retries, generator templates, docs and ADRs.',
      '',
    ].join('\n');
  }

  /**
   * Reads a changed file as the tip of the change has it; a deleted one reads empty.
   * @param {string} file Path from the root.
   * @returns {string} Its text.
   */
  read(file) {
    try {
      return execFileSync('git', ['show', `${this.head}:${file}`], {
        cwd: this.root,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      return '';
    }
  }

  /**
   * Projects Nx counts as affected since the base.
   * @returns {string[]} Project names.
   */
  nxAffected() {
    return execFileSync(
      'pnpm',
      ['nx', 'show', 'projects', '--affected', `--base=${this.base}`],
      {
        cwd: this.root,
        encoding: 'utf8',
        env: { ...process.env, NX_DAEMON: 'false' },
      },
    )
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  /**
   * Runs git and splits its output.
   * @param {string[]} args Git arguments.
   * @returns {string[]} Non-empty lines.
   */
  git(args) {
    return execFileSync('git', args, {
      cwd: this.root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
      .split('\n')
      .filter(Boolean);
  }
}
