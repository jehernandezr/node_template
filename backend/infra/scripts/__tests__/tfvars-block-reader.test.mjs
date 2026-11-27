import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TfvarsBlockReader } from '../tfvars-block-reader.mjs';

const SAMPLE = `service_name = "fixture-mixed"

api = {
  runtime        = "fargate"
  route_prefixes = ["/v1/{x}"]
  nested = {
    runtime = "lambda"
  }
}

workers = {}

# consumers = {
#   mail = {}
# }
`;

describe('TfvarsBlockReader', () => {
  it('tells a block with content from an empty one', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.hasBlock('api'), true);
    assert.equal(reader.hasBlock('workers'), true);
    assert.equal(reader.hasContent('api'), true);
    assert.equal(reader.hasContent('workers'), false);
    assert.equal(reader.hasBlock('consumers'), false);
  });

  it('returns the block text respecting nested braces and strings with braces', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    const block = reader.block('api');
    assert.match(block, /nested = \{/);
    assert.match(block, /runtime = "lambda"/);
    assert.doesNotMatch(block, /workers/);
    const withBraces = new TfvarsBlockReader('x = {\n  s = "}"\n}\ny = 1\n');
    assert.equal(withBraces.block('x').trim(), 's = "}"');
  });

  it('reads runtime only inside the requested block', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.stringIn('api', 'runtime'), 'fargate');
    assert.equal(reader.stringIn('workers', 'runtime'), undefined);
    assert.equal(reader.stringIn('api', 'missing'), undefined);
  });

  it('does not read keys from a deeper level or from comments', () => {
    const reader = new TfvarsBlockReader(
      'api = {\n  nested = {\n    runtime = "lambda"\n  }\n}\n',
    );
    assert.equal(reader.stringIn('api', 'runtime'), undefined);
    const commented = new TfvarsBlockReader(
      '# api = {\n#   runtime = "lambda"\n# }\n',
    );
    assert.equal(commented.hasBlock('api'), false);
    assert.equal(commented.stringIn('api', 'runtime'), undefined);
  });

  it('ignores comments when reading values', () => {
    const reader = new TfvarsBlockReader(
      'api = {\n  runtime = "fargate" # lambda\n}\n',
    );
    assert.equal(reader.stringIn('api', 'runtime'), 'fargate');
  });

  it('reads unindented values from the top level', () => {
    const reader = new TfvarsBlockReader(SAMPLE);
    assert.equal(reader.topLevelString('service_name'), 'fixture-mixed');
    assert.equal(reader.topLevelString('runtime'), undefined);
    const indented = new TfvarsBlockReader(
      'api = {\n  service_name = "other"\n}\n',
    );
    assert.equal(indented.topLevelString('service_name'), undefined);
  });

  it('tells a top-level assignment from a commented or nested one', () => {
    const reader = new TfvarsBlockReader(
      [
        'compute_enabled = false',
        '# ses_domain = "example.com"',
        'api = {',
        '  ses_domain = "nested.example.com"',
        '}',
      ].join('\n'),
    );
    assert.equal(reader.assigns('compute_enabled'), true);
    assert.equal(reader.topLevelExpression('compute_enabled'), 'false');
    assert.equal(reader.assigns('ses_domain'), false);
    assert.equal(reader.topLevelExpression('ses_domain'), undefined);
  });

  it('lists the entry names of a block, without nested keys or comments', () => {
    const reader = new TfvarsBlockReader(
      [
        'workers = {',
        '  usage = { queue = "billing-usage", max_capacity = 2 }',
        '  # old = { queue = "old" }',
        '  "access-projection" = {',
        '    queue = "identity-access-projection"',
        '  }',
        '}',
      ].join('\n'),
    );
    assert.deepEqual(reader.entryNames('workers'), [
      'usage',
      'access-projection',
    ]);
    assert.deepEqual(reader.entryNames('consumers'), []);
  });

  it('reads a one-line list of strings at the top level', () => {
    const reader = new TfvarsBlockReader(
      'valkey_services = ["identity", "tasks"] # all\n# other = ["x"]\n',
    );
    assert.deepEqual(reader.topLevelStrings('valkey_services'), [
      'identity',
      'tasks',
    ]);
    assert.deepEqual(reader.topLevelStrings('other'), []);
  });

  it('fails if a block is not closed', () => {
    const reader = new TfvarsBlockReader('api = {\n  runtime = "fargate"\n');
    assert.throws(() => reader.block('api'), /Unclosed block/);
  });
});
