import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ModuleResolver } from './module-resolver.mjs';

/** @typedef {{ file: string, name: string }} Declaration An exported name and the file that declares it. */

/**
 * Searches the tracked files of the repository with `git grep`, reading each candidate source once to follow imports
 * and class headers that span several lines. A file imports a declaration only when one of its imports resolves to
 * the declaring module or a barrel over it, so a class with the same name elsewhere is not an importer.
 */
export class RepositorySearch {
  static SOURCES = ['*.ts', '*.mjs', '*.cjs', '*.js', '*.dart'];
  static BATCH = 200;
  static ES_IMPORT =
    /(?:^|[;\n])\s*(?:import|export)\s+(?:type\s+)?([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g;
  static REQUIRE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  static DART_IMPORT = /^\s*(?:import|export)\s+['"]([^'"]+)['"]/gm;

  /**
   * @param {string} root Repository root.
   * @param {ModuleResolver} [resolver] Resolves import specifiers to files.
   */
  constructor(root, resolver = new ModuleResolver(root)) {
    this.root = root;
    this.resolver = resolver;
    this.texts = new Map();
  }

  /**
   * Every line that contains the literal.
   * @param {string} literal Text to find.
   * @param {boolean} [word] Whether it must stand as a whole word.
   * @returns {string[]} `file:line` entries.
   */
  occurrences(literal, word = false) {
    return this.grep(['-n', '-F', ...(word ? ['-w'] : []), '-e', literal]).map(
      (line) => line.split(':').slice(0, 2).join(':'),
    );
  }

  /**
   * For each declaration, the files whose imports reach its module and use the name, and the files with a class that
   * extends, implements or mixes it in.
   * @param {Declaration[]} declared Exported names and the file that declares each.
   * @returns {Map<string, { importers: string[], subtypes: string[] }>} Uses per `file#name`.
   */
  usesOf(declared) {
    const uses = new Map(
      declared.map(({ file, name }) => [
        RepositorySearch.keyOf(file, name),
        { importers: [], subtypes: [] },
      ]),
    );
    const names = [...new Set(declared.map(({ name }) => name))];
    for (const candidate of this.candidates(names)) {
      const text = this.text(candidate);
      const imports = this.importsOf(candidate, text);
      for (const { file, name } of declared) {
        if (candidate === file) continue;
        const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
        const reached = imports.some(
          ({ specifier, bindings }) =>
            (bindings === undefined ||
              bindings === '*' ||
              word.test(bindings)) &&
            this.resolver.reaches(candidate, specifier, file),
        );
        if (!reached || !word.test(text)) continue;
        const entry = uses.get(RepositorySearch.keyOf(file, name));
        entry.importers.push(candidate);
        if (
          new RegExp(
            `(extends|implements|with)[^{;]*?${word.source}`,
            's',
          ).test(text)
        ) {
          entry.subtypes.push(candidate);
        }
      }
    }
    return uses;
  }

  /**
   * The key `usesOf` files each declaration under.
   * @param {string} file Declaring file.
   * @param {string} name Exported name.
   * @returns {string} `file#name`.
   */
  static keyOf(file, name) {
    return `${file}#${name}`;
  }

  /**
   * The imports of a source: the specifier and, for an ES import, the names it binds (`*` for a namespace). A Dart
   * import or a `require` binds the whole module, so its bindings are `undefined`.
   * @param {string} file Path from the root.
   * @param {string} text Its content.
   * @returns {{ specifier: string, bindings: string | undefined }[]} The imports.
   */
  importsOf(file, text) {
    if (file.endsWith('.dart')) {
      return [...text.matchAll(RepositorySearch.DART_IMPORT)].map((match) => ({
        specifier: match[1],
        bindings: undefined,
      }));
    }
    return [
      ...[...text.matchAll(RepositorySearch.ES_IMPORT)].map((match) => ({
        specifier: match[2],
        bindings: match[1].includes('*') ? '*' : match[1],
      })),
      ...[...text.matchAll(RepositorySearch.REQUIRE)].map((match) => ({
        specifier: match[1],
        bindings: undefined,
      })),
    ];
  }

  /**
   * Source files that mention any of the names as a word.
   * @param {string[]} names Names to look for.
   * @returns {string[]} File paths, without repeats.
   */
  candidates(names) {
    const files = new Set();
    for (let start = 0; start < names.length; start += RepositorySearch.BATCH) {
      const batch = names.slice(start, start + RepositorySearch.BATCH);
      for (const file of this.grep([
        '-l',
        '-w',
        ...batch.flatMap((name) => ['-e', name]),
        '--',
        ...RepositorySearch.SOURCES,
      ])) {
        files.add(file);
      }
    }
    return [...files];
  }

  /**
   * The text of a tracked file, read once.
   * @param {string} file Path from the root.
   * @returns {string} Its content.
   */
  text(file) {
    if (!this.texts.has(file)) {
      this.texts.set(file, readFileSync(join(this.root, file), 'utf8'));
    }
    return this.texts.get(file);
  }

  /**
   * Runs `git grep`; no match is an empty result, not an error.
   * @param {string[]} args Arguments after `grep`.
   * @returns {string[]} Output lines.
   */
  grep(args) {
    try {
      return execFileSync('git', ['grep', ...args], {
        cwd: this.root,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      })
        .split('\n')
        .filter(Boolean);
    } catch (error) {
      if (error.status === 1) return [];
      throw error;
    }
  }
}
