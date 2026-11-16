import 'reflect-metadata';
import { InternalHandlerMetadata } from '../internal-handler.metadata.js';
import { DecoratedHandlers } from './utils/decorated-handlers.js';
import { ExplorerOperations } from './utils/explorer-operations.js';

describe('InternalHandlerMetadata', () => {
  it('read, decorated method, returns the operation it serves', () => {
    expect(
      InternalHandlerMetadata.read(DecoratedHandlers.prototype.count),
    ).toBe(ExplorerOperations.Count);
  });

  it('read, method without the decorator, returns undefined', () => {
    expect(InternalHandlerMetadata.read(() => undefined)).toBeUndefined();
  });

  it('read, value that is not a function, returns undefined', () => {
    expect(InternalHandlerMetadata.read('count')).toBeUndefined();
  });
});
