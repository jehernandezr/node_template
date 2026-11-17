/** Ubica un tenant en los shards de su región antes de escribir sus datos. */
export abstract class TenantPlacement {
  /**
   * Un tenant normal va al shard menos cargado. El tenant compartido de clientes reparte a sus usuarios en
   * todos los shards de la región, así que su grupo los incluye a todos.
   */
  abstract place(
    tenantId: string,
    region: string,
    spread: boolean,
  ): Promise<void>;
}
