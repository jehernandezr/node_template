import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

/**
 * Client IP of the current request, already resolved with `trust proxy`. The platform's API key authenticator
 * does not receive the request, and without the IP a CIDR-restricted key could not be checked.
 */
@Injectable()
export class ClientIpContext {
  private readonly storage = new AsyncLocalStorage<string>();

  /**
   * Runs `fn` with the client IP of the request available to the code it calls.
   * @param ip Client IP of the request.
   * @param fn Work to run.
   * @returns What `fn` returns.
   */
  run<T>(ip: string, fn: () => T): T {
    return this.storage.run(ip, fn);
  }

  /**
   * `undefined` outside an HTTP request or if the server does not know the IP.
   * @returns The client IP of the request in course.
   */
  current(): string | undefined {
    const ip = this.storage.getStore();
    return ip === undefined || ip === '' ? undefined : ip;
  }
}
