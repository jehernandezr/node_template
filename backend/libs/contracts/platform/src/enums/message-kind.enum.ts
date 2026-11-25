/**
 * Kind of an asynchronous message: a fact that already happened (event) or a
 * work request to a specific service (command). The values match
 * `MessageKind` from `@platform/messaging`.
 */
export enum MessageKind {
  Event = 'event',
  Command = 'command',
}
