/**
 * Trama que el servidor entrega a un usuario conectado. Con `closesSession` la conexión de esa sesión la
 * entrega y se cierra, y con `RealtimeFrames.ALL_SESSIONS` todas las del usuario: así una revocación llega por
 * el mismo camino ordenado que el resto de las tramas.
 */
export interface RealtimeFrame {
  readonly type: string;
  readonly data: unknown;
  readonly closesSession?: string;
}

/** Trama ya guardada en el stream del usuario, con el id que la ordena y permite reanudar después de ella. */
export interface StoredFrame extends RealtimeFrame {
  readonly id: string;
}

/** Valores reservados de las tramas. */
export class RealtimeFrames {
  /** `closesSession` que cierra todas las conexiones del usuario. */
  static readonly ALL_SESSIONS = '*';
}
