import { InMemoryPasswordsFacade } from './utils/index.js';

const ANA = {
  userId: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: 't',
};

describe('InMemoryPasswordsFacade', () => {
  it('verifies the password stored for the user', async () => {
    const facade = new InMemoryPasswordsFacade();
    await facade.setInitial(ANA, 'contraseña-larga-123');

    await expect(facade.verify(ANA, 'contraseña-larga-123')).resolves.toBe(
      true,
    );
    await expect(facade.verify(ANA, 'otra-contraseña-456')).resolves.toBe(
      false,
    );
  });

  it('returns false for a user without a stored password', async () => {
    await expect(
      new InMemoryPasswordsFacade().verify(ANA, 'contraseña-larga-123'),
    ).resolves.toBe(false);
  });

  it('counts the checks made without a user and answers false', async () => {
    const facade = new InMemoryPasswordsFacade();

    await expect(facade.verify(undefined, 'cualquiera')).resolves.toBe(false);
    await expect(facade.verify(undefined, 'otra')).resolves.toBe(false);

    expect(facade.unknownUserChecks).toBe(2);
  });
});
