import 'package:meta/meta.dart';

import '../platform/enums/platform_enums.dart';
import 'problem_details.dart';

/// Generated description of an asynchronous message of a contract: an event
/// (for example a real-time push) or a command, with its payload decoder.
@immutable
final class MessageDescriptor<P> {
  /// Creates a descriptor. The generated code builds them as constants.
  const MessageDescriptor({
    required this.type,
    required this.kind,
    required this.version,
    required this.validatePayload,
    required this.decodePayload,
  });

  /// CloudEvents type with the version suffix, e.g. `identity.session.revoked.v1`.
  final String type;

  final MessageKind kind;

  /// Payload version, the `.vN` suffix of [type].
  final int version;

  /// Validates the payload JSON (the CloudEvents `data`) against the contract.
  final List<FieldError> Function(Object? json, {String path}) validatePayload;

  /// Decodes the payload JSON.
  final P Function(Map<String, dynamic> json) decodePayload;
}
