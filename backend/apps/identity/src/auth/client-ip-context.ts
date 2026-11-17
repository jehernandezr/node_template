import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

/**
 * IP del cliente de la petición en curso, ya resuelta con `trust proxy`. El autenticador de API keys de la
 * plataforma no recibe la petición, y sin la IP una key limitada por CIDR no se podría revisar.
 */
@Injectable()
export class ClientIpContext {
  private readonly storage = new AsyncLocalStorage<string>();

  run<T>(ip: string, fn: () => T): T {
    return this.storage.run(ip, fn);
  }

  /** `undefined` fuera de una petición HTTP o si el servidor no conoce la IP. */
  current(): string | undefined {
    const ip = this.storage.getStore();
    return ip === undefined || ip === '' ? undefined : ip;
  }
}
