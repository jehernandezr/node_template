# Ejemplos de backend-pruebas

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Cómo se escriben

```ts
describe('SignInUseCase', () => {
  describe('when the password is wrong five times', () => {
    it('locks the account and emits user.locked', async () => {
      const harness = SignInHarness.withUser(
        aUser({ email: 'ana@example.com' }),
      );

      for (let attempt = 0; attempt < 5; attempt++) {
        await harness.signInWith('wrong-password').catch(() => undefined);
      }

      expect(harness.users.get('ana@example.com').isLocked()).toBe(true);
      expect(harness.outbox.types()).toContain(UserEventType.Locked);
    });
  });
});
```

## Integración

```ts
export enum IntegrationMode {
  Skip = 'skip',
  Require = 'require',
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('TypeOrmOutboxStore', () => {
  it('appends a message inside the transaction', async () => {
    /* ... */
  });
});
```
