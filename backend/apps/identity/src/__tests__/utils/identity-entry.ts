import type { HttpTestClient } from '@platform/http/test-utils';
import type { MemoryIdentityMailer } from '../../modules/alerts/index.js';

/** Lo que un usuario de prueba necesita de un identity en marcha: clientes HTTP por IP y el correo enviado. */
export interface IdentityEntry {
  /** Cliente sin headers de canal: la petición cuenta como web. `ip` es la que el proxy declara. */
  client(ip?: string): HttpTestClient;
  /** Cliente de la app nativa: el session token viaja en el cuerpo. */
  nativeClient(ip?: string): HttpTestClient;
  mailer(): MemoryIdentityMailer;
}
