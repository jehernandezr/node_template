/**
 * Reads what the pipeline needs from a terraform.tfvars: top-level blocks with braces, quoted strings and comments with #. Before counting braces, strings and comments are masked (same length, same line breaks), so a "}" inside a string does not close a block and a commented-out block does not count.
 */
export class TfvarsBlockReader {
  static #CHARACTER_MASK = ' ';

  #text;
  #masked;

  /**
   * @param {string} text Contents of a terraform.tfvars file.
   */
  constructor(text) {
    this.#text = text;
    this.#masked = TfvarsBlockReader.#mask(text);
  }

  /**
   * Whether there is an unindented `name = {` (or `name = {}`) block.
   * @param {string} name Name of the top-level block.
   * @returns {boolean} True if the block exists outside comments.
   */
  hasBlock(name) {
    return this.#openBrace(name) !== -1;
  }

  /**
   * Text between the braces of a top-level block.
   * @param {string} name Name of the top-level block.
   * @returns {string | undefined} The text inside the braces, or undefined if the block does not exist.
   */
  block(name) {
    const open = this.#openBrace(name);
    if (open === -1) return undefined;
    const close = this.#closeBrace(open);
    return this.#text.slice(open + 1, close);
  }

  /**
   * Whether the block exists and has something inside other than whitespace or comments.
   * @param {string} name Name of the top-level block.
   * @returns {boolean} True if the block holds at least one value.
   */
  hasContent(name) {
    const open = this.#openBrace(name);
    if (open === -1) return false;
    const close = this.#closeBrace(open);
    return this.#masked.slice(open + 1, close).trim() !== '';
  }

  /**
   * Value of `key = "value"` one level inside a top-level block.
   * @param {string} blockName Name of the top-level block.
   * @param {string} key Key inside the block.
   * @returns {string | undefined} The quoted value, or undefined if the block or the key does not exist.
   */
  stringIn(blockName, key) {
    const open = this.#openBrace(blockName);
    if (open === -1) return undefined;
    const close = this.#closeBrace(open);
    return this.#stringAtDepthZero(open + 1, close, key, '\\s*');
  }

  /**
   * Value of an unindented `key = "value"` at the top level.
   * @param {string} key Top-level key.
   * @returns {string | undefined} The quoted value, or undefined if there is none.
   */
  topLevelString(key) {
    return this.#stringAtDepthZero(0, this.#masked.length, key, '');
  }

  /**
   * Whether there is an unindented `key = ...` assignment outside comments.
   * @param {string} key Top-level key.
   * @returns {boolean} True if the key is assigned.
   */
  assigns(key) {
    return this.#topLevelMatch(key) !== null;
  }

