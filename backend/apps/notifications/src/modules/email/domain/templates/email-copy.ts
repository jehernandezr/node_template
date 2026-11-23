/** Textos de un correo en un idioma. `{nombre}` se reemplaza por el dato de plantilla con ese nombre. */
export interface EmailCopy {
  readonly subject: string;
  readonly lines: readonly string[];
  /** Texto del enlace, si el correo lleva `link`. */
  readonly action?: string;
}
