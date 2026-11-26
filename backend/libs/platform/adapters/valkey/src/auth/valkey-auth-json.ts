import type { z } from 'zod';
import { ValkeyCommand } from '../valkey-command.enum.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';

/** Reads and writes the JSON values of `auth:*` with the shape set by `AuthStateSchemas`. */
export class ValkeyAuthJson {
  /**
   * Parses and validates a JSON reply.
   * @param command Command that produced it.
   * @param text Reply text.
   * @param schema Expected shape.
   * @returns The parsed value.
   * @throws ValkeyUnexpectedReplyError if the text is not JSON or does not match the schema.
   */
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

  /**
   * Encodes a value as JSON to store it.
   * @param value Value to encode.
   * @returns The JSON text.
   */
  static encode(value: unknown): string {
    return JSON.stringify(value);
  }
}
