import { Injectable, type NestMiddleware } from '@nestjs/common';
import { ClientIpContext } from './client-ip-context.js';

/** Abre el `ClientIpContext` de cada petición antes de que se autentique. */
@Injectable()
export class ClientIpMiddleware implements NestMiddleware {
  constructor(private readonly context: ClientIpContext) {}

  use(request: { ip?: string }, _response: unknown, next: () => void): void {
    this.context.run(request.ip ?? '', next);
  }
}
