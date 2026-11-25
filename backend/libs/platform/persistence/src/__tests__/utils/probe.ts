/** Sample aggregate for the tests. `version` is 0 until it is saved. */
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
