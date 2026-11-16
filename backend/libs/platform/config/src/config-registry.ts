import type { ConfigSection } from './config-section.js';

/**
 * Valores ya validados de cada sección y del esquema propio del servicio.
 * Solo el arranque escribe en él; `AppConfig` lo lee.
 */
export class ConfigRegistry {
  private readonly sections = new Map<string, unknown>();
  private rootValue: unknown;

  /** Guarda los valores de `section`. Registrar dos veces la misma sección conserva el primer valor. */
  register<T>(section: ConfigSection<T>, value: T): void {
    if (this.sections.has(section.name)) {
      return;
    }
    this.sections.set(section.name, ConfigRegistry.freeze(value));
  }

  /** Valores de `section`, o `undefined` si aún no se cargó. */
  find<T>(section: ConfigSection<T>): T | undefined {
    return this.sections.get(section.name) as T | undefined;
  }

  setRoot(value: unknown): void {
    this.rootValue = ConfigRegistry.freeze(value);
  }

  root(): unknown {
    return this.rootValue;
  }

  /** Congela los objetos para que nadie altere la configuración después de validarla. */
  private static freeze<T>(value: T): T {
    return typeof value === 'object' && value !== null
      ? Object.freeze(value)
      : value;
  }
}
