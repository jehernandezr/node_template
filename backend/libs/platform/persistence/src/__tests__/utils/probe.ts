/** Agregado de ejemplo de las pruebas. `version` es 0 mientras no se guarda. */
export class Probe {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly priority: number,
    readonly version: number,
    readonly tenantId?: string,
  ) {}

  rename(name: string): Probe {
    return new Probe(this.id, name, this.priority, this.version, this.tenantId);
  }
}
