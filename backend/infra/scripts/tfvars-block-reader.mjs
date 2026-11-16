// Lee lo que el pipeline necesita de un terraform.tfvars: bloques de primer nivel con llaves,
// cadenas entre comillas y comentarios con #. Antes de contar llaves se enmascaran las cadenas
// y los comentarios (mismo largo, mismos saltos de línea), así un "}" dentro de una cadena no
// cierra un bloque y un bloque comentado no cuenta.
export class TfvarsBlockReader {
  static #CHARACTER_MASK = ' ';

  #text;
  #masked;

  constructor(text) {
    this.#text = text;
    this.#masked = TfvarsBlockReader.#mask(text);
  }

  /** Indica si hay un bloque `name = {` (o `name = {}`) sin sangría. */
  hasBlock(name) {
    return this.#openBrace(name) !== -1;
  }

  /** Texto entre las llaves del bloque de primer nivel, o undefined si no existe. */
  block(name) {
    const open = this.#openBrace(name);
    if (open === -1) return undefined;
    const close = this.#closeBrace(open);
    return this.#text.slice(open + 1, close);
  }

  /** Indica si el bloque existe y tiene algo dentro que no sea espacio ni comentario. */
  hasContent(name) {
    const open = this.#openBrace(name);
    if (open === -1) return false;
    const close = this.#closeBrace(open);
    return this.#masked.slice(open + 1, close).trim() !== '';
  }

  /** Valor de `key = "valor"` a un nivel dentro del bloque, o undefined. */
  stringIn(blockName, key) {
    const open = this.#openBrace(blockName);
    if (open === -1) return undefined;
    const close = this.#closeBrace(open);
    return this.#stringAtDepthZero(open + 1, close, key, '\\s*');
  }

  /** Valor de `key = "valor"` sin sangría en el nivel principal, o undefined. */
  topLevelString(key) {
    return this.#stringAtDepthZero(0, this.#masked.length, key, '');
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
    throw new Error('Bloque sin cerrar en terraform.tfvars');
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
