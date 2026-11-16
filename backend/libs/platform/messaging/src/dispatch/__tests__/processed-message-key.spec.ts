import { ProcessedMessageKey } from '../processed-message-key.js';

describe('ProcessedMessageKey', () => {
  it('scopes keys by consumer without separator collisions', () => {
    expect(ProcessedMessageKey.of('audit', 'm1')).not.toBe(
      ProcessedMessageKey.of('notifications', 'm1'),
    );
    expect(ProcessedMessageKey.of('a,b', 'c')).not.toBe(
      ProcessedMessageKey.of('a', 'b,c'),
    );
  });
});
