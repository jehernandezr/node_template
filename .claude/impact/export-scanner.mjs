/** Reads the names a TypeScript module exports, to look for their importers, subclasses and implementations. */
export class ExportScanner {
  static DECLARATION =
    /^export\s+(?:default\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|enum|type|const|function|let)\s+([A-Za-z_$][\w$]*)/gm;
  static LIST = /^export\s*\{([^}]*)\}/gm;

  /**
   * Lists the exported names of a source.
   * @param {string} text TypeScript source.
   * @returns {string[]} The names, without repeats.
   */
  exportsOf(text) {
    const names = new Set();
    for (const match of text.matchAll(ExportScanner.DECLARATION)) {
      names.add(match[1]);
    }
    for (const match of text.matchAll(ExportScanner.LIST)) {
      for (const part of match[1].split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.replace(/^type\s+/, '');
        if (name) names.add(name);
      }
    }
    return [...names];
  }
}
