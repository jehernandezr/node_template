import { Entity } from './entity.js';
import { Id } from './id.js';
import { SequentialIdGenerator } from './testing/sequential-id-generator.js';

class User extends Entity {
  constructor(id: Id) {
    super(id);
  }
}

describe('Entity', () => {
  const ids = new SequentialIdGenerator();

  it('equals another entity with the same id, even with different state', () => {
    const id = ids.next();
    expect(new User(id).equals(new User(id))).toBe(true);
  });

  it('is not equal to an entity with a different id', () => {
    expect(new User(ids.next()).equals(new User(ids.next()))).toBe(false);
  });

  it('is not equal to null or undefined', () => {
    const user = new User(ids.next());
    expect(user.equals(null)).toBe(false);
    expect(user.equals(undefined)).toBe(false);
  });
});
