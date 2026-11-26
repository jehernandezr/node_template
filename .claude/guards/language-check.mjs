import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LanguageBaseline } from './language-baseline.mjs';
import { LanguagePolicy } from './language-policy.mjs';
import { SpanishDetector } from './spanish-detector.mjs';

/** One Spanish line, or a baseline entry that no longer matches what its file holds. */
export class LanguageFinding {
  /**
   * @param {string} file Path from the repository root.
   * @param {number} line Line number from 1, or 0 for a baseline entry.
   * @param {string} message What is wrong.
   */
  constructor(file, line, message) {
    this.file = file;
    this.line = line;
    this.message = message;
  }

  /**
   * One line of the report.
   * @returns {string} `file:line message`.
   */
  toString() {
    return `${this.file}${this.line > 0 ? `:${this.line}` : ''} ${this.message}`;
  }
}

/** Finds Spanish text in developer files and commit messages, within what the baseline still allows. */
export class LanguageCheck {
  /**
   * @param {string} root Repository root.
   * @param {LanguageBaseline} baseline Files that may still hold some Spanish.
   * @param {LanguagePolicy} [policy] Which files are developer text.
   * @param {SpanishDetector} [detector] How a line is judged.
   */
  constructor(
    root,
    baseline,
    policy = new LanguagePolicy(),
    detector = new SpanishDetector(),
  ) {
    this.root = root;
    this.baseline = baseline;
    this.policy = policy;
    this.detector = detector;
  }

  /**
   * Checks repository files; with `complete`, baseline entries of files that were not given are checked too.
   * @param {string[]} files Paths from the repository root.
   * @param {boolean} complete Whether `files` is the whole repository.
   * @returns {LanguageFinding[]} What is wrong, in file order.
   */
  checkFiles(files, complete) {
    const findings = [];
    const seen = new Set();
    for (const file of files.filter((candidate) =>
      this.policy.checks(candidate),
    )) {
      seen.add(file);
      const lines = this.spanishLines(file);
      const verdict = this.baseline.judge(file, lines.length);
      if (verdict === 'over') {
        findings.push(
          ...lines.map(
            (line) =>
              new LanguageFinding(
                file,
                line,
                'reads as Spanish: developer text is English (ARB files keep the product text)',
              ),
          ),
        );
      } else if (verdict === 'under') {
        findings.push(
          new LanguageFinding(
            file,
            0,
            `holds ${lines.length} Spanish lines, fewer than the baseline: lower its entry in .claude/guards/language-baseline.json`,
          ),
        );
      }
    }
    if (complete) {
      for (const file of this.baseline
        .files()
        .filter((entry) => !seen.has(entry))) {
        findings.push(
          new LanguageFinding(
            file,
            0,
            'is in the language baseline but no longer exists: remove its entry',
          ),
        );
      }
    }
    return findings;
  }

  /**
   * Checks a commit message, ignoring the comment lines git adds.
   * @param {string} text Message as git wrote it.
   * @returns {LanguageFinding[]} One finding per Spanish line.
   */
  checkMessage(text) {
    return text
      .split('\n')
      .map((line, index) => ({ line, number: index + 1 }))
      .filter(({ line }) => !line.startsWith('#'))
      .filter(({ line }) => this.detector.isSpanish(line, { prose: true }))
      .map(
        ({ number }) =>
          new LanguageFinding(
            'commit message',
            number,
            'reads as Spanish: commit messages are English',
          ),
      );
  }

  /**
   * Counts the Spanish lines of every developer file, for a new baseline.
   * @param {string[]} files Paths from the repository root.
   * @returns {Record<string, number>} Files with at least one Spanish line.
   */
  count(files) {
    return Object.fromEntries(
      files
        .filter((file) => this.policy.checks(file))
        .map((file) => [file, this.spanishLines(file).length])
        .filter(([, found]) => found > 0),
    );
  }

  /**
   * Line numbers of a file that read as Spanish.
   * @param {string} file Path from the repository root.
   * @returns {number[]} Lines from 1.
   */
  spanishLines(file) {
    let text;
    try {
      text = readFileSync(join(this.root, file), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') return [];
      throw error;
    }
    const kind = {
      prose: this.policy.isProse(file),
      dataStrings: this.policy.hasDataStrings(file),
      syntax: this.policy.syntaxOf(file),
    };
    return text
      .split('\n')
      .map((line, index) =>
        this.detector.isSpanish(line, kind) &&
        !this.policy.allowsLine(file, line)
          ? index + 1
          : 0,
      )
      .filter((line) => line > 0);
  }
}
