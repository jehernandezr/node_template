import { ReplyError } from 'iovalkey';

/** Server reply errors, as iovalkey throws them. */
export class ReplyErrors {
  static of(message: string): Error {
    return new (ReplyError as new (message: string) => Error)(message);
  }
}
