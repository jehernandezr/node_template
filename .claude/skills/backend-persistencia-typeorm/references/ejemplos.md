# backend-persistencia-typeorm examples

Long examples the skill cites. Read them only when the topic applies to you.

## Repositories and mappers

```ts
@Injectable()
export class TypeOrmUserRepository
  extends ShardedRepository<User, UserEntity>
  implements UserRepository
{
  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.manager().findOne(UserEntity, {
      where: { email: email.value },
    });
    return row ? this.mapper.toDomain(row) : null;
  }
}
```
