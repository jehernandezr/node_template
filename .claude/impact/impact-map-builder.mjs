import { execFileSync } from 'node:child_process';
import { ExportScanner } from './export-scanner.mjs';
import { RepositorySearch } from './repository-search.mjs';
import { StringKeyExtractor } from './string-key-extractor.mjs';

/**
 * Builds the starting impact map of a diff for the reviewer: affected projects, importers and subtypes of every
 * export of a changed file, and every occurrence of each string-keyed identifier the diff changed. What only reading
 * reveals (DI tokens, payload shapes, migrations, Terraform, docs) the reviewer adds on top.
 */
export class ImpactMapBuilder {
  static SOURCE = /\.(ts|mjs)$/;
  static TEST =
    /(\/__tests__\/|\.(int-|e2e-|contract-)?spec\.ts$|\.test\.mjs$)/;

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
    this.affected = options.affected ?? (() => this.nxAffected());
  }

  /**
   * Collects the affected projects, the uses of every export of the changed files and the occurrences of every
   * string-keyed identifier the diff changed.
   * @returns {{ changed: string[], projects: string[], exports: object[], keys: object[] }} The impact map.
   */
  build() {
    const changed = this.git([
      'diff',
      '--name-only',
      `${this.base}...${this.head}`,
    ]);
    const declaring = new Set(changed);
    const declared = changed
      .filter((file) => ImpactMapBuilder.SOURCE.test(file))
      .filter((file) => !ImpactMapBuilder.TEST.test(file))
      .flatMap((file) =>
        this.exports.exportsOf(this.read(file)).map((name) => ({ file, name })),
      );
    const uses = this.search.usesOf([
      ...new Set(declared.map((entry) => entry.name)),
    ]);
    const exports = declared.map(({ file, name }) => ({
      file,
      name,
      importers: uses
        .get(name)
        .importers.filter((other) => !declaring.has(other)),
      subtypes: uses.get(name).subtypes.filter((other) => other !== file),
    }));
    const diff = this.git([
      'diff',
      '--unified=0',
      `${this.base}...${this.head}`,
    ]).join('\n');
    const keys = [...this.keys.extract(diff)].flatMap(([kind, literals]) =>
      [...literals].map((literal) => ({
        kind,
        literal,
        occurrences: this.search.occurrences(literal),
      })),
    );
    return { changed, projects: this.affected(), exports, keys };
  }

  /**
   * Renders the map as the Markdown section the review returns.
   * @param {ReturnType<ImpactMapBuilder['build']>} map Built map.
   * @returns {string} Markdown.
   */
  static markdown(map) {
    const list = (items) => (items.length === 0 ? 'none' : items.join(', '));
    return [
      '## Impact map',
      '',
      `Affected projects: ${list(map.projects)}`,
      '',
      '### Exports of the changed files',
      '',
      ...map.exports.map(
        (entry) =>
          `- \`${entry.name}\` (${entry.file}): importers ${list(entry.importers)}; subtypes ${list(entry.subtypes)}`,
      ),
      '',
      '### String-keyed identifiers the diff changed',
      '',
      ...map.keys.map(
        (entry) =>
          `- ${entry.kind} \`${entry.literal}\`: ${list(entry.occurrences)}`,
      ),
      '',
      'Add what only reading shows: DI tokens and providers, payload shapes and consumers, outbox and saga steps, migrations and RLS, Terraform and defaults, generated Dart, routes and Problem Details, key TTLs, timeouts and retries, generator templates, docs and ADRs.',
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