  /**
   * Text after `key =` on its line, without its comment, for an unindented assignment.
   * @param {string} key Top-level key.
   * @returns {string | undefined} The expression, or undefined if the key is not assigned.
   */
  topLevelExpression(key) {
    const match = this.#topLevelMatch(key);
    if (match === null) return undefined;
    const start = match.index + match[0].length;
    const end = this.#masked.indexOf('\n', start);
    const lineEnd = end === -1 ? this.#masked.length : end;
    return this.#text
      .slice(start, start + this.#masked.slice(start, lineEnd).trimEnd().length)
      .trim();
  }

  /**
   * Strings of an unindented one-line list `key = ["a", "b"]`.
   * @param {string} key Top-level key.
   * @returns {string[]} The strings in order, or an empty list if the key is not assigned.
   */
  topLevelStrings(key) {
    const expression = this.topLevelExpression(key) ?? '';
    return [...expression.matchAll(/"([^"]*)"/g)].map(([, value]) => value);
  }

  /**
   * Keys of the entries one level inside a block (`name = ...` or `"name" = ...`).
   * @param {string} blockName Name of the top-level block.
   * @returns {string[]} The keys in order, or an empty list if the block does not exist.
   */
  entryNames(blockName) {
    return this.entries(blockName).map((entry) => entry.name);
  }

  /**
   * Entries one level inside a block, each with the text of its value and its comments removed.
   * @param {string} blockName Name of the top-level block.
   * @returns {{ name: string, value: string }[]} The entries in order, or an empty list if the block does not exist.
   */
  entries(blockName) {
    const open = this.#openBrace(blockName);
    if (open === -1) return [];
    const close = this.#closeBrace(open);
    const entries = [];
    let depth = 0;
    let offset = open + 1;
    for (const line of this.#masked.slice(open + 1, close).split('\n')) {
      const original = this.#text.slice(offset, offset + line.length);
      const key =
        depth === 0 ? /^\s*("[^"]*"|[A-Za-z0-9_-]+)\s*=/.exec(line) : null;
      if (key !== null) {
        const name = /^\s*(?:"([^"]+)"|([A-Za-z0-9_-]+))/.exec(original);
        entries.push({
          name: name[1] ?? name[2],
          value: TfvarsBlockReader.#unmasked(original, line, key[0].length),
        });
      } else if (entries.length > 0 && depth > 0) {
        entries.at(-1).value +=
          `\n${TfvarsBlockReader.#unmasked(original, line, 0)}`;
      }
      for (const character of line) {
        if (character === '{') depth++;
        if (character === '}') depth--;
      }
      offset += line.length + 1;
    }
    return entries;
  }

  static #unmasked(original, masked, from) {
    const commentFree = masked.slice(from).trimEnd().length;
    return original.slice(from, from + commentFree).trim();
  }

  #topLevelMatch(key) {
    return new RegExp(`^${TfvarsBlockReader.#escape(key)}\\s*=`, 'm').exec(
      this.#masked,
    );
  }

  #openBrace(name) {
    const pattern = new RegExp(
      `^${TfvarsBlockReader.#escape(name)}\\s*=\\s*\\{`,
      'm',
    );
    const match = pattern.exec(this.#masked);
    return match === null ? -1 : match.index + match[0].length - 1;
  }

  #closeBrace(open) {
    let depth = 0;
    for (let index = open; index < this.#masked.length; index++) {
      const character = this.#masked[index];
      if (character === '{') depth++;
      if (character === '}') {
        depth--;
        if (depth === 0) return index;
      }
    }
    throw new Error('Unclosed block in terraform.tfvars');
  }

  #stringAtDepthZero(from, to, key, indent) {
    const pattern = new RegExp(
      `^${indent}${TfvarsBlockReader.#escape(key)}\\s*=\\s*"([^"]*)"`,
    );
    const lines = this.#masked.slice(from, to).split('\n');
    let depth = 0;
    let offset = from;
    for (const line of lines) {
      if (depth === 0) {
        const original = this.#text.slice(offset, offset + line.length);
        const match = pattern.exec(original);
        if (match !== null && pattern.test(line)) return match[1];
      }
      for (const character of line) {
        if (character === '{') depth++;
        if (character === '}') depth--;
      }
      offset += line.length + 1;
    }
    return undefined;
  }

  static #escape(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static #mask(text) {
    let output = '';
    let inString = false;
    let inComment = false;
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (character === '\n') {
        inComment = false;
        output += '\n';
      } else if (inComment) {
        output += TfvarsBlockReader.#CHARACTER_MASK;
      } else if (inString) {
        if (
          character === '\\' &&
          index + 1 < text.length &&
          text[index + 1] !== '\n'
        ) {
          output += TfvarsBlockReader.#CHARACTER_MASK.repeat(2);
          index++;
        } else if (character === '"') {
          inString = false;
          output += '"';
        } else {
          output += TfvarsBlockReader.#CHARACTER_MASK;
        }
      } else if (character === '"') {
        inString = true;
        output += '"';
      } else if (character === '#') {
        inComment = true;
        output += TfvarsBlockReader.#CHARACTER_MASK;
      } else {
        output += character;
      }
    }
    return output;
  }
}
