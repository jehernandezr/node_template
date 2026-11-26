import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Searches the tracked files of the repository with `git grep`, reading each candidate source once to follow imports
 * and class headers that span several lines.
 */
export class RepositorySearch {
  static SOURCES = ['*.ts', '*.mjs'];
  static BATCH = 200;

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
    this.texts = new Map();
  }

  /**
   * Every line that contains the literal.
   * @param {string} literal Text to find.
   * @returns {string[]} `file:line` entries.
   */
  occurrences(literal) {
    return this.grep(['-n', '-F', '-e', literal]).map((line) =>
      line.split(':').slice(0, 2).join(':'),
    );
  }

  /**
   * For each name, the files that import it and the files with a class that extends or implements it.
   * @param {string[]} names Exported names.
   * @returns {Map<string, { importers: string[], subtypes: string[] }>} Uses per name.
   */
  usesOf(names) {
    const uses = new Map(
      names.map((name) => [name, { importers: [], subtypes: [] }]),
    );
    for (const file of this.candidates(names)) {
      const text = this.text(file);
      for (const name of names) {
        const word = `\\b${name.replace(/\$/g, '\\$')}\\b`;
        if (new RegExp(`import\\s[^;]*?${word}[^;]*?from\\s`, 's').test(text)) {
          uses.get(name).importers.push(file);
        }
        if (new RegExp(`(extends|implements)[^{;]*?${word}`, 's').test(text)) {
          uses.get(name).subtypes.push(file);
        }
      }
    }
    return uses;
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
