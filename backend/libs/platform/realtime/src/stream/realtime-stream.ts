import type { RealtimeFrame, StoredFrame } from './realtime-frame.js';

/** Se cancela una suscripción a un canal. */
export type StreamUnsubscribe = () => Promise<void>;

/**
 * Stream ordenado de tramas por canal (un canal por usuario). Guarda las últimas tramas para que una
 * conexión que se corta pueda pedir las que llegaron después de la última que recibió.
 */
export abstract class RealtimeStream {
  /** Agrega la trama al final del canal y devuelve su id. */
  abstract append(channel: string, frame: RealtimeFrame): Promise<string>;

  /**
   * Las tramas posteriores a `afterId` (todas las retenidas si no hay), en orden y hasta `limit`. Un `afterId`
   * que no es un id de este stream no devuelve nada: quien lee parte de `resumePoint` o de una trama ya leída.
   */
  abstract readAfter(
    channel: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<readonly StoredFrame[]>;

  /**
   * Desde dónde lee una conexión que abre: `lastEventId` si es un id de este stream que no pasa de la última
   * trama; si falta, no lo es o es posterior, el id de la última trama del canal (`undefined` si no tiene
   * ninguna). Un id inventado o corrupto no reproduce lo retenido: lo anterior ya lo trae la API.
   */
  abstract resumePoint(
    channel: string,
    lastEventId: string | undefined,
  ): Promise<string | undefined>;

  /**
   * Avisa cada vez que el canal recibe tramas. El aviso no trae la trama: quien escucha la lee con
   * `readAfter`, así un aviso perdido solo atrasa la entrega hasta el siguiente.
   */
  abstract subscribe(
    channel: string,
    onAppend: () => void,
  ): Promise<StreamUnsubscribe>;
}
