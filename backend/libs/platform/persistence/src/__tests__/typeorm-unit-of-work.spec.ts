import { StubDataSource } from './utils/stub-data-source.js';
import { TypeOrmUnitOfWork } from '../typeorm-unit-of-work.js';

function buildUnitOfWork(): TypeOrmUnitOfWork {
  const dataSource = new StubDataSource('svc_shard_a');
  const queryRunner = dataSource.createQueryRunner();
  return new TypeOrmUnitOfWork('svc_shard_a', queryRunner.manager, queryRunner);
}

describe('TypeOrmUnitOfWork', () => {
  describe('when commit hooks are registered', () => {
    it('hands them out in registration order and then empties the list', () => {
      const uow = buildUnitOfWork();
      const events: string[] = [];
      uow.afterCommit(() => {
        events.push('first');
      });
      uow.afterCommit(() => {
        events.push('second');
      });

      const taken = uow.takeCommitHooks();
      taken.forEach((hook) => hook());

      expect(events).toEqual(['first', 'second']);
      expect(uow.takeCommitHooks()).toEqual([]);
    });
  });

  describe('when rollback hooks are registered', () => {
    it('hands them out in registration order and then empties the list', () => {
      const uow = buildUnitOfWork();
      const events: string[] = [];
      uow.afterRollback(() => {
        events.push('first');
      });
      uow.afterRollback(() => {
        events.push('second');
      });

      const taken = uow.takeRollbackHooks();
      taken.forEach((hook) => hook());

      expect(events).toEqual(['first', 'second']);
      expect(uow.takeRollbackHooks()).toEqual([]);
    });

    it('keeps commit hooks apart from rollback hooks', () => {
      const uow = buildUnitOfWork();
      uow.afterCommit(() => undefined);

      expect(uow.takeRollbackHooks()).toEqual([]);
      expect(uow.takeCommitHooks()).toHaveLength(1);
    });
  });
});
