/** Comandos que envían los adaptadores. */
export enum ValkeyCommand {
  Get = 'GET',
  Set = 'SET',
  Del = 'DEL',
  Hget = 'HGET',
  Pexpire = 'PEXPIRE',
  Ping = 'PING',
  Eval = 'EVAL',
  EvalSha = 'EVALSHA',
  Publish = 'PUBLISH',
  Bitfield = 'BITFIELD',
  BitfieldReadOnly = 'BITFIELD_RO',
  BloomReserve = 'BF.RESERVE',
  BloomInsert = 'BF.INSERT',
  BloomExists = 'BF.EXISTS',
}
