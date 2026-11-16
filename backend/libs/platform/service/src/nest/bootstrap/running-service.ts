import type { INestApplicationContext } from '@nestjs/common';
import { ServiceShutdownTimeoutError } from '../../errors/service-shutdown-timeout.error.js';

/** Dirección en la que escucha un proceso HTTP. */
export interface ServiceAddress {
  readonly host: string;
  readonly port: number;
}

/** Un servicio arrancado. Su cierre es ordenado y está acotado por el plazo de gracia. */
export class RunningService {
  private stopping: Promise<void> | undefined;

  constructor(
    readonly name: string,
    readonly app: INestApplicationContext,
    private readonly graceMs: number,
    readonly address?: ServiceAddress,
  ) {}

  /**
   * Cierra la aplicación: deja de aceptar, espera lo que está en curso, detiene jobs y consumidores
   * y cierra persistencia, Valkey y telemetría. Llamarlo varias veces devuelve el mismo cierre.
   * @throws ServiceShutdownTimeoutError si no termina dentro de `graceMs`.
   */
  stop(): Promise<void> {
    if (this.stopping === undefined) {
      this.stopping = this.closeWithin();
    }
    return this.stopping;
  }

  private async closeWithin(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new ServiceShutdownTimeoutError(this.name, this.graceMs));
      }, this.graceMs);
    });
    try {
      await Promise.race([this.app.close(), timeout]);
    } finally {
      // Sin esto, un temporizador pendiente retendría el proceso después de cerrar.
      clearTimeout(timer);
    }
  }
}
