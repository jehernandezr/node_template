import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'the manifest eagerly imports only shell_core, go_router and material_ui',
    () {
      final source = File('lib/mf_backoffice.dart').readAsStringSync();
      final imports = RegExp(
        r"^import '([^']+)'( deferred as \w+)?;",
        multiLine: true,
      ).allMatches(source).toList();

      final eager = [
        for (final m in imports)
          if (m.group(2) == null) m.group(1)!,
      ];
      final deferred = [
        for (final m in imports)
          if (m.group(2) != null) m.group(1)!,
      ];

      expect(
        eager,
        unorderedEquals([
          'package:shell_core/shell_core.dart',
          'package:go_router/go_router.dart',
          'package:material_ui/material_ui.dart',
        ]),
      );
      expect(deferred, ['src/screens/screens.dart']);
    },
  );
}
