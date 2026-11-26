/**
 * Finds the string-keyed identifiers a diff adds or removes: couplings that no import shows, such as event names,
 * environment variables, error codes, cache key prefixes and routes.
 */
export class StringKeyExtractor {
  static KINDS = [
    {
      kind: 'event or message',
      pattern: /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}(\.v\d+)?$/,
    },
    { kind: 'error code', pattern: /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/ },
    { kind: 'environment variable', pattern: /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/ },
    { kind: 'key prefix', pattern: /^[a-z][a-z0-9-]*(:[a-z0-9{}$-]+)+:?$/ },
    { kind: 'route', pattern: /^\/(v\d+|internal|api)(\/[\w:{}.-]+)+$/ },
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
    for (const line of diff.split('\n')) {
      if (!/^[+-]/.test(line) || /^(\+\+\+|---) /.test(line)) continue;
      for (const match of line.matchAll(StringKeyExtractor.LITERAL)) {
        const literal = match[1] ?? match[2] ?? match[3];
        const kind = this.kindOf(literal);
        if (kind === undefined) continue;
        if (!found.has(kind)) found.set(kind, new Set());
        found.get(kind).add(literal);
      }
    }
    return found;
  }

  /**
   * Classifies one literal.
   * @param {string} literal String without its quotes.
   * @returns {string | undefined} The kind, or `undefined` for ordinary text.
   */
  kindOf(literal) {
    return StringKeyExtractor.KINDS.find(({ pattern }) => pattern.test(literal))
      ?.kind;
  }
}
