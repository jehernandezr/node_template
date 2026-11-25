# backend-persistence-typeorm examples

Long examples the skill cites. Read them only when the topic applies to you.

## Repositories and mappers

```ts
@Injectable()
export class TypeOrmTaskRepository
  extends TenantIsolatedRepository
  implements TaskRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async find(taskId: string): Promise<Task | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(TaskEntity, { id: taskId, tenantId }),
    );
    return row === null ? undefined : TaskMapper.toDomain(row);
  }
}
```
