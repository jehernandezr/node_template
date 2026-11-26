import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** One rule of CLAUDE.md or of a skill: a top-level bullet of a rule section. */
export class Rule {
  /**
   * @param {string} source `CLAUDE.md` or the skill name.
   * @param {string} section Heading the bullet sits under.
   * @param {string} text The bullet, without its marker.
   * @param {string | undefined} id Stable id stored with the bullet, such as `claude.code.3` or `backend-testing.2`;
   *   `undefined` when the bullet carries none.
   */
  constructor(source, section, text, id) {
    this.source = source;
    this.section = section;
    this.text = text;
    this.id = id;
  }

  /**
   * How `rule-checks.md` names the rule: its first words, without Markdown.
   * @returns {string} Up to ten lowercase words.
   */
  get key() {
    return RuleInventory.keyOf(this.text);
  }
}

/**
 * Lists every rule of `CLAUDE.md` and of the `.claude/skills` skills, so `docs/quality/rule-checks.md` can be checked
 * for a missing or stale entry. A rule is one top-level bullet of a rule section of `CLAUDE.md` or of a skill's
 * `SKILL.md`; numbered procedure steps, tables and the `references/` files detail those rules and are not listed.
 * Sections that only point elsewhere or show an example hold no rules.
 *
 * Each rule carries its id at the end of its bullet, as `<!-- id: backend-testing.2 -->`. The id is written once, when
 * the rule is added, and never changes when rules around it are added or removed: `claude.<section>.<n>` for
 * `CLAUDE.md` and `<skill>.<n>` for a skill, with `n` the next number unused in that prefix.
 */
export class RuleInventory {
  static CLAUDE = 'CLAUDE.md';
  static KEY_WORDS = 10;
  static ID = /\s*<!-- id: ([a-z0-9.-]+) -->\s*$/;
  static NOT_RULES = new Set([
    'skill map',
    'with pstack',
    'example',
    'loading a pstack skill',
    'commands',
    'verification',
    'review report',
    'how to measure',
    'rejected from the public guides',
    'what it creates',
  ]);

  /**
   * @param {string} root Repository root.
   */
  constructor(root) {
    this.root = root;
  }

  /**
   * Normalizes rule text into the key both the inventory and the document use.
   * @param {string} text Rule or table cell text.
   * @returns {string} Its first words, lowercase, without Markdown.
   */
  static keyOf(text) {
    return text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9@./-]+/)
      .filter(Boolean)
      .slice(0, RuleInventory.KEY_WORDS)
      .join(' ');
  }

  /**
   * Every rule, in source order.
   * @returns {Rule[]} The rules.
   */
  rules() {
    const skills = join(this.root, '.claude/skills');
    const sources = [
      {
        source: RuleInventory.CLAUDE,
        path: join(this.root, RuleInventory.CLAUDE),
      },
      ...readdirSync(skills, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          source: entry.name,
          path: join(skills, entry.name, 'SKILL.md'),
        })),
    ];
    return sources.flatMap(({ source, path }) =>
      this.rulesOf(source, readFileSync(path, 'utf8')),
    );
  }

  /**
   * The rules of one Markdown source.
   * @param {string} source Name of the source.
   * @param {string} text Its Markdown.
   * @returns {Rule[]} Its top-level bullets outside the sections that hold no rules, each with the id it stores.
   */
  rulesOf(source, text) {
    const rules = [];
    let section = '';
    let fence = false;
    for (const line of text.split('\n')) {
      if (line.startsWith('```')) fence = !fence;
      if (fence) continue;
      const heading = /^#{2,3} (.+)$/.exec(line);
      if (heading) {
        section = heading[1].trim();
        continue;
      }
      if (
        line.startsWith('- ') &&
        section !== '' &&
        !RuleInventory.NOT_RULES.has(section.toLowerCase())
      ) {
        const bullet = line.slice(2).trim();
        const id = RuleInventory.ID.exec(bullet)?.[1];
        rules.push(
          new Rule(source, section, bullet.replace(RuleInventory.ID, ''), id),
        );
      }
    }
    return rules;
  }

  /**
   * The part of a rule id before its number, which the id stored with a rule must start with.
   * @param {string} source `CLAUDE.md` or the skill name.
   * @param {string} section Heading the rule sits under.
   * @returns {string} `claude.<section slug>` for `CLAUDE.md`, the skill name otherwise.
   */
  static prefixOf(source, section) {
    if (source !== RuleInventory.CLAUDE) return source;
    const slug = section
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `claude.${slug}`;
  }
}
