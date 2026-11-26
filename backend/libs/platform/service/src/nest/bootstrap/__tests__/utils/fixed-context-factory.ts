import type { INestApplicationContext } from '@nestjs/common';
import { ApplicationContextFactory } from '../../application-context-factory.js';

/** Hands out the same test context on every request and counts how many it was asked for. */
export class FixedContextFactory extends ApplicationContextFactory {
  created = 0;

  constructor(private readonly context: INestApplicationContext) {
    super();
  }

  override async create(): Promise<INestApplicationContext> {
    this.created += 1;
    return this.context;
  }
}
