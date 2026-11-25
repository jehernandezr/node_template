import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/src/shell_menu_model.dart';

void main() {
  MenuEntry entry(String path, int order) => MenuEntry(
    label: MenuLabel({'es': 'Tareas', 'en': 'Tasks'}),
    path: path,
    order: order,
    icon: Icons.circle_outlined,
  );

  ShellMenuModel model({
    required List<MenuEntry> entries,
    required String location,
    String languageCode = 'es',
    int? Function(MenuEntry entry)? badgeFor,
    int maxPrimary = 4,
  }) => ShellMenuModel(
    entries: entries,
    location: location,
    languageCode: languageCode,
    badgeFor: badgeFor ?? (_) => null,
    maxPrimary: maxPrimary,
  );

  group('ShellMenuModel', () {
    test('selects the longest path on a segment boundary', () {
      final menu = model(
        entries: [entry('/tasks', 1), entry('/tasks2', 2)],
        location: '/tasks2',
      );

      expect(menu.selectedIndex, 1);
    });

    test('a deeper location keeps the parent selected', () {
      final menu = model(
        entries: [entry('/tasks', 1), entry('/tasks2', 2)],
        location: '/tasks/42',
      );

      expect(menu.selectedIndex, 0);
    });

    test('the query string does not change the selection', () {
      final menu = model(
        entries: [entry('/tasks', 1), entry('/tasks2', 2)],
        location: '/tasks?x=1',
      );

      expect(menu.selectedIndex, 0);
    });

    test('a location outside every entry selects nothing', () {
      final menu = model(
        entries: [entry('/tasks', 1), entry('/tasks2', 2)],
        location: '/other',
      );

      expect(menu.selectedIndex, -1);
    });

    test('entries beyond maxPrimary go to overflow and select More', () {
      final menu = model(
        entries: [
          entry('/a', 1),
          entry('/b', 2),
          entry('/c', 3),
          entry('/d', 4),
          entry('/e', 5),
          entry('/f', 6),
        ],
        location: '/e',
      );

      expect(menu.primary, hasLength(4));
      expect(menu.overflow, hasLength(2));
      expect(menu.hasOverflow, isTrue);
      expect(menu.selectedIndex, 4);
      expect(menu.pathAt(4), isNull);
      expect(menu.pathAt(0), '/a');
      expect(menu.pathAt(-1), isNull);
    });

    test('without overflow the bar has no More slot', () {
      final menu = model(
        entries: [
          entry('/a', 1),
          entry('/b', 2),
          entry('/c', 3),
          entry('/d', 4),
        ],
        location: '/a',
      );

      expect(menu.hasOverflow, isFalse);
      expect(menu.overflow, isEmpty);
      expect(menu.primary, hasLength(4));
    });

    test('labels follow the language code', () {
      final entries = [entry('/tasks', 1)];

      final english = model(
        entries: entries,
        location: '/tasks',
        languageCode: 'en',
      );
      final spanish = model(
        entries: entries,
        location: '/tasks',
        languageCode: 'es',
      );

      expect(english.primary.single.label, 'Tasks');
      expect(spanish.primary.single.label, 'Tareas');
    });

    test('each destination takes the badge given for its entry', () {
      final menu = model(
        entries: [entry('/tasks', 1), entry('/other', 2)],
        location: '/tasks',
        badgeFor: (e) => e.path == '/tasks' ? 3 : null,
      );

      expect(menu.primary[0].badge, 3);
      expect(menu.primary[1].badge, isNull);
    });
  });
}
