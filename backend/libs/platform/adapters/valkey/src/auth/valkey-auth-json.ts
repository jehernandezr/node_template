import type { z } from 'zod';
import { ValkeyCommand } from '../valkey-command.enum.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';

/** Reads and writes the JSON values of `auth:*` with the shape set by `AuthStateSchemas`. */
export class ValkeyAuthJson {
  /** @throws ValkeyUnexpectedReplyError if the text is not JSON or does not match the schema. */
  static parse<T>(
    command: ValkeyCommand,
    text: string,
    schema: z.ZodType<T>,
  ): T {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ValkeyUnexpectedReplyError(command, 'a valid JSON value');
    }
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new ValkeyUnexpectedReplyError(command, 'a valid JSON value');
    }
    return result.data;
  }

  static encode(value: unknown): string {
    return JSON.stringify(value);
  }
}
