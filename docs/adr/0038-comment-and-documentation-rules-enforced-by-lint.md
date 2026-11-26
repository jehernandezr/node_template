# 0038. Comment and documentation rules enforced by lint

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0027](0027-front-screen-patterns-and-tests.md), [ADR 0033](0033-generators-and-openapi.md)

## Context

The repository rules say that code explains itself without inline comments and that every public method has a complete, concise JSDoc (`///` in Dart). Nothing checked them. The general review of 2026-11-24 found about 550 inline comments in the backend, about 400 in the front, roughly 2,000 public methods without documentation, filler summaries that only repeat the name, and several comments that described behavior the code does not have.

## Decision

### Backend

`backend/eslint.comments.mjs` adds two ESLint rules, as errors, to every backend project:

- `comments/no-inline-comments` rejects every `//` and `/* */` comment except `eslint-disable* <rule> -- <reason>`, `eslint-enable`, `@ts-expect-error <reason>` and the `generated:` markers the generators edit. A JSDoc block is accepted only on a declaration: a class, a member, a constructor parameter, a top-level variable, a property of an object outside any function, an enum member, an export or a top-level `module.exports` assignment, plus one overview block at the very top of a file. A JSDoc inside a function body, nested functions and test callbacks included, is an inline comment. Migrations are generated code and are not checked.
- `comments/require-public-jsdoc` asks every exported class for a summary line and every public method, getter and public function-valued property included, for a summary, an `@param` per parameter and `@returns` whenever the method returns a value: from the declared type, from the type checker when there is no annotation, or from a `return <value>` in its body when there is no type information. A summary whose words are all in the member name and its class name is rejected as filler, a summary made only of vague words (`Does the work.`) is rejected as saying nothing, and a field, property or getter doc that only repeats its name is rejected too.

A method that overrides or implements a member of its base class or of an `implements` clause is documented on the port it fulfills, and the rule does not ask it again: the port is where the contract lives, and its documentation is what an editor shows on the implementation. The rule detects `override` and, with type information, the members of the implemented interfaces. Every implementation of a base class member now carries `override`. Constructors and setters are not checked.

Test code (`__tests__`, `*.spec.ts`, `*.int-spec.ts`, `*.e2e-spec.ts`) has no inline comments either, but its classes are not public API and are not asked for JSDoc.

### JavaScript tooling

`eslint.tooling.config.mjs` applies the same two rules to the scripts under `.claude/skills`, the hooks under `.claude/hooks` and the front tools (`front/tools/nx-plugin`); it runs as the `lint` target of `backend-tooling`. JavaScript has no `override` keyword, so a method documented on its base class carries `/** @override */`, which the rule accepts only in JavaScript files. The workflow scripts under `.claude/workflows` belong to the agent harness and are not linted.

### Front

- The front structure check gains the `inline-comment` rule. A comment scanner that skips strings, raw strings and the code of interpolations rejects every comment except `///` documentation of a declaration and the analyzer directives `// ignore: <codes> -- <reason>` and `// ignore_for_file: <codes> -- <reason>`; the analyzer reads the codes before `--` and still applies the directive. A `///` inside a function body, a control block or a collection literal documents nothing and is rejected. Generated files are recognized by their path only (a `generated` folder and the generated contracts), never by a header a hand-written file could copy.
- Every `analysis_options.yaml` enables `public_member_api_docs`, and `flutter analyze` fails on it. The contracts generator writes `// ignore_for_file: public_member_api_docs` in the header of its generated files.
- A catch-all is written `on Object catch`, only at a point that reports the failure, and the `///` of the method explains why. The former `// catch-all:` mark was an inline comment.

### What a former inline comment became

An inline comment that explained a reason was moved into the JSDoc (or `///`) of the member that holds it, private members included, which may be documented. Comments that narrated the code, separated sections or repeated the code were deleted.

## Consequences

- A new inline comment or an undocumented public method fails `nx lint` in the backend and `check-structure` or `flutter analyze` in the front, so the reviewer no longer has to find them by reading.
- Typed linting only backs the `implements` exemption; it makes the lint of the whole backend slower and heavier than before, so lint runs per project as Nx already does.
- Whether a documentation sentence is accurate is still a matter of review: the rules check presence, completeness and filler, not truth.
