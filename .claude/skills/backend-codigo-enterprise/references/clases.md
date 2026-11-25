# Classes and injection: example

```ts
// Good
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

// Bad: loose functions that read module dependencies
export async function signIn(email: string, password: string) {
  const user = await db.findUser(email);
}
```
