import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Spanish lines a file may still hold because they could not be translated yet, such as Terraform descriptions whose
 * change replaces the resource. The count of a file may only go down: a file above its count fails, and one below it
 * fails until the baseline is lowered, so the gain is kept.
 */
export class LanguageBaseline {
  /**
   * @param {Record<string, number>} counts Allowed Spanish lines per file.
   */
  constructor(counts) {
    this.counts = counts;
  }

  /**
   * Reads a baseline file; a missing file allows nothing.
   * @param {string} path Absolute path of the JSON file.
   * @returns {LanguageBaseline} The recorded counts.
   */
  static read(path) {
    try {
      return new LanguageBaseline(JSON.parse(readFileSync(path, 'utf8')));
    } catch (error) {
      if (error.code === 'ENOENT') return new LanguageBaseline({});
      throw error;
    }
  }

  /**
   * Compares what a file holds with what the baseline allows.
   * @param {string} file Path from the repository root.
   * @param {number} found Spanish lines found in it.
   * @returns {'over' | 'under' | 'ok'} `over` when it grew, `under` when the baseline should be lowered.
   */
  judge(file, found) {
    const allowed = this.counts[file] ?? 0;
    if (found > allowed) return 'over';
    if (found < allowed) return 'under';
    return 'ok';
  }

  /**
   * Files the baseline lists.
   * @returns {string[]} Paths from the repository root.
   */
  files() {
    return Object.keys(this.counts);
  }

  /**
   * Lowers each entry to what its file still holds, never raising one or adding a file.
   * @param {Record<string, number>} found Spanish lines found per file.
   * @returns {Record<string, number>} The lowered counts, only files above zero.
   */
  lowered(found) {
    return Object.fromEntries(
      Object.entries(this.counts)
        .map(([file, allowed]) => [file, Math.min(allowed, found[file] ?? 0)])
        .filter(([, count]) => count > 0),
    );
  }

  /**
   * Writes the counts, sorted by file.
   * @param {string} path Absolute path of the JSON file.
   * @param {Record<string, number>} counts Spanish lines per file, only files above zero.
   */
  static write(path, counts) {
    const sorted = Object.fromEntries(
      Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
  }
}
