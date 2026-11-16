import { ClientChannel } from '../client-channel.enum.js';
import { ClientChannelResolver } from '../client-channel-resolver.js';

describe('ClientChannelResolver', () => {
  it('is web by default', () => {
    expect(ClientChannelResolver.resolve({})).toBe(ClientChannel.Web);
  });

  it('is native with a session token as bearer credential', () => {
    expect(
      ClientChannelResolver.resolve({ authorization: 'Bearer st1_abc' }),
    ).toBe(ClientChannel.Native);
  });

  it('is native when the app declares the bearer transport in any case', () => {
    expect(
      ClientChannelResolver.resolve({ 'x-session-transport': 'BEARER' }),
    ).toBe(ClientChannel.Native);
  });

  it('stays web for an access token and another transport value', () => {
    expect(
      ClientChannelResolver.resolve({
        authorization: 'Bearer eyJ.x.y',
        'x-session-transport': 'cookie',
      }),
    ).toBe(ClientChannel.Web);
  });
});
