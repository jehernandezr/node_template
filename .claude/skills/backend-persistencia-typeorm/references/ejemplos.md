# Ejemplos de backend-persistencia-typeorm

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Repositorios y mappers

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
