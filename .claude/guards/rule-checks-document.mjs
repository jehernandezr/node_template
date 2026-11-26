import { readFileSync } from 'node:fs';
import { RuleInventory } from './rule-inventory.mjs';

/** One row of `docs/quality/rule-checks.md`: a rule and the check that enforces it, or `review only`. */
export class RuleCheck {
  /**
   * @param {string} source `CLAUDE.md` or the skill name.
   * @param {string} rule First words of the rule.
   * @param {string} check The check, or `review only`.
   */
  constructor(source, rule, check) {
    this.source = source;
    this.rule = rule;
    this.check = check;
  }

  /**
   * Key that matches the rule in the inventory.
   * @returns {string} `source|first words`.
   */
  get id() {
    return `${this.source}|${RuleInventory.keyOf(this.rule)}`;
  }
}

/** Reads the rows of `docs/quality/rule-checks.md`: every table whose header is `Source | Rule | Check`. */
export class RuleChecksDocument {
  static HEADER = /^\|\s*Source\s*\|\s*Rule\s*\|\s*Check\s*\|$/;
  static REVIEW_ONLY = 'review only';

  /**
   * @param {string} text Markdown of the document.
   */
  constructor(text) {
    this.text = text;
  }

  /**
   * Reads the document from disk.
   * @param {string} path Absolute path.
   * @returns {RuleChecksDocument} The document.
   */
  static read(path) {
    return new RuleChecksDocument(readFileSync(path, 'utf8'));
  }

  /**
   * Every row of the rule tables.
   * @returns {RuleCheck[]} The rows, in document order.
   */
  rows() {
    const rows = [];
    let inTable = false;
    for (const line of this.text.split('\n')) {
      if (RuleChecksDocument.HEADER.test(line.trim())) {
        inTable = true;
        continue;
      }
      if (!line.startsWith('|')) {
        inTable = false;
        continue;
      }
      if (!inTable || /^\|\s*-/.test(line)) continue;
      const cells = line
        .slice(1, -1)
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim());
      if (cells.length === 3) rows.push(new RuleCheck(...cells));
    }
    return rows;
  }
}
