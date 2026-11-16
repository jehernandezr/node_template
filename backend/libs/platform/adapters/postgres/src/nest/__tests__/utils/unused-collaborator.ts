/**
 * Marcador que ocupa el lugar de una dependencia que el módulo solo recibe. Los factories de `PostgresPlatformModule`
 * guardan la referencia sin usarla al construir, así que basta un objeto distinto por token para comprobar el cableado.
 */
export class UnusedCollaborator {
  constructor(readonly role: string) {}
}
