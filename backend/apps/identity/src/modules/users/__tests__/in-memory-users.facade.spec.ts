import { UserStatus } from '@contracts/identity';
import { InMemoryUsersFacade } from './utils/index.js';

const TENANT = '018f0000-0000-7000-8000-00000000000a';
const ANA = {
  id: '018f0000-0000-7000-8000-000000000001',
  homeTenantId: TENANT,
  email: 'ana@example.com',
  status: UserStatus.Active,
  displayName: 'Ana',
  locale: 'es-MX',
};

describe('InMemoryUsersFacade', () => {
  it('finds a user by email regardless of case and spaces', async () => {
    const facade = new InMemoryUsersFacade().add(ANA);

    await expect(facade.findByEmail('  ANA@Example.com ')).resolves.toEqual(
      ANA,
    );
  });

  it('returns undefined when no user has the email', async () => {
    await expect(
      new InMemoryUsersFacade().findByEmail('nobody@example.com'),
    ).resolves.toBeUndefined();
  });

  it('returns the user by reference', async () => {
    const facade = new InMemoryUsersFacade().add(ANA);

    await expect(
      facade.getByRef({ userId: ANA.id, homeTenantId: TENANT }),
    ).resolves.toEqual(ANA);
  });

  it('rejects an unknown user reference', async () => {
    await expect(
      new InMemoryUsersFacade().getByRef({
        userId: 'x',
        homeTenantId: TENANT,
      }),
    ).rejects.toThrow('User not found');
  });

  it('registers a pending user with the normalized email and a sequential id', async () => {
    const facade = new InMemoryUsersFacade();

    const ref = await facade.register({
      email: ' Ana@Example.COM ',
      password: 'long-password-123',
      displayName: 'Ana',
      locale: 'es-MX',
      homeTenantId: TENANT,
    });

    const stored = await facade.getByRef(ref);
    expect(stored).toMatchObject({
      email: 'ana@example.com',
      status: UserStatus.PendingVerification,
      homeTenantId: TENANT,
    });
    expect(ref.userId).toBe('01941f29-7c00-7000-8000-000000000001');
    expect(facade.registered).toHaveLength(1);
  });

  it('refuses to register an email already in use', async () => {
    const facade = new InMemoryUsersFacade().add(ANA);

    await expect(
      facade.register({
        email: 'ANA@example.com',
        password: 'long-password-123',
        displayName: 'Another',
        locale: 'es-MX',
        homeTenantId: TENANT,
      }),
    ).rejects.toThrow('Email already registered');
    expect(facade.registered).toHaveLength(0);
  });

  it('stores the last tenant of a user', async () => {
    const facade = new InMemoryUsersFacade().add(ANA);

    await facade.setLastTenant(
      { userId: ANA.id, homeTenantId: TENANT },
      'tenant-b',
    );

    await expect(
      facade.getByRef({ userId: ANA.id, homeTenantId: TENANT }),
    ).resolves.toMatchObject({ lastTenantId: 'tenant-b' });
  });

  it('rejects setLastTenant for an unknown user', async () => {
    await expect(
      new InMemoryUsersFacade().setLastTenant(
        { userId: 'x', homeTenantId: TENANT },
        'tenant-b',
      ),
    ).rejects.toThrow('User not found');
  });
});
