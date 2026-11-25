# Clases e inyección: ejemplo

```ts
// Bien
export class SignInUseCase implements UseCase<SignInCommand, SessionAccess> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(command: SignInCommand): Promise<SessionAccess> {
    /* ... */
  }
}

// Mal: funciones sueltas que leen dependencias de módulo
export async function signIn(email: string, password: string) {
  const user = await db.findUser(email);
}
```
