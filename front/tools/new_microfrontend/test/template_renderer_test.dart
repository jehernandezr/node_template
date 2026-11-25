import 'package:new_microfrontend/new_microfrontend.dart';
import 'package:test/test.dart';

void main() {
  test('replaces every occurrence of every placeholder', () {
    const renderer = TemplateRenderer({'id': 'reports', 'Pascal': 'Reports'});

    expect(
      renderer.render('{{id}}/{{Pascal}}/{{id}}'),
      'reports/Reports/reports',
    );
  });

  test('throws for a placeholder without a value', () {
    const renderer = TemplateRenderer({'id': 'reports'});

    expect(
      () => renderer.render('path {{nope}}'),
      throwsA(
        isA<ScaffoldException>().having(
          (error) => error.message,
          'message',
          'Unknown placeholder: {{nope}}',
        ),
      ),
    );
  });

  test('keeps text without placeholders as it is', () {
    const renderer = TemplateRenderer({});

    expect(
      renderer.render("plain 'text' \$x {single}"),
      "plain 'text' \$x {single}",
    );
  });

  test('leaves a Dart interpolation that starts with braces intact', () {
    const renderer = TemplateRenderer({'Pascal': 'Reports'});

    expect(renderer.render(r'${{{Pascal}}Paths'), r'${ReportsPaths');
  });
}
