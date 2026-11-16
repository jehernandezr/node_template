/** Lee el header `Cookie` según RFC 6265: solo pares `nombre=valor`, separados por `;`. */
export class CookieParser {
  /** La primera aparición de cada nombre gana. Los pares sin `=` o con nombre vacío se ignoran. */
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

  /** Un valor mal codificado se deja tal cual: no es un error de la petición. */
  private static decode(raw: string): string {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
}
