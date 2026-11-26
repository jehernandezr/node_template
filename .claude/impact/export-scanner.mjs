/**
 * Reads the names a module exports, to look for their importers, subclasses and implementations: TypeScript and ES
 * modules, CommonJS modules and the public types of a Dart library.
 */
export class ExportScanner {
  static DECLARATION =
    /^export\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|enum|type|const|function|let)\s+([A-Za-z_$][\w$]*)/gm;
  static LIST = /^export\s*\{([^}]*)\}/gm;
  static COMMON_JS_LIST = /module\.exports\s*=\s*\{([^}]*)\}/g;
  static COMMON_JS_MEMBER = /^(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/gm;
  static DART_TYPE =
    /^(?:(?:abstract|sealed|final|base|interface|mixin)\s+)*(?:class|enum|mixin|typedef|extension\s+type)\s+([A-Z][\w$]*)/gm;

  /**
   * Lists the exported names of a source.
   * @param {string} text Module source.
   * @param {string} [file] Its path, which tells a Dart library apart; TypeScript when absent.
   * @returns {string[]} The names, without repeats.
   */
  exportsOf(text, file = '') {
    if (file.endsWith('.dart')) {
      return [
        ...new Set(
          [...text.matchAll(ExportScanner.DART_TYPE)].map((m) => m[1]),
        ),
      ];
    }
    const names = new Set();
    for (const match of text.matchAll(ExportScanner.DECLARATION)) {
      names.add(match[1]);
    }
    for (const match of text.matchAll(ExportScanner.LIST)) {
      for (const part of match[1].split(',')) {
        this.add(
          names,
          part
            .trim()
            .split(/\s+as\s+/)
            .pop(),
        );
      }
    }
    for (const match of text.matchAll(ExportScanner.COMMON_JS_LIST)) {
      for (const part of match[1].split(',')) {
        this.add(names, part.split(':')[0]);
      }
    }
    for (const match of text.matchAll(ExportScanner.COMMON_JS_MEMBER)) {
      names.add(match[1]);
    }
    return [...names];
  }

  /**
   * Adds one exported name, without a `type` modifier, when it is an identifier.
   * @param {Set<string>} names Names found so far.
   * @param {string | undefined} raw Name as written in the export list.
   */
  add(names, raw) {
    const name = raw?.trim().replace(/^type\s+/, '');
    if (name && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
  }
}
