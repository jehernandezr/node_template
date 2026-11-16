import { Violation } from '../violation.mjs';

// Regla de estructura. Las subclases implementan appliesTo (solo por ruta) y check.
// El motor llama a check solo si appliesTo devolvió true, y entrega el texto del archivo
// únicamente para .dart y pubspec.yaml (para el resto, text es '').
export class Rule {
  constructor(id, message) {
    this.id = id;
    this.message = message;
  }

  appliesTo(_file) {
    throw new Error(`${this.constructor.name}.appliesTo no implementado`);
  }

  // Devuelve Violation[]; vacío si el archivo cumple.
  check(_file, _text) {
    throw new Error(`${this.constructor.name}.check no implementado`);
  }

  violation(file, line = null) {
    return new Violation(file, this.id, this.message, line);
  }
}
