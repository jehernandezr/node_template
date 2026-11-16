/** Recibe el `sid` de una sesión recién revocada. */
export type RevocationHandler = (sessionId: string) => void;
