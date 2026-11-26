import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

/**
 * Resolves an import specifier to the repository file it names: relative paths, the TypeScript aliases of
 * `backend/tsconfig.base.json` and Dart `package:` URIs. Packages from the registry and `node:` modules resolve to
 * nothing, so a class with the same name elsewhere never counts as an importer.
 */
export class ModuleResolver {
  static EXTENSION = /\.(d\.ts|ts|mts|cts|mjs|cjs|js|dart)$/;
  static TSCONFIG = 'backend/tsconfig.base.json';

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
    this.aliases = this.readAliases();
    this.packages = this.readPackages();
  }

  /**
   * Whether an import in one file reaches the file that declares a name, directly or through the barrel of a folder
   * that holds it.
   * @param {string} from Importing file, from the root.
   * @param {string} specifier Text between the quotes of the import.
   * @param {string} declaring File that declares the name, from the root.
   * @returns {boolean} `true` when the import loads that module.
   */
  reaches(from, specifier, declaring) {
    const target = this.resolve(from, specifier);
    if (target === undefined) return false;
    const bare = target.replace(ModuleResolver.EXTENSION, '');
    if (bare === declaring.replace(ModuleResolver.EXTENSION, '')) return true;
    const folder = posix.dirname(target);
    if (posix.basename(bare) === 'index') {
      return declaring.startsWith(`${folder}/`);
    }
    if (target.endsWith('.dart') && folder.endsWith('/lib')) {
      return declaring.startsWith(`${folder}/`);
    }
    return (
      !ModuleResolver.EXTENSION.test(target) &&
      declaring.startsWith(`${target}/`)
    );
  }

  /**
   * The repository path an import names.
   * @param {string} from Importing file, from the root.
   * @param {string} specifier Text between the quotes of the import.
   * @returns {string | undefined} The path, or `undefined` for a registry package or a `node:` module.
   */
  resolve(from, specifier) {
    if (specifier.startsWith('.')) {
      return posix.normalize(posix.join(posix.dirname(from), specifier));
    }
    if (specifier.startsWith('package:')) {
      const [name, ...rest] = specifier.slice('package:'.length).split('/');
      const folder = this.packages.get(name);
      return folder === undefined
        ? undefined
        : posix.join(folder, 'lib', ...rest);
    }
    for (const [alias, target] of this.aliases) {
      if (alias === specifier) return target;
      if (alias.endsWith('/*') && specifier.startsWith(alias.slice(0, -1))) {
        return target.replace('*', specifier.slice(alias.length - 1));
      }
    }
    return undefined;
  }

  /**
   * The aliases of the backend TypeScript config, each with its first target from the root.
   * @returns {Map<string, string>} Alias to path.
   */
  readAliases() {
    try {
      const paths =
        JSON.parse(
          readFileSync(posix.join(this.root, ModuleResolver.TSCONFIG), 'utf8'),
        ).compilerOptions?.paths ?? {};
      const folder = posix.dirname(ModuleResolver.TSCONFIG);
      return new Map(
        Object.entries(paths).map(([alias, targets]) => [
          alias,
          posix.normalize(posix.join(folder, targets[0])),
        ]),
      );
    } catch {
      return new Map();
    }
  }

  /**
   * The Dart packages of the repository by name, from their `pubspec.yaml`.
   * @returns {Map<string, string>} Package name to its folder.
   */
  readPackages() {
    const packages = new Map();
    for (const pubspec of this.trackedPubspecs()) {
      const name = /^name:\s*([\w]+)/m.exec(
        readFileSync(posix.join(this.root, pubspec), 'utf8'),
      )?.[1];
      if (name !== undefined) packages.set(name, posix.dirname(pubspec));
    }
    return packages;
  }

  /**
   * The tracked `pubspec.yaml` files.
   * @returns {string[]} Paths from the root.
   */
  trackedPubspecs() {
    try {
      return execFileSync('git', ['ls-files', '*pubspec.yaml'], {
        cwd: this.root,
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}
