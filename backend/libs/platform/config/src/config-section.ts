import type { z } from 'zod';

/**
 * Grupo de variables de entorno con nombre y esquema. Cada librería declara la
 * suya y el servicio la lee con `AppConfig.get(section)`; así un servicio no
 * recibe variables que no usa.
 */
export class ConfigSection<T> {
  /** Token propio de la sección, para que el cableado no use cadenas sueltas. */
  readonly token: symbol;

  constructor(
    readonly name: string,
    readonly schema: z.ZodType<T>,
  ) {
    this.token = Symbol(`config.section.${name}`);
  }
}
