/** Receives the `sid` of a newly revoked session. */
export type RevocationHandler = (sessionId: string) => void;
