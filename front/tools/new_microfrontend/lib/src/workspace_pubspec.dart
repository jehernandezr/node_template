import 'scaffold_exception.dart';

/// Edits the `workspace:` list of `front/pubspec.yaml`.
final class WorkspacePubspec {
  /// Creates the editor.
  const WorkspacePubspec();

  static final RegExp _member = RegExp(r'^  - (.+)$');

  /// [pubspec] with `  - [member]` added in sorted position inside the
  /// `workspace:` list, keeping the rest byte for byte. Throws
  /// `ScaffoldException` when the member is already listed or when there is
  /// no `workspace:` list.
  String addMember(String pubspec, String member) {
    final lines = pubspec.split('\n');
    final header = lines.indexOf('workspace:');
    if (header < 0) {
      throw const ScaffoldException(
        'front/pubspec.yaml has no workspace list.',
      );
    }
    final members = <String>[];
    var end = header + 1;
    while (end < lines.length) {
      final match = _member.firstMatch(lines[end]);
      if (match == null) break;
      members.add(match.group(1)!);
      end++;
    }
    if (members.contains(member)) {
      throw ScaffoldException('$member is already in the workspace list.');
    }
    var position = end;
    for (var i = 0; i < members.length; i++) {
      if (members[i].compareTo(member) > 0) {
        position = header + 1 + i;
        break;
      }
    }
    lines.insert(position, '  - $member');
    return lines.join('\n');
  }
}
