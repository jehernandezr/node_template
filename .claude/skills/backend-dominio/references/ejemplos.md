# Ejemplos del dominio

## Agregado `User`

```ts
export class User extends AggregateRoot<Id, UserEvent> {
  private constructor(
    id: Id,
    private email: Email,
    private status: UserStatus,
    private readonly createdAt: Date,
    private version: number,
  ) {
    super(id);
  }

  static register(params: RegisterUserParams): User {
    const user = new User(
      params.id,
      params.email,
      UserStatus.Active,
      params.now,
      0,
    );
    user.addDomainEvent({
      id: params.eventId,
      type: UserEventType.Registered,
      occurredAt: params.now,
      aggregateId: params.id.value,
      payload: { email: params.email.value },
    });
    return user;
  }

  changeEmail(newEmail: Email, now: Date, eventId: Id): void {
    if (this.status !== UserStatus.Active) {
      throw new UserNotActiveError({ userId: this.id.value });
    }
    if (this.email.equals(newEmail)) return;
    this.email = newEmail;
    this.addDomainEvent({
      id: eventId,
      type: UserEventType.EmailChanged,
      occurredAt: now,
      aggregateId: this.id.value,
      payload: { email: newEmail.value },
    });
  }
}
```

## Objeto de valor `Email`

```ts
export class Email extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError();
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.props.value;
  }
}
```
