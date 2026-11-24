import { Injectable } from '@nestjs/common';
import { TenantDirectory } from '../domain/tenant-directory.js';

/**
 * Apunta a la región nueva de un tenant trasladado el índice de slugs del catálogo. La fila del tenant ya llega con
 * su región nueva al shard de destino: la cambia el traslado antes de abrir las escrituras, porque desde la región
 * de origen ese shard ya no se alcanza por el enrutamiento. Repetirlo no cambia nada.
 */
@Injectable()
export class RelocateTenant {
  constructor(private readonly directory: TenantDirectory) {}

  async execute(tenantId: string, region: string): Promise<void> {
    await this.directory.relocate(tenantId, region);
  }
}
