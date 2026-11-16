import { JsonBodyReader } from '../json-body-reader.js';

async function* chunksOf(
  ...parts: (Uint8Array | string)[]
): AsyncGenerator<Uint8Array | string> {
  for (const part of parts) {
    yield part;
  }
}

describe('JsonBodyReader', () => {
  it('reads an object sent in several chunks', async () => {
    const reader = new JsonBodyReader();

    await expect(
      reader.read(chunksOf('{"name":', new TextEncoder().encode('"Lapiz"}'))),
    ).resolves.toEqual({
      name: 'Lapiz',
    });
  });

  it('returns undefined for an empty body', async () => {
    await expect(
      new JsonBodyReader().read(chunksOf()),
    ).resolves.toBeUndefined();
  });

  it('rejects broken JSON as malformed', async () => {
    await expect(
      new JsonBodyReader().read(chunksOf('{"name":')),
    ).rejects.toMatchObject({
      code: 'PLATFORM.HTTP.MALFORMED_BODY',
    });
  });

  it('rejects text that is not valid UTF-8', async () => {
    const invalid = new Uint8Array([0x22, 0xff, 0x22]);

    await expect(
      new JsonBodyReader().read(chunksOf(invalid)),
    ).rejects.toMatchObject({
      code: 'PLATFORM.HTTP.MALFORMED_BODY',
    });
  });

  it('accepts a body of exactly the limit', async () => {
    const body = JSON.stringify({ a: 'x'.repeat(10) });
    const reader = new JsonBodyReader(Buffer.byteLength(body));

    await expect(reader.read(chunksOf(body))).resolves.toEqual({
      a: 'x'.repeat(10),
    });
  });

  it('rejects a body one byte above the limit as too large', async () => {
    const body = JSON.stringify({ a: 'x'.repeat(10) });
    const reader = new JsonBodyReader(Buffer.byteLength(body) - 1);

    await expect(reader.read(chunksOf(body))).rejects.toMatchObject({
      code: 'PLATFORM.HTTP.PAYLOAD_TOO_LARGE',
    });
  });
});
