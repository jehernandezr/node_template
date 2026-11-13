/**
 * Clase de un mensaje asíncrono: un hecho que ya pasó (evento) o un pedido de
 * trabajo a un servicio concreto (comando). Los valores coinciden con
 * `MessageKind` de `@platform/messaging`.
 */
export enum MessageKind {
  Event = 'event',
  Command = 'command',
}
