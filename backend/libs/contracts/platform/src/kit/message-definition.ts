import type { z } from 'zod';
import type { MessageKind } from '../enums/message-kind.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';

/**
 * Asynchronous message declared in a contract: event or command.
 *
 * It has the shape `@platform/messaging` uses (`type`, `kind` and `schema`), so
 * `MessageBus.publish`, `MessageBus.send`, `MessageDispatcher.register` and
 * `Route.event`/`Route.command` can take the descriptor as is.
 */
export interface MessageDefinition<
  K extends MessageKind = MessageKind,
  P extends z.ZodType = z.ZodType,
> {
  /** CloudEvents type with the version at the end, for example `identity.session.revoked.v1`. */
  readonly type: string;
  readonly kind: K;
  /** Payload version, taken from the `.vN` suffix of `type`. */
  readonly version: number;
  /** Schema of the `data` field of the CloudEvents envelope. */
  readonly payload: P;
  /** The same schema as `payload`, with the name `@platform/messaging` expects. */
  readonly schema: P;
  readonly description: string;
}

/** Data written when declaring a message. */
export interface MessageSpec<P extends z.ZodType> {
  readonly type: string;
  readonly payload: P;
  readonly description: string;
}

/** `service.entity.action.vN`: at least three segments and the version. */
const MESSAGE_TYPE =
  /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9_-]*){2,}\.v([1-9][0-9]*)$/;

/** Builds the frozen descriptor of a message after validating its type. */
export function defineMessage<K extends MessageKind, P extends z.ZodType>(
  kind: K,
  label: string,
  shape: string,
  spec: MessageSpec<P>,
): MessageDefinition<K, P> {
  const match = MESSAGE_TYPE.exec(spec.type);
  if (!match) {
    throw new ContractDefinitionError(
      `${label} ${spec.type}: the type must have the shape ${shape}`,
    );
  }
  if (!spec.description.trim()) {
    throw new ContractDefinitionError(
      `${label} ${spec.type}: missing description`,
    );
  }
  return Object.freeze({
    type: spec.type,
    kind,
    version: Number(match[2]),
    payload: spec.payload,
    schema: spec.payload,
    description: spec.description,
  });
}

/** Owning service of a message or operation: the first segment of the id. */
export function serviceOfId(id: string): string {
  return id.slice(0, id.indexOf('.'));
}
