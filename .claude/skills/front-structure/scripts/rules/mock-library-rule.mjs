import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

/**
 * Rejects mocking libraries in the front: a test double is a class that implements the port, shared through
 * `test_utils`, as the backend writes its doubles instead of `jest.fn`.
 */
export class MockLibraryRule extends PatternRule {
  constructor() {
    super(
      RuleId.MOCK_LIBRARY,
      'no mocktail or mockito: write a class double that implements the port',
      /package:(mocktail|mockito)\/|^\s+(mocktail|mockito):/m,
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isDart(file) || file.endsWith('/pubspec.yaml');
  }
}
