/**
 * Finds the comments of a Dart source, skipping strings (single, double, triple and raw quotes) and the code of
 * their `${...}` interpolations, and nesting block comments as Dart does. Each comment says whether it sits inside a
 * block of code (a function body, a control block or a collection literal) rather than at the top level or in the
 * body of a class, enum, mixin or extension, where declarations live.
 */
export class DartCommentScanner {
  /**
   * Lists the comments of a Dart source.
   * @param {string} text Dart source.
   * @returns {{ line: number, text: string, block: boolean, inCode: boolean }[]} Each comment with the line where
   *   it starts and whether it is inside a block of code.
   */
  scan(text) {
    const comments = [];
    const state = { text, index: 0, line: 1, blocks: [], head: '' };
    this.#code(state, comments, false);
    return comments;
  }

  #code(state, comments, inInterpolation) {
    let depth = 0;
    while (state.index < state.text.length) {
      const char = state.text[state.index];
      const next = state.text[state.index + 1];
      if (char === '/' && next === '/') {
        this.#lineComment(state, comments);
      } else if (char === '/' && next === '*') {
        this.#blockComment(state, comments);
      } else if (char === "'" || char === '"') {
        this.#string(state, comments, false);
      } else if (
        (char === 'r' || char === 'R') &&
        (next === "'" || next === '"') &&
        !this.#isIdentifierPart(state.text[state.index - 1])
      ) {
        state.index += 1;
        this.#string(state, comments, true);
      } else if (inInterpolation && char === '{') {
        depth += 1;
        this.#advance(state);
      } else if (inInterpolation && char === '}') {
        if (depth === 0) {
          this.#advance(state);
          return;
        }
        depth -= 1;
        this.#advance(state);
      } else if (char === '{') {
        state.blocks.push(
          this.#isDeclarationBody(state.head) ? 'body' : 'code',
        );
        state.head = '';
        this.#advance(state);
      } else if (char === '}') {
        state.blocks.pop();
        state.head = '';
        this.#advance(state);
      } else if (char === ';') {
        state.head = '';
        this.#advance(state);
      } else {
        state.head += char;
        this.#advance(state);
      }
    }
  }

  #lineComment(state, comments) {
    const start = state.index;
    const line = state.line;
    while (
      state.index < state.text.length &&
      state.text[state.index] !== '\n'
    ) {
      state.index += 1;
    }
    comments.push({
      line,
      text: state.text.slice(start, state.index),
      block: false,
      inCode: state.blocks.includes('code'),
    });
  }

  #blockComment(state, comments) {
    const start = state.index;
    const line = state.line;
    let depth = 0;
    while (state.index < state.text.length) {
      if (state.text.startsWith('/*', state.index)) {
        depth += 1;
        state.index += 2;
      } else if (state.text.startsWith('*/', state.index)) {
        depth -= 1;
        state.index += 2;
        if (depth === 0) break;
      } else {
        this.#advance(state);
      }
    }
    comments.push({
      line,
      text: state.text.slice(start, state.index),
      block: true,
      inCode: state.blocks.includes('code'),
    });
  }

  #string(state, comments, raw) {
    const quote = state.text[state.index];
    const triple = state.text.startsWith(quote.repeat(3), state.index);
    const closing = triple ? quote.repeat(3) : quote;
    state.index += closing.length;
    while (state.index < state.text.length) {
      const char = state.text[state.index];
      if (!raw && char === '\\') {
        state.index += 1;
        this.#advance(state);
      } else if (state.text.startsWith(closing, state.index)) {
        state.index += closing.length;
        return;
      } else if (!raw && char === '$' && state.text[state.index + 1] === '{') {
        state.index += 2;
        this.#code(state, comments, true);
      } else if (!triple && char === '\n') {
        return;
      } else {
        this.#advance(state);
      }
    }
  }

  #isDeclarationBody(head) {
    const code = head.replace(/@[\w.]+(\([^)]*\))?/g, ' ');
    return /\b(class|enum|mixin|extension)\b/.test(code) && !/[(=]/.test(code);
  }

  #advance(state) {
    if (state.text[state.index] === '\n') state.line += 1;
    state.index += 1;
  }

  #isIdentifierPart(char) {
    return char !== undefined && /[\w$]/.test(char);
  }
}
