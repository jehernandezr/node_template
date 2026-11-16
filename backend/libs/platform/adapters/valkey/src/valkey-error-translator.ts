import { FailureKind, PlatformError } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';
import { ValkeyCommandError } from './valkey-command.error.js';

/**
 * Traduce los errores del cliente iovalkey. Como `FailureRule` le dice al
 * `FailureClassifier` cómo falla un error de respuesta del servidor; como
 * traductor envuelve cualquier error del cliente en un `ValkeyCommandError`.
 */
export class ValkeyErrorTranslator extends FailureRule {
  /**
   * Respuestas de error que un intento posterior puede arreglar: el servidor
   * está cargando, ocupado, en failover o en solo lectura durante un cambio.
   */
  private static readonly TRANSIENT_REPLIES: ReadonlySet<string> = new Set([
    'LOADING',
    'BUSY',
    'TRYAGAIN',
    'CLUSTERDOWN',
    'MASTERDOWN',
    'READONLY',
    'NOREPLICAS',
  ]);

  /** Mensaje que usa iovalkey cuando vence `commandTimeout`. */
  private static readonly COMMAND_TIMEOUT_MESSAGE = 'Command timed out';

  /** Solo opina de un error de respuesta del servidor; el resto lo deja al clasificador. */
  classify(error: object): FailureKind | undefined {
    return this.isReplyError(error) ? this.kindOf(error) : undefined;
  }

  /**
   * Cómo falla un error del cliente:
   * - una respuesta de error es pasajera solo con los prefijos de un servidor cargando, ocupado o en failover;
   * - el `commandTimeout` de iovalkey es un tiempo agotado;
   * - cualquier otra cosa (conexión rechazada o cerrada, reintentos agotados, cola sin conexión) es pasajera.
   */
  kindOf(error: unknown): FailureKind {
    if (this.isReplyError(error)) {
      return ValkeyErrorTranslator.TRANSIENT_REPLIES.has(
        this.replyPrefix(error),
      )
        ? FailureKind.Transient
        : FailureKind.Permanent;
    }
    if (
      this.messageOf(error) === ValkeyErrorTranslator.COMMAND_TIMEOUT_MESSAGE
    ) {
      return FailureKind.Timeout;
    }
    return FailureKind.Transient;
  }

  /** Envuelve un error del cliente en un {@link ValkeyCommandError}. Los errores de la plataforma pasan sin cambios. */
  translate(error: unknown, command: string): PlatformError {
    if (error instanceof PlatformError) {
      return error;
    }
    return new ValkeyCommandError(command, this.kindOf(error), error);
  }

  /** `true` para una respuesta de error del servidor (no una falla de conexión o del cliente). */
  isReplyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      String((error as { name?: unknown }).name) === 'ReplyError'
    );
  }

  /** Primera palabra de una respuesta de error, como `WRONGTYPE` o `NOSCRIPT`. */
  replyPrefix(error: unknown): string {
    return this.messageOf(error).split(' ', 1)[0] ?? '';
  }

  private messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
