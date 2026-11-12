import 'package:contracts/contracts.dart';

final _uuidV7 = RegExp(IdentifierFormat.pattern);

/// True when [id] is a UUIDv7, the format of every platform identifier.
bool isUuidV7(String id) => _uuidV7.hasMatch(id);

/// Creation time encoded in the 48 millisecond bits of a UUIDv7, in UTC.
/// Returns null when [id] is not a UUIDv7.
DateTime? uuidV7Time(String id) {
  if (!isUuidV7(id)) return null;
  final hex = id.substring(0, 8) + id.substring(9, 13);
  return DateTime.fromMillisecondsSinceEpoch(
    int.parse(hex, radix: 16),
    isUtc: true,
  );
}

/// Short form of an id for people, for example `0193f1c2…0000`.
/// Keeps the time prefix and the random tail so two ids rarely look equal.
String shortId(String id) => id.length <= 12
    ? id
    : '${id.substring(0, 8)}…${id.substring(id.length - 4)}';
