/**
 * Finds the string-keyed identifiers a diff adds or removes: couplings that no import shows. In code these are event
 * names, environment variables, error codes, cache key prefixes and routes; in the front, ARB keys, screen routes and
 * the repositories a `RepositoryBinding` serves; in the infrastructure, Terraform variables and outputs, topology
 * entries and workflow jobs.
 */
export class StringKeyExtractor {
  static KINDS = [
    {
      kind: 'event or message',
      pattern: /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}(\.v\d+)?$/,
    },
    { kind: 'error code', pattern: /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/ },
    { kind: 'environment variable', pattern: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/ },
    {
      kind: 'key prefix',
      pattern:
        /^(?!(node|package|dart|http|https):)[a-z][a-z0-9-]*(:[a-z0-9{}$-]+)+:?$/,
    },
    { kind: 'route', pattern: /^\/(v\d+|internal|api)(\/[\w:{}.-]+)+$/ },
    {
      kind: 'front route',
      files: /\.dart$/,
      pattern: /^\/[a-z][\w-]*(\/[\w:{}-]+)*$/,
    },
  ];
  static LINE_KINDS = [
    { kind: 'ARB key', files: /\.arb$/, pattern: /^\s*"([a-zA-Z]\w*)"\s*:/ },
    {
      kind: 'repository binding',
      files: /\.dart$/,
      pattern: /RepositoryBinding<\s*([A-Z]\w*)\s*>/,
    },
    {
      kind: 'Terraform variable',
      files: /\.tf$/,
      pattern: /^\s*variable\s+"([\w-]+)"/,
    },
    {
      kind: 'Terraform output',
      files: /\.tf$/,
      pattern: /^\s*output\s+"([\w-]+)"/,
    },
    {
      kind: 'topology entry',
      files: /(^|\/)topology\.json$/,
      pattern: /^\s*"([\w.-]{3,})"\s*:/,
    },
    {
      kind: 'workflow job',
      files: /^\.github\/workflows\/[^/]+\.ya?ml$/,
      pattern: /^ {2}([\w-]+):\s*$/,
    },
  ];
  static LITERAL =
    /'([^'\n\\]{3,120})'|"([^"\n\\]{3,120})"|`([^`\n\\$]{3,120})`/g;

  /**
   * Collects the identifiers of the changed lines of a unified diff, by kind.
   * @param {string} diff Output of `git diff --unified=0`.
   * @returns {Map<string, Set<string>>} Identifiers per kind.
   */
  extract(diff) {
    const found = new Map();
    const add = (kind, literal) => {
      if (!found.has(kind)) found.set(kind, new Set());
      found.get(kind).add(literal);
    };
    let file = '';
    for (const line of diff.split('\n')) {
      const header = /^\+\+\+ (?:b\/)?(.+)$/.exec(line);
      if (header !== null) {
        file = header[1];
        continue;
      }
      if (!/^[+-]/.test(line) || /^--- /.test(line)) continue;
      const body = line.slice(1);
      const lineKind = StringKeyExtractor.LINE_KINDS.find(
        (entry) => entry.files.test(file) && entry.pattern.test(body),
      );
      if (lineKind !== undefined) {
        add(lineKind.kind, lineKind.pattern.exec(body)[1]);
        continue;
      }
      for (const match of body.matchAll(StringKeyExtractor.LITERAL)) {
        const literal = match[1] ?? match[2] ?? match[3];
        const kind = this.kindOf(literal, file);
        if (kind !== undefined) add(kind, literal);
      }
    }
    return found;
  }

  /**
   * Classifies one literal.
   * @param {string} literal String without its quotes.
   * @param {string} [file] File of the line, for the kinds that only apply to some files.
   * @returns {string | undefined} The kind, or `undefined` for ordinary text.
   */
  kindOf(literal, file = '') {
    return StringKeyExtractor.KINDS.find(
      ({ pattern, files }) =>
        (files === undefined || files.test(file)) && pattern.test(literal),
    )?.kind;
  }

  /**
   * Whether occurrences of a kind are searched as a whole word rather than as text: the names of the front and the
   * infrastructure are short and would match inside other names.
   * @param {string} kind Kind of identifier.
   * @returns {boolean} `true` for the kinds read from whole lines.
   */
  static isWord(kind) {
    return StringKeyExtractor.LINE_KINDS.some((entry) => entry.kind === kind);
  }
}
