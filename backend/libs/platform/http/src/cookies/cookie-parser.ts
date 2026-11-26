/** Reads the `Cookie` header per RFC 6265: only `name=value` pairs, separated by `;`. */
export class CookieParser {
  /**
   * The first occurrence of each name wins. Pairs without `=` or with an empty name are ignored.
   * @param header `Cookie` header.
   * @returns The cookies by name.
   */
  static parse(header: string | undefined): ReadonlyMap<string, string> {
    const cookies = new Map<string, string>();
    if (header === undefined) {
      return cookies;
    }
    for (const pair of header.split(';')) {
      const separator = pair.indexOf('=');
      if (separator === -1) {
        continue;
      }
      const name = pair.slice(0, separator).trim();
      if (name === '' || cookies.has(name)) {
        continue;
      }
      cookies.set(name, CookieParser.decode(pair.slice(separator + 1).trim()));
    }
    return cookies;
  }

  /** A badly encoded value is left as is: it is not a request error. */
  private static decode(raw: string): string {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
}
