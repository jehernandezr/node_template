import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { Argon2Params } from '../../../shared/constants/argon2.constants.js';
import { PasswordHasher } from '../domain/password-hasher.js';

const argon2Async = promisify(argon2);

/** Parameters and parts of an already parsed argon2id PHC hash. */
interface ParsedPhc {
  readonly memoryKiB: number;
  readonly passes: number;
  readonly parallelism: number;
  readonly salt: Buffer;
  readonly tag: Buffer;
}

/**
 * argon2id with Node's `crypto.argon2` (since 24.7.0) and the OWASP parameters. The PHC encoding
 * `$argon2id$v=19$m=…,t=…,p=…$salt$hash` is our own, with unpadded base64 like the reference one.
 */
@Injectable()
export class NodeArgon2idHasher extends PasswordHasher {
  private static readonly PHC =
    /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

  override async hash(password: string): Promise<string> {
    const salt = randomBytes(Argon2Params.saltBytes);
    const tag = await this.derive(password, {
      memoryKiB: Argon2Params.memoryKiB,
      passes: Argon2Params.passes,
      parallelism: Argon2Params.parallelism,
      salt,
      tagBytes: Argon2Params.tagBytes,
    });
    return [
      '',
      'argon2id',
      `v=${Argon2Params.version}`,
      `m=${Argon2Params.memoryKiB},t=${Argon2Params.passes},p=${Argon2Params.parallelism}`,
      NodeArgon2idHasher.b64(salt),
      NodeArgon2idHasher.b64(tag),
    ].join('$');
  }

  override async verify(password: string, hash: string): Promise<boolean> {
    const parsed = NodeArgon2idHasher.parse(hash);
    if (parsed === undefined) {
      return false;
    }
    const tag = await this.derive(password, {
      ...parsed,
      tagBytes: parsed.tag.length,
    });
    return tag.length === parsed.tag.length && timingSafeEqual(tag, parsed.tag);
  }

  override needsRehash(hash: string): boolean {
    const parsed = NodeArgon2idHasher.parse(hash);
    return (
      parsed === undefined ||
      parsed.memoryKiB !== Argon2Params.memoryKiB ||
      parsed.passes !== Argon2Params.passes ||
      parsed.parallelism !== Argon2Params.parallelism ||
      parsed.tag.length !== Argon2Params.tagBytes
    );
  }

  private async derive(
    password: string,
    params: Omit<ParsedPhc, 'tag'> & { tagBytes: number },
  ): Promise<Buffer> {
    return argon2Async('argon2id', {
      message: password,
      nonce: params.salt,
      memory: params.memoryKiB,
      passes: params.passes,
      parallelism: params.parallelism,
      tagLength: params.tagBytes,
    });
  }

  private static parse(hash: string): ParsedPhc | undefined {
    const match = NodeArgon2idHasher.PHC.exec(hash);
    if (match === null) {
      return undefined;
    }
    const [, memory, passes, parallelism, salt, tag] = match;
    return {
      memoryKiB: Number(memory),
      passes: Number(passes),
      parallelism: Number(parallelism),
      salt: Buffer.from(salt ?? '', 'base64'),
      tag: Buffer.from(tag ?? '', 'base64'),
    };
  }

  private static b64(bytes: Buffer): string {
    return bytes.toString('base64').replace(/=+$/, '');
  }
}
