import { ReplyError } from 'iovalkey';

/** Errores de respuesta del servidor, como los lanza iovalkey. */
export class ReplyErrors {
  static of(message: string): Error {
    return new (ReplyError as new (message: string) => Error)(message);
  }
}
